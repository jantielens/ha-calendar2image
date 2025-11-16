const fs = require('fs').promises;
const path = require('path');
const { toCacheName } = require('../utils/sanitize');

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
  EXTRA_DATA: 'extra_data',
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
  
  // Extra Data subtypes
  EXTRA_DATA_FETCH: 'extra_data_fetch',
  EXTRA_DATA_REFRESH: 'extra_data_refresh',
  EXTRA_DATA_ERROR: 'extra_data_error',
  
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
 * @property {string} configName - Configuration name or index as string
 * @property {string} eventType - Type of event (from EVENT_TYPES)
 * @property {string} eventSubtype - Specific trigger (from EVENT_SUBTYPES)
 * @property {Object} metadata - Additional event data
 */

/**
 * Get timeline file path for a configuration name
 * @param {string|number} name - Configuration name or index
 * @returns {string} Timeline file path
 */
function getTimelineFilePath(name) {
  const cacheName = toCacheName(String(name));
  return path.join(CACHE_DIR, `${cacheName}.timeline.json`);
}

/**
 * Load timeline events from disk
 * @param {string|number} name - Configuration name or index
 * @returns {Promise<TimelineEvent[]>} Array of timeline events
 */
async function loadTimeline(name) {
  try {
    const timelinePath = getTimelineFilePath(name);
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
      await saveTimeline(name, prunedEvents);
      console.log(`[Timeline] Pruned ${events.length - prunedEvents.length} old events for config ${name}`);
    }
    
    return prunedEvents;
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File doesn't exist yet, return empty array
      return [];
    }
    console.error(`[Timeline] Error loading timeline for config ${name}:`, error.message);
    return [];
  }
}

/**
 * Save timeline events to disk
 * @param {string|number} name - Configuration name or index
 * @param {TimelineEvent[]} events - Array of timeline events
 * @returns {Promise<void>}
 */
async function saveTimeline(name, events) {
  try {
    // Ensure cache directory exists
    await fs.mkdir(CACHE_DIR, { recursive: true });
    
    const timelinePath = getTimelineFilePath(name);
    await fs.writeFile(timelinePath, JSON.stringify(events, null, 2), 'utf8');
  } catch (error) {
    console.error(`[Timeline] Error saving timeline for config ${name}:`, error.message);
    throw error;
  }
}

/**
 * Log a timeline event
 * @param {string|number} name - Configuration name or index
 * @param {string} eventType - Type of event (from EVENT_TYPES)
 * @param {string} eventSubtype - Specific trigger (from EVENT_SUBTYPES)
 * @param {Object} metadata - Additional event data
 * @returns {Promise<void>}
 */
async function logEvent(name, eventType, eventSubtype, metadata = {}) {
  try {
    // Create event object
    const event = {
      timestamp: new Date().toISOString(),
      configName: String(name),
      eventType,
      eventSubtype,
      metadata
    };
    
    // Load existing events
    const events = await loadTimeline(name);
    
    // Add new event at the beginning (newest first)
    events.unshift(event);
    
    // Save updated timeline
    await saveTimeline(name, events);
    
    console.log(`[Timeline] Logged ${eventType}:${eventSubtype} for config ${name}`);
  } catch (error) {
    // Don't throw - timeline logging should not break the main application
    console.error(`[Timeline] Failed to log event for config ${name}:`, error.message);
  }
}

/**
 * Helper function to log generation events
 * @param {string|number} name - Configuration name or index
 * @param {string} subtype - Generation subtype (scheduled, on_demand, boot)
 * @param {Object} metadata - Metadata (crc32, changed, duration, etc.)
 * @returns {Promise<void>}
 */
async function logGeneration(name, subtype, metadata) {
  return logEvent(name, EVENT_TYPES.GENERATION, subtype, metadata);
}

/**
 * Helper function to log download events
 * @param {string|number} name - Configuration name or index
 * @param {string} subtype - Download subtype (image, crc32, crc32_history)
 * @param {Object} metadata - Metadata (ip, userAgent, etc.)
 * @returns {Promise<void>}
 */
async function logDownload(name, subtype, metadata) {
  return logEvent(name, EVENT_TYPES.DOWNLOAD, subtype, metadata);
}

/**
 * Helper function to log ICS calendar events
 * @param {string|number} name - Configuration name or index
 * @param {string} subtype - ICS subtype (fetch_success, fetch_error, parse_error)
 * @param {Object} metadata - Metadata (duration, eventCount, error, etc.)
 * @returns {Promise<void>}
 */
async function logICS(name, subtype, metadata) {
  return logEvent(name, EVENT_TYPES.ICS, subtype, metadata);
}

/**
 * Helper function to log configuration events
 * @param {string|number} name - Configuration name or index
 * @param {string} subtype - Config subtype (file_changed, load_error, etc.)
 * @param {Object} metadata - Metadata (changedFields, error, etc.)
 * @returns {Promise<void>}
 */
async function logConfig(name, subtype, metadata) {
  return logEvent(name, EVENT_TYPES.CONFIG, subtype, metadata);
}

/**
 * Helper function to log system events
 * @param {string|number} name - Configuration name or index
 * @param {string} subtype - System subtype (cache_cleared, startup, etc.)
 * @param {Object} metadata - Metadata
 * @returns {Promise<void>}
 */
async function logSystem(name, subtype, metadata) {
  return logEvent(name, EVENT_TYPES.SYSTEM, subtype, metadata);
}

/**
 * Helper function to log error events
 * @param {string|number} name - Configuration name or index
 * @param {string} subtype - Error subtype (render_error, template_error, etc.)
 * @param {Object} metadata - Metadata (error message, stack trace, etc.)
 * @returns {Promise<void>}
 */
async function logError(name, subtype, metadata) {
  return logEvent(name, EVENT_TYPES.ERROR, subtype, metadata);
}

/**
 * Get all timeline events for a configuration (with automatic pruning)
 * @param {string|number} name - Configuration name or index
 * @returns {Promise<TimelineEvent[]>} Array of timeline events (newest first)
 */
async function getTimeline(name) {
  return loadTimeline(name);
}

/**
 * Get timeline statistics for a configuration
 * @param {string|number} name - Configuration name or index
 * @returns {Promise<Object>} Timeline statistics
 */
async function getTimelineStats(name) {
  const events = await loadTimeline(name);
  
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
