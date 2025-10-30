const { loadConfig } = require('../config');
const { getCalendarEvents } = require('../calendar');
const { renderTemplate } = require('../templates');
const { generateImage } = require('../image');

/**
 * Main API handler for generating calendar images
 * Orchestrates the entire pipeline: config -> fetch -> render -> generate
 * 
 * @param {number} index - Configuration index (0, 1, 2, etc.)
 * @returns {Promise<Object>} Object with buffer and contentType
 * @throws {Error} With appropriate error details for HTTP response handling
 */
async function generateCalendarImage(index) {
  console.log(`[API] Starting image generation for config index ${index}`);
  
  try {
    // Step 1: Load configuration
    console.log(`[API] Loading configuration ${index}...`);
    const config = await loadConfig(index);
    console.log(`[API] Configuration loaded: template="${config.template}", icsUrl="${config.icsUrl}"`);
    console.log(`[API] Image settings: ${config.width}x${config.height}, ${config.imageType}, grayscale=${config.grayscale}, bitDepth=${config.bitDepth}`);

    // Step 2: Fetch calendar events
    console.log(`[API] Fetching calendar events from ICS URL...`);
    const startFetch = Date.now();
    const events = await getCalendarEvents(config.icsUrl, {
      expandRecurringFrom: config.expandRecurringFrom,
      expandRecurringTo: config.expandRecurringTo
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
      bitDepth: config.bitDepth
    });
    const imageDuration = Date.now() - startImage;
    console.log(`[API] Image generated: ${result.buffer.length} bytes in ${imageDuration}ms`);
    console.log(`[API] Total processing time: ${fetchDuration + renderDuration + imageDuration}ms`);

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
 * Express middleware handler for /api/:index endpoint
 * Validates input, calls generateCalendarImage, and handles response
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function handleImageRequest(req, res, next) {
  const indexParam = req.params.index;
  
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
    // Generate the image
    const result = await generateCalendarImage(index);

    // Set response headers
    res.set('Content-Type', result.contentType);
    res.set('Content-Length', result.buffer.length);
    
    // TODO: Future optimization - Add cache control headers
    // res.set('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
    
    console.log(`[API] Successfully returning image for config ${index} (${result.buffer.length} bytes)`);
    
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

module.exports = {
  generateCalendarImage,
  handleImageRequest
};
