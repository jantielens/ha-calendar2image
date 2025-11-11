/**
 * Generate image adjustment comparison samples
 * 
 * Creates a comprehensive visual comparison matrix showing the effect of
 * different adjustment parameters on the test pattern template.
 * 
 * NOTE: This script requires Puppeteer/Chrome to be available.
 * - In Docker container: Works out of the box (npm run generate:adjustment-matrix)
 * - Local development: Requires Chrome installation or run via npm run test:ci
 * 
 * Usage:
 *   Docker: npm run generate:adjustment-matrix
 *   Local:  npm run test:ci (includes matrix generation test)
 */

const { generateImage } = require('./src/image');
const { renderTemplate } = require('./src/templates');
const { closeBrowser } = require('./src/image/browser');
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'adjustment-samples');
const MATRIX_OUTPUT_DIR = path.join(__dirname, 'docs-user', 'images');

// Configuration
const BASE_CONFIG = {
  width: 400,
  height: 300,
  template: 'adjustment-test'
};

// Matrix configurations to generate
const MATRIX_CONFIGS = [
  { name: 'color', format: 'png', bitDepth: null },
  { name: 'grayscale-8bit', format: 'png', bitDepth: null, grayscale: true },
  { name: 'grayscale-4bit', format: 'png', bitDepth: 4, grayscale: true },
  { name: 'grayscale-2bit', format: 'png', bitDepth: 2, grayscale: true }
];

// Define adjustment parameters to test
const ADJUSTMENTS = [
  {
    name: 'brightness',
    values: [-100, -75, -50, -25, 0, 25, 50, 75, 100],
    default: 0
  },
  {
    name: 'contrast',
    values: [-100, -75, -50, -25, 0, 25, 50, 75, 100],
    default: 0
  },
  {
    name: 'saturation',
    values: [-100, -75, -50, -25, 0, 25, 50, 75, 100],
    default: 0
  },
  {
    name: 'gamma',
    values: [1.0, 1.2, 1.5, 1.8, 2.2, 2.5, 3.0],
    default: 1.0
  },
  {
    name: 'hue',
    values: [-180, -135, -90, -45, 0, 45, 90, 135, 180],
    default: 0
  },
  {
    name: 'sharpen',
    values: [false, true],
    default: false,
    labels: ['Off', 'On']
  },
  {
    name: 'normalize',
    values: [false, true],
    default: false,
    labels: ['Off', 'On']
  },
  {
    name: 'invert',
    values: [false, true],
    default: false,
    labels: ['Off', 'On']
  },
  {
    name: 'threshold',
    values: [0, 32, 64, 96, 127, 159, 191, 223, 255],
    default: 127
  },
  {
    name: 'dither',
    values: [false, 'floyd-steinberg', 'atkinson'],
    default: false,
    labels: ['None', 'Floyd-Steinberg', 'Atkinson'],
    extraConfig: { bitDepth: 4, grayscale: true }
  }
];

/**
 * Generate a single image with specified adjustments
 */
async function generateAdjustedImage(adjustmentName, adjustmentValue, matrixConfig) {
  console.log(`Generating: ${adjustmentName} = ${adjustmentValue}`);
  
  const config = {
    ...BASE_CONFIG,
    format: matrixConfig.format,
    grayscale: matrixConfig.grayscale || false,
    bitDepth: matrixConfig.bitDepth || 8
  };
  
  // Render template
  const html = await renderTemplate(config.template, {
    events: [],
    config,
    extraData: {}
  });
  
  // Build adjustments object
  const adjustments = {
    [adjustmentName]: adjustmentValue
  };
  
  // Generate image
  const result = await generateImage(html, {
    width: config.width,
    height: config.height,
    imageType: config.format,
    grayscale: config.grayscale,
    bitDepth: config.bitDepth,
    adjustments
  });
  
  return result.buffer;
}

/**
 * Generate all variations for a single adjustment parameter
 */
async function generateAdjustmentSeries(adjustment, matrixConfig) {
  const images = [];
  const labels = [];
  
  for (let i = 0; i < adjustment.values.length; i++) {
    const value = adjustment.values[i];
    const label = adjustment.labels ? adjustment.labels[i] : String(value);
    
    const buffer = await generateAdjustedImage(
      adjustment.name,
      value,
      matrixConfig
    );
    
    images.push(buffer);
    labels.push(label);
  }
  
  return { images, labels };
}

/**
 * Create a labeled image strip for one adjustment parameter
 */
async function createLabeledStrip(adjustment, images, labels) {
  const PADDING = 5;
  const LABEL_HEIGHT = 30;
  const imageWidth = BASE_CONFIG.width;
  const imageHeight = BASE_CONFIG.height;
  
  // Calculate dimensions
  const stripWidth = images.length * (imageWidth + PADDING) - PADDING;
  const stripHeight = LABEL_HEIGHT + imageHeight;
  
  // Create composites array
  const composites = [];
  
  for (let i = 0; i < images.length; i++) {
    const x = i * (imageWidth + PADDING);
    
    composites.push({
      input: images[i],
      top: LABEL_HEIGHT,
      left: x
    });
  }
  
  // Create label strip
  const labelSvg = Buffer.from(`
    <svg width="${stripWidth}" height="${LABEL_HEIGHT}">
      <rect width="${stripWidth}" height="${LABEL_HEIGHT}" fill="#f0f0f0"/>
      ${images.map((_, i) => {
        const x = i * (imageWidth + PADDING) + imageWidth / 2;
        const label = labels[i];
        const isDefault = adjustment.values[i] === adjustment.default;
        return `
          <text 
            x="${x}" 
            y="${LABEL_HEIGHT / 2}" 
            text-anchor="middle" 
            dominant-baseline="middle" 
            font-family="Arial" 
            font-size="12" 
            font-weight="${isDefault ? 'bold' : 'normal'}"
            fill="${isDefault ? '#e74c3c' : '#333'}"
          >${label}</text>
        `;
      }).join('')}
    </svg>
  `);
  
  // Create base image with labels
  const strip = await sharp({
    create: {
      width: stripWidth,
      height: stripHeight,
      channels: 4,
      background: { r: 240, g: 240, b: 240, alpha: 1 }
    }
  })
  .composite([
    { input: labelSvg, top: 0, left: 0 },
    ...composites
  ])
  .png()
  .toBuffer();
  
  return strip;
}

/**
 * Create the parameter label column
 */
async function createParameterLabels(adjustments, stripHeight) {
  const LABEL_WIDTH = 150;
  const PADDING = 5;
  
  const totalHeight = adjustments.length * (stripHeight + PADDING) - PADDING;
  
  const labelSvg = Buffer.from(`
    <svg width="${LABEL_WIDTH}" height="${totalHeight}">
      <rect width="${LABEL_WIDTH}" height="${totalHeight}" fill="#34495e"/>
      ${adjustments.map((adj, i) => {
        const y = i * (stripHeight + PADDING) + stripHeight / 2;
        return `
          <text 
            x="${LABEL_WIDTH / 2}" 
            y="${y}" 
            text-anchor="middle" 
            dominant-baseline="middle" 
            font-family="Arial" 
            font-size="16" 
            font-weight="bold"
            fill="white"
          >${adj.name.toUpperCase()}</text>
        `;
      }).join('')}
    </svg>
  `);
  
  return labelSvg;
}

/**
 * Generate a single matrix with the given configuration
 */
async function generateSingleMatrix(matrixConfig) {
  console.log(`\n--- Generating ${matrixConfig.name} matrix ---`);
  
  const strips = [];
  
  // Generate all adjustment series
  for (const adjustment of ADJUSTMENTS) {
    console.log(`\nProcessing ${adjustment.name}...`);
    const { images, labels } = await generateAdjustmentSeries(adjustment, matrixConfig);
    const strip = await createLabeledStrip(adjustment, images, labels);
    strips.push(strip);
  }
  
  console.log('\nCreating final matrix...');
  
  // Get strip dimensions
  const stripMetadata = await sharp(strips[0]).metadata();
  const stripWidth = stripMetadata.width;
  const stripHeight = stripMetadata.height;
  
  const PADDING = 5;
  const LABEL_WIDTH = 150;
  
  // Calculate final dimensions
  const matrixWidth = LABEL_WIDTH + PADDING + stripWidth;
  const matrixHeight = strips.length * (stripHeight + PADDING) - PADDING;
  
  // Create parameter labels
  const parameterLabels = await createParameterLabels(ADJUSTMENTS, stripHeight);
  
  // Create composite
  const composites = [
    { input: parameterLabels, top: 0, left: 0 }
  ];
  
  for (let i = 0; i < strips.length; i++) {
    composites.push({
      input: strips[i],
      top: i * (stripHeight + PADDING),
      left: LABEL_WIDTH + PADDING
    });
  }
  
  const outputPath = path.join(MATRIX_OUTPUT_DIR, `adjustment-matrix-${matrixConfig.name}.png`);
  
  await sharp({
    create: {
      width: matrixWidth,
      height: matrixHeight,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
  .composite(composites)
  .png()
  .toFile(outputPath);
  
  console.log(`✅ ${matrixConfig.name} matrix complete: ${matrixWidth} x ${matrixHeight}`);
  
  return { path: outputPath, width: matrixWidth, height: matrixHeight };
}

/**
 * Generate complete adjustment comparison matrices
 */
async function generateMatrix() {
  console.log('='.repeat(60));
  console.log('Generating Adjustment Comparison Matrices');
  console.log('='.repeat(60));
  
  // Create output directories
  await fs.mkdir(MATRIX_OUTPUT_DIR, { recursive: true });
  
  const results = [];
  
  // Generate each matrix configuration
  for (const matrixConfig of MATRIX_CONFIGS) {
    const result = await generateSingleMatrix(matrixConfig);
    results.push(result);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ All matrices generated successfully!');
  console.log('='.repeat(60));
  console.log(`Output directory: ${MATRIX_OUTPUT_DIR}`);
  console.log(`Matrices generated: ${results.length}`);
  results.forEach(r => {
    console.log(`  - ${path.basename(r.path)}: ${r.width} x ${r.height}`);
  });
}

// Run if called directly
if (require.main === module) {
  generateMatrix()
    .then(async () => {
      await closeBrowser();
      console.log('\n✅ Done!');
      process.exit(0);
    })
    .catch(async (error) => {
      await closeBrowser();
      console.error('\n❌ Error:', error);
      process.exit(1);
    });
}

module.exports = { generateMatrix };
