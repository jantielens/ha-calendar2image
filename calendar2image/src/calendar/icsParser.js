const ICAL = require('ical.js');

/**
 * Converts a date to a specific timezone and returns ISO string
 * Uses Intl.DateTimeFormat to get the date/time in target timezone
 * @param {Date} date - The date to convert
 * @param {string} timezone - IANA timezone name (e.g., 'Europe/Berlin')
 * @returns {string} ISO string representation in the target timezone
 */
function convertToTimezone(date, timezone) {
  // Get date components in target timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const parts = formatter.formatToParts(date);
  const getValue = (type) => parts.find(p => p.type === type)?.value;
  
  const year = getValue('year');
  const month = getValue('month');
  const day = getValue('day');
  const hour = getValue('hour');
  const minute = getValue('minute');
  const second = getValue('second');
  
  // Construct ISO string (without timezone offset, representing local time in target timezone)
  return `${year}-${month}-${day}T${hour}:${minute}:${second}.000Z`;
}

/**
 * Parses ICS data and returns structured event objects
 * @param {string} icsData - Raw ICS data
 * @param {Object} options - Parsing options
 * @param {number} options.expandRecurringFrom - Days from today to start expanding recurring events (negative for past)
 * @param {number} options.expandRecurringTo - Days from today to stop expanding recurring events
 * @param {string} options.timezone - IANA timezone name to convert event times to (e.g., 'Europe/Berlin')
 * @returns {Array<Object>} Array of event objects
 * @throws {Error} If ICS data is malformed
 */
function parseICS(icsData, options = {}) {
  const { expandRecurringFrom = -31, expandRecurringTo = 31, timezone } = options;

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

  // First pass: collect all events and identify which are recurrence exceptions
  const masterEvents = new Map(); // uid -> vevent (master recurring events)
  const recurrenceExceptions = new Map(); // uid -> Map(recurrenceId -> vevent)
  
  for (const vevent of vevents) {
    try {
      const event = new ICAL.Event(vevent);
      const uid = event.uid;
      
      // Check if this is a recurrence exception (has RECURRENCE-ID property)
      const recurrenceId = vevent.getFirstPropertyValue('recurrence-id');
      
      if (recurrenceId) {
        // This is a modified occurrence of a recurring event
        if (!recurrenceExceptions.has(uid)) {
          recurrenceExceptions.set(uid, new Map());
        }
        // Store using the recurrence-id time as key for matching
        const recurrenceKey = recurrenceId.toString();
        recurrenceExceptions.get(uid).set(recurrenceKey, vevent);
      } else if (event.isRecurring()) {
        // This is a master recurring event
        masterEvents.set(uid, vevent);
      } else {
        // This is a simple non-recurring event
        events.push(createEventObject(event, null, timezone));
      }
    } catch (error) {
      console.warn(`Warning: Failed to process event: ${error.message}`);
    }
  }

  // Second pass: expand recurring events and apply exceptions
  for (const [uid, vevent] of masterEvents) {
    try {
      const event = new ICAL.Event(vevent);
      const exceptions = recurrenceExceptions.get(uid) || new Map();
      
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

        // Check if this occurrence has been modified (RECURRENCE-ID) or cancelled (EXDATE)
        const occurrenceKey = next.toString();
        
        if (exceptions.has(occurrenceKey)) {
          // Use the modified occurrence instead of the master event
          const exceptionEvent = new ICAL.Event(exceptions.get(occurrenceKey));
          events.push(createEventObject(exceptionEvent, null, timezone));
        } else {
          // Normal occurrence from master event
          events.push(createEventObject(event, next, timezone));
        }
      }
    } catch (error) {
      console.warn(`Warning: Failed to expand recurring event: ${error.message}`);
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
 * @param {string} [timezone] - IANA timezone name to convert event times to
 * @returns {Object} Standardized event object
 */
function createEventObject(event, occurrenceDate = null, timezone = null) {
  const startDate = occurrenceDate || event.startDate;
  const duration = event.duration;
  const endDate = startDate.clone();
  endDate.addDuration(duration);

  let startISO = startDate.toJSDate().toISOString();
  let endISO = endDate.toJSDate().toISOString();

  // Apply timezone conversion if specified
  if (timezone) {
    try {
      startISO = convertToTimezone(startDate.toJSDate(), timezone);
      endISO = convertToTimezone(endDate.toJSDate(), timezone);
    } catch (error) {
      console.warn(`Warning: Failed to convert event times to timezone ${timezone}: ${error.message}`);
    }
  }

  return {
    uid: event.uid || '',
    summary: event.summary || '',
    description: event.description || '',
    location: event.location || '',
    start: startISO,
    end: endISO,
    isRecurring: event.isRecurring(),
    timezone: timezone || (startDate.zone ? startDate.zone.tzid : null),
    isAllDay: startDate.isDate || false
  };
}

module.exports = {
  parseICS
};
