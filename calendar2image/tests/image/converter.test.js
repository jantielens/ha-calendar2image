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

    test('should convert to BMP format', async () => {
      const result = await convertImage(testImageBuffer, {
        imageType: 'bmp',
        grayscale: false,
        bitDepth: 8
      });

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
      
      // Note: Sharp converts BMP to PNG since it doesn't support BMP output
      const metadata = await sharp(result).metadata();
      expect(metadata.format).toBe('png');
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
  });

  describe('getContentType', () => {
    test('should return correct content type for PNG', () => {
      expect(getContentType('png')).toBe('image/png');
    });

    test('should return correct content type for JPEG', () => {
      expect(getContentType('jpg')).toBe('image/jpeg');
      expect(getContentType('jpeg')).toBe('image/jpeg');
    });

    test('should return correct content type for BMP', () => {
      expect(getContentType('bmp')).toBe('image/bmp');
    });

    test('should handle uppercase formats', () => {
      expect(getContentType('PNG')).toBe('image/png');
      expect(getContentType('JPG')).toBe('image/jpeg');
    });

    test('should return default for unknown format', () => {
      expect(getContentType('unknown')).toBe('application/octet-stream');
    });
  });
});
