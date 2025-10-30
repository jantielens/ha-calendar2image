const { fetchICS } = require('./icsClient');
const { parseICS } = require('./icsParser');

/**
 * Fetches and parses calendar data from an ICS URL
 * @param {string} url - The ICS URL to fetch
 * @param {Object} options - Parsing options
 * @param {number} options.expandRecurringFrom - Days from today to start expanding recurring events
 * @param {number} options.expandRecurringTo - Days from today to stop expanding recurring events
 * @returns {Promise<Array<Object>>} Array of event objects
 */
async function getCalendarEvents(url, options = {}) {
  const icsData = await fetchICS(url);
  const events = parseICS(icsData, options);
  return events;
}

module.exports = {
  fetchICS,
  parseICS,
  getCalendarEvents
};
