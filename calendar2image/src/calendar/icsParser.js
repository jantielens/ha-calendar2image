const ICAL = require('ical.js');

/**
 * Parses ICS data and returns structured event objects
 * @param {string} icsData - Raw ICS data
 * @param {Object} options - Parsing options
 * @param {number} options.expandRecurringFrom - Days from today to start expanding recurring events (negative for past)
 * @param {number} options.expandRecurringTo - Days from today to stop expanding recurring events
 * @returns {Array<Object>} Array of event objects
 * @throws {Error} If ICS data is malformed
 */
function parseICS(icsData, options = {}) {
  const { expandRecurringFrom = -31, expandRecurringTo = 31 } = options;

  if (!icsData || typeof icsData !== 'string') {
    throw new Error('Invalid ICS data: must be a non-empty string');
  }

  let jcalData;
  try {
    jcalData = ICAL.parse(icsData);
  } catch (error) {
    throw new Error(`Failed to parse ICS data: ${error.message}`);
  }

  const comp = new ICAL.Component(jcalData);
  const vevents = comp.getAllSubcomponents('vevent');

  if (!vevents || vevents.length === 0) {
    // Empty calendar is valid, just return empty array
    return [];
  }

  const events = [];
  const today = ICAL.Time.now();
  const rangeStart = today.clone();
  rangeStart.adjust(expandRecurringFrom, 0, 0, 0);
  const rangeEnd = today.clone();
  rangeEnd.adjust(expandRecurringTo, 0, 0, 0);

  for (const vevent of vevents) {
    try {
      const event = new ICAL.Event(vevent);

      // Check if event is recurring
      if (event.isRecurring()) {
        // Expand recurring events within the specified range
        const expand = new ICAL.RecurExpansion({
          component: vevent,
          dtstart: event.startDate
        });

        let next;
        while ((next = expand.next())) {
          // Stop if we're past the end of our range
          if (next.compare(rangeEnd) > 0) {
            break;
          }

          // Skip if before our range
          if (next.compare(rangeStart) < 0) {
            continue;
          }

          // Create an occurrence
          const occurrence = createEventObject(event, next);
          events.push(occurrence);
        }
      } else {
        // Non-recurring event
        events.push(createEventObject(event));
      }
    } catch (error) {
      // Log warning but continue processing other events
      console.warn(`Warning: Failed to process event: ${error.message}`);
    }
  }

  // Sort events by start date
  events.sort((a, b) => {
    return new Date(a.start) - new Date(b.start);
  });

  return events;
}

/**
 * Creates a standardized event object
 * @param {ICAL.Event} event - The ICAL event
 * @param {ICAL.Time} [occurrenceDate] - For recurring events, the specific occurrence date
 * @returns {Object} Standardized event object
 */
function createEventObject(event, occurrenceDate = null) {
  const startDate = occurrenceDate || event.startDate;
  const duration = event.duration;
  const endDate = startDate.clone();
  endDate.addDuration(duration);

  return {
    uid: event.uid || '',
    summary: event.summary || '',
    description: event.description || '',
    location: event.location || '',
    start: startDate.toJSDate().toISOString(),
    end: endDate.toJSDate().toISOString(),
    isRecurring: event.isRecurring(),
    timezone: startDate.zone ? startDate.zone.tzid : null,
    isAllDay: startDate.isDate || false
  };
}

module.exports = {
  parseICS
};
