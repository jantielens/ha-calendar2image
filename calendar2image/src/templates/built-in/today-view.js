/**
 * Today View Template
 * Displays only today's events
 * 
 * @param {Object} data - Template data
 * @param {Array} data.events - Array of calendar events
 * @param {Object} data.config - Configuration object
 * @param {number} data.now - Current timestamp
 * @returns {string} HTML string
 */
module.exports = function todayView(data) {
  const { events, now } = data;
  
  // Get today's date boundaries
  const today = new Date(now);
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const todayEnd = todayStart + (24 * 60 * 60 * 1000) - 1;
  
  // Filter events to today only
  // Include events that:
  // 1. Start today, OR
  // 2. Are ongoing (started before today but end during or after today)
  const todayEvents = events.filter(event => {
    const eventStart = new Date(event.start).getTime();
    const eventEnd = new Date(event.end).getTime();
    
    // Include if event starts today
    if (eventStart >= todayStart && eventStart <= todayEnd) {
      return true;
    }
    
    // Include if event is ongoing (started before today but ends today or later)
    if (eventStart < todayStart && eventEnd >= todayStart) {
      return true;
    }
    
    return false;
  });

  // Sort events by start time
  todayEvents.sort((a, b) => {
    return new Date(a.start).getTime() - new Date(b.start).getTime();
  });

  // Format time
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  // Format today's date
  const formatTodayDate = () => {
    return today.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Check if event is all-day
  const isAllDay = (event) => {
    return event.allDay || false;
  };

  // Generate HTML
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: Arial, Helvetica, sans-serif;
      padding: 20px;
      background: white;
      color: #333;
    }
    
    .header {
      font-size: 28px;
      font-weight: bold;
      margin-bottom: 10px;
      color: #0066cc;
    }
    
    .date {
      font-size: 16px;
      color: #666;
      margin-bottom: 30px;
      padding-bottom: 15px;
      border-bottom: 2px solid #0066cc;
    }
    
    .event {
      margin-bottom: 15px;
      padding: 15px;
      background: #f8f9fa;
      border-left: 4px solid #0066cc;
      border-radius: 4px;
      position: relative;
    }
    
    .event:hover {
      background: #e9ecef;
    }
    
    .event-time {
      font-size: 18px;
      font-weight: bold;
      color: #0066cc;
      margin-bottom: 8px;
    }
    
    .event-title {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 6px;
    }
    
    .event-description {
      font-size: 13px;
      color: #555;
      margin-top: 6px;
      line-height: 1.4;
    }
    
    .event-location {
      font-size: 12px;
      color: #777;
      margin-top: 6px;
    }
    
    .all-day-event {
      border-left-color: #28a745;
    }
    
    .all-day-badge {
      display: inline-block;
      background: #28a745;
      color: white;
      padding: 3px 8px;
      border-radius: 3px;
      font-size: 12px;
      font-weight: bold;
      margin-bottom: 8px;
    }
    
    .no-events {
      text-align: center;
      padding: 40px;
      font-size: 16px;
      color: #999;
      font-style: italic;
    }
    
    .event-count {
      font-size: 14px;
      color: #666;
      margin-bottom: 20px;
    }
  </style>
</head>
<body>
  <div class="header">Today's Events</div>
  <div class="date">${formatTodayDate()}</div>
  
  ${todayEvents.length > 0 ? `
    <div class="event-count">${todayEvents.length} event${todayEvents.length !== 1 ? 's' : ''} today</div>
  ` : ''}
  
  ${todayEvents.length === 0 ? `
    <div class="no-events">No events scheduled for today</div>
  ` : ''}
  
  ${todayEvents.map(event => `
    <div class="event ${isAllDay(event) ? 'all-day-event' : ''}">
      ${isAllDay(event) ? `
        <div class="all-day-badge">ALL DAY</div>
      ` : `
        <div class="event-time">
          ⏰ ${formatTime(event.start)}${event.end ? ' - ' + formatTime(event.end) : ''}
        </div>
      `}
      <div class="event-title">${event.title || 'Untitled Event'}</div>
      ${event.location ? `
        <div class="event-location">📍 ${event.location}</div>
      ` : ''}
      ${event.description ? `
        <div class="event-description">${event.description}</div>
      ` : ''}
    </div>
  `).join('')}
</body>
</html>
  `.trim();
};
