/**
 * Development Setup Helper
 * 
 * Creates a sample custom template and config for development
 * 
 * Usage:
 *   node dev-setup.js <template-name>
 * 
 * Example:
 *   node dev-setup.js my-custom-calendar
 */

const fs = require('fs');
const path = require('path');

const TEMPLATES_DIR = path.join(__dirname, '..', 'data', 'calendar2image', 'templates');
const CONFIG_DIR = path.join(__dirname, '..', 'data', 'calendar2image');

const templateName = process.argv[2];

if (!templateName) {
  console.error('Usage: node dev-setup.js <template-name>');
  console.error('Example: node dev-setup.js my-custom-calendar');
  process.exit(1);
}

// Ensure directories exist
if (!fs.existsSync(TEMPLATES_DIR)) {
  fs.mkdirSync(TEMPLATES_DIR, { recursive: true });
  console.log(`✓ Created templates directory: ${TEMPLATES_DIR}`);
}

// Create sample template
const templatePath = path.join(TEMPLATES_DIR, `${templateName}.js`);

if (fs.existsSync(templatePath)) {
  console.error(`❌ Template already exists: ${templatePath}`);
  process.exit(1);
}

const templateContent = `/**
 * Custom Template: ${templateName}
 * 
 * This template receives calendar events and renders them as HTML.
 * The HTML will be converted to an image by Puppeteer.
 * 
 * @param {Object} data - Template data
 * @param {Array} data.events - Array of calendar events
 * @param {Object} data.config - Configuration object
 * @param {number} data.now - Current timestamp
 * @returns {string} HTML string
 */
module.exports = function(data) {
  const { events = [], config = {} } = data;
  const now = new Date();

  // Filter to upcoming events (next 7 days)
  const upcomingEvents = events
    .filter(e => new Date(e.start) >= now)
    .filter(e => new Date(e.start) <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000))
    .slice(0, 10);

  return \`
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
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 20px;
          width: \${config.width}px;
          height: \${config.height}px;
          overflow: hidden;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .header h1 {
          font-size: 48px;
          font-weight: 700;
          margin-bottom: 10px;
        }
        .header .subtitle {
          font-size: 20px;
          opacity: 0.9;
        }
        .events {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        .event {
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(10px);
          border-radius: 12px;
          padding: 15px 20px;
          border-left: 4px solid #ffd700;
        }
        .event-title {
          font-size: 24px;
          font-weight: 600;
          margin-bottom: 5px;
        }
        .event-time {
          font-size: 16px;
          opacity: 0.8;
        }
        .no-events {
          text-align: center;
          font-size: 24px;
          opacity: 0.7;
          margin-top: 50px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📅 Upcoming Events</h1>
        <div class="subtitle">Next 7 Days</div>
      </div>
      
      <div class="events">
        \${upcomingEvents.length > 0 
          ? upcomingEvents.map(event => \`
            <div class="event">
              <div class="event-title">\${escapeHtml(event.title)}</div>
              <div class="event-time">
                \${formatDate(event.start)}
                \${event.allDay ? ' (All Day)' : ' at ' + formatTime(event.start)}
              </div>
            </div>
          \`).join('')
          : '<div class="no-events">No upcoming events</div>'
        }
      </div>
    </body>
    </html>
  \`;

  // Helper functions
  function escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  function formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  }

  function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  }
};
`;

fs.writeFileSync(templatePath, templateContent);
console.log(`✓ Created template: ${templatePath}`);

// Find next available config index
let configIndex = 99; // Start at 99 for dev configs
while (fs.existsSync(path.join(CONFIG_DIR, `${configIndex}.json`))) {
  configIndex++;
}

// Create sample config
const configPath = path.join(CONFIG_DIR, `${configIndex}.json`);
const configContent = {
  "icsUrl": "https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics",
  "template": templateName,
  "width": 800,
  "height": 600,
  "grayscale": false,
  "bitDepth": 8,
  "imageType": "png",
  "expandRecurringFrom": -31,
  "expandRecurringTo": 31,
  "preGenerateInterval": "*/5 * * * *"
};

fs.writeFileSync(configPath, JSON.stringify(configContent, null, 2));
console.log(`✓ Created config: ${configPath}`);

console.log('\n' + '='.repeat(60));
console.log('✅ Development setup complete!');
console.log('='.repeat(60));
console.log('\nNext steps:');
console.log('\n1. Start the Docker container (in Terminal 1):');
console.log('   docker compose up');
console.log('\n2. In another terminal (Terminal 2), start the watcher:');
console.log(`   npm run watch ${configIndex}`);
console.log('   OR use PowerShell helper:');
console.log(`   .\\dev-watch.ps1 ${configIndex}`);
console.log('\n3. Edit your template:');
console.log(`   ${templatePath}`);
console.log('\n4. The image will auto-regenerate on save!');
console.log(`   Check: ../output/output-${configIndex}.png`);
console.log('\n' + '='.repeat(60));
