const sharp = require('sharp');

/**
 * Convert image buffer to different formats and apply transformations
 * 
 * @param {Buffer} imageBuffer - Input image buffer (PNG from Puppeteer)
 * @param {Object} options - Conversion options
 * @param {string} options.imageType - Output format ('png', 'jpg')
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

    // Pre-quantize to fixed palette for e-ink displays (bitDepth <= 8)
    if (bitDepth <= 8) {
      const levels = Math.pow(2, bitDepth);
      
      // Get raw pixel data
      const { data, info } = await pipeline.raw().toBuffer({ resolveWithObject: true });
      
      // Quantize each pixel to fixed palette
      // For grayscale: map to evenly-distributed levels (0, 17, 34, ..., 255 for 4-bit)
      // For color: map each RGB channel to fixed levels
      const step = 255 / (levels - 1);
      
      for (let i = 0; i < data.length; i++) {
        // Quantize to nearest fixed palette level
        const value = data[i];
        const level = Math.round(value / step);
        data[i] = Math.round(level * step);
      }
      
      // Create new pipeline from quantized data
      pipeline = sharp(data, {
        raw: {
          width: info.width,
          height: info.height,
          channels: info.channels
        }
      });
      
      // Re-apply grayscale if needed (in case raw buffer lost colorspace info)
      if (grayscale) {
        pipeline = pipeline.grayscale();
      }
    }

    // Convert to requested format
    switch (imageType.toLowerCase()) {
      case 'png':
        // Determine PNG options based on bit depth
        const pngOptions = {
          compressionLevel: 9
        };

        // Apply palette mode for bit depths <= 8
        if (bitDepth <= 1) {
          pngOptions.palette = true;
          pngOptions.colours = 2;
        } else if (bitDepth <= 4) {
          pngOptions.palette = true;
          pngOptions.colours = 16;
        } else if (bitDepth <= 8) {
          pngOptions.palette = true;
          pngOptions.colours = 256;
        }
        // For bitDepth > 8, use standard 8-bit per channel (no palette)

        pipeline = pipeline.png(pngOptions);
        break;

      case 'jpg':
      case 'jpeg':
        // JPEG doesn't support bit depth or transparency
        pipeline = pipeline.jpeg({
          quality: 90,
          mozjpeg: true
        });
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
 * @param {string} imageType - Image format ('png', 'jpg')
 * @returns {string} Content-Type header value
 */
function getContentType(imageType) {
  switch (imageType.toLowerCase()) {
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    default:
      return 'application/octet-stream';
  }
}

module.exports = {
  convertImage,
  getContentType
};
