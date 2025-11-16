const fs = require('fs').promises;
const path = require('path');
const { toCacheName } = require('../utils/sanitize');

const CACHE_DIR = path.join(process.cwd(), '..', 'data', 'cache');
const MAX_HISTORY_ENTRIES = 500;

/**
 * Get CRC32 history file path for a configuration name
 * @param {string|number} name - Configuration name or index
 * @returns {string} History file path
 */
function getHistoryFilePath(name) {
  const cacheName = toCacheName(String(name));
  return path.join(CACHE_DIR, `${cacheName}.crc32-history.json`);
}

/**
 * Load CRC32 history for a configuration
 * @param {string|number} name - Configuration name or index
 * @returns {Promise<Array>} Array of history entries
 */
async function loadHistory(name) {
  try {
    const historyPath = getHistoryFilePath(name);
    const data = await fs.readFile(historyPath, 'utf8');
    const history = JSON.parse(data);
    
    // Validate structure
    if (!Array.isArray(history)) {
      console.warn(`[CRC32History] Invalid history format for config ${name}, resetting`);
      return [];
    }
    
    return history;
  } catch (error) {
    // History file doesn't exist or is corrupted
    if (error.code === 'ENOENT') {
      console.log(`[CRC32History] No history file found for config ${name}`);
    } else {
      console.warn(`[CRC32History] Failed to load history for config ${name}: ${error.message}`);
    }
    return [];
  }
}

/**
 * Save CRC32 history for a configuration
 * @param {string|number} name - Configuration name or index
 * @param {Array} history - Array of history entries
 * @returns {Promise<void>}
 */
async function saveHistory(name, history) {
  try {
    const historyPath = getHistoryFilePath(name);
    await fs.writeFile(historyPath, JSON.stringify(history, null, 2));
  } catch (error) {
    console.error(`[CRC32History] Failed to save history for config ${name}: ${error.message}`);
    throw error;
  }
}

/**
 * Add a CRC32 entry to history
 * Maintains a circular buffer of MAX_HISTORY_ENTRIES
 * 
 * @param {string|number} name - Configuration name or index
 * @param {string} crc32 - CRC32 checksum
 * @param {Object} options - Additional options
 * @param {string} options.trigger - Trigger type (scheduled, fresh, startup, config_change)
 * @param {number} options.generationDuration - Generation duration in ms
 * @param {number} options.imageSize - Image size in bytes
 * @returns {Promise<void>}
 */
async function addHistoryEntry(name, crc32, options = {}) {
  try {
    const {
      trigger = 'unknown',
      generationDuration = null,
      imageSize = null
    } = options;
    
    // Load existing history
    const history = await loadHistory(name);
    
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
    await saveHistory(name, history);
    
    console.log(`[CRC32History] Added entry for config ${name}: ${crc32} (${trigger})`);
  } catch (error) {
    // Don't throw - history is non-critical
    console.error(`[CRC32History] Failed to add history entry for config ${name}: ${error.message}`);
  }
}

/**
 * Get CRC32 history for a configuration
 * @param {string|number} name - Configuration name or index
 * @param {number} limit - Maximum number of entries to return (default: all)
 * @returns {Promise<Array>} Array of history entries (most recent first)
 */
async function getHistory(name, limit = null) {
  const history = await loadHistory(name);
  
  if (limit && limit > 0) {
    return history.slice(0, limit);
  }
  
  return history;
}

/**
 * Get history statistics for a configuration
 * @param {string|number} name - Configuration name or index
 * @returns {Promise<Object>} Statistics object
 */
async function getHistoryStats(name) {
  const history = await loadHistory(name);
  
  if (history.length === 0) {
    return {
      uniqueCRC32Values: 0,
      changes: 0,
      changesInPastHour: 0,
      changesInPast24Hours: 0,
      durationStats: null,
      blocks: []
    };
  }

  // Count unique CRC32 values
  const uniqueValues = new Set(history.map(h => h.crc32));

  // Calculate time thresholds
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Count changes (when CRC32 differs from previous)
  let changes = 0;
  let changesInPastHour = 0;
  let changesInPast24Hours = 0;
  
  for (let i = 0; i < history.length - 1; i++) {
    if (history[i].crc32 !== history[i + 1].crc32) {
      changes++;
      
      const timestamp = new Date(history[i].timestamp);
      if (timestamp >= oneHourAgo) {
        changesInPastHour++;
      }
      if (timestamp >= twentyFourHoursAgo) {
        changesInPast24Hours++;
      }
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
    changesInPastHour,
    changesInPast24Hours,
    durationStats,
    blocks
  };
}

/**
 * Delete history for a configuration
 * @param {string|number} name - Configuration name or index
 * @returns {Promise<void>}
 */
async function deleteHistory(name) {
  try {
    const historyPath = getHistoryFilePath(name);
    await fs.unlink(historyPath);
    console.log(`[CRC32History] Deleted history for config ${name}`);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn(`[CRC32History] Failed to delete history for config ${name}: ${error.message}`);
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
