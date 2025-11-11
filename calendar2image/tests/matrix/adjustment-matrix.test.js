/**
 * Matrix generation tests for visual documentation
 * 
 * This generates comprehensive adjustment comparison matrices:
 * - Color matrix (full RGB)
 * - Grayscale 8-bit matrix (full grayscale range)
 * - Grayscale 4-bit matrix (16 gray levels)
 * - Grayscale 2-bit matrix (4 gray levels - e-ink simulation)
 * 
 * These are used for documentation and visual regression testing.
 */

const { closeBrowser } = require('../../src/image/browser');
const fs = require('fs').promises;
const path = require('path');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

const MATRIX_OUTPUT_DIR = path.join(__dirname, '../../docs-user/images');

describe('Adjustment Matrix Generation', () => {
  // Allow plenty of time for matrix generation (up to 10 minutes)
  jest.setTimeout(600000);

  afterAll(async () => {
    // Clean up browser resources
    await closeBrowser();
  });

  test('should generate all adjustment comparison matrices', async () => {
    // Run the matrix generation script
    const { stdout, stderr } = await exec('node generate-adjustment-matrix.js');
    
    // Check for errors
    expect(stderr).not.toContain('❌ Error:');
    expect(stdout).toContain('✅ All matrices generated successfully!');
  });

  test('should create all matrix files', async () => {
    // Check that matrix directory exists
    const dirExists = await fs.access(MATRIX_OUTPUT_DIR)
      .then(() => true)
      .catch(() => false);
    expect(dirExists).toBe(true);

    // Verify all expected matrix files exist
    const expectedFiles = [
      'adjustment-matrix-color.png',
      'adjustment-matrix-grayscale-8bit.png',
      'adjustment-matrix-grayscale-4bit.png',
      'adjustment-matrix-grayscale-2bit.png',
      'adjustment-matrix-color-2bit-dithered.png',
      'adjustment-matrix-grayscale-2bit-dithered.png'
    ];
    
    for (const file of expectedFiles) {
      const filePath = path.join(MATRIX_OUTPUT_DIR, file);
      const fileExists = await fs.access(filePath)
        .then(() => true)
        .catch(() => false);
      expect(fileExists).toBe(true);
      
      // Check file size (should be substantial - at least 100KB)
      const stats = await fs.stat(filePath);
      expect(stats.size).toBeGreaterThan(100000);
    }
  });

  test('should generate matrices with consistent dimensions', async () => {
    const sharp = require('sharp');
    
    // All matrices should have the same dimensions (only color depth differs)
    const files = await fs.readdir(MATRIX_OUTPUT_DIR);
    const matrixFiles = files.filter(f => f.startsWith('adjustment-matrix-') && f.endsWith('.png'));
    
    expect(matrixFiles.length).toBe(5);
    
    // Get dimensions of all matrices
    const dimensions = await Promise.all(
      matrixFiles.map(async (file) => {
        const metadata = await sharp(path.join(MATRIX_OUTPUT_DIR, file)).metadata();
        return { file, width: metadata.width, height: metadata.height };
      })
    );
    
    // All should have the same width and height
    const firstDim = dimensions[0];
    dimensions.forEach(dim => {
      expect(dim.width).toBe(firstDim.width);
      expect(dim.height).toBe(firstDim.height);
    });
    
    // Dimensions should be reasonable (> 1000 pixels)
    expect(firstDim.width).toBeGreaterThan(1000);
    expect(firstDim.height).toBeGreaterThan(1000);
  });
});
