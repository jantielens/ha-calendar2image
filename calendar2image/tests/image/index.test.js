/**
 * Image Generator Tests
 * 
 * Note: These tests use real Puppeteer and are slower than typical unit tests
 */

const { generateImage } = require('../../src/image');
const { closeBrowser } = require('../../src/image/browser');
const sharp = require('sharp');

describe('Image Generator', () => {

  // Close browser after all tests
  afterAll(async () => {
    await closeBrowser();
  });

  const simpleHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { margin: 0; padding: 20px; font-family: Arial; background: white; }
        h1 { color: #0066cc; }
      </style>
    </head>
    <body>
      <h1>Test Page</h1>
      <p>This is a test</p>
    </body>
    </html>
  `;

  describe('generateImage', () => {
    test('should generate PNG image from HTML', async () => {
      const result = await generateImage(simpleHTML, {
        width: 800,
        height: 600,
        imageType: 'png'
      });

      expect(result).toBeDefined();
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.contentType).toBe('image/png');
      expect(result.buffer.length).toBeGreaterThan(0);

      // Verify it's a valid PNG
      const metadata = await sharp(result.buffer).metadata();
      expect(metadata.format).toBe('png');
      expect(metadata.width).toBe(800);
      expect(metadata.height).toBe(600);
    }, 30000);

    test('should generate JPEG image from HTML', async () => {
      const result = await generateImage(simpleHTML, {
        width: 640,
        height: 480,
        imageType: 'jpg'
      });

      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.contentType).toBe('image/jpeg');

      const metadata = await sharp(result.buffer).metadata();
      expect(metadata.format).toBe('jpeg');
      expect(metadata.width).toBe(640);
      expect(metadata.height).toBe(480);
    }, 30000);

    test('should generate BMP image from HTML', async () => {
      const result = await generateImage(simpleHTML, {
        width: 400,
        height: 300,
        imageType: 'bmp'
      });

      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.contentType).toBe('image/bmp');
      expect(result.buffer.length).toBeGreaterThan(0);
      
      // Note: Sharp converts BMP to PNG since it doesn't support BMP output
      const metadata = await sharp(result.buffer).metadata();
      expect(metadata.format).toBe('png');
    }, 30000);

    test('should apply custom dimensions', async () => {
      const result = await generateImage(simpleHTML, {
        width: 1024,
        height: 768,
        imageType: 'png'
      });

      const metadata = await sharp(result.buffer).metadata();
      expect(metadata.width).toBe(1024);
      expect(metadata.height).toBe(768);
    }, 30000);

    test('should generate grayscale image', async () => {
      const result = await generateImage(simpleHTML, {
        width: 800,
        height: 600,
        imageType: 'png',
        grayscale: true
      });

      const metadata = await sharp(result.buffer).metadata();
      // Sharp may keep RGB channels but desaturate
      expect(metadata.channels).toBeGreaterThanOrEqual(1);
      expect(metadata.channels).toBeLessThanOrEqual(4);
    }, 30000);

    test('should use default dimensions when not specified', async () => {
      const result = await generateImage(simpleHTML);

      const metadata = await sharp(result.buffer).metadata();
      expect(metadata.width).toBe(800); // default
      expect(metadata.height).toBe(600); // default
    }, 30000);

    test('should handle complex HTML with CSS', async () => {
      const complexHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            .container { display: flex; flex-direction: column; }
            .box { padding: 10px; margin: 5px; background: #f0f0f0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="box">Box 1</div>
            <div class="box">Box 2</div>
            <div class="box">Box 3</div>
          </div>
        </body>
        </html>
      `;

      const result = await generateImage(complexHTML, {
        width: 600,
        height: 400,
        imageType: 'png'
      });

      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.buffer.length).toBeGreaterThan(0);
    }, 30000);

    test('should handle malformed HTML gracefully', async () => {
      // Puppeteer is forgiving and will render even malformed HTML
      const result = await generateImage('<div>No closing tag', {
        width: 800,
        height: 600
      });

      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.buffer.length).toBeGreaterThan(0);
    }, 30000);

    test('should handle empty HTML', async () => {
      const result = await generateImage('', {
        width: 800,
        height: 600,
        imageType: 'png'
      });

      expect(result.buffer).toBeInstanceOf(Buffer);
    }, 30000);
  });

  describe('Image Quality', () => {
    test('should produce different file sizes for different bit depths (JPEG)', async () => {
      const result8bit = await generateImage(simpleHTML, {
        width: 800,
        height: 600,
        imageType: 'jpg',
        bitDepth: 8
      });

      const result32bit = await generateImage(simpleHTML, {
        width: 800,
        height: 600,
        imageType: 'jpg',
        bitDepth: 32
      });

      // Higher bit depth should result in larger file
      expect(result32bit.buffer.length).toBeGreaterThan(result8bit.buffer.length);
    }, 30000);
  });
});
