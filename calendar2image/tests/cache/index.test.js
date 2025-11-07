const fs = require('fs').promises;
const path = require('path');

// Set test cache directory
const testCacheDir = path.join(__dirname, '../fixtures/cache-test');
process.env.CACHE_DIR = testCacheDir;

const {
  ensureCacheDir,
  saveCachedImage,
  loadCachedImage,
  getCacheMetadata
} = require('../../src/cache');

// Mock the CRC32 history module
jest.mock('../../src/cache/crc32History', () => ({
  addHistoryEntry: jest.fn().mockResolvedValue(true)
}));

describe('Cache Atomic File Replacement', () => {
  beforeAll(async () => {
    // Create test cache directory
    await fs.mkdir(testCacheDir, { recursive: true });
    await ensureCacheDir();
  });

  afterAll(async () => {
    // Clean up
    try {
      await fs.rm(testCacheDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
    delete process.env.CACHE_DIR;
  });

  beforeEach(async () => {
    // Clean up cache files before each test
    try {
      const files = await fs.readdir(testCacheDir);
      await Promise.all(
        files.map(file => fs.unlink(path.join(testCacheDir, file)).catch(() => {}))
      );
    } catch (error) {
      // Ignore if directory doesn't exist
    }
  });

  test('should save image atomically using temp files', async () => {
    const index = 0;
    const buffer = Buffer.from('test-image-data');
    const contentType = 'image/png';
    const imageType = 'png';

    // Save the image
    const metadata = await saveCachedImage(index, buffer, contentType, imageType);

    // Verify metadata is correct
    expect(metadata).toMatchObject({
      index,
      contentType,
      imageType,
      size: buffer.length
    });

    // Verify no temp files remain
    const files = await fs.readdir(testCacheDir);
    const tempFiles = files.filter(file => file.endsWith('.tmp'));
    expect(tempFiles).toHaveLength(0);

    // Verify cache files exist
    expect(files).toContain('0.png');
    expect(files).toContain('0.meta.json');
  });

  test('should load cached image correctly', async () => {
    const index = 1;
    const buffer = Buffer.from('test-image-data-2');
    const contentType = 'image/png';
    const imageType = 'png';

    // Save the image
    await saveCachedImage(index, buffer, contentType, imageType);

    // Load the image
    const cached = await loadCachedImage(index);

    // Verify loaded data
    expect(cached).not.toBeNull();
    expect(cached.buffer.toString()).toBe(buffer.toString());
    expect(cached.contentType).toBe(contentType);
    expect(cached.metadata.index).toBe(index);
  });

  test('should cleanup orphaned temp files on startup', async () => {
    // Create some orphaned temp files
    await fs.writeFile(path.join(testCacheDir, '5.png.tmp'), 'orphaned-data');
    await fs.writeFile(path.join(testCacheDir, '5.meta.json.tmp'), '{}');

    // Verify temp files exist
    let files = await fs.readdir(testCacheDir);
    let tempFiles = files.filter(file => file.endsWith('.tmp'));
    expect(tempFiles.length).toBeGreaterThan(0);

    // Call ensureCacheDir which should cleanup temp files
    await ensureCacheDir();

    // Verify temp files are gone
    files = await fs.readdir(testCacheDir);
    tempFiles = files.filter(file => file.endsWith('.tmp'));
    expect(tempFiles).toHaveLength(0);
  });

  test('should handle sequential save operations', async () => {
    const index = 2;
    const buffer1 = Buffer.from('test-image-v1');
    const buffer2 = Buffer.from('test-image-v2');
    const contentType = 'image/png';
    const imageType = 'png';

    // Perform sequential saves
    const meta1 = await saveCachedImage(index, buffer1, contentType, imageType);
    const meta2 = await saveCachedImage(index, buffer2, contentType, imageType);

    // Both should complete successfully
    expect(meta1).toBeDefined();
    expect(meta2).toBeDefined();

    // Load the final cached version
    const cached = await loadCachedImage(index);
    expect(cached).not.toBeNull();

    // The final cached image should be the last one written
    const cachedData = cached.buffer.toString();
    expect(cachedData).toBe(buffer2.toString());

    // No temp files should remain
    const files = await fs.readdir(testCacheDir);
    const tempFiles = files.filter(file => file.endsWith('.tmp'));
    expect(tempFiles).toHaveLength(0);
  });

  test('should handle save and read during concurrent operations', async () => {
    const index = 3;
    const buffer = Buffer.from('test-concurrent-data');
    const contentType = 'image/png';
    const imageType = 'png';

    // Save initial version
    await saveCachedImage(index, buffer, contentType, imageType);

    // Perform concurrent save and read operations
    const results = await Promise.all([
      saveCachedImage(index, Buffer.from('updated-data'), contentType, imageType),
      loadCachedImage(index),
      loadCachedImage(index),
      getCacheMetadata(index)
    ]);

    // All operations should complete successfully
    expect(results[0]).toBeDefined(); // save result
    expect(results[1]).not.toBeNull(); // first read
    expect(results[2]).not.toBeNull(); // second read
    expect(results[3]).not.toBeNull(); // metadata read

    // No temp files should remain
    const files = await fs.readdir(testCacheDir);
    const tempFiles = files.filter(file => file.endsWith('.tmp'));
    expect(tempFiles).toHaveLength(0);
  });

  test('should include CRC32 in metadata', async () => {
    const index = 4;
    const buffer = Buffer.from('test-crc32-data');
    const contentType = 'image/png';
    const imageType = 'png';

    // Save the image
    const metadata = await saveCachedImage(index, buffer, contentType, imageType);

    // Verify CRC32 is included (as a hex string)
    expect(metadata.crc32).toBeDefined();
    expect(typeof metadata.crc32).toBe('string');
    expect(metadata.crc32).toMatch(/^[0-9a-f]{8}$/);

    // Verify metadata can be loaded
    const loadedMeta = await getCacheMetadata(index);
    expect(loadedMeta.crc32).toBe(metadata.crc32);
  });
});
