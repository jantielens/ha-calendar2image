const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { loadConfig, loadAllConfigs, validateConfigs } = require('../../src/config/loader');

describe('config loader', () => {
  let tempDir;

  beforeEach(async () => {
    // Create a temporary directory for test configs
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ha-cal2img-test-'));
  });

  afterEach(async () => {
    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('loadConfig', () => {
    it('should load a valid configuration file', async () => {
      const config = {
        icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
        template: 'week-view'
      };

      await fs.writeFile(
        path.join(tempDir, '0.json'),
        JSON.stringify(config)
      );

      const result = await loadConfig(0, tempDir);
      
      expect(result).toMatchObject(config);
      expect(result.grayscale).toBe(false); // Default applied
      expect(result.bitDepth).toBe(8); // Default applied
      expect(result.imageType).toBe('png'); // Default applied
    });

    it('should load configuration with all fields', async () => {
      const config = {
        icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
        template: 'today-view',
        width: 1024,
        height: 768,
        grayscale: true,
        bitDepth: 16,
        imageType: 'jpg',
        expandRecurringFrom: -60,
        expandRecurringTo: 60,
        rotate: 0,
        locale: 'en-US',
        extraDataCacheTtl: 300
      };

      await fs.writeFile(
        path.join(tempDir, '5.json'),
        JSON.stringify(config)
      );

      const result = await loadConfig(5, tempDir);
      
      expect(result).toEqual(config);
    });

    it('should throw error for non-existent config file', async () => {
      await expect(loadConfig(99, tempDir)).rejects.toThrow('Configuration file not found');
    });

    it('should throw error for invalid JSON', async () => {
      await fs.writeFile(
        path.join(tempDir, '0.json'),
        'not valid json {'
      );

      await expect(loadConfig(0, tempDir)).rejects.toThrow('Invalid JSON');
    });

    it('should accept config without icsUrl (extraData-only mode)', async () => {
      const config = {
        template: 'week-view'
        // No icsUrl - valid for extraData-only templates
      };

      await fs.writeFile(
        path.join(tempDir, '0.json'),
        JSON.stringify(config)
      );

      const result = await loadConfig(0, tempDir);
      expect(result.template).toBe('week-view');
      expect(result.icsUrl).toBeUndefined();
    });

    it('should throw error for invalid icsUrl', async () => {
      const config = {
        icsUrl: 'ftp://invalid.com/cal.ics',
        template: 'week-view'
      };

      await fs.writeFile(
        path.join(tempDir, '0.json'),
        JSON.stringify(config)
      );

      await expect(loadConfig(0, tempDir)).rejects.toThrow('Configuration validation failed');
    });

    it('should throw error for invalid imageType', async () => {
      const config = {
        icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
        template: 'week-view',
        imageType: 'gif'
      };

      await fs.writeFile(
        path.join(tempDir, '0.json'),
        JSON.stringify(config)
      );

      await expect(loadConfig(0, tempDir)).rejects.toThrow('Configuration validation failed');
    });

    it('should throw error for negative index', async () => {
      await expect(loadConfig(-1, tempDir)).rejects.toThrow('Invalid config index');
    });

    it('should throw error for non-number index', async () => {
      await expect(loadConfig('abc', tempDir)).rejects.toThrow('Invalid config index');
    });
  });

  describe('loadAllConfigs', () => {
    it('should load all configuration files', async () => {
      const config0 = {
        icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
        template: 'week-view',
        rotate: 0
      };
      const config1 = {
        icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
        template: 'today-view',
        rotate: 0
      };

      await fs.writeFile(path.join(tempDir, '0.json'), JSON.stringify(config0));
      await fs.writeFile(path.join(tempDir, '1.json'), JSON.stringify(config1));

      const result = await loadAllConfigs(tempDir);
      
      expect(result).toHaveLength(2);
      expect(result[0].config).toMatchObject(config0);
      expect(result[1].config).toMatchObject(config1);
    });

    it('should load configs with non-sequential indices', async () => {
      const config0 = {
        icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
        template: 'week-view',
        rotate: 0
      };
      const config5 = {
        icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
        template: 'today-view',
        rotate: 0
      };

      await fs.writeFile(path.join(tempDir, '0.json'), JSON.stringify(config0));
      await fs.writeFile(path.join(tempDir, '5.json'), JSON.stringify(config5));

      const result = await loadAllConfigs(tempDir);
      
      expect(result).toHaveLength(2);
      expect(result[0].config).toMatchObject(config0);
      expect(result[1].config).toMatchObject(config5);
      expect(result[0].index).toBe(0);
      expect(result[1].index).toBe(5);
    });

    it('should ignore non-JSON files', async () => {
      const config0 = {
        icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
        template: 'week-view',
        rotate: 0
      };

      await fs.writeFile(path.join(tempDir, '0.json'), JSON.stringify(config0));
      await fs.writeFile(path.join(tempDir, 'readme.txt'), 'some text');
      await fs.writeFile(path.join(tempDir, 'config.json'), JSON.stringify(config0));

      const result = await loadAllConfigs(tempDir);
      
      expect(result).toHaveLength(1);
      expect(result[0].config).toMatchObject(config0);
    });

    it('should throw error if no config files found', async () => {
      await expect(loadAllConfigs(tempDir)).rejects.toThrow('No configuration files found');
    });

    it('should throw error if config directory does not exist', async () => {
      await expect(loadAllConfigs('/nonexistent/path')).rejects.toThrow('Configuration directory not found');
    });

    it('should throw error if any config is invalid', async () => {
      const config0 = {
        icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
        template: 'week-view'
      };
      const invalidConfig = {
        icsUrl: 'ftp://invalid.com/calendar.ics', // Invalid protocol
        template: 'week-view'
      };

      await fs.writeFile(path.join(tempDir, '0.json'), JSON.stringify(config0));
      await fs.writeFile(path.join(tempDir, '1.json'), JSON.stringify(invalidConfig));

      await expect(loadAllConfigs(tempDir)).rejects.toThrow('Failed to load configurations');
    });

    it('should report all invalid configs in error message', async () => {
      const invalidConfig1 = { icsUrl: 'ftp://invalid.com/calendar.ics', template: 'week-view' }; // Invalid protocol
      const invalidConfig2 = { icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics' }; // Missing template

      await fs.writeFile(path.join(tempDir, '0.json'), JSON.stringify(invalidConfig1));
      await fs.writeFile(path.join(tempDir, '1.json'), JSON.stringify(invalidConfig2));

      try {
        await loadAllConfigs(tempDir);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toContain('Config 0');
        expect(error.message).toContain('Config 1');
      }
    });
  });

  describe('validateConfigs', () => {
    it('should validate and return all configs', async () => {
      const config0 = {
        icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
        template: 'week-view',
        rotate: 0
      };

      await fs.writeFile(path.join(tempDir, '0.json'), JSON.stringify(config0));

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await validateConfigs(tempDir);
      
      expect(result[0].config).toMatchObject(config0);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Loading configurations'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Successfully loaded 1'));

      consoleSpy.mockRestore();
    });

    it('should throw error for invalid configs', async () => {
      const invalidConfig = {
        icsUrl: 'ftp://invalid.com/calendar.ics', // Invalid protocol
        template: 'week-view'
      };

      await fs.writeFile(path.join(tempDir, '0.json'), JSON.stringify(invalidConfig));

      await expect(validateConfigs(tempDir)).rejects.toThrow('Failed to load configurations');
    });
  });
});


