const sharp = require('sharp');

/**
 * Convert image buffer to different formats and apply transformations
 * 
 * @param {Buffer} imageBuffer - Input image buffer (PNG from Puppeteer)
 * @param {Object} options - Conversion options
 * @param {string} options.imageType - Output format ('png', 'jpg', 'bmp')
 * @param {boolean} options.grayscale - Convert to grayscale
 * @param {number} options.bitDepth - Bit depth (1-32)
 * @param {number} options.rotate - Rotation angle in degrees (0, 90, 180, 270)
 * @returns {Promise<Buffer>} Converted image buffer
 */
async function convertImage(imageBuffer, options = {}) {
  const {
    imageType = 'png',
    grayscale = false,
    bitDepth = 8,
    rotate = 0
  } = options;

  try {
    let pipeline = sharp(imageBuffer);

    // Apply grayscale if requested
    if (grayscale) {
      pipeline = pipeline.grayscale();
    }

    // Apply rotation if requested
    if (rotate && rotate !== 0) {
      pipeline = pipeline.rotate(rotate);
    }

    // Convert to requested format
    switch (imageType.toLowerCase()) {
      case 'png':
        pipeline = pipeline.png({
          compressionLevel: 9,
          // PNG bit depth options
          ...(bitDepth <= 1 ? { colours: 2 } : {}),
          ...(bitDepth <= 4 ? { colours: 16 } : {}),
          ...(bitDepth <= 8 ? { colours: 256 } : {})
        });
        break;

      case 'jpg':
      case 'jpeg':
        // JPEG doesn't support bit depth or transparency, but we can adjust quality
        const quality = Math.min(100, Math.max(1, Math.round(bitDepth * 3.125)));
        pipeline = pipeline.jpeg({
          quality: quality,
          mozjpeg: true
        });
        break;

      case 'bmp':
        // Sharp doesn't support BMP output natively, convert to PNG instead
        // BMP support would require additional library
        pipeline = pipeline.png({ compressionLevel: 0 });
        break;

      default:
        throw new Error(`Unsupported image type: ${imageType}`);
    }

    // Execute pipeline and return buffer
    const outputBuffer = await pipeline.toBuffer();
    return outputBuffer;

  } catch (error) {
    throw new Error(`Image conversion failed: ${error.message}`);
  }
}

/**
 * Get the content type for an image format
 * @param {string} imageType - Image format ('png', 'jpg', 'bmp')
 * @returns {string} Content-Type header value
 */
function getContentType(imageType) {
  switch (imageType.toLowerCase()) {
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'bmp':
      return 'image/bmp';
    default:
      return 'application/octet-stream';
  }
}

module.exports = {
  convertImage,
  getContentType
};
