const puppeteer = require('puppeteer');

/**
 * Singleton browser instance manager
 * 
 * NOTE: We're using a singleton pattern here to keep the browser instance alive
 * across multiple requests for better performance. This approach:
 * - Pros: Much faster (no browser launch overhead), lower memory churn
 * - Cons: If browser crashes, all requests fail until restart
 * - Testing: Monitor in production, may need to switch to per-request launch if unstable
 */

let browserInstance = null;
let isLaunching = false;
let launchPromise = null;

/**
 * Get or create the browser instance
 * @returns {Promise<Browser>} Puppeteer browser instance
 */
async function getBrowser() {
  // If browser exists and is connected, return it
  if (browserInstance && browserInstance.isConnected()) {
    return browserInstance;
  }

  // If already launching, wait for that promise
  if (isLaunching) {
    return launchPromise;
  }

  // Launch new browser
  isLaunching = true;
  launchPromise = launchBrowser();

  try {
    browserInstance = await launchPromise;
    return browserInstance;
  } finally {
    isLaunching = false;
    launchPromise = null;
  }
}

/**
 * Launch a new browser instance
 * @returns {Promise<Browser>} Puppeteer browser instance
 */
async function launchBrowser() {
  console.log('Launching Puppeteer browser...');

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ],
    executablePath: process.env.CHROMIUM_PATH || undefined
  });

  console.log('Puppeteer browser launched successfully');

  // Handle unexpected browser disconnection
  browser.on('disconnected', () => {
    console.warn('Browser disconnected unexpectedly');
    browserInstance = null;
  });

  return browser;
}

/**
 * Close the browser instance gracefully
 */
async function closeBrowser() {
  if (browserInstance) {
    console.log('Closing Puppeteer browser...');
    try {
      await browserInstance.close();
      console.log('Puppeteer browser closed');
    } catch (error) {
      console.error('Error closing browser:', error);
    } finally {
      browserInstance = null;
    }
  }
}

/**
 * Create a new page in the browser
 * @returns {Promise<Page>} Puppeteer page instance
 */
async function createPage() {
  const browser = await getBrowser();
  const page = await browser.newPage();
  return page;
}

// Graceful shutdown handlers
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing browser...');
  await closeBrowser();
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing browser...');
  await closeBrowser();
});

module.exports = {
  getBrowser,
  closeBrowser,
  createPage
};
