const fs = require('fs').promises;
const path = require('path');
const { calculateCRC32 } = require('../utils/crc32');
const { addHistoryEntry } = require('./crc32History');

const CACHE_DIR = path.join(process.cwd(), '..', 'data', 'cache');

/**
 * Ensure cache directory exists
 */
async function ensureCacheDir() {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    console.log(`[Cache] Cache directory ready: ${CACHE_DIR}`);
  } catch (error) {
    console.error(`[Cache] Failed to create cache directory: ${error.message}`);
    throw error;
  }
}

/**
 * Get cache file path for a configuration index
 * @param {number} index - Configuration index
 * @param {string} imageType - Image type (png, jpg, bmp)
 * @returns {string} Cache file path
 */
function getCacheFilePath(index, imageType = 'png') {
  const extension = imageType === 'jpg' ? 'jpg' : imageType === 'bmp' ? 'bmp' : 'png';
  return path.join(CACHE_DIR, `${index}.${extension}`);
}

/**
 * Get cache metadata file path for a configuration index
 * @param {number} index - Configuration index
 * @returns {string} Metadata file path
 */
function getMetadataFilePath(index) {
  return path.join(CACHE_DIR, `${index}.meta.json`);
}

/**
 * Check if cached image exists and get metadata
 * @param {number} index - Configuration index
 * @returns {Promise<Object|null>} Cache metadata or null if not found
 */
async function getCacheMetadata(index) {
  try {
    const metadataPath = getMetadataFilePath(index);
    const metadata = await fs.readFile(metadataPath, 'utf8');
    return JSON.parse(metadata);
  } catch (error) {
    return null;
  }
}

/**
 * Save cached image and metadata
 * @param {number} index - Configuration index
 * @param {Buffer} buffer - Image buffer
 * @param {string} contentType - Content type
 * @param {string} imageType - Image type
 * @param {Object} options - Additional options
 * @param {string} options.trigger - Trigger type for history tracking
 * @param {number} options.generationDuration - Generation duration in ms
 */
async function saveCachedImage(index, buffer, contentType, imageType, options = {}) {
  try {
    const cachePath = getCacheFilePath(index, imageType);
    const metadataPath = getMetadataFilePath(index);
    
    // Calculate CRC32 checksum
    const crc32 = calculateCRC32(buffer);
    
    const metadata = {
      index,
      contentType,
      imageType,
      size: buffer.length,
      crc32,
      generatedAt: new Date().toISOString(),
      cachePath
    };

    // Save image and metadata atomically
    await Promise.all([
      fs.writeFile(cachePath, buffer),
      fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2))
    ]);

    console.log(`[Cache] Saved cached image for config ${index}: ${buffer.length} bytes`);
    
    // Record in CRC32 history (non-blocking)
    const { trigger = 'unknown', generationDuration = null } = options;
    addHistoryEntry(index, crc32, {
      trigger,
      generationDuration,
      imageSize: buffer.length
    }).catch(err => {
      console.warn(`[Cache] Failed to record CRC32 history: ${err.message}`);
    });
    
    return metadata;
  } catch (error) {
    console.error(`[Cache] Failed to save cached image for config ${index}: ${error.message}`);
    throw error;
  }
}

/**
 * Load cached image
 * @param {number} index - Configuration index
 * @returns {Promise<Object|null>} Object with buffer and contentType, or null if not found
 */
async function loadCachedImage(index) {
  try {
    const metadata = await getCacheMetadata(index);
    if (!metadata) {
      return null;
    }

    const cachePath = getCacheFilePath(index, metadata.imageType);
    const buffer = await fs.readFile(cachePath);

    console.log(`[Cache] Loaded cached image for config ${index}: ${buffer.length} bytes (generated ${metadata.generatedAt})`);
    
    return {
      buffer,
      contentType: metadata.contentType,
      metadata
    };
  } catch (error) {
    console.warn(`[Cache] Failed to load cached image for config ${index}: ${error.message}`);
    return null;
  }
}

/**
 * Pre-generate image for a configuration index
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
 * Pre-generate image for a configuration index
 * @param {number} index - Configuration index
 * @returns {Promise<boolean>} Success status
 */
async function preGenerateImage(index) {
  if (!preGenerateImageFn) {
    throw new Error('Pre-generate function not set. Call setPreGenerateFunction first.');
  }
  return preGenerateImageFn(index);
}

/**
 * Delete cached image and metadata
 * @param {number} index - Configuration index
 */
async function deleteCachedImage(index) {
  try {
    const metadata = await getCacheMetadata(index);
    if (metadata) {
      const cachePath = getCacheFilePath(index, metadata.imageType);
      const metadataPath = getMetadataFilePath(index);
      
      await Promise.all([
        fs.unlink(cachePath).catch(() => {}),
        fs.unlink(metadataPath).catch(() => {})
      ]);
      
      console.log(`[Cache] Deleted cached image for config ${index}`);
    }
  } catch (error) {
    console.warn(`[Cache] Failed to delete cached image for config ${index}: ${error.message}`);
  }
}

module.exports = {
  ensureCacheDir,
  getCacheMetadata,
  loadCachedImage,
  saveCachedImage,
  preGenerateImage,
  setPreGenerateFunction,
  deleteCachedImage,
  // Re-export CRC32 history functions
  ...require('./crc32History')
};
