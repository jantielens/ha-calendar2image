const https = require('https');
const http = require('http');

// Simple in-memory cache for extra data
const cache = new Map();

/**
 * Fetch extra data from a URL
 * Returns empty object on any error to never break rendering
 * 
 * @param {string} url - URL to fetch JSON data from
 * @param {Object} options - Fetch options
 * @param {number} options.cacheTtl - Cache TTL in seconds (default: 300)
 * @param {Object} options.headers - HTTP headers for request
 * @returns {Promise<Object>} Parsed JSON data or empty object on error
 */
async function fetchExtraData(url, options = {}) {
  const { cacheTtl = 300, headers = {} } = options;

  if (!url) {
    return {};
  }

  try {
    // Check cache first
    const cacheKey = `${url}-${JSON.stringify(headers)}`;
    const cached = cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < cacheTtl * 1000) {
      console.log(`[ExtraData] Using cached data for ${url} (age: ${Math.floor((Date.now() - cached.timestamp) / 1000)}s)`);
      return cached.data;
    }

    // Fetch fresh data
    console.log(`[ExtraData] Fetching data from ${url}...`);
    const startTime = Date.now();
    
    const data = await fetchWithTimeout(url, {
      headers,
      timeout: 5000
    });

    const duration = Date.now() - startTime;
    console.log(`[ExtraData] Successfully fetched data from ${url} (${duration}ms)`);

    // Parse JSON
    let parsedData;
    try {
      parsedData = JSON.parse(data);
    } catch (parseError) {
      console.warn(`[ExtraData] Failed to parse JSON from ${url}: ${parseError.message}`);
      return {};
    }

    // Cache the result
    cache.set(cacheKey, {
      data: parsedData,
      timestamp: Date.now()
    });

    return parsedData;

  } catch (error) {
    console.warn(`[ExtraData] Failed to fetch extra data from ${url}: ${error.message}`);
    console.warn(`[ExtraData] Continuing without extra data...`);
    return {};
  }
}

/**
 * Fetch data from URL with timeout
 * 
 * @param {string} url - URL to fetch from
 * @param {Object} options - Fetch options
 * @param {Object} options.headers - HTTP headers
 * @param {number} options.timeout - Timeout in milliseconds
 * @returns {Promise<string>} Response body as string
 */
function fetchWithTimeout(url, options = {}) {
  const { headers = {}, timeout = 5000 } = options;

  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;

    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Calendar2Image/1.0',
        'Accept': 'application/json',
        ...headers
      }
    };

    const req = protocol.request(requestOptions, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    // Set timeout
    req.setTimeout(timeout, () => {
      req.destroy();
      reject(new Error(`Request timeout after ${timeout}ms`));
    });

    req.end();
  });
}

/**
 * Clear the extra data cache
 * Useful for testing or when cache needs to be invalidated
 */
function clearCache() {
  cache.clear();
  console.log('[ExtraData] Cache cleared');
}

module.exports = {
  fetchExtraData,
  clearCache
};
