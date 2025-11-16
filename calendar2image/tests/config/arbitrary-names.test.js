const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { loadConfig, loadAllConfigs } = require('../../src/config/loader');
const { sanitizeConfigName, isValidConfigName, toCacheName } = require('../../src/utils/sanitize');

describe('Arbitrary Config Names', () => {
  let tempDir;

  beforeEach(async () => {
    // Create a temporary directory for test configs
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ha-cal2img-names-'));
  });

  afterEach(async () => {
    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Config name sanitization', () => {
    it('should accept simple alphanumeric names', () => {
      expect(sanitizeConfigName('kitchen')).toBe('kitchen');
      expect(sanitizeConfigName('vacation2024')).toBe('vacation2024');
      expect(sanitizeConfigName('room1')).toBe('room1');
    });

    it('should accept names with hyphens and underscores', () => {
      expect(sanitizeConfigName('kitchen-week')).toBe('kitchen-week');
      expect(sanitizeConfigName('vacation_2024')).toBe('vacation_2024');
      expect(sanitizeConfigName('meeting-room_1')).toBe('meeting-room_1');
    });

    it('should accept names with spaces', () => {
      expect(sanitizeConfigName('kitchen week')).toBe('kitchen week');
      expect(sanitizeConfigName('Work Calendar')).toBe('Work Calendar');
    });

    it('should accept names with unicode characters', () => {
      expect(sanitizeConfigName('café')).toBe('café');
      expect(sanitizeConfigName('日本語')).toBe('日本語');
      expect(sanitizeConfigName('Ñoño')).toBe('Ñoño');
    });

    it('should reject names with path separators', () => {
      expect(() => sanitizeConfigName('../etc/passwd')).toThrow('path separators');
      expect(() => sanitizeConfigName('..\\windows\\system32')).toThrow('path separators');
      expect(() => sanitizeConfigName('etc/passwd')).toThrow('path separators');
    });

    it('should reject names with parent directory references', () => {
      expect(() => sanitizeConfigName('..')).toThrow('parent directory');
      expect(() => sanitizeConfigName('a..b')).toThrow('parent directory');
    });

    it('should reject names starting with dot', () => {
      expect(() => sanitizeConfigName('.hidden')).toThrow('start with a dot');
    });

    it('should reject reserved names', () => {
      expect(() => sanitizeConfigName('con')).toThrow('reserved');
      expect(() => sanitizeConfigName('prn')).toThrow('reserved');
      expect(() => sanitizeConfigName('aux')).toThrow('reserved');
      expect(() => sanitizeConfigName('nul')).toThrow('reserved');
    });

    it('should remove .json extension automatically', () => {
      expect(sanitizeConfigName('kitchen.json')).toBe('kitchen');
      expect(sanitizeConfigName('KITCHEN.JSON')).toBe('KITCHEN');
    });

    it('should trim whitespace', () => {
      expect(sanitizeConfigName('  kitchen  ')).toBe('kitchen');
      expect(sanitizeConfigName('\tkitchen\n')).toBe('kitchen');
    });
  });

  describe('isValidConfigName', () => {
    it('should return true for valid names', () => {
      expect(isValidConfigName('kitchen')).toBe(true);
      expect(isValidConfigName('kitchen week')).toBe(true);
      expect(isValidConfigName('vacation-2024')).toBe(true);
      expect(isValidConfigName('café')).toBe(true);
    });

    it('should return false for invalid names', () => {
      expect(isValidConfigName('../etc/passwd')).toBe(false);
      expect(isValidConfigName('.hidden')).toBe(false);
      expect(isValidConfigName('')).toBe(false);
      expect(isValidConfigName(null)).toBe(false);
    });
  });

  describe('toCacheName', () => {
    it('should convert spaces to underscores', () => {
      expect(toCacheName('kitchen week')).toBe('kitchen_week');
      expect(toCacheName('Work Calendar')).toBe('Work_Calendar');
    });

    it('should preserve hyphens and underscores', () => {
      expect(toCacheName('vacation-2024')).toBe('vacation-2024');
      expect(toCacheName('meeting_room')).toBe('meeting_room');
    });

    it('should handle unicode characters', () => {
      const result = toCacheName('café');
      expect(result).toBeTruthy(); // Should not throw
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('loadConfig with arbitrary names', () => {
    it('should load config with simple name', async () => {
      const config = {
        template: 'week-view',
        icsUrl: 'https://example.com/cal.ics'
      };

      await fs.writeFile(
        path.join(tempDir, 'kitchen.json'),
        JSON.stringify(config)
      );

      const result = await loadConfig('kitchen', tempDir);
      expect(result.template).toBe('week-view');
    });

    it('should load config with spaces in name', async () => {
      const config = {
        template: 'week-view',
        icsUrl: 'https://example.com/cal.ics'
      };

      await fs.writeFile(
        path.join(tempDir, 'kitchen week.json'),
        JSON.stringify(config)
      );

      const result = await loadConfig('kitchen week', tempDir);
      expect(result.template).toBe('week-view');
    });

    it('should load config with hyphens and underscores', async () => {
      const config = {
        template: 'week-view',
        icsUrl: 'https://example.com/cal.ics'
      };

      await fs.writeFile(
        path.join(tempDir, 'vacation-2024.json'),
        JSON.stringify(config)
      );

      const result = await loadConfig('vacation-2024', tempDir);
      expect(result.template).toBe('week-view');
    });

    it('should load config with unicode characters', async () => {
      const config = {
        template: 'week-view',
        icsUrl: 'https://example.com/cal.ics'
      };

      await fs.writeFile(
        path.join(tempDir, 'café.json'),
        JSON.stringify(config)
      );

      const result = await loadConfig('café', tempDir);
      expect(result.template).toBe('week-view');
    });

    it('should still support numeric names (backward compatibility)', async () => {
      const config = {
        template: 'week-view',
        icsUrl: 'https://example.com/cal.ics'
      };

      await fs.writeFile(
        path.join(tempDir, '0.json'),
        JSON.stringify(config)
      );

      const result = await loadConfig(0, tempDir);
      expect(result.template).toBe('week-view');
    });

    it('should reject path traversal attempts', async () => {
      await expect(loadConfig('../etc/passwd', tempDir)).rejects.toThrow('Invalid config name');
      await expect(loadConfig('..\\windows\\system32', tempDir)).rejects.toThrow('Invalid config name');
    });
  });

  describe('loadAllConfigs with mixed names', () => {
    it('should load all configs with various naming styles', async () => {
      const config = {
        template: 'week-view',
        icsUrl: 'https://example.com/cal.ics'
      };

      // Create configs with different naming styles
      await fs.writeFile(path.join(tempDir, '0.json'), JSON.stringify(config));
      await fs.writeFile(path.join(tempDir, '1.json'), JSON.stringify(config));
      await fs.writeFile(path.join(tempDir, 'kitchen.json'), JSON.stringify(config));
      await fs.writeFile(path.join(tempDir, 'kitchen week.json'), JSON.stringify(config));
      await fs.writeFile(path.join(tempDir, 'vacation-2024.json'), JSON.stringify(config));

      const result = await loadAllConfigs(tempDir);
      
      // Should have loaded all 5 configs
      expect(result).toHaveLength(5);
      
      // Numeric configs should come first, sorted numerically
      expect(result[0].name).toBe('0');
      expect(result[0].index).toBe(0);
      expect(result[1].name).toBe('1');
      expect(result[1].index).toBe(1);
      
      // Named configs should come after, sorted alphabetically
      const namedConfigs = result.slice(2);
      const names = namedConfigs.map(c => c.name).sort();
      expect(names).toEqual(['kitchen', 'kitchen week', 'vacation-2024']);
    });

    it('should handle configs with only non-numeric names', async () => {
      const config = {
        template: 'week-view',
        icsUrl: 'https://example.com/cal.ics'
      };

      await fs.writeFile(path.join(tempDir, 'alpha.json'), JSON.stringify(config));
      await fs.writeFile(path.join(tempDir, 'beta.json'), JSON.stringify(config));
      await fs.writeFile(path.join(tempDir, 'gamma.json'), JSON.stringify(config));

      const result = await loadAllConfigs(tempDir);
      
      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('alpha');
      expect(result[1].name).toBe('beta');
      expect(result[2].name).toBe('gamma');
      
      // Non-numeric names should not have an index property
      expect(result[0].index).toBeUndefined();
      expect(result[1].index).toBeUndefined();
      expect(result[2].index).toBeUndefined();
    });
  });
});
