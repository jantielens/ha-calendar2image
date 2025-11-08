const https = require('https');
const http = require('http');
const fs = require('fs').promises;
const path = require('path');

// Cache directory - use same as other cache files
const CACHE_DIR = process.env.CACHE_DIR || path.join(process.cwd(), '..', 'data', 'cache');

// Track ongoing refresh operations to prevent duplicate fetches
const ongoingRefreshes = new Map();

/**
 * Get cache file path for a given URL and headers combination
 * @param {string} url - URL to fetch from
 * @param {Object} headers - HTTP headers
 * @returns {string} Cache file path
 */
function getCacheFilePath(url, headers) {
  const crypto = require('crypto');
  const cacheKey = `${url}-${JSON.stringify(headers)}`;
  const hash = crypto.createHash('md5').update(cacheKey).digest('hex');
  return path.join(CACHE_DIR, `extradata-${hash}.json`);
}

/**
 * Load cached extra data from disk
 * @param {string} cachePath - Path to cache file
 * @returns {Promise<Object|null>} Cached data or null if not found/invalid
 */
async function loadCachedData(cachePath) {
  try {
    const cacheContent = await fs.readFile(cachePath, 'utf8');
    const cached = JSON.parse(cacheContent);
    return cached;
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn(`[ExtraData] Error reading cache file: ${error.message}`);
    }
    return null;
  }
}

/**
 * Save extra data to disk cache
 * @param {string} cachePath - Path to cache file
 * @param {Object} data - Data to cache
 * @param {number} timestamp - Timestamp when data was fetched
 * @returns {Promise<void>}
 */
async function saveCachedData(cachePath, data, timestamp) {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    const cacheContent = JSON.stringify({
      data,
      timestamp,
      fetchedAt: new Date(timestamp).toISOString()
    });
    await fs.writeFile(cachePath, cacheContent, 'utf8');
  } catch (error) {
    console.warn(`[ExtraData] Error saving cache file: ${error.message}`);
  }
}

/**
 * Fetch extra data from a URL with stale-while-revalidate pattern
 * Returns cached data immediately (even if stale) and fetches fresh data in background
 * Never blocks image generation or downloads
 * 
 * @param {string} url - URL to fetch JSON data from
 * @param {Object} options - Fetch options
 * @param {number} options.cacheTtl - Cache TTL in seconds (default: 300)
 * @param {Object} options.headers - HTTP headers for request
 * @param {number} options.configIndex - Configuration index for timeline logging (optional)
 * @returns {Promise<Object>} Parsed JSON data or empty object on error
 */
async function fetchExtraData(url, options = {}) {
  const { cacheTtl = 300, headers = {}, configIndex = null } = options;

  if (!url) {
    return {};
  }

  const cachePath = getCacheFilePath(url, headers);
  const cacheKey = `${url}-${JSON.stringify(headers)}`;

  try {
    // Load cached data from disk
    const cached = await loadCachedData(cachePath);
    const now = Date.now();
    const ttlMs = cacheTtl * 1000;

    if (cached) {
      const age = now - cached.timestamp;
      const ageSeconds = Math.floor(age / 1000);
      
      if (age < ttlMs) {
        // Cache is fresh - return immediately
        console.log(`[ExtraData] Cache HIT for ${url} (age: ${ageSeconds}s, TTL: ${cacheTtl}s)`);
        
        // Note: We don't log cache hits to timeline to avoid breaking CRC32 block continuity
        
        return cached.data;
      } else {
        // Cache is stale - return it immediately but refresh in background
        console.log(`[ExtraData] Cache STALE for ${url} (age: ${ageSeconds}s, TTL: ${cacheTtl}s) - serving stale, refreshing in background`);
        
        // Note: We don't log stale serves to timeline to avoid breaking CRC32 block continuity
        // Only log when the cache is actually refreshed (see EXTRA_DATA_REFRESH event)
        
        // Start background refresh (only if not already refreshing)
        if (!ongoingRefreshes.has(cacheKey)) {
          refreshInBackground(url, headers, cachePath, configIndex, cacheKey);
        }
        
        return cached.data;
      }
    }

    // No cache exists - fetch synchronously (first time only)
    console.log(`[ExtraData] Cache MISS for ${url} - fetching fresh data`);
    const data = await fetchAndCache(url, headers, cachePath, configIndex, cacheKey);
    return data;

  } catch (error) {
    console.warn(`[ExtraData] Error in fetchExtraData for ${url}: ${error.message}`);
    
    // Log error to timeline (non-blocking)
    if (configIndex !== null) {
      logExtraDataEvent(configIndex, 'EXTRA_DATA_ERROR', {
        url,
        error: error.message
      }).catch(err => console.warn(`[ExtraData] Timeline logging failed: ${err.message}`));
    }
    
    return {};
  }
}

/**
 * Fetch fresh data and update cache
 * @param {string} url - URL to fetch from
 * @param {Object} headers - HTTP headers
 * @param {string} cachePath - Cache file path
 * @param {number|null} configIndex - Configuration index for logging
 * @param {string} cacheKey - Cache key for tracking ongoing refreshes
 * @returns {Promise<Object>} Fetched data
 */
async function fetchAndCache(url, headers, cachePath, configIndex, cacheKey) {
  try {
    console.log(`[ExtraData] Fetching fresh data from ${url}...`);
    const startTime = Date.now();
    
    const rawData = await fetchWithTimeout(url, {
      headers,
      timeout: 5000
    });

    const duration = Date.now() - startTime;
    
    // Parse JSON
    let parsedData;
    try {
      parsedData = JSON.parse(rawData);
    } catch (parseError) {
      console.warn(`[ExtraData] Failed to parse JSON from ${url}: ${parseError.message}`);
      return {};
    }

    // Save to cache
    await saveCachedData(cachePath, parsedData, Date.now());
    
    console.log(`[ExtraData] Successfully fetched and cached data from ${url} (${duration}ms)`);
    
    // Log fetch to timeline (non-blocking)
    if (configIndex !== null) {
      logExtraDataEvent(configIndex, 'EXTRA_DATA_FETCH', {
        url,
        duration,
        dataSize: rawData.length
      }).catch(err => console.warn(`[ExtraData] Timeline logging failed: ${err.message}`));
    }

    return parsedData;

  } catch (error) {
    console.warn(`[ExtraData] Failed to fetch from ${url}: ${error.message}`);
    
    // Log error to timeline (non-blocking)
    if (configIndex !== null) {
      logExtraDataEvent(configIndex, 'EXTRA_DATA_ERROR', {
        url,
        error: error.message
      }).catch(err => console.warn(`[ExtraData] Timeline logging failed: ${err.message}`));
    }
    
    return {};
  }
}

/**
 * Refresh data in background without blocking
 * @param {string} url - URL to fetch from
 * @param {Object} headers - HTTP headers
 * @param {string} cachePath - Cache file path
 * @param {number|null} configIndex - Configuration index for logging
 * @param {string} cacheKey - Cache key for tracking ongoing refreshes
 */
function refreshInBackground(url, headers, cachePath, configIndex, cacheKey) {
  // Mark as refreshing
  ongoingRefreshes.set(cacheKey, true);
  
  console.log(`[ExtraData] Starting background refresh for ${url}`);
  
  // Fetch and cache in background
  fetchAndCache(url, headers, cachePath, configIndex, cacheKey)
    .then(() => {
      console.log(`[ExtraData] Background refresh completed for ${url}`);
      
      // Log refresh to timeline (non-blocking)
      if (configIndex !== null) {
        logExtraDataEvent(configIndex, 'EXTRA_DATA_REFRESH', {
          url,
          background: true
        }).catch(err => console.warn(`[ExtraData] Timeline logging failed: ${err.message}`));
      }
    })
    .catch(err => {
      console.warn(`[ExtraData] Background refresh failed for ${url}: ${err.message}`);
    })
    .finally(() => {
      // Clear refresh tracking
      ongoingRefreshes.delete(cacheKey);
    });
}

/**
 * Log extra data event to timeline
 * @param {number} configIndex - Configuration index
 * @param {string} subtype - Event subtype
 * @param {Object} metadata - Event metadata
 * @returns {Promise<void>}
 */
async function logExtraDataEvent(configIndex, subtype, metadata) {
  try {
    const { logEvent, EVENT_TYPES, EVENT_SUBTYPES } = require('../timeline');
    await logEvent(configIndex, EVENT_TYPES.EXTRA_DATA, EVENT_SUBTYPES[subtype], metadata);
  } catch (error) {
    // Silently fail - don't break functionality if timeline logging fails
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
 * Clear the extra data cache by deleting all cache files
 * Useful for testing or when cache needs to be invalidated
 */
async function clearCache() {
  try {
    const files = await fs.readdir(CACHE_DIR);
    const extraDataFiles = files.filter(f => f.startsWith('extradata-') && f.endsWith('.json'));
    
    for (const file of extraDataFiles) {
      await fs.unlink(path.join(CACHE_DIR, file));
    }
    
    console.log(`[ExtraData] Cleared ${extraDataFiles.length} cache files`);
  } catch (error) {
    console.warn(`[ExtraData] Error clearing cache: ${error.message}`);
  }
}

module.exports = {
  fetchExtraData,
  clearCache
};
