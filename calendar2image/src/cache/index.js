const fs = require('fs').promises;
const path = require('path');
const { calculateCRC32 } = require('../utils/crc32');
const { addHistoryEntry } = require('./crc32History');
const { toCacheName } = require('../utils/sanitize');

// Cache directory - use environment variable or default
const CACHE_DIR = process.env.CACHE_DIR || path.join(process.cwd(), '..', 'data', 'cache');

// In-memory cache for instant reads (eliminates file I/O contention)
// Map<index, {buffer, metadata}>
const memoryCache = new Map();

/**
 * Ensure cache directory exists and cleanup orphaned temp files
 */
async function ensureCacheDir() {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    console.log(`[Cache] Cache directory ready: ${CACHE_DIR}`);
    
    // Cleanup orphaned .tmp files from previous crashes
    await cleanupTempFiles();
  } catch (error) {
    console.error(`[Cache] Failed to create cache directory: ${error.message}`);
    throw error;
  }
}

/**
 * Cleanup orphaned temporary files from previous crashes
 */
async function cleanupTempFiles() {
  try {
    const files = await fs.readdir(CACHE_DIR);
    const tempFiles = files.filter(file => file.endsWith('.tmp'));
    
    if (tempFiles.length > 0) {
      console.log(`[Cache] Cleaning up ${tempFiles.length} orphaned temporary file(s)...`);
      await Promise.all(
        tempFiles.map(file => 
          fs.unlink(path.join(CACHE_DIR, file)).catch(err => 
            console.warn(`[Cache] Failed to delete ${file}: ${err.message}`)
          )
        )
      );
      console.log(`[Cache] Cleanup complete`);
    }
  } catch (error) {
    console.warn(`[Cache] Failed to cleanup temporary files: ${error.message}`);
  }
}

/**
 * Get cache file path for a configuration name
 * @param {string|number} name - Configuration name or index
 * @param {string} imageType - Image type (png, jpg, bmp)
 * @returns {string} Cache file path
 */
function getCacheFilePath(name, imageType = 'png') {
  const cacheName = toCacheName(String(name));
  const extension = imageType === 'jpg' ? 'jpg' : imageType === 'bmp' ? 'bmp' : 'png';
  return path.join(CACHE_DIR, `${cacheName}.${extension}`);
}

/**
 * Get cache metadata file path for a configuration name
 * @param {string|number} name - Configuration name or index
 * @returns {string} Metadata file path
 */
function getMetadataFilePath(name) {
  const cacheName = toCacheName(String(name));
  return path.join(CACHE_DIR, `${cacheName}.meta.json`);
}

/**
 * Check if cached image exists and get metadata
 * @param {string|number} name - Configuration name or index
 * @returns {Promise<Object|null>} Cache metadata or null if not found
 */
async function getCacheMetadata(name) {
  try {
    const metadataPath = getMetadataFilePath(name);
    const metadata = await fs.readFile(metadataPath, 'utf8');
    return JSON.parse(metadata);
  } catch (error) {
    return null;
  }
}

/**
 * Save cached image and metadata
 * @param {string|number} name - Configuration name or index
 * @param {Buffer} buffer - Image buffer
 * @param {string} contentType - Content type
 * @param {string} imageType - Image type
 * @param {Object} options - Additional options
 * @param {string} options.trigger - Trigger type for history tracking
 * @param {number} options.generationDuration - Generation duration in ms
 */
async function saveCachedImage(name, buffer, contentType, imageType, options = {}) {
  try {
    const cachePath = getCacheFilePath(name, imageType);
    const metadataPath = getMetadataFilePath(name);
    
    // Use temporary file paths for atomic replacement
    const tempCachePath = cachePath + '.tmp';
    const tempMetadataPath = metadataPath + '.tmp';
    
    // Calculate CRC32 checksum
    const crc32 = calculateCRC32(buffer);
    
    const metadata = {
      name: String(name),
      contentType,
      imageType,
      size: buffer.length,
      crc32,
      generatedAt: new Date().toISOString(),
      cachePath
    };

    // Write to temporary files first
    await Promise.all([
      fs.writeFile(tempCachePath, buffer),
      fs.writeFile(tempMetadataPath, JSON.stringify(metadata, null, 2))
    ]);

    // Atomically replace old cache files (this is instant and atomic on POSIX)
    await Promise.all([
      fs.rename(tempCachePath, cachePath),
      fs.rename(tempMetadataPath, metadataPath)
    ]);

    // After successful disk write, update memory cache atomically
    memoryCache.set(String(name), { buffer, metadata });

    console.log(`[Cache] Saved cached image for config ${name}: ${buffer.length} bytes (memory + disk)`);
    
    // Record in CRC32 history (non-blocking)
    const { trigger = 'unknown', generationDuration = null } = options;
    addHistoryEntry(name, crc32, {
      trigger,
      generationDuration,
      imageSize: buffer.length
    }).catch(err => {
      console.warn(`[Cache] Failed to record CRC32 history: ${err.message}`);
    });
    
    return metadata;
  } catch (error) {
    console.error(`[Cache] Failed to save cached image for config ${name}: ${error.message}`);
    throw error;
  }
}

/**
 * Load cached image
 * @param {string|number} name - Configuration name or index
 * @returns {Promise<Object|null>} Object with buffer and contentType, or null if not found
 */
async function loadCachedImage(name) {
  const nameStr = String(name);
  
  // Try memory cache first (instant, no I/O)
  const memoryCached = memoryCache.get(nameStr);
  if (memoryCached) {
    console.log(`[Cache] Loaded from memory for config ${name}: ${memoryCached.buffer.length} bytes`);
    return {
      buffer: memoryCached.buffer,
      contentType: memoryCached.metadata.contentType,
      metadata: memoryCached.metadata
    };
  }
  
  // Fall back to disk
  try {
    const metadata = await getCacheMetadata(name);
    if (!metadata) {
      return null;
    }

    const cachePath = getCacheFilePath(name, metadata.imageType);
    const buffer = await fs.readFile(cachePath);

    console.log(`[Cache] Loaded from disk for config ${name}: ${buffer.length} bytes (generated ${metadata.generatedAt})`);
    
    // Populate memory cache for future reads
    memoryCache.set(nameStr, { buffer, metadata });
    
    return {
      buffer,
      contentType: metadata.contentType,
      metadata
    };
  } catch (error) {
    console.warn(`[Cache] Failed to load cached image for config ${name}: ${error.message}`);
    return null;
  }
}

/**
 * Pre-generate image for a configuration name
 * Note: This function is set by the scheduler module to avoid circular dependencies
 * @type {Function}
 */
let preGenerateImageFn = null;

/**
 * Set the pre-generation function (called by scheduler)
 * @param {Function} fn - The function to use for pre-generation
 */
function setPreGenerateFunction(fn) {
  preGenerateImageFn = fn;
}

/**
 * Pre-generate image for a configuration name
 * @param {string|number} name - Configuration name or index
 * @returns {Promise<boolean>} Success status
 */
async function preGenerateImage(name) {
  if (!preGenerateImageFn) {
    throw new Error('Pre-generate function not set. Call setPreGenerateFunction first.');
  }
  return preGenerateImageFn(name);
}

/**
 * Delete cached image and metadata
 * @param {string|number} name - Configuration name or index
 */
async function deleteCachedImage(name) {
  const nameStr = String(name);
  
  // Remove from memory cache first
  memoryCache.delete(nameStr);
  
  try {
    const metadata = await getCacheMetadata(name);
    if (metadata) {
      const cachePath = getCacheFilePath(name, metadata.imageType);
      const metadataPath = getMetadataFilePath(name);
      
      await Promise.all([
        fs.unlink(cachePath).catch(() => {}),
        fs.unlink(metadataPath).catch(() => {})
      ]);
      
      console.log(`[Cache] Deleted cached image for config ${name} (memory + disk)`);
    }
  } catch (error) {
    console.warn(`[Cache] Failed to delete cached image for config ${name}: ${error.message}`);
  }
}

/**
 * Get memory cache statistics
 * @returns {Object} Statistics object with entries, totalBytes, and per-config details
 */
function getMemoryCacheStats() {
  const stats = {
    entries: memoryCache.size,
    totalBytes: 0,
    configs: []
  };
  
  for (const [name, cached] of memoryCache.entries()) {
    const bytes = cached.buffer.length;
    stats.totalBytes += bytes;
    stats.configs.push({
      name,
      size: bytes,
      crc32: cached.metadata.crc32,
      generatedAt: cached.metadata.generatedAt
    });
  }
  
  return stats;
}

/**
 * Clear memory cache (useful for testing or manual maintenance)
 */
function clearMemoryCache() {
  const size = memoryCache.size;
  memoryCache.clear();
  console.log(`[Cache] Cleared memory cache (${size} entries)`);
}

module.exports = {
  ensureCacheDir,
  getCacheMetadata,
  loadCachedImage,
  saveCachedImage,
  preGenerateImage,
  setPreGenerateFunction,
  deleteCachedImage,
  getMemoryCacheStats,
  clearMemoryCache,
  // Re-export CRC32 history functions
  ...require('./crc32History')
};
