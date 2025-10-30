/**
 * Local Testing Script
 * Quickly test template rendering and image generation locally
 * 
 * Usage:
 *   node test-local.js [config-index]
 * 
 * Examples:
 *   node test-local.js 0        # Test ../data/calendar2image/0.json
 *   node test-local.js 1        # Test ../data/calendar2image/1.json
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { loadConfig } = require('./src/config');
const { getCalendarEvents } = require('./src/calendar');
const { renderTemplate } = require('./src/templates');
const { generateImage } = require('./src/image');
const { closeBrowser } = require('./src/image/browser');

// Config directory (parent data folder)
const CONFIG_DIR = path.join(__dirname, '..', 'data', 'calendar2image');
// Output directory for generated files (in project root)
const OUTPUT_DIR = path.join(__dirname, '..', 'output');

// Ensure output directory exists
if (!fsSync.existsSync(OUTPUT_DIR)) {
  fsSync.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function testConfig(configIndex) {
  try {
    console.log('='.repeat(60));
    console.log(`Testing Configuration ${configIndex}`);
    console.log('='.repeat(60));

    // Load configuration
    console.log('\n1. Loading configuration...');
    const config = await loadConfig(configIndex, CONFIG_DIR);
    console.log(`   ✓ Loaded: ${config.template} template`);
    console.log(`   ✓ ICS URL: ${config.icsUrl}`);
    console.log(`   ✓ Dimensions: ${config.width}x${config.height}`);
    console.log(`   ✓ Format: ${config.imageType} (${config.grayscale ? 'grayscale' : 'color'})`);

    // Fetch calendar events
    console.log('\n2. Fetching calendar events...');
    const events = await getCalendarEvents(config.icsUrl, {
      expandRecurringFrom: config.expandRecurringFrom,
      expandRecurringTo: config.expandRecurringTo
    });
    console.log(`   ✓ Fetched ${events.length} events`);

    // Show some sample events
    if (events.length > 0) {
      console.log('\n   Sample events:');
      events.slice(0, 3).forEach((event, i) => {
        const start = new Date(event.start).toLocaleDateString();
        console.log(`     ${i + 1}. ${event.title} (${start})`);
      });
      if (events.length > 3) {
        console.log(`     ... and ${events.length - 3} more`);
      }
    }

    // Render template
    console.log('\n3. Rendering template...');
    const html = await renderTemplate(config.template, {
      events,
      config
    });
    console.log(`   ✓ Rendered ${html.length} characters of HTML`);

    // Optionally save HTML for inspection
    const htmlPath = path.join(OUTPUT_DIR, `output-${configIndex}.html`);
    await fs.writeFile(htmlPath, html);
    console.log(`   ✓ Saved HTML to: ${htmlPath}`);

    // Generate image
    console.log('\n4. Generating image...');
    const result = await generateImage(html, {
      width: config.width,
      height: config.height,
      imageType: config.imageType,
      grayscale: config.grayscale,
      bitDepth: config.bitDepth
    });
    console.log(`   ✓ Generated ${result.buffer.length} bytes`);
    console.log(`   ✓ Content-Type: ${result.contentType}`);

    // Save image
    const ext = config.imageType === 'jpg' ? 'jpg' : config.imageType;
    const imagePath = path.join(OUTPUT_DIR, `output-${configIndex}.${ext}`);
    await fs.writeFile(imagePath, result.buffer);
    console.log(`   ✓ Saved image to: ${imagePath}`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ SUCCESS!');
    console.log('='.repeat(60));
    console.log(`\nOpen the image: ${imagePath}`);
    console.log(`Open the HTML:  ${htmlPath}\n`);

  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ ERROR');
    console.error('='.repeat(60));
    console.error(error);
    process.exit(1);
  } finally {
    // Clean up browser
    await closeBrowser();
  }
}

// Main execution
const configIndex = parseInt(process.argv[2] || '0', 10);
testConfig(configIndex)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
