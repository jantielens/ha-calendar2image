/**
 * Template Development Watch Script
 * 
 * Watches custom template files and automatically regenerates images when they change.
 * Uses the running Docker container to generate images (requires Puppeteer).
 * 
 * Usage:
 *   1. Start the Docker container: npm run test:ci (or docker-compose up)
 *   2. In another terminal: node watch-template.js <config-index> [template-file]
 * 
 * Examples:
 *   node watch-template.js 0 my-custom-template.js
 *   node watch-template.js 1
 * 
 * The script will:
 *   - Watch the specified template file (or detect from config)
 *   - Clear the template cache in the container
 *   - Regenerate the image via container API
 *   - Download and save the image to ../output/
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

// Configuration
const CONFIG_DIR = path.join(__dirname, '..', 'data', 'calendar2image');
const TEMPLATES_DIR = path.join(__dirname, '..', 'data', 'calendar2image', 'templates');
const OUTPUT_DIR = path.join(__dirname, '..', 'output');
const CONTAINER_HOST = process.env.CONTAINER_HOST || 'localhost';
const CONTAINER_PORT = process.env.CONTAINER_PORT || '3000';

// Ensure directories exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}
if (!fs.existsSync(TEMPLATES_DIR)) {
  fs.mkdirSync(TEMPLATES_DIR, { recursive: true });
}

// Parse arguments
const configIndex = parseInt(process.argv[2], 10);
const templateFileArg = process.argv[3];

if (isNaN(configIndex)) {
  console.error('Usage: node watch-template.js <config-index> [template-file]');
  console.error('Example: node watch-template.js 0 my-custom-template.js');
  process.exit(1);
}

// Load config to get template name and image type
function getConfig(index) {
  const configPath = path.join(CONFIG_DIR, `${index}.json`);
  if (!fs.existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}`);
  }
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

// Generate image via container API
async function generateImage(index, config) {
  return new Promise((resolve, reject) => {
    const ext = config.imageType || 'png';
    const url = `http://${CONTAINER_HOST}:${CONTAINER_PORT}/api/${index}/fresh.${ext}`;
    
    console.log(`   Requesting: ${url}`);
    
    const req = http.get(url, (res) => {
      if (res.statusCode !== 200) {
        let errorData = '';
        res.on('data', chunk => errorData += chunk);
        res.on('end', () => {
          reject(new Error(`HTTP ${res.statusCode}: ${errorData}`));
        });
        return;
      }

      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve({ buffer, contentType: res.headers['content-type'] });
      });
    });

    req.on('error', (err) => {
      reject(new Error(`Failed to connect to container: ${err.message}\nMake sure the Docker container is running on ${CONTAINER_HOST}:${CONTAINER_PORT}`));
    });

    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout - image generation took too long'));
    });
  });
}

// Save image to output directory
function saveImage(index, buffer, config) {
  const ext = config.imageType || 'png';
  const imagePath = path.join(OUTPUT_DIR, `output-${index}.${ext}`);
  fs.writeFileSync(imagePath, buffer);
  return imagePath;
}

// Handle file change
let regenerateTimeout = null;
let isRegenerating = false;

async function onFileChange(templateFile) {
  // Debounce: wait 500ms after last change
  if (regenerateTimeout) {
    clearTimeout(regenerateTimeout);
  }

  regenerateTimeout = setTimeout(async () => {
    if (isRegenerating) {
      console.log('   ⏳ Already regenerating, skipping...');
      return;
    }

    try {
      isRegenerating = true;
      const timestamp = new Date().toLocaleTimeString();
      
      console.log('\n' + '='.repeat(60));
      console.log(`🔄 Template changed: ${path.basename(templateFile)}`);
      console.log(`   Time: ${timestamp}`);
      console.log('='.repeat(60));

      const config = getConfig(configIndex);
      
      console.log('\n1. Generating image via container...');
      const result = await generateImage(configIndex, config);
      console.log(`   ✓ Generated ${result.buffer.length} bytes`);

      console.log('\n2. Saving image...');
      const imagePath = saveImage(configIndex, result.buffer, config);
      console.log(`   ✓ Saved to: ${imagePath}`);

      console.log('\n✅ Done! Image updated.\n');
      console.log('👀 Watching for changes...\n');

    } catch (error) {
      console.error('\n❌ Error:', error.message, '\n');
      console.log('👀 Watching for changes...\n');
    } finally {
      isRegenerating = false;
    }
  }, 500);
}

// Main
async function main() {
  try {
    // Load config
    const config = getConfig(configIndex);
    const templateName = config.template;
    
    // Determine template file to watch
    let templateFile;
    if (templateFileArg) {
      templateFile = path.join(TEMPLATES_DIR, templateFileArg);
    } else {
      templateFile = path.join(TEMPLATES_DIR, `${templateName}.js`);
    }

    // Check if template file exists
    if (!fs.existsSync(templateFile)) {
      console.error(`\n❌ Template file not found: ${templateFile}`);
      console.error(`\nTo create a custom template:`);
      console.error(`   1. Create: ${templateFile}`);
      console.error(`   2. Export a function that returns HTML`);
      console.error(`   3. Update config ${configIndex}.json to use template: "${templateName}"\n`);
      process.exit(1);
    }

    console.log('='.repeat(60));
    console.log('📝 Template Development Watcher');
    console.log('='.repeat(60));
    console.log(`Config:    ${configIndex}.json`);
    console.log(`Template:  ${path.basename(templateFile)}`);
    console.log(`Container: ${CONTAINER_HOST}:${CONTAINER_PORT}`);
    console.log(`Output:    ${OUTPUT_DIR}`);
    console.log('='.repeat(60));

    // Test container connection
    console.log('\n🔍 Testing container connection...');
    try {
      await generateImage(configIndex, config);
      console.log('✅ Container is running and responsive\n');
    } catch (error) {
      console.error(`❌ Container connection failed: ${error.message}`);
      console.error('\nMake sure to start the Docker container first:');
      console.error('   npm run test:ci');
      console.error('   (or) docker-compose up\n');
      process.exit(1);
    }

    // Initial generation
    console.log('🚀 Generating initial image...');
    await onFileChange(templateFile);

    // Watch for changes
    console.log(`\n👀 Watching: ${templateFile}`);
    console.log('   Press Ctrl+C to stop\n');

    fs.watch(templateFile, (eventType) => {
      if (eventType === 'change') {
        onFileChange(templateFile);
      }
    });

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Stopping watcher...');
  process.exit(0);
});

main();
