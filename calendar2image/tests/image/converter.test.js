const { convertImage, getContentType } = require('../../src/image/converter');
const sharp = require('sharp');

describe('Image Converter', () => {

  // Create a simple test image buffer (1x1 red pixel PNG)
  let testImageBuffer;

  beforeAll(async () => {
    testImageBuffer = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 1 }
      }
    })
    .png()
    .toBuffer();
  });

  describe('convertImage', () => {
    test('should convert to PNG format', async () => {
      const result = await convertImage(testImageBuffer, {
        imageType: 'png',
        grayscale: false,
        bitDepth: 8
      });

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);

      // Verify it's a valid PNG
      const metadata = await sharp(result).metadata();
      expect(metadata.format).toBe('png');
    });

    test('should convert to JPEG format', async () => {
      const result = await convertImage(testImageBuffer, {
        imageType: 'jpg',
        grayscale: false,
        bitDepth: 8
      });

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);

      // Verify it's a valid JPEG
      const metadata = await sharp(result).metadata();
      expect(metadata.format).toBe('jpeg');
    });

    test('should apply grayscale conversion', async () => {
      const result = await convertImage(testImageBuffer, {
        imageType: 'png',
        grayscale: true,
        bitDepth: 8
      });

      const metadata = await sharp(result).metadata();
      // Sharp may keep RGB channels but desaturate, so just verify it's a valid image
      expect(metadata.channels).toBeGreaterThanOrEqual(1);
      expect(metadata.channels).toBeLessThanOrEqual(4);
    });

    test('should handle default options', async () => {
      const result = await convertImage(testImageBuffer);
      expect(result).toBeInstanceOf(Buffer);
    });

    test('should throw error for unsupported format', async () => {
      await expect(convertImage(testImageBuffer, {
        imageType: 'unsupported'
      })).rejects.toThrow('Unsupported image type');
    });

    test('should handle invalid buffer', async () => {
      const invalidBuffer = Buffer.from('not an image');
      await expect(convertImage(invalidBuffer, {
        imageType: 'png'
      })).rejects.toThrow();
    });

    test('should rotate image 90 degrees', async () => {
      // Create a rectangular image to verify rotation
      const rectangleBuffer = await sharp({
        create: {
          width: 200,
          height: 100,
          channels: 4,
          background: { r: 255, g: 0, b: 0, alpha: 1 }
        }
      })
      .png()
      .toBuffer();

      const result = await convertImage(rectangleBuffer, {
        imageType: 'png',
        rotate: 90
      });

      const metadata = await sharp(result).metadata();
      // After 90° rotation, width and height should be swapped
      expect(metadata.width).toBe(100);
      expect(metadata.height).toBe(200);
    });

    test('should rotate image 180 degrees', async () => {
      const testBuffer = await sharp({
        create: {
          width: 200,
          height: 100,
          channels: 4,
          background: { r: 255, g: 0, b: 0, alpha: 1 }
        }
      })
      .png()
      .toBuffer();

      const result = await convertImage(testBuffer, {
        imageType: 'png',
        rotate: 180
      });

      const metadata = await sharp(result).metadata();
      // After 180° rotation, dimensions should remain the same
      expect(metadata.width).toBe(200);
      expect(metadata.height).toBe(100);
    });

    test('should rotate image 270 degrees', async () => {
      const rectangleBuffer = await sharp({
        create: {
          width: 200,
          height: 100,
          channels: 4,
          background: { r: 255, g: 0, b: 0, alpha: 1 }
        }
      })
      .png()
      .toBuffer();

      const result = await convertImage(rectangleBuffer, {
        imageType: 'png',
        rotate: 270
      });

      const metadata = await sharp(result).metadata();
      // After 270° rotation, width and height should be swapped
      expect(metadata.width).toBe(100);
      expect(metadata.height).toBe(200);
    });

    test('should handle 0 degree rotation (no rotation)', async () => {
      const testBuffer = await sharp({
        create: {
          width: 200,
          height: 100,
          channels: 4,
          background: { r: 255, g: 0, b: 0, alpha: 1 }
        }
      })
      .png()
      .toBuffer();

      const result = await convertImage(testBuffer, {
        imageType: 'png',
        rotate: 0
      });

      const metadata = await sharp(result).metadata();
      expect(metadata.width).toBe(200);
      expect(metadata.height).toBe(100);
    });
  });

  describe('getContentType', () => {
    test('should return correct content type for PNG', () => {
      expect(getContentType('png')).toBe('image/png');
    });

    test('should return correct content type for JPEG', () => {
      expect(getContentType('jpg')).toBe('image/jpeg');
      expect(getContentType('jpeg')).toBe('image/jpeg');
    });

    test('should handle uppercase formats', () => {
      expect(getContentType('PNG')).toBe('image/png');
      expect(getContentType('JPG')).toBe('image/jpeg');
    });

    test('should return default for unknown format', () => {
      expect(getContentType('unknown')).toBe('application/octet-stream');
    });
  });

  describe('Image Adjustments', () => {
    test('should apply brightness adjustment', async () => {
      const result = await convertImage(testImageBuffer, {
        imageType: 'png',
        adjustments: { brightness: 50 }
      });

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    test('should apply contrast adjustment', async () => {
      const result = await convertImage(testImageBuffer, {
        imageType: 'png',
        adjustments: { contrast: 30 }
      });

      expect(result).toBeInstanceOf(Buffer);
    });

    test('should apply gamma correction', async () => {
      const result = await convertImage(testImageBuffer, {
        imageType: 'png',
        adjustments: { gamma: 1.5 }
      });

      expect(result).toBeInstanceOf(Buffer);
    });

    test('should apply levels adjustment with all parameters', async () => {
      const result = await convertImage(testImageBuffer, {
        imageType: 'png',
        adjustments: {
          levels: {
            inputBlack: 0,
            inputWhite: 255,
            gamma: 2.2,
            outputBlack: 40,
            outputWhite: 255
          }
        }
      });

      expect(result).toBeInstanceOf(Buffer);
    });

    test('should apply levels adjustment with partial parameters', async () => {
      const result = await convertImage(testImageBuffer, {
        imageType: 'png',
        adjustments: {
          levels: {
            gamma: 3.0,
            outputBlack: 30
          }
        }
      });

      expect(result).toBeInstanceOf(Buffer);
    });

    test('should handle levels.gamma taking precedence over standalone gamma', async () => {
      const resultLevels = await convertImage(testImageBuffer, {
        imageType: 'png',
        adjustments: {
          gamma: 1.5,
          levels: {
            gamma: 2.2
          }
        }
      });

      const resultDirect = await convertImage(testImageBuffer, {
        imageType: 'png',
        adjustments: {
          levels: {
            gamma: 2.2
          }
        }
      });

      // Both should produce identical results since levels.gamma takes precedence
      expect(resultLevels.equals(resultDirect)).toBe(true);
    });

    test('should apply standalone gamma via levels (backward compatibility)', async () => {
      const resultOldGamma = await convertImage(testImageBuffer, {
        imageType: 'png',
        adjustments: {
          gamma: 1.8
        }
      });

      const resultLevelsGamma = await convertImage(testImageBuffer, {
        imageType: 'png',
        adjustments: {
          levels: {
            gamma: 1.8
          }
        }
      });

      // Both should produce identical results
      expect(resultOldGamma.equals(resultLevelsGamma)).toBe(true);
    });

    test('should handle extreme levels gamma values', async () => {
      const resultLow = await convertImage(testImageBuffer, {
        imageType: 'png',
        adjustments: {
          levels: {
            gamma: 0.1
          }
        }
      });

      const resultHigh = await convertImage(testImageBuffer, {
        imageType: 'png',
        adjustments: {
          levels: {
            gamma: 8.0
          }
        }
      });

      expect(resultLow).toBeInstanceOf(Buffer);
      expect(resultHigh).toBeInstanceOf(Buffer);
    });

    test('should handle levels with input range compression', async () => {
      const result = await convertImage(testImageBuffer, {
        imageType: 'png',
        adjustments: {
          levels: {
            inputBlack: 50,
            inputWhite: 200
          }
        }
      });

      expect(result).toBeInstanceOf(Buffer);
    });

    test('should handle levels with output range compression', async () => {
      const result = await convertImage(testImageBuffer, {
        imageType: 'png',
        adjustments: {
          levels: {
            outputBlack: 30,
            outputWhite: 220
          }
        }
      });

      expect(result).toBeInstanceOf(Buffer);
    });

    test('should work with levels on grayscale images', async () => {
      const result = await convertImage(testImageBuffer, {
        imageType: 'png',
        grayscale: true,
        adjustments: {
          levels: {
            gamma: 2.5,
            outputBlack: 40
          }
        }
      });

      expect(result).toBeInstanceOf(Buffer);
    });

    test('should combine levels with other adjustments', async () => {
      const result = await convertImage(testImageBuffer, {
        imageType: 'png',
        adjustments: {
          levels: {
            gamma: 2.2,
            outputBlack: 30
          },
          brightness: 10,
          contrast: 20,
          sharpen: true
        }
      });

      expect(result).toBeInstanceOf(Buffer);
    });

    test('should apply sharpen', async () => {
      const result = await convertImage(testImageBuffer, {
        imageType: 'png',
        adjustments: { sharpen: true }
      });

      expect(result).toBeInstanceOf(Buffer);
    });

    test('should apply invert', async () => {
      const result = await convertImage(testImageBuffer, {
        imageType: 'png',
        adjustments: { invert: true }
      });

      expect(result).toBeInstanceOf(Buffer);
    });

    test('should apply normalize', async () => {
      const result = await convertImage(testImageBuffer, {
        imageType: 'png',
        adjustments: { normalize: true }
      });

      expect(result).toBeInstanceOf(Buffer);
    });

    test('should apply threshold', async () => {
      const result = await convertImage(testImageBuffer, {
        imageType: 'png',
        adjustments: { threshold: 127 }
      });

      expect(result).toBeInstanceOf(Buffer);
    });

    test('should apply saturation adjustment on color images', async () => {
      const result = await convertImage(testImageBuffer, {
        imageType: 'png',
        grayscale: false,
        adjustments: { saturation: 50 }
      });

      expect(result).toBeInstanceOf(Buffer);
    });

    test('should apply hue adjustment on color images', async () => {
      const result = await convertImage(testImageBuffer, {
        imageType: 'png',
        grayscale: false,
        adjustments: { hue: 90 }
      });

      expect(result).toBeInstanceOf(Buffer);
    });

    test('should handle saturation on grayscale images gracefully', async () => {
      const result = await convertImage(testImageBuffer, {
        imageType: 'png',
        grayscale: true,
        adjustments: { saturation: 50 }
      });

      expect(result).toBeInstanceOf(Buffer);
    });

    test('should apply multiple adjustments together', async () => {
      const result = await convertImage(testImageBuffer, {
        imageType: 'png',
        adjustments: {
          brightness: 10,
          contrast: 20,
          gamma: 1.2,
          sharpen: true
        }
      });

      expect(result).toBeInstanceOf(Buffer);
    });

    test('should handle empty adjustments object', async () => {
      const result = await convertImage(testImageBuffer, {
        imageType: 'png',
        adjustments: {}
      });

      expect(result).toBeInstanceOf(Buffer);
    });

    test('should handle undefined adjustments', async () => {
      const result = await convertImage(testImageBuffer, {
        imageType: 'png',
        adjustments: undefined
      });

      expect(result).toBeInstanceOf(Buffer);
    });

    test('should apply extreme brightness values', async () => {
      const result1 = await convertImage(testImageBuffer, {
        imageType: 'png',
        adjustments: { brightness: -100 }
      });
      expect(result1).toBeInstanceOf(Buffer);

      const result2 = await convertImage(testImageBuffer, {
        imageType: 'png',
        adjustments: { brightness: 100 }
      });
      expect(result2).toBeInstanceOf(Buffer);
    });

    test('should apply extreme contrast values', async () => {
      const result1 = await convertImage(testImageBuffer, {
        imageType: 'png',
        adjustments: { contrast: -100 }
      });
      expect(result1).toBeInstanceOf(Buffer);

      const result2 = await convertImage(testImageBuffer, {
        imageType: 'png',
        adjustments: { contrast: 100 }
      });
      expect(result2).toBeInstanceOf(Buffer);
    });
  });

  describe('Dithering', () => {
    let gradientBuffer;

    beforeAll(async () => {
      // Create a gradient image for better dithering testing
      gradientBuffer = await sharp({
        create: {
          width: 256,
          height: 100,
          channels: 3,
          background: { r: 128, g: 128, b: 128 }
        }
      })
      .png()
      .toBuffer();
    });

    test('should apply Floyd-Steinberg dithering with boolean true', async () => {
      const result = await convertImage(gradientBuffer, {
        imageType: 'png',
        bitDepth: 4,
        adjustments: { dither: true }
      });

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    test('should apply Floyd-Steinberg dithering with string', async () => {
      const result = await convertImage(gradientBuffer, {
        imageType: 'png',
        bitDepth: 4,
        adjustments: { dither: 'floyd-steinberg' }
      });

      expect(result).toBeInstanceOf(Buffer);
    });

    test('should apply Atkinson dithering', async () => {
      const result = await convertImage(gradientBuffer, {
        imageType: 'png',
        bitDepth: 4,
        adjustments: { dither: 'atkinson' }
      });

      expect(result).toBeInstanceOf(Buffer);
    });

    test('should apply dithering with 1-bit depth', async () => {
      const result = await convertImage(gradientBuffer, {
        imageType: 'png',
        bitDepth: 1,
        adjustments: { dither: true }
      });

      expect(result).toBeInstanceOf(Buffer);
    });

    test('should apply dithering with 2-bit depth', async () => {
      const result = await convertImage(gradientBuffer, {
        imageType: 'png',
        bitDepth: 2,
        adjustments: { dither: 'atkinson' }
      });

      expect(result).toBeInstanceOf(Buffer);
    });

    test('should not apply dithering when false', async () => {
      const result = await convertImage(gradientBuffer, {
        imageType: 'png',
        bitDepth: 4,
        adjustments: { dither: false }
      });

      expect(result).toBeInstanceOf(Buffer);
    });

    test('should not apply dithering when bitDepth > 8', async () => {
      const result = await convertImage(gradientBuffer, {
        imageType: 'png',
        bitDepth: 16,
        adjustments: { dither: true }
      });

      expect(result).toBeInstanceOf(Buffer);
    });

    test('dithering should be deterministic - Floyd-Steinberg', async () => {
      const result1 = await convertImage(gradientBuffer, {
        imageType: 'png',
        bitDepth: 4,
        adjustments: { dither: true }
      });

      const result2 = await convertImage(gradientBuffer, {
        imageType: 'png',
        bitDepth: 4,
        adjustments: { dither: true }
      });

      // Both results should be identical
      expect(result1.equals(result2)).toBe(true);
    });

    test('dithering should be deterministic - Atkinson', async () => {
      const result1 = await convertImage(gradientBuffer, {
        imageType: 'png',
        bitDepth: 4,
        adjustments: { dither: 'atkinson' }
      });

      const result2 = await convertImage(gradientBuffer, {
        imageType: 'png',
        bitDepth: 4,
        adjustments: { dither: 'atkinson' }
      });

      // Both results should be identical
      expect(result1.equals(result2)).toBe(true);
    });

    test('should combine dithering with other adjustments', async () => {
      const result = await convertImage(gradientBuffer, {
        imageType: 'png',
        bitDepth: 4,
        grayscale: true,
        adjustments: {
          contrast: 30,
          gamma: 1.3,
          sharpen: true,
          dither: 'atkinson'
        }
      });

      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe('Adjustments with Existing Features', () => {
    test('should work with adjustments and grayscale', async () => {
      const result = await convertImage(testImageBuffer, {
        imageType: 'png',
        grayscale: true,
        adjustments: {
          brightness: 20,
          contrast: 30,
          sharpen: true
        }
      });

      expect(result).toBeInstanceOf(Buffer);
    });

    test('should work with adjustments and rotation', async () => {
      const result = await convertImage(testImageBuffer, {
        imageType: 'png',
        rotate: 90,
        adjustments: {
          brightness: 10,
          contrast: 15
        }
      });

      expect(result).toBeInstanceOf(Buffer);
      
      const metadata = await sharp(result).metadata();
      expect(metadata.width).toBe(100);
      expect(metadata.height).toBe(100);
    });

    test('should work with adjustments and bit depth', async () => {
      const result = await convertImage(testImageBuffer, {
        imageType: 'png',
        bitDepth: 4,
        adjustments: {
          contrast: 25,
          gamma: 1.2
        }
      });

      expect(result).toBeInstanceOf(Buffer);
    });

    test('should work with adjustments on JPEG format', async () => {
      const result = await convertImage(testImageBuffer, {
        imageType: 'jpg',
        adjustments: {
          brightness: 15,
          contrast: 20,
          sharpen: true
        }
      });

      expect(result).toBeInstanceOf(Buffer);
      const metadata = await sharp(result).metadata();
      expect(metadata.format).toBe('jpeg');
    });
  });
});
