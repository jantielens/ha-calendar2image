const { loadConfig } = require('../config');
const { getCalendarEvents } = require('../calendar');
const { renderTemplate } = require('../templates');
const { generateImage } = require('../image');
const { loadCachedImage, saveCachedImage, getCacheMetadata } = require('../cache');
const { calculateCRC32 } = require('../utils/crc32');
const { fetchExtraData } = require('../extraData');
const { logGeneration, logDownload, logICS, logError, EVENT_SUBTYPES } = require('../timeline');
const { getVersion } = require('../utils/version');

/**
 * Fetch extra data based on config format (string or array)
 * 
 * @param {Object} config - Configuration object
 * @param {number} configIndex - Configuration index for timeline logging
 * @returns {Promise<Object|Array>} Extra data as object (string format) or array (array format)
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
    // Fetch all sources in parallel
    const promises = config.extraDataUrl.map(source => {
      // Determine headers for this source
      let headers;
      if (source.headers !== undefined) {
        // Headers explicitly set for this source
        if (source.headers === '' || source.headers === null || 
            (typeof source.headers === 'object' && Object.keys(source.headers).length === 0)) {
          // Opt-out: use no headers
          headers = {};
        } else {
          // Use source-specific headers
          headers = source.headers;
        }
      } else {
        // No headers specified for this source, use global
        headers = config.extraDataHeaders || {};
      }

      // Determine cacheTtl for this source
      const cacheTtl = source.cacheTtl !== undefined 
        ? source.cacheTtl 
        : config.extraDataCacheTtl;

      return fetchExtraData(source.url, { cacheTtl, headers, configIndex });
    });

    return Promise.all(promises);
  }

  // Fallback
  return {};
}

/**
 * Main API handler for generating calendar images
 * Orchestrates the entire pipeline: config -> fetch -> render -> generate
 * 
 * @param {string|number} name - Configuration name or index (e.g., 'kitchen', 0, 1, 2)
 * @param {Object} options - Generation options
 * @param {boolean} options.saveCache - Whether to save the generated image to cache
 * @returns {Promise<Object>} Object with buffer and contentType
 * @throws {Error} With appropriate error details for HTTP response handling
 */
async function generateCalendarImage(name, options = {}) {
  const { saveCache = false, trigger = 'unknown' } = options;
  const version = getVersion();
  
  console.log(`[API] Starting image generation for config ${name} (v${version})`);
  const generationStart = Date.now();
  
  try {
    // Step 1: Load configuration
    console.log(`[API] Loading configuration ${name}...`);
    const config = await loadConfig(name);
    const icsUrlDisplay = config.icsUrl ? `"${config.icsUrl}"` : 'none';
    console.log(`[API] Configuration loaded: template="${config.template}", icsUrl=${icsUrlDisplay}`);
    console.log(`[API] Image settings: ${config.width}x${config.height}, ${config.imageType}, grayscale=${config.grayscale}, bitDepth=${config.bitDepth}, rotate=${config.rotate}°`);

    // Step 2: Fetch calendar events and extra data in parallel
    const startFetch = Date.now();
    
    let events = [];
    let extraData = {};
    let fetchDuration;
    
    if (config.icsUrl) {
      const isMultiSource = Array.isArray(config.icsUrl);
      if (isMultiSource) {
        console.log(`[API] Fetching calendar events from ${config.icsUrl.length} ICS source(s)...`);
      } else {
        console.log(`[API] Fetching calendar events from ICS URL...`);
      }
      
      [events, extraData] = await Promise.all([
        getCalendarEvents(config.icsUrl, {
          expandRecurringFrom: config.expandRecurringFrom,
          expandRecurringTo: config.expandRecurringTo,
          timezone: config.timezone
        }),
        fetchExtraDataForConfig(config, name)
      ]);
      
      fetchDuration = Date.now() - startFetch;
      
      // Enhanced logging for multiple sources
      if (isMultiSource) {
        // Count events by source
        const eventsBySource = {};
        events.forEach(event => {
          const sourceKey = event.source;
          eventsBySource[sourceKey] = (eventsBySource[sourceKey] || 0) + 1;
        });
        
        const sourceDetails = config.icsUrl.map((source, index) => {
          const eventCount = eventsBySource[index] || 0;
          const sourceName = source.sourceName ? ` (${source.sourceName})` : '';
          return `source ${index}${sourceName}: ${eventCount} events`;
        }).join(', ');
        
        console.log(`[API] Fetched ${events.length} events total in ${fetchDuration}ms - ${sourceDetails}`);
      } else {
        console.log(`[API] Fetched ${events.length} events in ${fetchDuration}ms`);
      }
    } else {
      console.log(`[API] No icsUrl configured, skipping calendar fetch...`);
      extraData = await fetchExtraDataForConfig(config, name);
      fetchDuration = Date.now() - startFetch;
      console.log(`[API] Skipped calendar fetch in ${fetchDuration}ms (no icsUrl)`);
    }
    
    if (config.extraDataUrl) {
      const dataKeys = Array.isArray(extraData) 
        ? `array with ${extraData.length} sources`
        : Object.keys(extraData).join(', ') || 'none';
      console.log(`[API] Extra data: ${dataKeys}`);
    }

    // Step 3: Render template
    console.log(`[API] Rendering template "${config.template}"...`);
    const startRender = Date.now();
    const html = await renderTemplate(config.template, {
      events,
      config,
      extraData
    });
    const renderDuration = Date.now() - startRender;
    console.log(`[API] Template rendered: ${html.length} characters in ${renderDuration}ms`);

    // Step 4: Generate image
    console.log(`[API] Generating image with Puppeteer...`);
    const startImage = Date.now();
    const result = await generateImage(html, {
      width: config.width,
      height: config.height,
      imageType: config.imageType,
      grayscale: config.grayscale,
      bitDepth: config.bitDepth,
      rotate: config.rotate,
      adjustments: config.adjustments
    });
    const imageDuration = Date.now() - startImage;
    console.log(`[API] Image generated: ${result.buffer.length} bytes in ${imageDuration}ms`);
    console.log(`[API] Total processing time: ${fetchDuration + renderDuration + imageDuration}ms`);

    // Step 5: Calculate CRC32 and check if it changed
    const newCRC32 = calculateCRC32(result.buffer);
    const oldMetadata = await getCacheMetadata(name);
    const crc32Changed = !oldMetadata || oldMetadata.crc32 !== newCRC32;
    const generationDuration = (Date.now() - generationStart) / 1000; // Convert to seconds

    // Step 6: Log generation event to timeline
    const generationSubtype = trigger === 'scheduled' ? EVENT_SUBTYPES.SCHEDULED :
                              trigger === 'boot' ? EVENT_SUBTYPES.BOOT :
                              EVENT_SUBTYPES.ON_DEMAND;
    
    await logGeneration(name, generationSubtype, {
      crc32: newCRC32,
      previousCrc32: oldMetadata ? oldMetadata.crc32 : null,
      changed: crc32Changed,
      duration: generationDuration,
      template: config.template,
      imageSize: result.buffer.length,
      eventCount: events.length
    }).catch(err => console.warn(`[Timeline] Failed to log generation: ${err.message}`));

    // Step 7: Save to cache if requested
    if (saveCache) {
      try {
        const generationDurationMs = Date.now() - generationStart;
        await saveCachedImage(name, result.buffer, result.contentType, config.imageType, {
          trigger,
          generationDuration: generationDurationMs
        });
      } catch (cacheError) {
        console.warn(`[API] Failed to save to cache: ${cacheError.message}`);
        // Don't fail the request if caching fails
      }
    }

    return result;

  } catch (error) {
    // Categorize errors for appropriate HTTP status codes
    const errorMessage = error.message || 'Unknown error';
    
    // Log error to timeline
    await logError(name, EVENT_SUBTYPES.GENERATION_ERROR, {
      error: errorMessage,
      trigger,
      duration: (Date.now() - generationStart) / 1000
    }).catch(err => console.warn(`[Timeline] Failed to log error: ${err.message}`));
    
    // Configuration errors (404 - Not Found)
    if (errorMessage.includes('Configuration file not found')) {
      console.error(`[API] Configuration ${name} not found: ${errorMessage}`);
      const notFoundError = new Error(`Configuration ${name} not found`);
      notFoundError.statusCode = 404;
      notFoundError.details = errorMessage;
      throw notFoundError;
    }

    // Invalid configuration (400 - Bad Request)
    if (errorMessage.includes('Invalid config') || 
        errorMessage.includes('Configuration validation failed')) {
      console.error(`[API] Invalid configuration ${name}: ${errorMessage}`);
      const badRequestError = new Error(`Invalid configuration ${name}`);
      badRequestError.statusCode = 400;
      badRequestError.details = errorMessage;
      throw badRequestError;
    }

    // ICS fetch errors (502 - Bad Gateway)
    if (errorMessage.includes('Failed to fetch ICS') || 
        errorMessage.includes('ICS fetch failed')) {
      console.error(`[API] Failed to fetch calendar data: ${errorMessage}`);
      const gatewayError = new Error('Failed to fetch calendar data from ICS URL');
      gatewayError.statusCode = 502;
      gatewayError.details = errorMessage;
      throw gatewayError;
    }

    // Template errors (500 - Internal Server Error)
    if (errorMessage.includes('Template not found') || 
        errorMessage.includes('Failed to render template')) {
      console.error(`[API] Template error: ${errorMessage}`);
      const templateError = new Error('Template rendering failed');
      templateError.statusCode = 500;
      templateError.details = errorMessage;
      throw templateError;
    }

    // Image generation errors (500 - Internal Server Error)
    if (errorMessage.includes('Image generation failed')) {
      console.error(`[API] Image generation error: ${errorMessage}`);
      const imageError = new Error('Image generation failed');
      imageError.statusCode = 500;
      imageError.details = errorMessage;
      throw imageError;
    }

    // Generic errors (500 - Internal Server Error)
    console.error(`[API] Unexpected error during image generation: ${errorMessage}`);
    console.error(error);
    const serverError = new Error('Internal server error during image generation');
    serverError.statusCode = 500;
    serverError.details = errorMessage;
    throw serverError;
  }
}

/**
 * Express middleware handler for /api/:name.:ext endpoint
 * Returns cached image if available, otherwise generates fresh
 * Validates that requested extension matches config imageType
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function handleImageRequest(req, res, next) {
  const requestStartTime = Date.now(); // Track request start time
  const nameParam = decodeURIComponent(req.params.name);
  const requestedExt = req.params.ext;
  
  // Validate name parameter
  let name;
  try {
    // Support both numeric (legacy) and string names
    // If it's a numeric string, parse it as a number for backward compatibility
    if (/^\d+$/.test(nameParam)) {
      name = parseInt(nameParam, 10);
    } else {
      name = nameParam;
    }
  } catch (error) {
    console.warn(`[API] Invalid name parameter: "${nameParam}"`);
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid name parameter',
      details: 'Name must be a valid config filename (without .json extension)'
    });
  }

  try {
    // Check if config has preGenerateInterval to determine caching behavior
    let config;
    try {
      config = await loadConfig(name);
    } catch (configError) {
      // Re-throw with appropriate status code
      const errorMessage = configError.message || 'Unknown error';
      if (errorMessage.includes('Configuration file not found')) {
        const notFoundError = new Error(`Configuration ${name} not found`);
        notFoundError.statusCode = 404;
        notFoundError.details = errorMessage;
        throw notFoundError;
      } else if (errorMessage.includes('Invalid config') || 
                 errorMessage.includes('Configuration validation failed')) {
        const badRequestError = new Error(`Invalid configuration ${name}`);
        badRequestError.statusCode = 400;
        badRequestError.details = errorMessage;
        throw badRequestError;
      }
      // Other config errors are 500
      configError.statusCode = 500;
      throw configError;
    }
    
    // Validate requested extension matches config imageType
    if (requestedExt !== config.imageType) {
      console.warn(`[API] Extension mismatch for config ${name}: requested .${requestedExt}, config has ${config.imageType}`);
      return res.status(404).json({
        error: 'Not Found',
        message: `Config ${name} serves ${config.imageType} images, not ${requestedExt}`,
        details: `Use /api/${encodeURIComponent(String(name))}.${config.imageType} instead`
      });
    }
    
    const useCache = !!config.preGenerateInterval;
    
    if (useCache) {
      // Try to load cached image first
      console.log(`[API] Checking cache for config ${name}...`);
      const cached = await loadCachedImage(name);
      
      if (cached) {
        // Serve cached image IMMEDIATELY
        res.set('Content-Type', cached.contentType);
        res.set('Content-Length', cached.buffer.length);
        res.set('X-Cache', 'HIT');
        res.set('X-Generated-At', cached.metadata.generatedAt);
        res.set('X-CRC32', cached.metadata.crc32 || calculateCRC32(cached.buffer));
        
        console.log(`[API] Serving cached image for config ${name} (${cached.buffer.length} bytes)`);
        res.send(cached.buffer);
        
        // Log download event to timeline AFTER response is sent (fire-and-forget)
        const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
        const userAgent = req.get('user-agent') || 'unknown';
        const duration = Date.now() - requestStartTime;
        logDownload(name, EVENT_SUBTYPES.IMAGE, {
          ip: clientIp,
          userAgent,
          cacheHit: true,
          imageSize: cached.buffer.length,
          crc32: cached.metadata.crc32,
          duration
        }).catch(err => console.warn(`[Timeline] Failed to log download: ${err.message}`));
        
        return;
      }
    } else {
      console.log(`[API] Config ${name} has no preGenerateInterval, generating fresh image...`);
    }
    
    // No cache available or no preGenerateInterval, generate fresh image
    console.log(`[API] Generating fresh image for config ${name}...`);
    const result = await generateCalendarImage(name, { 
      saveCache: useCache,
      trigger: useCache ? 'cache_miss' : 'on_demand'
    });

    // Calculate CRC32 for fresh image
    const crc32 = calculateCRC32(result.buffer);

    // Set response headers
    res.set('Content-Type', result.contentType);
    res.set('Content-Length', result.buffer.length);
    res.set('X-Cache', useCache ? 'MISS' : 'DISABLED');
    res.set('X-CRC32', crc32);
    
    console.log(`[API] Successfully returning fresh image for config ${name} (${result.buffer.length} bytes)`);
    
    // Send binary data IMMEDIATELY
    res.send(result.buffer);
    
    // Log download event to timeline AFTER response is sent (fire-and-forget)
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';
    const duration = Date.now() - requestStartTime;
    logDownload(name, EVENT_SUBTYPES.IMAGE, {
      ip: clientIp,
      userAgent,
      cacheHit: false,
      imageSize: result.buffer.length,
      crc32,
      duration
    }).catch(err => console.warn(`[Timeline] Failed to log download: ${err.message}`));

  } catch (error) {
    // Handle errors with appropriate HTTP status codes
    const statusCode = error.statusCode || 500;
    
    console.error(`[API] Request failed with status ${statusCode}: ${error.message}`);
    
    res.status(statusCode).json({
      error: getErrorName(statusCode),
      message: error.message,
      details: error.details || error.message
    });
  }
}

/**
 * Express middleware handler for /api/:name/fresh.:ext endpoint
 * Always generates a fresh image, bypassing cache
 * Validates that requested extension matches config imageType
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function handleFreshImageRequest(req, res, next) {
  const nameParam = decodeURIComponent(req.params.name);
  const requestedExt = req.params.ext;
  
  // Validate name parameter
  let name;
  try {
    // Support both numeric (legacy) and string names
    if (/^\d+$/.test(nameParam)) {
      name = parseInt(nameParam, 10);
    } else {
      name = nameParam;
    }
  } catch (error) {
    console.warn(`[API] Invalid name parameter: "${nameParam}"`);
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid name parameter',
      details: 'Name must be a valid config filename (without .json extension)'
    });
  }

  try {
    // Load config to validate extension
    let config;
    try {
      config = await loadConfig(name);
    } catch (configError) {
      // Re-throw with appropriate status code
      const errorMessage = configError.message || 'Unknown error';
      if (errorMessage.includes('Configuration file not found')) {
        const notFoundError = new Error(`Configuration ${name} not found`);
        notFoundError.statusCode = 404;
        notFoundError.details = errorMessage;
        throw notFoundError;
      } else if (errorMessage.includes('Invalid config') || 
                 errorMessage.includes('Configuration validation failed')) {
        const badRequestError = new Error(`Invalid configuration ${name}`);
        badRequestError.statusCode = 400;
        badRequestError.details = errorMessage;
        throw badRequestError;
      }
      // Other config errors are 500
      configError.statusCode = 500;
      throw configError;
    }
    
    // Validate requested extension matches config imageType
    if (requestedExt !== config.imageType) {
      console.warn(`[API] Extension mismatch for config ${name}: requested .${requestedExt}, config has ${config.imageType}`);
      return res.status(404).json({
        error: 'Not Found',
        message: `Config ${name} serves ${config.imageType} images, not ${requestedExt}`,
        details: `Use /api/${encodeURIComponent(String(name))}/fresh.${config.imageType} instead`
      });
    }
    
    console.log(`[API] Forcing fresh generation for config ${name}...`);
    
    // Generate fresh image and save to cache
    const result = await generateCalendarImage(name, { 
      saveCache: true,
      trigger: 'fresh'
    });

    // Calculate CRC32 for fresh image
    const crc32 = calculateCRC32(result.buffer);

    // Set response headers
    res.set('Content-Type', result.contentType);
    res.set('Content-Length', result.buffer.length);
    res.set('X-Cache', 'BYPASS');
    res.set('X-CRC32', crc32);
    
    console.log(`[API] Successfully returning fresh image for config ${name} (${result.buffer.length} bytes)`);
    
    // Send binary data
    res.send(result.buffer);

  } catch (error) {
    // Handle errors with appropriate HTTP status codes
    const statusCode = error.statusCode || 500;
    
    console.error(`[API] Fresh generation failed with status ${statusCode}: ${error.message}`);
    
    res.status(statusCode).json({
      error: getErrorName(statusCode),
      message: error.message,
      details: error.details || error.message
    });
  }
}

/**
 * Get standard error name for HTTP status code
 * @param {number} statusCode - HTTP status code
 * @returns {string} Error name
 */
function getErrorName(statusCode) {
  const errorNames = {
    400: 'Bad Request',
    404: 'Not Found',
    500: 'Internal Server Error',
    502: 'Bad Gateway'
  };
  return errorNames[statusCode] || 'Error';
}

/**
 * Express middleware handler for /api/:name.:ext.crc32 endpoint
 * Returns CRC32 checksum of the image (cached or generated)
 * Validates that requested extension matches config imageType
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function handleCRC32Request(req, res, next) {
  const requestStartTime = Date.now(); // Track request start time
  const nameParam = decodeURIComponent(req.params.name);
  const requestedExt = req.params.ext;
  
  // Validate name parameter
  let name;
  try {
    // Support both numeric (legacy) and string names
    if (/^\d+$/.test(nameParam)) {
      name = parseInt(nameParam, 10);
    } else {
      name = nameParam;
    }
  } catch (error) {
    console.warn(`[API] Invalid name parameter: "${nameParam}"`);
    return res.status(400).send('Invalid name parameter');
  }

  try {
    // Load config to validate extension
    const config = await loadConfig(name);
    
    // Validate requested extension matches config imageType
    if (requestedExt !== config.imageType) {
      console.warn(`[API] Extension mismatch for config ${name}: requested .${requestedExt}, config has ${config.imageType}`);
      return res.status(404).send(`Config ${name} serves ${config.imageType} images, not ${requestedExt}`);
    }
    
    // Try to load cached metadata first
    console.log(`[API] Checking CRC32 for config ${name}...`);
    const metadata = await getCacheMetadata(name);
    
    if (metadata && metadata.crc32) {
      // Return cached CRC32 IMMEDIATELY (don't wait for logging)
      console.log(`[API] Returning cached CRC32 for config ${name}: ${metadata.crc32}`);
      res.type('text/plain').send(metadata.crc32);
      
      // Log CRC32 download to timeline AFTER response is sent (fire-and-forget)
      const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('user-agent') || 'unknown';
      const duration = Date.now() - requestStartTime;
      logDownload(name, EVENT_SUBTYPES.CRC32, {
        ip: clientIp,
        userAgent,
        crc32: metadata.crc32,
        cacheHit: true,
        duration
      }).catch(err => console.warn(`[Timeline] Failed to log CRC32 download: ${err.message}`));
      
      return;
    }
    
    // No cache or no CRC32 in metadata, generate fresh image
    console.log(`[API] No cached CRC32 for config ${name}, generating fresh image...`);
    const result = await generateCalendarImage(name, { 
      saveCache: true,
      trigger: 'crc32_check'
    });
    
    // Calculate CRC32
    const crc32 = calculateCRC32(result.buffer);
    
    // Return CRC32 IMMEDIATELY
    console.log(`[API] Returning fresh CRC32 for config ${name}: ${crc32}`);
    res.type('text/plain').send(crc32);
    
    // Log CRC32 download to timeline AFTER response is sent (fire-and-forget)
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';
    const duration = Date.now() - requestStartTime;
    logDownload(name, EVENT_SUBTYPES.CRC32, {
      ip: clientIp,
      userAgent,
      crc32,
      cacheHit: false,
      duration
    }).catch(err => console.warn(`[Timeline] Failed to log CRC32 download: ${err.message}`));

  } catch (error) {
    // Handle errors with appropriate HTTP status codes
    const statusCode = error.statusCode || 500;
    
    console.error(`[API] CRC32 request failed with status ${statusCode}: ${error.message}`);
    
    res.status(statusCode).send(error.message);
  }
}

module.exports = {
  generateCalendarImage,
  handleImageRequest,
  handleFreshImageRequest,
  handleCRC32Request
};
