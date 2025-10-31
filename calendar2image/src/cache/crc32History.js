const fs = require('fs').promises;
const path = require('path');

const CACHE_DIR = path.join(process.cwd(), '..', 'data', 'cache');
const MAX_HISTORY_ENTRIES = 500;

/**
 * Get CRC32 history file path for a configuration index
 * @param {number} index - Configuration index
 * @returns {string} History file path
 */
function getHistoryFilePath(index) {
  return path.join(CACHE_DIR, `${index}.crc32-history.json`);
}

/**
 * Load CRC32 history for a configuration
 * @param {number} index - Configuration index
 * @returns {Promise<Array>} Array of history entries
 */
async function loadHistory(index) {
  try {
    const historyPath = getHistoryFilePath(index);
    const data = await fs.readFile(historyPath, 'utf8');
    const history = JSON.parse(data);
    
    // Validate structure
    if (!Array.isArray(history)) {
      console.warn(`[CRC32History] Invalid history format for config ${index}, resetting`);
      return [];
    }
    
    return history;
  } catch (error) {
    // History file doesn't exist or is corrupted
    if (error.code === 'ENOENT') {
      console.log(`[CRC32History] No history file found for config ${index}`);
    } else {
      console.warn(`[CRC32History] Failed to load history for config ${index}: ${error.message}`);
    }
    return [];
  }
}

/**
 * Save CRC32 history for a configuration
 * @param {number} index - Configuration index
 * @param {Array} history - Array of history entries
 * @returns {Promise<void>}
 */
async function saveHistory(index, history) {
  try {
    const historyPath = getHistoryFilePath(index);
    await fs.writeFile(historyPath, JSON.stringify(history, null, 2));
  } catch (error) {
    console.error(`[CRC32History] Failed to save history for config ${index}: ${error.message}`);
    throw error;
  }
}

/**
 * Add a CRC32 entry to history
 * Maintains a circular buffer of MAX_HISTORY_ENTRIES
 * 
 * @param {number} index - Configuration index
 * @param {string} crc32 - CRC32 checksum
 * @param {Object} options - Additional options
 * @param {string} options.trigger - Trigger type (scheduled, fresh, startup, config_change)
 * @param {number} options.generationDuration - Generation duration in ms
 * @param {number} options.imageSize - Image size in bytes
 * @returns {Promise<void>}
 */
async function addHistoryEntry(index, crc32, options = {}) {
  try {
    const {
      trigger = 'unknown',
      generationDuration = null,
      imageSize = null
    } = options;
    
    // Load existing history
    const history = await loadHistory(index);
    
    // Create new entry
    const entry = {
      crc32,
      timestamp: new Date().toISOString(),
      trigger
    };
    
    // Add optional fields if provided
    if (generationDuration !== null) {
      entry.generationDuration = generationDuration;
    }
    if (imageSize !== null) {
      entry.imageSize = imageSize;
    }
    
    // Add to beginning of array (most recent first)
    history.unshift(entry);
    
    // Trim to MAX_HISTORY_ENTRIES (keep most recent)
    if (history.length > MAX_HISTORY_ENTRIES) {
      history.length = MAX_HISTORY_ENTRIES;
    }
    
    // Save updated history
    await saveHistory(index, history);
    
    console.log(`[CRC32History] Added entry for config ${index}: ${crc32} (${trigger})`);
  } catch (error) {
    // Don't throw - history is non-critical
    console.error(`[CRC32History] Failed to add history entry for config ${index}: ${error.message}`);
  }
}

/**
 * Get CRC32 history for a configuration
 * @param {number} index - Configuration index
 * @param {number} limit - Maximum number of entries to return (default: all)
 * @returns {Promise<Array>} Array of history entries (most recent first)
 */
async function getHistory(index, limit = null) {
  const history = await loadHistory(index);
  
  if (limit && limit > 0) {
    return history.slice(0, limit);
  }
  
  return history;
}

/**
 * Get history statistics for a configuration
 * @param {number} index - Configuration index
 * @returns {Promise<Object>} Statistics object
 */
async function getHistoryStats(index) {
  const history = await loadHistory(index);
  
  if (history.length === 0) {
    return {
      uniqueCRC32Values: 0,
      changes: 0,
      durationStats: null,
      blocks: []
    };
  }

  // Count unique CRC32 values
  const uniqueValues = new Set(history.map(h => h.crc32));

  // Count changes (when CRC32 differs from previous)
  let changes = 0;
  for (let i = 0; i < history.length - 1; i++) {
    if (history[i].crc32 !== history[i + 1].crc32) {
      changes++;
    }
  }

  // Duration stats
  const durations = history.map(h => h.generationDuration).filter(d => typeof d === 'number');
  let durationStats = null;
  if (durations.length > 0) {
    const min = Math.min(...durations);
    const max = Math.max(...durations);
    const avg = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
    durationStats = { min, max, avg };
  }

  // CRC32 blocks (consecutive runs of same value)
  const blocks = [];
  let currentBlock = null;
  for (let i = 0; i < history.length; i++) {
    const h = history[i];
    if (!currentBlock || currentBlock.crc32 !== h.crc32) {
      if (currentBlock) blocks.push(currentBlock);
      currentBlock = {
        crc32: h.crc32,
        start: h.timestamp,
        end: h.timestamp,
        count: 1
      };
    } else {
      currentBlock.end = h.timestamp;
      currentBlock.count++;
    }
  }
  if (currentBlock) blocks.push(currentBlock);

  return {
    uniqueCRC32Values: uniqueValues.size,
    changes,
    durationStats,
    blocks
  };
}

/**
 * Delete history for a configuration
 * @param {number} index - Configuration index
 * @returns {Promise<void>}
 */
async function deleteHistory(index) {
  try {
    const historyPath = getHistoryFilePath(index);
    await fs.unlink(historyPath);
    console.log(`[CRC32History] Deleted history for config ${index}`);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn(`[CRC32History] Failed to delete history for config ${index}: ${error.message}`);
    }
  }
}

module.exports = {
  addHistoryEntry,
  getHistory,
  getHistoryStats,
  deleteHistory,
  MAX_HISTORY_ENTRIES
};
