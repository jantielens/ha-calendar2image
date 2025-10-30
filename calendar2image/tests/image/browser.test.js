/**
 * Browser Manager Tests
 * 
 * Note: These tests use real Puppeteer to ensure browser management works correctly.
 * They may be slower than other unit tests.
 */

const { getBrowser, closeBrowser, createPage } = require('../../src/image/browser');

describe('Browser Manager', () => {

  // Close browser after all tests
  afterAll(async () => {
    await closeBrowser();
  });

  describe('getBrowser', () => {
    test('should launch and return a browser instance', async () => {
      const browser = await getBrowser();
      expect(browser).toBeDefined();
      expect(browser.isConnected()).toBe(true);
    }, 30000); // 30s timeout for browser launch

    test('should return same browser instance on multiple calls', async () => {
      const browser1 = await getBrowser();
      const browser2 = await getBrowser();
      expect(browser1).toBe(browser2); // Same instance
    }, 30000);
  });

  describe('createPage', () => {
    test('should create a new page', async () => {
      const page = await createPage();
      expect(page).toBeDefined();
      expect(typeof page.goto).toBe('function');
      await page.close();
    }, 30000);

    test('should create multiple independent pages', async () => {
      const page1 = await createPage();
      const page2 = await createPage();
      
      expect(page1).toBeDefined();
      expect(page2).toBeDefined();
      expect(page1).not.toBe(page2); // Different pages

      await page1.close();
      await page2.close();
    }, 30000);

    test('page should be functional', async () => {
      const page = await createPage();
      
      // Set simple HTML content
      await page.setContent('<html><body><h1>Test</h1></body></html>');
      
      // Verify content
      const content = await page.content();
      expect(content).toContain('Test');

      await page.close();
    }, 30000);
  });

  describe('closeBrowser', () => {
    test('should close browser gracefully', async () => {
      // Get browser first
      const browser = await getBrowser();
      expect(browser.isConnected()).toBe(true);

      // Close it
      await closeBrowser();

      // Browser should be disconnected
      expect(browser.isConnected()).toBe(false);
    }, 30000);

    test('should handle multiple close calls safely', async () => {
      await closeBrowser();
      await closeBrowser(); // Should not throw
      expect(true).toBe(true);
    }, 10000);
  });
});
