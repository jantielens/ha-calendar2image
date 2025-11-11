const sharp = require('sharp');

/**
 * Generate fixed palette for bit depth quantization
 * @param {number} bitDepth - Bit depth (1-8)
 * @returns {Array<number>} Array of palette values
 */
function generatePalette(bitDepth) {
  const levels = Math.pow(2, bitDepth);
  const step = 255 / (levels - 1);
  const palette = [];
  for (let i = 0; i < levels; i++) {
    palette.push(Math.round(i * step));
  }
  return palette;
}

/**
 * Find nearest palette value
 * @param {number} value - Input value (0-255)
 * @param {Array<number>} palette - Palette array
 * @returns {number} Nearest palette value
 */
function nearestPaletteValue(value, palette) {
  let nearest = palette[0];
  let minDiff = Math.abs(value - nearest);
  
  for (let i = 1; i < palette.length; i++) {
    const diff = Math.abs(value - palette[i]);
    if (diff < minDiff) {
      minDiff = diff;
      nearest = palette[i];
    }
  }
  
  return nearest;
}

/**
 * Apply Floyd-Steinberg dithering algorithm
 * @param {Buffer} data - Raw pixel data
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {number} channels - Number of channels (1 for grayscale, 3+ for color)
 * @param {Array<number>} palette - Palette values for quantization
 * @returns {Buffer} Dithered pixel data
 */
function applyFloydSteinbergDither(data, width, height, channels, palette) {
  // Create a copy to avoid modifying original
  const output = Buffer.from(data);
  
  // Floyd-Steinberg error diffusion pattern:
  //     X   7/16
  // 3/16 5/16 1/16
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      for (let c = 0; c < Math.min(channels, 3); c++) { // Process RGB/gray channels, skip alpha
        const idx = (y * width + x) * channels + c;
        const oldValue = output[idx];
        const newValue = nearestPaletteValue(oldValue, palette);
        const error = oldValue - newValue;
        
        output[idx] = newValue;
        
        // Distribute error to neighboring pixels
        if (x + 1 < width) {
          const rightIdx = (y * width + (x + 1)) * channels + c;
          output[rightIdx] = Math.max(0, Math.min(255, output[rightIdx] + error * 7 / 16));
        }
        
        if (y + 1 < height) {
          if (x > 0) {
            const bottomLeftIdx = ((y + 1) * width + (x - 1)) * channels + c;
            output[bottomLeftIdx] = Math.max(0, Math.min(255, output[bottomLeftIdx] + error * 3 / 16));
          }
          
          const bottomIdx = ((y + 1) * width + x) * channels + c;
          output[bottomIdx] = Math.max(0, Math.min(255, output[bottomIdx] + error * 5 / 16));
          
          if (x + 1 < width) {
            const bottomRightIdx = ((y + 1) * width + (x + 1)) * channels + c;
            output[bottomRightIdx] = Math.max(0, Math.min(255, output[bottomRightIdx] + error * 1 / 16));
          }
        }
      }
    }
  }
  
  return output;
}

/**
 * Apply Atkinson dithering algorithm (lighter pattern, better for e-ink)
 * @param {Buffer} data - Raw pixel data
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {number} channels - Number of channels (1 for grayscale, 3+ for color)
 * @param {Array<number>} palette - Palette values for quantization
 * @returns {Buffer} Dithered pixel data
 */
function applyAtkinsonDither(data, width, height, channels, palette) {
  // Create a copy to avoid modifying original
  const output = Buffer.from(data);
  
  // Atkinson error diffusion pattern (1/8 each):
  //     X   1   1
  // 1   1   1
  //     1
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      for (let c = 0; c < Math.min(channels, 3); c++) { // Process RGB/gray channels, skip alpha
        const idx = (y * width + x) * channels + c;
        const oldValue = output[idx];
        const newValue = nearestPaletteValue(oldValue, palette);
        const error = oldValue - newValue;
        
        output[idx] = newValue;
        
        // Distribute 1/8 error to 6 neighbors (Atkinson distributes only 3/4 of error)
        const errorPortion = error / 8;
        
        if (x + 1 < width) {
          const idx1 = (y * width + (x + 1)) * channels + c;
          output[idx1] = Math.max(0, Math.min(255, output[idx1] + errorPortion));
        }
        
        if (x + 2 < width) {
          const idx2 = (y * width + (x + 2)) * channels + c;
          output[idx2] = Math.max(0, Math.min(255, output[idx2] + errorPortion));
        }
        
        if (y + 1 < height) {
          if (x > 0) {
            const idxBL = ((y + 1) * width + (x - 1)) * channels + c;
            output[idxBL] = Math.max(0, Math.min(255, output[idxBL] + errorPortion));
          }
          
          const idxB = ((y + 1) * width + x) * channels + c;
          output[idxB] = Math.max(0, Math.min(255, output[idxB] + errorPortion));
          
          if (x + 1 < width) {
            const idxBR = ((y + 1) * width + (x + 1)) * channels + c;
            output[idxBR] = Math.max(0, Math.min(255, output[idxBR] + errorPortion));
          }
        }
        
        if (y + 2 < height) {
          const idxBB = ((y + 2) * width + x) * channels + c;
          output[idxBB] = Math.max(0, Math.min(255, output[idxBB] + errorPortion));
        }
      }
    }
  }
  
  return output;
}

/**
 * Create a gamma correction lookup table (LUT)
 * @param {number} gamma - Gamma value (0.1-8.0)
 * @returns {Uint8Array} 256-element lookup table
 */
function createGammaLUT(gamma) {
  const lut = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    lut[i] = Math.round(255 * Math.pow(i / 255, gamma));
  }
  return lut;
}

/**
 * Apply lookup table to image data
 * @param {Buffer} data - Raw pixel data
 * @param {Uint8Array} lut - Lookup table
 * @param {number} channels - Number of channels (3 or 4)
 * @returns {Buffer} Modified pixel data
 */
function applyLUT(data, lut, channels) {
  const result = Buffer.from(data);
  for (let i = 0; i < result.length; i++) {
    // Skip alpha channel if present (every 4th byte when channels=4)
    if (channels === 4 && (i + 1) % 4 === 0) continue;
    result[i] = lut[result[i]];
  }
  return result;
}

/**
 * Apply Paint.NET-style levels adjustment
 * @param {Object} pipeline - Sharp pipeline instance
 * @param {Object} config - Levels configuration
 * @param {number} config.inputBlack - Input black point (0-255)
 * @param {number} config.inputWhite - Input white point (0-255)
 * @param {number} config.gamma - Gamma correction (0.1-8.0)
 * @param {number} config.outputBlack - Output black point (0-255)
 * @param {number} config.outputWhite - Output white point (0-255)
 * @returns {Promise<Object>} Modified Sharp pipeline
 */
async function applyLevelsAdjustment(pipeline, config) {
  const {
    inputBlack = 0,
    inputWhite = 255,
    gamma = 1.0,
    outputBlack = 0,
    outputWhite = 255
  } = config;

  // If no adjustments needed, return pipeline unchanged
  if (inputBlack === 0 && inputWhite === 255 && gamma === 1.0 && outputBlack === 0 && outputWhite === 255) {
    return pipeline;
  }

  // Get raw pixel data
  const { data, info } = await pipeline.raw().toBuffer({ resolveWithObject: true });
  let result = Buffer.from(data);

  // Step 1: Map input range [inputBlack, inputWhite] to [0, 255]
  if (inputBlack !== 0 || inputWhite !== 255) {
    const inputRange = inputWhite - inputBlack;
    if (Math.abs(inputRange) < 0.01) {
      console.warn('Levels adjustment: inputBlack and inputWhite are too close, skipping input mapping');
    } else {
      for (let i = 0; i < result.length; i++) {
        // Skip alpha channel
        if (info.channels === 4 && (i + 1) % 4 === 0) continue;
        
        const normalized = ((result[i] - inputBlack) / inputRange) * 255;
        result[i] = Math.max(0, Math.min(255, Math.round(normalized)));
      }
    }
  }

  // Step 2: Apply gamma correction using LUT
  // This correctly implements value^gamma for any gamma value (0.1 to 8.0)
  if (gamma !== 1.0) {
    const lut = createGammaLUT(gamma);
    result = applyLUT(result, lut, info.channels);
  }

  // Step 3: Map output range from [0, 255] to [outputBlack, outputWhite]
  if (outputBlack !== 0 || outputWhite !== 255) {
    const outputRange = outputWhite - outputBlack;
    for (let i = 0; i < result.length; i++) {
      // Skip alpha channel
      if (info.channels === 4 && (i + 1) % 4 === 0) continue;
      
      const mapped = outputBlack + (result[i] / 255) * outputRange;
      result[i] = Math.max(0, Math.min(255, Math.round(mapped)));
    }
  }

  // Create new pipeline from processed data
  return sharp(result, {
    raw: {
      width: info.width,
      height: info.height,
      channels: info.channels
    }
  });
}

/**
 * Apply image adjustments using Sharp operations
 * @param {Object} pipeline - Sharp pipeline instance
 * @param {Object} adjustments - Adjustment parameters
 * @param {boolean} isGrayscale - Whether image is grayscale
 * @returns {Promise<Object>} Modified Sharp pipeline
 */
async function applyAdjustments(pipeline, adjustments, isGrayscale) {
  if (!adjustments || Object.keys(adjustments).length === 0) {
    return pipeline;
  }
  
  // 1. Normalize (histogram-based contrast enhancement)
  if (adjustments.normalize) {
    pipeline = pipeline.normalize();
  }
  
  // 2. Levels adjustment (replaces old gamma, handles backward compatibility)
  // Priority: levels.gamma > standalone gamma
  if (adjustments.levels || adjustments.gamma !== undefined) {
    const levelsConfig = adjustments.levels ? { ...adjustments.levels } : {};
    
    // If standalone gamma exists and levels.gamma doesn't, use standalone gamma
    if (adjustments.gamma !== undefined && levelsConfig.gamma === undefined) {
      levelsConfig.gamma = adjustments.gamma;
    }
    
    // Apply levels adjustment (now async, returns new pipeline)
    pipeline = await applyLevelsAdjustment(pipeline, levelsConfig);
  }
  
  // 3. Brightness (via modulate)
  // Convert -100 to +100 range to 0.0 to 2.0 multiplier
  // -100 = 0.0 (black), 0 = 1.0 (no change), +100 = 2.0 (double brightness)
  if (adjustments.brightness !== undefined) {
    const brightnessMultiplier = 1.0 + (adjustments.brightness / 100);
    pipeline = pipeline.modulate({ brightness: brightnessMultiplier });
  }
  
  // 4. Contrast (via linear formula: a * input + b)
  // Convert -100 to +100 range to linear formula
  // contrast: -100 = flatten (a=0.5), 0 = no change (a=1.0), +100 = enhance (a=1.5)
  if (adjustments.contrast !== undefined) {
    const contrastMultiplier = 1.0 + (adjustments.contrast / 100) * 0.5;
    const contrastOffset = 127.5 * (1 - contrastMultiplier);
    pipeline = pipeline.linear(contrastMultiplier, contrastOffset);
  }
  
  // 5. Saturation (skip if grayscale)
  // Convert -100 to +100 range to 0.0 to 2.0 multiplier
  if (!isGrayscale && adjustments.saturation !== undefined) {
    const saturationMultiplier = 1.0 + (adjustments.saturation / 100);
    pipeline = pipeline.modulate({ saturation: saturationMultiplier });
  }
  
  // 6. Hue rotation (skip if grayscale)
  // Direct degrees value (-180 to +180)
  if (!isGrayscale && adjustments.hue !== undefined) {
    pipeline = pipeline.modulate({ hue: adjustments.hue });
  }
  
  // 7. Sharpen
  if (adjustments.sharpen) {
    pipeline = pipeline.sharpen();
  }
  
  // 8. Invert
  if (adjustments.invert) {
    pipeline = pipeline.negate();
  }
  
  // 9. Threshold (for 1-bit displays)
  if (adjustments.threshold !== undefined) {
    pipeline = pipeline.threshold(adjustments.threshold);
  }
  
  return pipeline;
}

/**
 * Convert image buffer to different formats and apply transformations
 * 
 * @param {Buffer} imageBuffer - Input image buffer (PNG from Puppeteer)
 * @param {Object} options - Conversion options
 * @param {string} options.imageType - Output format ('png', 'jpg')
 * @param {boolean} options.grayscale - Convert to grayscale
 * @param {number} options.bitDepth - Bit depth (1-32)
 * @param {number} options.rotate - Rotation angle in degrees (0, 90, 180, 270)
 * @param {Object} options.adjustments - Image adjustments for display optimization
 * @returns {Promise<Buffer>} Converted image buffer
 */
async function convertImage(imageBuffer, options = {}) {
  const {
    imageType = 'png',
    grayscale = false,
    bitDepth = 8,
    rotate = 0,
    adjustments = undefined
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

    // Apply adjustments (after rotation, before quantization)
    if (adjustments) {
      pipeline = await applyAdjustments(pipeline, adjustments, grayscale);
    }

    // Determine if dithering is requested
    const useDithering = adjustments && adjustments.dither && bitDepth <= 8;
    const ditheringMethod = typeof adjustments?.dither === 'string' 
      ? adjustments.dither 
      : (adjustments?.dither === true ? 'floyd-steinberg' : null);

    // Pre-quantize to fixed palette for e-ink displays (bitDepth <= 8)
    if (bitDepth <= 8) {
      const palette = generatePalette(bitDepth);
      
      // Get raw pixel data
      const { data, info } = await pipeline.raw().toBuffer({ resolveWithObject: true });
      
      let processedData;
      
      if (useDithering) {
        // Apply dithering algorithm
        if (ditheringMethod === 'atkinson') {
          processedData = applyAtkinsonDither(data, info.width, info.height, info.channels, palette);
        } else {
          // Default to Floyd-Steinberg
          processedData = applyFloydSteinbergDither(data, info.width, info.height, info.channels, palette);
        }
      } else {
        // Standard quantization without dithering (existing behavior)
        processedData = Buffer.from(data);
        const step = 255 / (Math.pow(2, bitDepth) - 1);
        
        for (let i = 0; i < processedData.length; i++) {
          const value = processedData[i];
          const level = Math.round(value / step);
          processedData[i] = Math.round(level * step);
        }
      }
      
      // Create new pipeline from quantized/dithered data
      pipeline = sharp(processedData, {
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
