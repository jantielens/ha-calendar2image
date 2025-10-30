/**
 * Example usage of the calendar and config modules
 * This demonstrates how to load a config and fetch calendar events
 */

const { loadConfig } = require('./src/config');
const { getCalendarEvents } = require('./src/calendar');

async function example() {
  try {
    // Load configuration for calendar index 0
    // In production, this would use /data/ha-calendar2image/
    // For this example, we'll use the data folder
    const config = await loadConfig(0, '../data/ha-calendar2image');
    
    console.log('Loaded configuration:');
    console.log(JSON.stringify(config, null, 2));
    console.log('\nFetching calendar events...\n');
    
    // Fetch and parse calendar events using the config
    const events = await getCalendarEvents(config.icsUrl, {
      expandRecurringFrom: config.expandRecurringFrom,
      expandRecurringTo: config.expandRecurringTo
    });
    
    console.log(`Found ${events.length} events\n`);
    
    // Display first 5 events
    events.slice(0, 5).forEach((event, index) => {
      console.log(`Event ${index + 1}:`);
      console.log(`  Summary: ${event.summary}`);
      console.log(`  Start: ${event.start}`);
      console.log(`  End: ${event.end}`);
      console.log(`  Location: ${event.location || 'N/A'}`);
      console.log(`  Recurring: ${event.isRecurring ? 'Yes' : 'No'}`);
      console.log(`  Timezone: ${event.timezone || 'N/A'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  example();
}

module.exports = { example };
