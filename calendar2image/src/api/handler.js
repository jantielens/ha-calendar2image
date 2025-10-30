const { loadConfig } = require('../config');
const { getCalendarEvents } = require('../calendar');
const { renderTemplate } = require('../templates');
const { generateImage } = require('../image');
const { loadCachedImage, saveCachedImage, getCacheMetadata } = require('../cache');
const { calculateCRC32 } = require('../utils/crc32');

/**
 * Main API handler for generating calendar images
 * Orchestrates the entire pipeline: config -> fetch -> render -> generate
 * 
 * @param {number} index - Configuration index (0, 1, 2, etc.)
 * @param {Object} options - Generation options
 * @param {boolean} options.saveCache - Whether to save the generated image to cache
 * @returns {Promise<Object>} Object with buffer and contentType
 * @throws {Error} With appropriate error details for HTTP response handling
 */
async function generateCalendarImage(index, options = {}) {
  const { saveCache = false } = options;
  
  console.log(`[API] Starting image generation for config index ${index}`);
  
  try {
    // Step 1: Load configuration
    console.log(`[API] Loading configuration ${index}...`);
    const config = await loadConfig(index);
    console.log(`[API] Configuration loaded: template="${config.template}", icsUrl="${config.icsUrl}"`);
    console.log(`[API] Image settings: ${config.width}x${config.height}, ${config.imageType}, grayscale=${config.grayscale}, bitDepth=${config.bitDepth}, rotate=${config.rotate}°`);

    // Step 2: Fetch calendar events
    console.log(`[API] Fetching calendar events from ICS URL...`);
    const startFetch = Date.now();
    const events = await getCalendarEvents(config.icsUrl, {
      expandRecurringFrom: config.expandRecurringFrom,
      expandRecurringTo: config.expandRecurringTo,
      timezone: config.timezone
    });
    const fetchDuration = Date.now() - startFetch;
    console.log(`[API] Fetched ${events.length} events in ${fetchDuration}ms`);

    // Step 3: Render template
    console.log(`[API] Rendering template "${config.template}"...`);
    const startRender = Date.now();
    const html = await renderTemplate(config.template, {
      events,
      config
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
      rotate: config.rotate
    });
    const imageDuration = Date.now() - startImage;
    console.log(`[API] Image generated: ${result.buffer.length} bytes in ${imageDuration}ms`);
    console.log(`[API] Total processing time: ${fetchDuration + renderDuration + imageDuration}ms`);

    // Step 5: Save to cache if requested
    if (saveCache) {
      try {
        await saveCachedImage(index, result.buffer, result.contentType, config.imageType);
      } catch (cacheError) {
        console.warn(`[API] Failed to save to cache: ${cacheError.message}`);
        // Don't fail the request if caching fails
      }
    }

    return result;

  } catch (error) {
    // Categorize errors for appropriate HTTP status codes
    const errorMessage = error.message || 'Unknown error';
    
    // Configuration errors (404 - Not Found)
    if (errorMessage.includes('Configuration file not found')) {
      console.error(`[API] Configuration ${index} not found: ${errorMessage}`);
      const notFoundError = new Error(`Configuration ${index} not found`);
      notFoundError.statusCode = 404;
      notFoundError.details = errorMessage;
      throw notFoundError;
    }

    // Invalid configuration (400 - Bad Request)
    if (errorMessage.includes('Invalid config index') || 
        errorMessage.includes('Configuration validation failed')) {
      console.error(`[API] Invalid configuration ${index}: ${errorMessage}`);
      const badRequestError = new Error(`Invalid configuration ${index}`);
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
 * Express middleware handler for /api/:index.:ext endpoint
 * Returns cached image if available, otherwise generates fresh
 * Validates that requested extension matches config imageType
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function handleImageRequest(req, res, next) {
  const indexParam = req.params.index;
  const requestedExt = req.params.ext;
  
  // Validate index parameter
  const index = parseInt(indexParam, 10);
  
  if (isNaN(index) || index < 0 || indexParam !== index.toString()) {
    console.warn(`[API] Invalid index parameter: "${indexParam}"`);
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid index parameter',
      details: 'Index must be a non-negative integer (0, 1, 2, etc.)'
    });
  }

  try {
    // Check if config has preGenerateInterval to determine caching behavior
    const config = await loadConfig(index);
    
    // Validate requested extension matches config imageType
    if (requestedExt !== config.imageType) {
      console.warn(`[API] Extension mismatch for config ${index}: requested .${requestedExt}, config has ${config.imageType}`);
      return res.status(404).json({
        error: 'Not Found',
        message: `Config ${index} serves ${config.imageType} images, not ${requestedExt}`,
        details: `Use /api/${index}.${config.imageType} instead`
      });
    }
    
    const useCache = !!config.preGenerateInterval;
    
    if (useCache) {
      // Try to load cached image first
      console.log(`[API] Checking cache for config ${index}...`);
      const cached = await loadCachedImage(index);
      
      if (cached) {
        // Serve cached image
        res.set('Content-Type', cached.contentType);
        res.set('Content-Length', cached.buffer.length);
        res.set('X-Cache', 'HIT');
        res.set('X-Generated-At', cached.metadata.generatedAt);
        res.set('X-CRC32', cached.metadata.crc32 || calculateCRC32(cached.buffer));
        
        console.log(`[API] Serving cached image for config ${index} (${cached.buffer.length} bytes)`);
        return res.send(cached.buffer);
      }
    } else {
      console.log(`[API] Config ${index} has no preGenerateInterval, generating fresh image...`);
    }
    
    // No cache available or no preGenerateInterval, generate fresh image
    console.log(`[API] Generating fresh image for config ${index}...`);
    const result = await generateCalendarImage(index, { saveCache: useCache });

    // Calculate CRC32 for fresh image
    const crc32 = calculateCRC32(result.buffer);

    // Set response headers
    res.set('Content-Type', result.contentType);
    res.set('Content-Length', result.buffer.length);
    res.set('X-Cache', useCache ? 'MISS' : 'DISABLED');
    res.set('X-CRC32', crc32);
    
    console.log(`[API] Successfully returning fresh image for config ${index} (${result.buffer.length} bytes)`);
    
    // Send binary data
    res.send(result.buffer);

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
 * Express middleware handler for /api/:index/fresh.:ext endpoint
 * Always generates a fresh image, bypassing cache
 * Validates that requested extension matches config imageType
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function handleFreshImageRequest(req, res, next) {
  const indexParam = req.params.index;
  const requestedExt = req.params.ext;
  
  // Validate index parameter
  const index = parseInt(indexParam, 10);
  
  if (isNaN(index) || index < 0 || indexParam !== index.toString()) {
    console.warn(`[API] Invalid index parameter: "${indexParam}"`);
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid index parameter',
      details: 'Index must be a non-negative integer (0, 1, 2, etc.)'
    });
  }

  try {
    // Load config to validate extension
    const config = await loadConfig(index);
    
    // Validate requested extension matches config imageType
    if (requestedExt !== config.imageType) {
      console.warn(`[API] Extension mismatch for config ${index}: requested .${requestedExt}, config has ${config.imageType}`);
      return res.status(404).json({
        error: 'Not Found',
        message: `Config ${index} serves ${config.imageType} images, not ${requestedExt}`,
        details: `Use /api/${index}/fresh.${config.imageType} instead`
      });
    }
    
    console.log(`[API] Forcing fresh generation for config ${index}...`);
    
    // Generate fresh image and save to cache
    const result = await generateCalendarImage(index, { saveCache: true });

    // Calculate CRC32 for fresh image
    const crc32 = calculateCRC32(result.buffer);

    // Set response headers
    res.set('Content-Type', result.contentType);
    res.set('Content-Length', result.buffer.length);
    res.set('X-Cache', 'BYPASS');
    res.set('X-CRC32', crc32);
    
    console.log(`[API] Successfully returning fresh image for config ${index} (${result.buffer.length} bytes)`);
    
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
 * Express middleware handler for /api/:index.:ext.crc32 endpoint
 * Returns CRC32 checksum of the image (cached or generated)
 * Validates that requested extension matches config imageType
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function handleCRC32Request(req, res, next) {
  const indexParam = req.params.index;
  const requestedExt = req.params.ext;
  
  // Validate index parameter
  const index = parseInt(indexParam, 10);
  
  if (isNaN(index) || index < 0 || indexParam !== index.toString()) {
    console.warn(`[API] Invalid index parameter: "${indexParam}"`);
    return res.status(400).send('Invalid index parameter');
  }

  try {
    // Load config to validate extension
    const config = await loadConfig(index);
    
    // Validate requested extension matches config imageType
    if (requestedExt !== config.imageType) {
      console.warn(`[API] Extension mismatch for config ${index}: requested .${requestedExt}, config has ${config.imageType}`);
      return res.status(404).send(`Config ${index} serves ${config.imageType} images, not ${requestedExt}`);
    }
    
    // Try to load cached metadata first
    console.log(`[API] Checking CRC32 for config ${index}...`);
    const metadata = await getCacheMetadata(index);
    
    if (metadata && metadata.crc32) {
      // Return cached CRC32
      console.log(`[API] Returning cached CRC32 for config ${index}: ${metadata.crc32}`);
      return res.type('text/plain').send(metadata.crc32);
    }
    
    // No cache or no CRC32 in metadata, generate fresh image
    console.log(`[API] No cached CRC32 for config ${index}, generating fresh image...`);
    const result = await generateCalendarImage(index, { saveCache: true });
    
    // Calculate CRC32
    const crc32 = calculateCRC32(result.buffer);
    
    console.log(`[API] Returning fresh CRC32 for config ${index}: ${crc32}`);
    res.type('text/plain').send(crc32);

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
