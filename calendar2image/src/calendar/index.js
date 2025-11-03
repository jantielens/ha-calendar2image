const { fetchICS } = require('./icsClient');
const { parseICS } = require('./icsParser');

/**
 * Creates error events for a failed ICS source
 * @param {number} sourceIndex - Index of the failed source
 * @param {string} sourceName - Optional name of the failed source  
 * @param {string} errorMessage - The error message to display
 * @param {Object} options - Parsing options for date range
 * @returns {Array<Object>} Array of error event objects
 */
function createErrorEvents(sourceIndex, sourceName, errorMessage, options = {}) {
  const { expandRecurringFrom = -31, expandRecurringTo = 31 } = options;
  const today = new Date();
  const events = [];
  
  // Truncate error message if too long (for better display)
  const shortError = errorMessage.length > 50 
    ? errorMessage.substring(0, 47) + '...' 
    : errorMessage;
  
  // Create one error event per day in the configured range
  for (let dayOffset = expandRecurringFrom; dayOffset <= expandRecurringTo; dayOffset++) {
    const eventDate = new Date(today);
    eventDate.setDate(today.getDate() + dayOffset);
    
    // Set to start of day in local timezone
    const startOfDay = new Date(eventDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const errorEvent = {
      summary: `Failed loading ICS ${sourceIndex}: ${shortError}`,
      title: `Failed loading ICS ${sourceIndex}: ${shortError}`,
      description: `Error loading calendar source ${sourceIndex}: ${errorMessage}`,
      start: startOfDay.toISOString(),
      end: startOfDay.toISOString(),
      allDay: true,
      isAllDay: true,
      source: sourceIndex,
      error: errorMessage
    };
    
    // Add sourceName if provided
    if (sourceName) {
      errorEvent.sourceName = sourceName;
    }
    
    events.push(errorEvent);
  }
  
  return events;
}

/**
 * Fetches and parses calendar data from ICS URL(s)
 * @param {string|Array} icsUrlConfig - Single URL string or array of source objects
 * @param {Object} options - Parsing options
 * @param {number} options.expandRecurringFrom - Days from today to start expanding recurring events
 * @param {number} options.expandRecurringTo - Days from today to stop expanding recurring events
 * @param {string} options.timezone - IANA timezone name for event conversion
 * @returns {Promise<Array<Object>>} Array of event objects with normalized field names and source information
 */
async function getCalendarEvents(icsUrlConfig, options = {}) {
  // Handle backward compatibility: convert string to array format
  const sources = typeof icsUrlConfig === 'string' 
    ? [{ url: icsUrlConfig }] 
    : icsUrlConfig;

  // Fetch all ICS sources in parallel
  const fetchPromises = sources.map(async (source, index) => {
    try {
      const icsData = await fetchICS(source.url);
      const events = parseICS(icsData, options);
      
      // Add source information to each event and normalize field names
      return events.map(event => ({
        ...event,
        title: event.summary,
        allDay: event.isAllDay,
        source: index,
        ...(source.sourceName && { sourceName: source.sourceName })
      }));
    } catch (error) {
      console.warn(`[Calendar] Failed to fetch ICS from source ${index} (${source.url}): ${error.message}`);
      
      // Return error events for this failed source with the actual error message
      return createErrorEvents(index, source.sourceName, error.message, options);
    }
  });

  // Wait for all sources to complete (successful or failed)
  const eventArrays = await Promise.all(fetchPromises);
  
  // Flatten and return combined events from all sources
  return eventArrays.flat();
}

module.exports = {
  fetchICS,
  parseICS,
  getCalendarEvents,
  createErrorEvents
};
