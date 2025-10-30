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
  daysToShow: 7,
  
  // Visual symbols
  symbols: {
    noEvents: 'No events',
    allDay: '🕛'
  },
  
  // Font sizes (adjust all typography here)
  fontSize: {
    dayName: '40px',
    dayNumber: '50px',
    eventTitle: '30px',
    eventTime: '30px',
    noEvents: '30px'
  },
  
  // Colors
  colors: {
    background: 'white',
    calendarBg: 'white',
    text: '#000000ff',
    textMuted: '#666',
    textLight: '#999',
    border: '#e0e0e0'
  },
  
  // Dimensions
  dimensions: {
    dayHeaderWidth: '115px',
    dayRowMinHeight: '60px',
    maxWidth: '800px'
  },
  
  // Time format
  timeFormat: {
    multiDayStart: '00:00',
    multiDayEnd: '23:59'
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const getDayStart = (timestamp) => {
  const date = new Date(timestamp);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
};

const formatTime = (dateString) => {
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

const getDisplayTimes = (event, day) => {
  const eventStart = new Date(event.start).getTime();
  const eventEnd = new Date(event.end).getTime();
  const startDay = getDayStart(event.start);
  const endDay = getDayStart(event.end);
  const isMultiDay = endDay > startDay;
  
  if (!isMultiDay) {
    return { start: formatTime(event.start), end: formatTime(event.end) };
  }
  
  return {
    start: day.dayStart > startDay ? CONFIG.timeFormat.multiDayStart : formatTime(event.start),
    end: eventEnd > day.dayEnd ? CONFIG.timeFormat.multiDayEnd : formatTime(event.end)
  };
};

const createDaysArray = (startTimestamp, daysCount) => {
  const days = [];
  for (let i = 0; i < daysCount; i++) {
    const dayStart = startTimestamp + (i * MS_PER_DAY);
    const dayEnd = dayStart + MS_PER_DAY - 1;
    const date = new Date(dayStart);
    const dayKey = date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'numeric',
      day: 'numeric'
    });
    days.push({ dayKey, dayStart, dayEnd, date });
  }
  return days;
};

const groupEventsByDay = (events, days) => {
  const eventsByDay = {};
  days.forEach(day => eventsByDay[day.dayKey] = []);
  
  events.forEach(event => {
    const eventStart = new Date(event.start).getTime();
    const eventEnd = new Date(event.end).getTime();
    
    days.forEach(day => {
      if (eventStart < day.dayEnd && eventEnd > day.dayStart) {
        eventsByDay[day.dayKey].push(event);
      }
    });
  });
  
  // Sort events by start time
  Object.values(eventsByDay).forEach(dayEvents => {
    dayEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  });
  
  return eventsByDay;
};

// ============================================================================
// HTML RENDERING
// ============================================================================
const renderEvent = (event, day) => {
  const times = getDisplayTimes(event, day);
  const isAllDay = event.allDay || false;
  const title = event.title || 'Untitled Event';
  const timeDisplay = isAllDay ? CONFIG.symbols.allDay : `${times.start} - ${times.end}`;
  const timeClass = isAllDay ? 'all-day-badge' : '';
  
  return `
        <div class="event-item">
          <div class="event-title">${title}</div>
          <div class="event-time ${timeClass}">${timeDisplay}</div>
        </div>`;
};

const renderDay = (day, events) => {
  const dayOfWeek = day.date.toLocaleDateString(undefined, { weekday: 'short' });
  const dayOfMonth = day.date.getDate();
  const hasEvents = events.length > 0;
  
  return `
    <div class="day-row">
      <div class="day-header">
        <div class="day-name">${dayOfWeek}</div>
        <div class="day-number">${dayOfMonth}</div>
      </div>
      <div class="events-container">
        ${hasEvents ? events.map(e => renderEvent(e, day)).join('') : `
        <div class="no-events">${CONFIG.symbols.noEvents}</div>`}
      </div>
    </div>`;
};

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
  const { events, now } = data;
  const todayStart = getDayStart(now);
  const days = createDaysArray(todayStart, CONFIG.daysToShow);
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
    <div class="calendar-title">Week View</div>
  ${days.map(day => renderDay(day, eventsByDay[day.dayKey])).join('')}
  </div>
</body>
</html>
  `.trim();
};
