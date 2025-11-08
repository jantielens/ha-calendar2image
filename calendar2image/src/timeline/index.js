const fs = require('fs').promises;
const path = require('path');

// Cache directory - use same as other cache files
const CACHE_DIR = process.env.CACHE_DIR || path.join(process.cwd(), '..', 'data', 'cache');

// Timeline retention period (24 hours in milliseconds)
const RETENTION_PERIOD_MS = 24 * 60 * 60 * 1000;

/**
 * Event type constants
 */
const EVENT_TYPES = {
  GENERATION: 'generation',
  DOWNLOAD: 'download',
  ICS: 'ics',
  CONFIG: 'config',
  SYSTEM: 'system',
  ERROR: 'error'
};

/**
 * Event subtype constants
 */
const EVENT_SUBTYPES = {
  // Generation subtypes
  SCHEDULED: 'scheduled',
  ON_DEMAND: 'on_demand',
  BOOT: 'boot',
  
  // Download subtypes
  IMAGE: 'image',
  CRC32: 'crc32',
  CRC32_HISTORY: 'crc32_history',
  
  // ICS subtypes
  FETCH_SUCCESS: 'fetch_success',
  FETCH_ERROR: 'fetch_error',
  PARSE_ERROR: 'parse_error',
  
  // Config subtypes
  FILE_CHANGED: 'file_changed',
  FILE_DETECTED: 'file_detected',
  LOAD_ERROR: 'load_error',
  TEMPLATE_CHANGED: 'template_changed',
  
  // System subtypes
  SCHEDULER_STARTED: 'scheduler_started',
  SCHEDULER_STOPPED: 'scheduler_stopped',
  SCHEDULER_SKIPPED: 'scheduler_skipped',
  APP_STARTUP: 'app_startup',
  
  // Error subtypes
  GENERATION_ERROR: 'generation_error',
  ICS_ERROR: 'ics_error',
  CONFIG_ERROR: 'config_error'
};

/**
 * @typedef {Object} TimelineEvent
 * @property {string} timestamp - ISO 8601 timestamp
 * @property {number} configIndex - Configuration index
 * @property {string} eventType - Type of event (from EVENT_TYPES)
 * @property {string} eventSubtype - Specific trigger (from EVENT_SUBTYPES)
 * @property {Object} metadata - Additional event data
 */

/**
 * Get timeline file path for a configuration index
 * @param {number} index - Configuration index
 * @returns {string} Timeline file path
 */
function getTimelineFilePath(index) {
  return path.join(CACHE_DIR, `${index}.timeline.json`);
}

/**
 * Load timeline events from disk
 * @param {number} index - Configuration index
 * @returns {Promise<TimelineEvent[]>} Array of timeline events
 */
async function loadTimeline(index) {
  try {
    const timelinePath = getTimelineFilePath(index);
    const data = await fs.readFile(timelinePath, 'utf8');
    const events = JSON.parse(data);
    
    // Prune old events (older than 24 hours)
    const now = Date.now();
    const prunedEvents = events.filter(event => {
      const eventTime = new Date(event.timestamp).getTime();
      return (now - eventTime) < RETENTION_PERIOD_MS;
    });
    
    // If events were pruned, save the pruned version
    if (prunedEvents.length < events.length) {
      await saveTimeline(index, prunedEvents);
      console.log(`[Timeline] Pruned ${events.length - prunedEvents.length} old events for config ${index}`);
    }
    
    return prunedEvents;
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File doesn't exist yet, return empty array
      return [];
    }
    console.error(`[Timeline] Error loading timeline for config ${index}:`, error.message);
    return [];
  }
}

/**
 * Save timeline events to disk
 * @param {number} index - Configuration index
 * @param {TimelineEvent[]} events - Array of timeline events
 * @returns {Promise<void>}
 */
async function saveTimeline(index, events) {
  try {
    // Ensure cache directory exists
    await fs.mkdir(CACHE_DIR, { recursive: true });
    
    const timelinePath = getTimelineFilePath(index);
    await fs.writeFile(timelinePath, JSON.stringify(events, null, 2), 'utf8');
  } catch (error) {
    console.error(`[Timeline] Error saving timeline for config ${index}:`, error.message);
    throw error;
  }
}

/**
 * Log a timeline event
 * @param {number} configIndex - Configuration index
 * @param {string} eventType - Type of event (from EVENT_TYPES)
 * @param {string} eventSubtype - Specific trigger (from EVENT_SUBTYPES)
 * @param {Object} metadata - Additional event data
 * @returns {Promise<void>}
 */
async function logEvent(configIndex, eventType, eventSubtype, metadata = {}) {
  try {
    // Create event object
    const event = {
      timestamp: new Date().toISOString(),
      configIndex,
      eventType,
      eventSubtype,
      metadata
    };
    
    // Load existing events
    const events = await loadTimeline(configIndex);
    
    // Add new event at the beginning (newest first)
    events.unshift(event);
    
    // Save updated timeline
    await saveTimeline(configIndex, events);
    
    console.log(`[Timeline] Logged ${eventType}:${eventSubtype} for config ${configIndex}`);
  } catch (error) {
    // Don't throw - timeline logging should not break the main application
    console.error(`[Timeline] Failed to log event for config ${configIndex}:`, error.message);
  }
}

/**
 * Helper function to log generation events
 * @param {number} configIndex - Configuration index
 * @param {string} subtype - Generation subtype (scheduled, on_demand, boot)
 * @param {Object} metadata - Metadata (crc32, changed, duration, etc.)
 * @returns {Promise<void>}
 */
async function logGeneration(configIndex, subtype, metadata) {
  return logEvent(configIndex, EVENT_TYPES.GENERATION, subtype, metadata);
}

/**
 * Helper function to log download events
 * @param {number} configIndex - Configuration index
 * @param {string} subtype - Download subtype (image, crc32, crc32_history)
 * @param {Object} metadata - Metadata (ip, userAgent, etc.)
 * @returns {Promise<void>}
 */
async function logDownload(configIndex, subtype, metadata) {
  return logEvent(configIndex, EVENT_TYPES.DOWNLOAD, subtype, metadata);
}

/**
 * Helper function to log ICS calendar events
 * @param {number} configIndex - Configuration index
 * @param {string} subtype - ICS subtype (fetch_success, fetch_error, parse_error)
 * @param {Object} metadata - Metadata (duration, eventCount, error, etc.)
 * @returns {Promise<void>}
 */
async function logICS(configIndex, subtype, metadata) {
  return logEvent(configIndex, EVENT_TYPES.ICS, subtype, metadata);
}

/**
 * Helper function to log configuration events
 * @param {number} configIndex - Configuration index
 * @param {string} subtype - Config subtype (file_changed, load_error, etc.)
 * @param {Object} metadata - Metadata (changedFields, error, etc.)
 * @returns {Promise<void>}
 */
async function logConfig(configIndex, subtype, metadata) {
  return logEvent(configIndex, EVENT_TYPES.CONFIG, subtype, metadata);
}

/**
 * Helper function to log system events
 * @param {number} configIndex - Configuration index
 * @param {string} subtype - System subtype (scheduler_started, app_startup, etc.)
 * @param {Object} metadata - Metadata
 * @returns {Promise<void>}
 */
async function logSystem(configIndex, subtype, metadata = {}) {
  return logEvent(configIndex, EVENT_TYPES.SYSTEM, subtype, metadata);
}

/**
 * Helper function to log error events
 * @param {number} configIndex - Configuration index
 * @param {string} subtype - Error subtype (generation_error, ics_error, etc.)
 * @param {Object} metadata - Metadata (error message, stack, etc.)
 * @returns {Promise<void>}
 */
async function logError(configIndex, subtype, metadata) {
  return logEvent(configIndex, EVENT_TYPES.ERROR, subtype, metadata);
}

/**
 * Get all timeline events for a configuration (with automatic pruning)
 * @param {number} configIndex - Configuration index
 * @returns {Promise<TimelineEvent[]>} Array of timeline events (newest first)
 */
async function getTimeline(configIndex) {
  return loadTimeline(configIndex);
}

/**
 * Get timeline statistics for a configuration
 * @param {number} configIndex - Configuration index
 * @returns {Promise<Object>} Timeline statistics
 */
async function getTimelineStats(configIndex) {
  const events = await loadTimeline(configIndex);
  
  const stats = {
    totalEvents: events.length,
    byType: {},
    oldestEvent: events.length > 0 ? events[events.length - 1].timestamp : null,
    newestEvent: events.length > 0 ? events[0].timestamp : null
  };
  
  // Count events by type
  events.forEach(event => {
    const key = `${event.eventType}:${event.eventSubtype}`;
    stats.byType[key] = (stats.byType[key] || 0) + 1;
  });
  
  return stats;
}

module.exports = {
  EVENT_TYPES,
  EVENT_SUBTYPES,
  logEvent,
  logGeneration,
  logDownload,
  logICS,
  logConfig,
  logSystem,
  logError,
  getTimeline,
  getTimelineStats,
  RETENTION_PERIOD_MS
};
