/**
 * Week View Template
 * Displays events for the next 7 days, grouped by day
 * 
 * @param {Object} data - Template data
 * @param {Array} data.events - Array of calendar events
 * @param {Object} data.config - Configuration object
 * @param {number} data.now - Current timestamp
 * @returns {string} HTML string
 */

// ============================================================================
// CONFIGURATION - Customize these values easily
// ============================================================================
const CONFIG = {
  // Calendar settings
  daysToShow: 7,                      // Number of days to display in the week view
  
  // Text labels and symbols
  symbols: {
    title: 'Weekly Calendar 📆',               // Calendar title shown at the top
    noEvents: 'No events 🎉',         // Message shown when a day has no events
    allDay: 'all day'                 // Label for all-day events
  },
  
  // Multi-day event time display
  timeFormat: {
    multiDayStart: '00:00',           // Time shown for events starting before this day
    multiDayEnd: '23:59'              // Time shown for events ending after this day
  },
  
  // Typography
  fontSize: {
    dayName: '40px',                  // Font size for day of week (Mon, Tue, etc.)
    dayNumber: '50px',                // Font size for day number (1, 2, 3, etc.)
    eventTitle: '30px',               // Font size for event titles
    eventTime: '30px',                // Font size for event times
    noEvents: '30px'                  // Font size for "no events" message
  },
  
  // Color scheme
  colors: {
    background: 'white',              // Body background color
    calendarBg: 'white',              // Calendar container background
    text: '#000000ff',                // Primary text color
    textMuted: '#666',                // Secondary text color (times, all-day badge)
    textLight: '#999',                // Light text color (no events message)
    border: '#e0e0e0'                 // Border color for dividers
  },
  
  // Layout dimensions
  dimensions: {
    dayHeaderWidth: '115px',          // Width of the left column showing day/date
    dayRowMinHeight: '60px',          // Minimum height for each day row
    maxWidth: '800px'                 // Maximum width of the calendar container
  }
};

// ============================================================================
// HTML RENDERING
// ============================================================================

// Render a single event item
const renderEvent = (event, day, locale) => {
  const title = event.summary || 'Untitled Event';
  const isAllDay = event.allDay || false;
  
  if (isAllDay) {
    return `
        <div class="event-item">
          <div class="event-title">${title}</div>
          <div class="event-time all-day-badge">${CONFIG.symbols.allDay}</div>
        </div>`;
  }
  
  const times = getDisplayTimes(event, day, locale);
  return `
        <div class="event-item">
          <div class="event-title">${title}</div>
          <div class="event-time">${times.start} - ${times.end}</div>
        </div>`;
};

// Render a complete day row with header and events
const renderDay = (day, events, locale) => {
  const dayOfWeek = day.date.toLocaleDateString(locale, { weekday: 'short' });
  const dayOfMonth = day.date.getDate();
  
  const eventsHtml = events.length > 0
    ? events.map(e => renderEvent(e, day, locale)).join('')
    : `<div class="no-events">${CONFIG.symbols.noEvents}</div>`;
  
  return `
    <div class="day-row">
      <div class="day-header">
        <div class="day-name">${dayOfWeek}</div>
        <div class="day-number">${dayOfMonth}</div>
      </div>
      <div class="events-container">
        ${eventsHtml}
      </div>
    </div>`;
};

// Generate CSS styles for the calendar
const generateStyles = () => `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      background: ${CONFIG.colors.background};
      color: ${CONFIG.colors.text};
    }
    
    .calendar {
      background: ${CONFIG.colors.calendarBg};
      max-width: ${CONFIG.dimensions.maxWidth};
      margin: 0;
    }
    
    .calendar-title {
      font-size: 32px;
      font-weight: 700;
      padding: 20px 15px;
      text-align: center;
      border-bottom: 2px solid ${CONFIG.colors.border};
    }
    
    .day-row {
      display: flex;
      border-bottom: 1px solid ${CONFIG.colors.border};
      min-height: ${CONFIG.dimensions.dayRowMinHeight};
    }
    
    .day-row:last-child {
      border-bottom: none;
    }
    
    .day-header {
      width: ${CONFIG.dimensions.dayHeaderWidth};
      flex-shrink: 0;
      padding: 12px 15px;
      background: ${CONFIG.colors.calendarBg};
      border-right: 1px solid ${CONFIG.colors.border};
      text-align: center;
    }
    
    .day-name {
      font-size: ${CONFIG.fontSize.dayName};
      font-weight: 600;
      margin-bottom: 0;
      line-height: 1.1;
    }
    
    .day-number {
      font-size: ${CONFIG.fontSize.dayNumber};
      font-weight: 600;
      line-height: 0.9;
    }
    
    .events-container {
      flex: 1;
      padding: 4px 8px;
    }
    
    .event-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 2px 0;
      min-height: 32px;
    }
    
    .event-title {
      font-size: ${CONFIG.fontSize.eventTitle};
      font-weight: 400;
      flex: 1;
    }
    
    .event-time {
      font-size: ${CONFIG.fontSize.eventTime};
      color: ${CONFIG.colors.textMuted};
      margin-left: 10px;
      white-space: nowrap;
    }
    
    .all-day-badge {
      color: ${CONFIG.colors.textMuted};
    }
    
    .no-events {
      padding: 15px 0;
      color: ${CONFIG.colors.textLight};
      font-size: ${CONFIG.fontSize.noEvents};
    }`;

// ============================================================================
// MAIN TEMPLATE FUNCTION
// ============================================================================
module.exports = function weekView(data) {
  const { events, now, locale } = data;
  const todayStart = getDayStart(now);
  const days = createDaysArray(todayStart, CONFIG.daysToShow, locale);
  const eventsByDay = groupEventsByDay(events, days);
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>${generateStyles()}</style>
</head>
<body>
  <div class="calendar">
    <div class="calendar-title">${CONFIG.symbols.title}</div>
  ${days.map(day => renderDay(day, eventsByDay[day.dayKey], locale)).join('')}
  </div>
</body>
</html>
  `.trim();
};

// ============================================================================
// HELPER FUNCTIONS - No need to modify these
// ============================================================================
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Get the start of day (midnight) for a given timestamp
const getDayStart = (timestamp) => {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

// Format time as HH:MM in 24-hour format
const formatTime = (dateString, locale) => {
  return new Date(dateString).toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

// Get display times for an event, handling multi-day events
const getDisplayTimes = (event, day, locale) => {
  const isMultiDay = getDayStart(event.end) > getDayStart(event.start);
  
  // Single-day events show actual start/end times
  if (!isMultiDay) {
    return { 
      start: formatTime(event.start, locale), 
      end: formatTime(event.end, locale) 
    };
  }
  
  // Multi-day events show 00:00 or 23:59 if they extend beyond current day
  const eventStart = new Date(event.start).getTime();
  const eventEnd = new Date(event.end).getTime();
  
  return {
    start: eventStart < day.dayStart ? CONFIG.timeFormat.multiDayStart : formatTime(event.start, locale),
    end: eventEnd > day.dayEnd ? CONFIG.timeFormat.multiDayEnd : formatTime(event.end, locale)
  };
};

// Create an array of day objects for the specified number of days
const createDaysArray = (startTimestamp, daysCount, locale) => {
  const days = [];
  
  for (let i = 0; i < daysCount; i++) {
    const dayStart = startTimestamp + (i * MS_PER_DAY);
    const dayEnd = dayStart + MS_PER_DAY - 1;
    const date = new Date(dayStart);
    const dayKey = date.toLocaleDateString(locale, {
      weekday: 'short',
      month: 'numeric',
      day: 'numeric'
    });
    days.push({ dayKey, dayStart, dayEnd, date });
  }
  
  return days;
};

// Group events by day, handling multi-day events that span multiple days
const groupEventsByDay = (events, days) => {
  // Initialize empty array for each day
  const eventsByDay = {};
  days.forEach(day => eventsByDay[day.dayKey] = []);
  
  // Add each event to all days it overlaps with
  events.forEach(event => {
    const eventStart = new Date(event.start).getTime();
    const eventEnd = new Date(event.end).getTime();
    
    days.forEach(day => {
      // Event overlaps if it starts before day ends AND ends after day starts
      if (eventStart < day.dayEnd && eventEnd > day.dayStart) {
        eventsByDay[day.dayKey].push(event);
      }
    });
  });
  
  // Sort each day's events by start time
  Object.values(eventsByDay).forEach(dayEvents => {
    dayEvents.sort((a, b) => new Date(a.start) - new Date(b.start));
  });
  
  return eventsByDay;
};
