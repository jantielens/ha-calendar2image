/**
 * Day View Template
 * A basic day view showing today's schedule
 */

// Configuration - Customize these values to personalize your day view
const CONFIG = {
  // Colors
  colors: {
    background: '#fff',          // Background color of the entire page
    headerText: '#333',          // Color of the date header text
    eventBackground: '#f5f5f5',  // Background color of event cards
    eventBorder: '#4285f4',      // Color of the left border on event cards
    timeText: '#666',            // Color of the time/duration text
    titleText: '#333',           // Color of the event title text
    locationText: '#999',        // Color of the location text
    descriptionText: '#999',     // Color of the description text
    noEventsText: '#999'         // Color of the "no events" message
  },
  
  // Labels and prefixes
  labels: {
    fullDayEvent: 'Full day',    // Text shown for all-day events
    noEvents: 'No events today', // Message when there are no events
    timePrefix: '🕐',            // Emoji/icon before time
    locationPrefix: '📍'         // Emoji/icon before location
  },
  
  // Fonts
  fonts: {
    family: 'Arial, sans-serif',    // Font family for all text
    headerSize: '24px',             // Font size of the date header
    headerWeight: 'bold',           // Font weight of the date header
    timeSize: '14px',               // Font size of event time
    titleSize: '16px',              // Font size of event title
    titleWeight: 'bold',            // Font weight of event title
    locationSize: '13px',           // Font size of location text
    descriptionSize: '13px',        // Font size of description text
    descriptionLineHeight: '1.4'   // Line height for description text
  },
  
  // Spacing
  spacing: {
    bodyPadding: '20px',         // Padding around the entire page
    headerMarginBottom: '20px',  // Space below the date header
    eventPadding: '12px',        // Padding inside event cards
    eventMarginBottom: '8px',    // Space between event cards
    eventBorderWidth: '4px',     // Width of the left border on events
    timeMarginBottom: '4px',     // Space below the time text
    locationMarginTop: '4px',    // Space above the location text
    descriptionMarginTop: '6px', // Space above the description text
    noEventsPadding: '20px'      // Padding for the "no events" message
  },
  
  // Date format
  dateFormat: {
    options: {
      weekday: 'long',  // Day of week format (e.g., "Monday")
      month: 'long',    // Month format (e.g., "January")
      day: 'numeric',   // Day format (e.g., "15")
      year: 'numeric'   // Year format (e.g., "2025")
    }
  }
};

module.exports = function dayView(data) {
  const { events, now, locale } = data;
  
  const currentDate = new Date(now);
  const dayStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  
  // Filter events for today
  const todayEvents = events.filter(event => {
    const start = new Date(event.start);
    const end = new Date(event.end);
    return (start >= dayStart && start < dayEnd) || (start < dayStart && end > dayStart);
  });
  
  // Sort by start time
  todayEvents.sort((a, b) => new Date(a.start) - new Date(b.start));
  
  // Format date header
  const dateHeader = currentDate.toLocaleDateString(
    locale,
    CONFIG.dateFormat.options
  );
  
  // Build event list HTML
  const eventListHTML = todayEvents.map(event => {
    const start = new Date(event.start);
    const end = new Date(event.end);
    
    let timeStr;
    if (event.allDay) {
      timeStr = CONFIG.labels.fullDayEvent;
    } else {
      timeStr = `${CONFIG.labels.timePrefix} ${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')} - ${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`;
    }
    
    return `
      <div class="event">
        <div class="time">${timeStr}</div>
        <div class="title">${event.summary}</div>
        ${event.location ? `<div class="location">${CONFIG.labels.locationPrefix} ${event.location}</div>` : ''}
        ${event.description ? `<div class="description">${event.description}</div>` : ''}
      </div>
    `;
  }).join('');
  
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: ${CONFIG.fonts.family};
      margin: 0;
      padding: ${CONFIG.spacing.bodyPadding};
      background: ${CONFIG.colors.background};
    }
    .header {
      font-size: ${CONFIG.fonts.headerSize};
      font-weight: ${CONFIG.fonts.headerWeight};
      margin-bottom: ${CONFIG.spacing.headerMarginBottom};
      color: ${CONFIG.colors.headerText};
    }
    .event {
      padding: ${CONFIG.spacing.eventPadding};
      margin-bottom: ${CONFIG.spacing.eventMarginBottom};
      background: ${CONFIG.colors.eventBackground};
      border-left: ${CONFIG.spacing.eventBorderWidth} solid ${CONFIG.colors.eventBorder};
    }
    .time {
      font-size: ${CONFIG.fonts.timeSize};
      color: ${CONFIG.colors.timeText};
      margin-bottom: ${CONFIG.spacing.timeMarginBottom};
    }
    .title {
      font-size: ${CONFIG.fonts.titleSize};
      font-weight: ${CONFIG.fonts.titleWeight};
      color: ${CONFIG.colors.titleText};
    }
    .location {
      font-size: ${CONFIG.fonts.locationSize};
      color: ${CONFIG.colors.locationText};
      margin-top: ${CONFIG.spacing.locationMarginTop};
    }
    .description {
      font-size: ${CONFIG.fonts.descriptionSize};
      color: ${CONFIG.colors.descriptionText};
      margin-top: ${CONFIG.spacing.descriptionMarginTop};
      line-height: ${CONFIG.fonts.descriptionLineHeight};
    }
    .no-events {
      padding: ${CONFIG.spacing.noEventsPadding};
      text-align: center;
      color: ${CONFIG.colors.noEventsText};
    }
  </style>
</head>
<body>
  <div class="header">${dateHeader}</div>
  ${todayEvents.length > 0 ? eventListHTML : `<div class="no-events">${CONFIG.labels.noEvents}</div>`}
</body>
</html>
  `;
};
