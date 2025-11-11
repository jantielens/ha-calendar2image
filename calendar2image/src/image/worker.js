/**
 * Image Generation Worker Process
 * 
 * This worker runs in a separate process to avoid blocking the main event loop
 * during CPU-intensive Puppeteer rendering operations.
 * 
 * Communication via process.send() and process.on('message')
 */

const { generateImage } = require('./index');
const { renderTemplate } = require('../templates');
const { getCalendarEvents } = require('../calendar');
const { loadConfig } = require('../config');
const { fetchExtraData } = require('../extraData');
const { calculateCRC32 } = require('../utils/crc32');
const { logGeneration, logError, EVENT_SUBTYPES } = require('../timeline');

/**
 * Fetch extra data based on config format (string or array)
 * @param {Object} config - Configuration object
 * @param {number} configIndex - Configuration index for timeline logging
 * @returns {Promise<Object|Array>} Extra data
 */
async function fetchExtraDataForConfig(config, configIndex) {
  if (!config.extraDataUrl) {
    return {};
  }

  // Legacy format: single string URL
  if (typeof config.extraDataUrl === 'string') {
    return fetchExtraData(config.extraDataUrl, {
      cacheTtl: config.extraDataCacheTtl,
      headers: config.extraDataHeaders || {},
      configIndex
    });
  }

  // New format: array of sources
  if (Array.isArray(config.extraDataUrl)) {
    const promises = config.extraDataUrl.map(source => {
      let headers;
      if (source.headers !== undefined) {
        if (source.headers === '' || source.headers === null || 
            (typeof source.headers === 'object' && Object.keys(source.headers).length === 0)) {
          headers = {};
        } else {
          headers = source.headers;
        }
      } else {
        headers = config.extraDataHeaders || {};
      }

      const cacheTtl = source.cacheTtl !== undefined 
        ? source.cacheTtl 
        : config.extraDataCacheTtl;

      return fetchExtraData(source.url, { cacheTtl, headers, configIndex });
    });

    return Promise.all(promises);
  }

  return {};
}

/**
 * Generate calendar image in worker process
 */
async function generateCalendarImageInWorker(index, trigger = 'unknown') {
  console.log(`[Worker] Starting image generation for config ${index} (trigger: ${trigger})`);
  const startTime = Date.now();
  
  try {
    // Load configuration
    const config = await loadConfig(index);
    
    // Get previous CRC32 for change detection
    const { getCacheMetadata } = require('../cache');
    let previousCrc32 = null;
    try {
      const oldMetadata = await getCacheMetadata(index);
      previousCrc32 = oldMetadata ? oldMetadata.crc32 : null;
    } catch (err) {
      // Ignore errors getting previous metadata
    }
    
    // Fetch calendar events and extra data in parallel (or skip calendar if no icsUrl)
    let events = [];
    let extraData = {};
    
    if (config.icsUrl) {
      [events, extraData] = await Promise.all([
        getCalendarEvents(config.icsUrl, {
          expandRecurringFrom: config.expandRecurringFrom,
          expandRecurringTo: config.expandRecurringTo,
          expandRecurringMax: config.expandRecurringMax
        }),
        fetchExtraDataForConfig(config, index)
      ]);
    } else {
      console.log(`[Worker] No icsUrl configured for config ${index}, skipping calendar fetch`);
      extraData = await fetchExtraDataForConfig(config, index);
    }
    
    // Render template
    console.log(`[Worker] Rendering template with ${events.length} events`);
    console.log(`[Worker] First event sample:`, events[0] ? JSON.stringify(events[0], null, 2) : 'No events');
    
    const html = await renderTemplate(config.template, {
      events,
      config,
      extraData // Note: renderTemplate will normalize this to 'extra' and add now/locale/timezone
    });
    
    // Generate image
    const result = await generateImage(html, {
      width: config.width,
      height: config.height,
      imageType: config.imageType || 'png',
      grayscale: config.grayscale || false,
      bitDepth: config.bitDepth || 8,
      rotate: config.rotate || 0,
      adjustments: config.adjustments
    });
    
    // Calculate CRC32
    const crc32 = calculateCRC32(result.buffer);
    const duration = Date.now() - startTime;
    const durationSeconds = duration / 1000; // Convert to seconds for timeline
    const crc32Changed = !previousCrc32 || previousCrc32 !== crc32;
    
    console.log(`[Worker] Image generation completed for config ${index} in ${duration}ms`);
    
    // Log generation event to timeline
    const generationSubtype = trigger === 'scheduled' ? EVENT_SUBTYPES.SCHEDULED :
                              trigger === 'boot' ? EVENT_SUBTYPES.BOOT :
                              EVENT_SUBTYPES.ON_DEMAND;
    
    try {
      await logGeneration(index, generationSubtype, {
        crc32: crc32,
        previousCrc32: previousCrc32,
        changed: crc32Changed,
        duration: durationSeconds,
        template: config.template,
        imageSize: result.buffer.length,
        eventCount: events.length
      });
      console.log(`[Worker] Timeline generation event logged for config ${index} (changed: ${crc32Changed})`);
    } catch (err) {
      console.warn(`[Worker] Failed to log generation to timeline: ${err.message}`);
    }
    
    // Send result back to parent (convert Buffer to base64 for IPC serialization)
    process.send({
      success: true,
      index: index,
      buffer: result.buffer.toString('base64'),
      contentType: result.contentType,
      imageType: result.imageType,
      crc32: crc32,
      duration: duration,
      eventCount: events.length
    });
    
    // Exit cleanly
    process.exit(0);
    
  } catch (error) {
    const duration = Date.now() - startTime;
    const durationSeconds = duration / 1000;
    console.error(`[Worker] Image generation failed for config ${index} after ${duration}ms: ${error.message}`);
    
    // Log error to timeline
    try {
      await logError(index, EVENT_SUBTYPES.GENERATION_ERROR, {
        error: error.message,
        trigger,
        duration: durationSeconds
      });
    } catch (timelineErr) {
      console.warn(`[Worker] Failed to log error to timeline: ${timelineErr.message}`);
    }
    
    // Send error back to parent
    process.send({
      success: false,
      index: index,
      error: error.message,
      duration: duration
    });
    
    // Exit with error
    process.exit(1);
  }
}

// Handle messages from parent process
process.on('message', async (msg) => {
  if (msg.action === 'generate') {
    await generateCalendarImageInWorker(msg.index, msg.trigger);
  }
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('[Worker] Uncaught exception:', error);
  process.send({
    success: false,
    error: error.message
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Worker] Unhandled rejection at:', promise, 'reason:', reason);
  process.send({
    success: false,
    error: String(reason)
  });
  process.exit(1);
});
