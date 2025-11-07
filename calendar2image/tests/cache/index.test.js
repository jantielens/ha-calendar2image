const fs = require('fs').promises;
const path = require('path');

// Set test cache directory
const testCacheDir = path.join(__dirname, '../fixtures/cache-test');
process.env.CACHE_DIR = testCacheDir;

const {
  ensureCacheDir,
  saveCachedImage,
  loadCachedImage,
  getCacheMetadata,
  deleteCachedImage,
  getMemoryCacheStats,
  clearMemoryCache
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
    
    // Clear memory cache before each test
    clearMemoryCache();
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

describe('In-Memory Cache', () => {
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
    // Clean up cache files and memory before each test
    try {
      const files = await fs.readdir(testCacheDir);
      await Promise.all(
        files.map(file => fs.unlink(path.join(testCacheDir, file)).catch(() => {}))
      );
    } catch (error) {
      // Ignore if directory doesn't exist
    }
    clearMemoryCache();
  });

  test('should load from memory cache on second read', async () => {
    const index = 10;
    const buffer = Buffer.from('test-memory-cache');
    const contentType = 'image/png';
    const imageType = 'png';

    // Save to cache (populates both disk and memory)
    await saveCachedImage(index, buffer, contentType, imageType);

    // First load populates memory cache (actually already populated by save)
    const firstLoad = await loadCachedImage(index);
    expect(firstLoad).not.toBeNull();

    // Second load should come from memory (instant, no disk I/O)
    const secondLoad = await loadCachedImage(index);
    expect(secondLoad).not.toBeNull();
    expect(secondLoad.buffer.toString()).toBe(buffer.toString());
  });

  test('should populate memory cache when loading from disk', async () => {
    const index = 11;
    const buffer = Buffer.from('test-disk-to-memory');
    const contentType = 'image/png';
    const imageType = 'png';

    // Save to disk
    await saveCachedImage(index, buffer, contentType, imageType);
    
    // Clear memory cache to simulate app restart
    clearMemoryCache();
    
    // Verify memory cache is empty
    let stats = getMemoryCacheStats();
    expect(stats.entries).toBe(0);

    // Load from disk (should populate memory)
    const loaded = await loadCachedImage(index);
    expect(loaded).not.toBeNull();

    // Verify memory cache now has the entry
    stats = getMemoryCacheStats();
    expect(stats.entries).toBe(1);
    expect(stats.configs[0].index).toBe(index);
  });

  test('should delete from both memory and disk', async () => {
    const index = 12;
    const buffer = Buffer.from('test-delete');
    const contentType = 'image/png';
    const imageType = 'png';

    // Save to cache
    await saveCachedImage(index, buffer, contentType, imageType);

    // Verify it's in memory cache
    let stats = getMemoryCacheStats();
    expect(stats.entries).toBe(1);

    // Delete
    await deleteCachedImage(index);

    // Verify it's gone from memory
    stats = getMemoryCacheStats();
    expect(stats.entries).toBe(0);

    // Verify it's gone from disk
    const loaded = await loadCachedImage(index);
    expect(loaded).toBeNull();
  });

  test('should track memory cache statistics correctly', async () => {
    const buffer1 = Buffer.from('test-stats-1');
    const buffer2 = Buffer.from('test-stats-22'); // Different size
    const contentType = 'image/png';
    const imageType = 'png';

    // Initially empty
    let stats = getMemoryCacheStats();
    expect(stats.entries).toBe(0);
    expect(stats.totalBytes).toBe(0);
    expect(stats.configs).toHaveLength(0);

    // Save first image
    await saveCachedImage(13, buffer1, contentType, imageType);
    stats = getMemoryCacheStats();
    expect(stats.entries).toBe(1);
    expect(stats.totalBytes).toBe(buffer1.length);
    expect(stats.configs[0].index).toBe(13);

    // Save second image
    await saveCachedImage(14, buffer2, contentType, imageType);
    stats = getMemoryCacheStats();
    expect(stats.entries).toBe(2);
    expect(stats.totalBytes).toBe(buffer1.length + buffer2.length);

    // Verify configs array
    const indexes = stats.configs.map(c => c.index).sort();
    expect(indexes).toEqual([13, 14]);
  });

  test('should clear all memory cache entries', async () => {
    const buffer = Buffer.from('test-clear');
    const contentType = 'image/png';
    const imageType = 'png';

    // Add multiple entries
    await saveCachedImage(15, buffer, contentType, imageType);
    await saveCachedImage(16, buffer, contentType, imageType);
    await saveCachedImage(17, buffer, contentType, imageType);

    // Verify they're in cache
    let stats = getMemoryCacheStats();
    expect(stats.entries).toBe(3);

    // Clear
    clearMemoryCache();

    // Verify cache is empty
    stats = getMemoryCacheStats();
    expect(stats.entries).toBe(0);
    expect(stats.totalBytes).toBe(0);
    expect(stats.configs).toHaveLength(0);
  });

  test('should handle concurrent reads from memory cache', async () => {
    const index = 18;
    const buffer = Buffer.from('test-concurrent-memory');
    const contentType = 'image/png';
    const imageType = 'png';

    // Save to populate memory cache
    await saveCachedImage(index, buffer, contentType, imageType);

    // Perform multiple concurrent reads (all should come from memory)
    const results = await Promise.all([
      loadCachedImage(index),
      loadCachedImage(index),
      loadCachedImage(index),
      loadCachedImage(index),
      loadCachedImage(index)
    ]);

    // All should succeed
    results.forEach(result => {
      expect(result).not.toBeNull();
      expect(result.buffer.toString()).toBe(buffer.toString());
    });
  });
});
