const { createPage } = require('./browser');
const { convertImage, getContentType } = require('./converter');

/**
 * Generate an image from HTML content
 * 
 * NOTE: Current implementation creates and closes a page for each request.
 * Future optimization: Consider page pooling if concurrent requests become common
 * - Could maintain a pool of pre-created pages for faster response times
 * - Trade-off: More memory usage vs faster first-byte-time
 * 
 * @param {string} html - HTML content to render
 * @param {Object} options - Image generation options
 * @param {number} options.width - Image width in pixels (default: 800)
 * @param {number} options.height - Image height in pixels (default: 600)
 * @param {string} options.imageType - Output format ('png', 'jpg', 'bmp')
 * @param {boolean} options.grayscale - Convert to grayscale
 * @param {number} options.bitDepth - Bit depth (1-32)
 * @param {number} options.rotate - Rotation angle in degrees (0, 90, 180, 270)
 * @returns {Promise<Object>} Object with buffer and contentType
 */
async function generateImage(html, options = {}) {
  const {
    width = 800,
    height = 600,
    imageType = 'png',
    grayscale = false,
    bitDepth = 8,
    rotate = 0
  } = options;

  let page = null;

  try {
    // Create a new page
    page = await createPage();

    // Set viewport size
    await page.setViewport({
      width: Math.floor(width),
      height: Math.floor(height),
      deviceScaleFactor: 1
    });

    // Load HTML content
    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Take screenshot
    const screenshotBuffer = await page.screenshot({
      type: 'png', // Always screenshot as PNG first
      fullPage: false,
      clip: {
        x: 0,
        y: 0,
        width: Math.floor(width),
        height: Math.floor(height)
      }
    });

    // Convert to desired format
    const finalBuffer = await convertImage(screenshotBuffer, {
      imageType,
      grayscale,
      bitDepth,
      rotate
    });

    return {
      buffer: finalBuffer,
      contentType: getContentType(imageType),
      imageType: imageType
    };

  } catch (error) {
    throw new Error(`Image generation failed: ${error.message}`);
  } finally {
    // Always close the page to free resources
    if (page) {
      try {
        await page.close();
      } catch (closeError) {
        console.error('Error closing page:', closeError);
      }
    }
  }
}

module.exports = {
  generateImage
};
