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

/**
 * Fetch extra data based on config format (string or array)
 */
async function fetchExtraDataForConfig(config) {
  if (!config.extraDataUrl) {
    return {};
  }

  // Legacy format: single string URL
  if (typeof config.extraDataUrl === 'string') {
    return fetchExtraData(config.extraDataUrl, {
      cacheTtl: config.extraDataCacheTtl,
      headers: config.extraDataHeaders || {}
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

      return fetchExtraData(source.url, { cacheTtl, headers });
    });

    return Promise.all(promises);
  }

  return {};
}

/**
 * Generate calendar image in worker process
 */
async function generateCalendarImageInWorker(index) {
  console.log(`[Worker] Starting image generation for config ${index}`);
  const startTime = Date.now();
  
  try {
    // Load configuration
    const config = await loadConfig(index);
    
    // Fetch calendar events and extra data in parallel
    const [events, extraData] = await Promise.all([
      getCalendarEvents(config.icsUrl, {
        expandRecurringFrom: config.expandRecurringFrom,
        expandRecurringTo: config.expandRecurringTo,
        expandRecurringMax: config.expandRecurringMax
      }),
      fetchExtraDataForConfig(config)
    ]);
    
    // Render template
    const html = renderTemplate(config.template, {
      events,
      config,
      extraData
    });
    
    // Generate image
    const result = await generateImage(html, {
      width: config.width,
      height: config.height,
      imageType: config.imageType || 'png',
      grayscale: config.grayscale || false,
      bitDepth: config.bitDepth || 8,
      rotate: config.rotate || 0
    });
    
    // Calculate CRC32
    const crc32 = calculateCRC32(result.buffer);
    const duration = Date.now() - startTime;
    
    console.log(`[Worker] Image generation completed for config ${index} in ${duration}ms`);
    
    // Send result back to parent
    process.send({
      success: true,
      index: index,
      buffer: result.buffer,
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
    console.error(`[Worker] Image generation failed for config ${index} after ${duration}ms: ${error.message}`);
    
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
    await generateCalendarImageInWorker(msg.index);
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
