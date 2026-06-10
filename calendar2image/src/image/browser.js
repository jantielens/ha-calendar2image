const puppeteer = require('puppeteer');
const os = require('os');
const path = require('path');
const fs = require('fs');

/**
 * Singleton browser instance manager
 * 
 * NOTE: We're using a singleton pattern here to keep the browser instance alive
 * across multiple requests for better performance. This approach:
 * - Pros: Much faster (no browser launch overhead), lower memory churn
 * - Cons: If browser crashes, all requests fail until restart
 * - Testing: Monitor in production, may need to switch to per-request launch if unstable
 */

// Prefix used for the Chrome user-data (profile) directories we create.
// By specifying our own userDataDir we avoid Puppeteer's auto-generated
// `puppeteer_dev_chrome_profile-*` dirs, and we can reliably clean them up
// ourselves even if the browser does not close gracefully.
const PROFILE_PREFIX = 'c2i-chrome-profile-';
// Puppeteer's default auto-generated prefix, reaped on startup to clean up
// leftovers from older add-on versions or crashed worker processes.
const PUPPETEER_DEFAULT_PREFIX = 'puppeteer_dev_chrome_profile-';

let browserInstance = null;
let isLaunching = false;
let launchPromise = null;
let currentUserDataDir = null;

/**
 * Synchronously remove the current Chrome user-data directory, if any.
 *
 * Uses synchronous fs so it can run safely from a `process.on('exit')`
 * handler. Best-effort: never throws.
 */
function cleanupUserDataDirSync() {
  if (!currentUserDataDir) {
    return;
  }
  const dir = currentUserDataDir;
  currentUserDataDir = null;
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch (error) {
    // Best-effort cleanup; never throw from here.
    console.error(`Error removing Chrome user-data dir ${dir}:`, error.message);
  }
}

/**
 * Remove stale Chrome profile directories left behind by previous runs.
 *
 * This reaps both our own `c2i-chrome-profile-*` directories and Puppeteer's
 * default `puppeteer_dev_chrome_profile-*` directories from the temp dir,
 * cleaning up leaks from older add-on versions or processes killed before
 * they could clean up after themselves. Best-effort: never throws.
 *
 * @returns {number} Number of directories removed
 */
function reapStaleProfiles() {
  const tmp = os.tmpdir();
  let removed = 0;
  let entries = [];
  try {
    entries = fs.readdirSync(tmp);
  } catch (error) {
    console.error(`Error reading temp dir ${tmp} for stale profiles:`, error.message);
    return removed;
  }

  for (const entry of entries) {
    if (entry.startsWith(PROFILE_PREFIX) || entry.startsWith(PUPPETEER_DEFAULT_PREFIX)) {
      // Don't remove the profile the current process is actively using.
      const fullPath = path.join(tmp, entry);
      if (fullPath === currentUserDataDir) {
        continue;
      }
      try {
        fs.rmSync(fullPath, { recursive: true, force: true });
        removed++;
      } catch (error) {
        console.error(`Error removing stale profile ${fullPath}:`, error.message);
      }
    }
  }

  if (removed > 0) {
    console.log(`Reaped ${removed} stale Chrome profile director${removed === 1 ? 'y' : 'ies'} from ${tmp}`);
  }
  return removed;
}

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

  const chromiumPath = process.env.CHROMIUM_PATH || process.env.PUPPETEER_EXECUTABLE_PATH;
  
  console.log(`CHROMIUM_PATH env: ${process.env.CHROMIUM_PATH}`);
  console.log(`PUPPETEER_EXECUTABLE_PATH env: ${process.env.PUPPETEER_EXECUTABLE_PATH}`);
  console.log(`Using executable path: ${chromiumPath}`);

  // Clean up any directory left over from a previous launch in this same
  // process (e.g. after an unexpected browser disconnect/crash) before we
  // create a new one, so references are never lost.
  cleanupUserDataDirSync();

  // Use our own controlled, unique user-data directory instead of letting
  // Puppeteer auto-create one. This lets us reliably remove it on shutdown
  // (or via the process 'exit' handler) even if browser.close() never runs
  // or fails, preventing unbounded /tmp growth.
  currentUserDataDir = path.join(os.tmpdir(), `${PROFILE_PREFIX}${process.pid}-${Date.now()}`);

  const launchOptions = {
    headless: true,
    userDataDir: currentUserDataDir,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ],
    executablePath: chromiumPath
  };

  console.log('Launch options:', JSON.stringify(launchOptions, null, 2));

  let browser;
  try {
    browser = await puppeteer.launch(launchOptions);
  } catch (error) {
    // If launch fails (bad Chromium path, sandbox error, etc.), Chromium may
    // have already created the profile dir. Remove it before rethrowing so
    // repeated launch failures don't leak directories into /tmp.
    cleanupUserDataDirSync();
    throw error;
  }

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
      // Remove the profile directory regardless of whether close() succeeded.
      cleanupUserDataDirSync();
    }
  } else {
    // No live browser, but a directory may still linger (e.g. after a crash).
    cleanupUserDataDirSync();
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

// Last-resort safety net: synchronously remove the profile directory on any
// process exit. This runs even when the process exits via process.exit()
// without browser.close() being awaited (e.g. the image worker), guaranteeing
// the Chrome user-data dir is never leaked into /tmp.
process.on('exit', () => {
  cleanupUserDataDirSync();
});

module.exports = {
  getBrowser,
  closeBrowser,
  createPage,
  reapStaleProfiles
};
