const { fetchICS } = require('./icsClient');
const { parseICS } = require('./icsParser');

/**
 * Fetches and parses calendar data from an ICS URL
 * @param {string} url - The ICS URL to fetch
 * @param {Object} options - Parsing options
 * @param {number} options.expandRecurringFrom - Days from today to start expanding recurring events
 * @param {number} options.expandRecurringTo - Days from today to stop expanding recurring events
 * @returns {Promise<Array<Object>>} Array of event objects with normalized field names
 */
async function getCalendarEvents(url, options = {}) {
  const icsData = await fetchICS(url);
  const events = parseICS(icsData, options);
  
  // Normalize field names for template compatibility
  // Map ICS 'summary' field to 'title' for easier template usage
  return events.map(event => ({
    ...event,
    title: event.summary,
    allDay: event.isAllDay
  }));
}

module.exports = {
  fetchICS,
  parseICS,
  getCalendarEvents
};
