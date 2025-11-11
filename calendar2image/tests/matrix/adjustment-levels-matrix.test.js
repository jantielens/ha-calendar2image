/**
 * Levels adjustment matrix generation tests
 * 
 * Generates visual comparison matrices specifically for the levels adjustment feature:
 * - Gamma vs Output Black matrix (grayscale 2-bit e-ink simulation)
 * - Gamma vs Output Black matrix (color 8-bit)
 */

const { generateImage } = require('../../src/image');
const { renderTemplate } = require('../../src/templates');
const { closeBrowser } = require('../../src/image/browser');
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

const MATRIX_OUTPUT_DIR = path.join(__dirname, '../../docs-user/images');

// Base configuration for test image
const BASE_CONFIG = {
  width: 400,
  height: 300,
  template: 'adjustment-test'
};

/**
 * Generate a single image with specified levels adjustments
 */
async function generateLevelsImage(levelsConfig, imageConfig) {
  const config = {
    ...BASE_CONFIG,
    format: imageConfig.format || 'png',
    grayscale: imageConfig.grayscale || false,
    bitDepth: imageConfig.bitDepth || 8
  };
  
  // Render template
  const html = await renderTemplate(config.template, {
    events: [],
    config,
    extraData: {}
  });
  
  // Build adjustments object
  const adjustments = {
    levels: levelsConfig
  };
  
  // Add dithering for grayscale matrices
  if (imageConfig.grayscale) {
    adjustments.dither = true;
  }
  
  // Generate image with levels adjustment
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
 * Create a text label image
 */
async function createLabelImage(text, width, height) {
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="white"/>
      <text x="${width/2}" y="${height/2}" 
            font-family="Arial, sans-serif" 
            font-size="14" 
            text-anchor="middle" 
            dominant-baseline="middle"
            fill="black">${text}</text>
    </svg>
  `;
  
  return await sharp(Buffer.from(svg)).png().toBuffer();
}

/**
 * Generate gamma × output black matrix
 */
async function generateGammaOutputMatrix(imageConfig, matrixName) {
  console.log(`\n📊 Generating ${matrixName} matrix...`);
  
  const gammaValues = [0.2, 0.5, 1.0, 1.5, 2.2, 3.0, 5.0, 8.0];
  const outputBlackValues = [0, 30, 60, 90, 120];
  
  const cellWidth = BASE_CONFIG.width;
  const cellHeight = BASE_CONFIG.height;
  const labelWidth = 80;
  const labelHeight = 40;
  
  const totalWidth = labelWidth + (cellWidth * gammaValues.length);
  const totalHeight = labelHeight + (cellHeight * outputBlackValues.length);
  
  // Create composite image
  const compositeOps = [];
  
  // Add column headers (gamma values)
  for (let col = 0; col < gammaValues.length; col++) {
    const gamma = gammaValues[col];
    const label = await createLabelImage(`gamma: ${gamma}`, cellWidth, labelHeight);
    compositeOps.push({
      input: label,
      top: 0,
      left: labelWidth + (col * cellWidth)
    });
  }
  
  // Add row headers (output black values)
  for (let row = 0; row < outputBlackValues.length; row++) {
    const outputBlack = outputBlackValues[row];
    const label = await createLabelImage(`outputBlack: ${outputBlack}`, labelWidth, cellHeight);
    compositeOps.push({
      input: label,
      top: labelHeight + (row * cellHeight),
      left: 0
    });
  }
  
  // Generate all cells
  let cellCount = 0;
  const totalCells = gammaValues.length * outputBlackValues.length;
  
  for (let row = 0; row < outputBlackValues.length; row++) {
    for (let col = 0; col < gammaValues.length; col++) {
      cellCount++;
      const gamma = gammaValues[col];
      const outputBlack = outputBlackValues[row];
      
      console.log(`  Generating cell ${cellCount}/${totalCells}: gamma=${gamma}, outputBlack=${outputBlack}`);
      
      const imageBuffer = await generateLevelsImage({
        inputBlack: 0,
        inputWhite: 255,
        gamma: gamma,
        outputBlack: outputBlack,
        outputWhite: 255
      }, imageConfig);
      
      compositeOps.push({
        input: imageBuffer,
        top: labelHeight + (row * cellHeight),
        left: labelWidth + (col * cellWidth)
      });
    }
  }
  
  // Create base white image
  const matrix = await sharp({
    create: {
      width: totalWidth,
      height: totalHeight,
      channels: 3,
      background: { r: 255, g: 255, b: 255 }
    }
  })
  .composite(compositeOps)
  .png()
  .toBuffer();
  
  // Save matrix
  const outputPath = path.join(MATRIX_OUTPUT_DIR, `${matrixName}.png`);
  await fs.writeFile(outputPath, matrix);
  console.log(`✅ Saved: ${outputPath}`);
  
  return outputPath;
}

describe('Levels Adjustment Matrix Generation', () => {
  // Allow plenty of time for matrix generation (up to 10 minutes)
  jest.setTimeout(600000);

  beforeAll(async () => {
    // Ensure output directory exists
    await fs.mkdir(MATRIX_OUTPUT_DIR, { recursive: true });
  });

  afterAll(async () => {
    // Clean up browser resources
    await closeBrowser();
  });

  test('should generate gamma × output black matrix (grayscale 2-bit)', async () => {
    const outputPath = await generateGammaOutputMatrix(
      { grayscale: true, bitDepth: 2 },
      'levels-gamma-output-grayscale-2bit'
    );
    
    // Verify file exists and has reasonable size
    const stats = await fs.stat(outputPath);
    expect(stats.size).toBeGreaterThan(100000);
  });

  test('should generate gamma × output black matrix (color 8-bit)', async () => {
    const outputPath = await generateGammaOutputMatrix(
      { grayscale: false, bitDepth: 8 },
      'levels-gamma-output-color-8bit'
    );
    
    // Verify file exists and has reasonable size
    const stats = await fs.stat(outputPath);
    expect(stats.size).toBeGreaterThan(100000);
  });
});
