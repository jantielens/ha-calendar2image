const { validateConfig, applyDefaults } = require('../../src/config/schema');

describe('config schema', () => {
  describe('validateConfig', () => {
    it('should validate a valid minimal configuration', () => {
      const config = {
        icsUrl: 'https://example.com/calendar.ics',
        template: 'week-view'
      };

      const result = validateConfig(config);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should validate a full configuration with all fields', () => {
      const config = {
        icsUrl: 'https://example.com/calendar.ics',
        template: 'week-view',
        grayscale: true,
        bitDepth: 16,
        imageType: 'jpg',
        expandRecurringFrom: -60,
        expandRecurringTo: 60
      };

      const result = validateConfig(config);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject configuration missing icsUrl', () => {
      const config = {
        template: 'week-view'
      };

      const result = validateConfig(config);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject configuration missing template', () => {
      const config = {
        icsUrl: 'https://example.com/calendar.ics'
      };

      const result = validateConfig(config);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject icsUrl without http/https protocol', () => {
      const config = {
        icsUrl: 'ftp://example.com/calendar.ics',
        template: 'week-view'
      };

      const result = validateConfig(config);
      
      expect(result.valid).toBe(false);
    });

    it('should reject empty icsUrl', () => {
      const config = {
        icsUrl: '',
        template: 'week-view'
      };

      const result = validateConfig(config);
      
      expect(result.valid).toBe(false);
    });

    it('should reject empty template', () => {
      const config = {
        icsUrl: 'https://example.com/calendar.ics',
        template: ''
      };

      const result = validateConfig(config);
      
      expect(result.valid).toBe(false);
    });

    it('should reject invalid imageType', () => {
      const config = {
        icsUrl: 'https://example.com/calendar.ics',
        template: 'week-view',
        imageType: 'gif'
      };

      const result = validateConfig(config);
      
      expect(result.valid).toBe(false);
    });

    it('should accept valid imageType values', () => {
      const validTypes = ['jpg', 'png', 'bmp'];
      
      validTypes.forEach(type => {
        const config = {
          icsUrl: 'https://example.com/calendar.ics',
          template: 'week-view',
          imageType: type
        };

        const result = validateConfig(config);
        expect(result.valid).toBe(true);
      });
    });

    it('should reject bitDepth below minimum', () => {
      const config = {
        icsUrl: 'https://example.com/calendar.ics',
        template: 'week-view',
        bitDepth: 0
      };

      const result = validateConfig(config);
      
      expect(result.valid).toBe(false);
    });

    it('should reject bitDepth above maximum', () => {
      const config = {
        icsUrl: 'https://example.com/calendar.ics',
        template: 'week-view',
        bitDepth: 33
      };

      const result = validateConfig(config);
      
      expect(result.valid).toBe(false);
    });

    it('should reject non-boolean grayscale', () => {
      const config = {
        icsUrl: 'https://example.com/calendar.ics',
        template: 'week-view',
        grayscale: 'yes'
      };

      const result = validateConfig(config);
      
      expect(result.valid).toBe(false);
    });

    it('should reject additional unknown properties', () => {
      const config = {
        icsUrl: 'https://example.com/calendar.ics',
        template: 'week-view',
        unknownField: 'value'
      };

      const result = validateConfig(config);
      
      expect(result.valid).toBe(false);
    });

    it('should accept http URLs', () => {
      const config = {
        icsUrl: 'http://example.com/calendar.ics',
        template: 'week-view'
      };

      const result = validateConfig(config);
      
      expect(result.valid).toBe(true);
    });
  });

  describe('applyDefaults', () => {
    it('should apply all default values to minimal config', () => {
      const config = {
        icsUrl: 'https://example.com/calendar.ics',
        template: 'week-view'
      };

      const result = applyDefaults(config);
      
      expect(result).toEqual({
        icsUrl: 'https://example.com/calendar.ics',
        template: 'week-view',
        width: 800,
        height: 600,
        grayscale: false,
        bitDepth: 8,
        imageType: 'png',
        expandRecurringFrom: -31,
        expandRecurringTo: 31
      });
    });

    it('should not override provided values', () => {
      const config = {
        icsUrl: 'https://example.com/calendar.ics',
        template: 'today-view',
        width: 800,
        height: 600,
        grayscale: true,
        bitDepth: 16,
        imageType: 'jpg',
        expandRecurringFrom: -60,
        expandRecurringTo: 60
      };

      const result = applyDefaults(config);
      
      expect(result).toEqual(config);
    });

    it('should handle partial defaults', () => {
      const config = {
        icsUrl: 'https://example.com/calendar.ics',
        template: 'week-view',
        grayscale: true,
        imageType: 'bmp'
      };

      const result = applyDefaults(config);
      
      expect(result).toEqual({
        icsUrl: 'https://example.com/calendar.ics',
        template: 'week-view',
        width: 800,
        height: 600,
        grayscale: true,
        bitDepth: 8,
        imageType: 'bmp',
        expandRecurringFrom: -31,
        expandRecurringTo: 31
      });
    });

    it('should handle grayscale: false explicitly', () => {
      const config = {
        icsUrl: 'https://example.com/calendar.ics',
        template: 'week-view',
        grayscale: false
      };

      const result = applyDefaults(config);
      
      expect(result.grayscale).toBe(false);
    });

    it('should handle zero values for expandRecurring fields', () => {
      const config = {
        icsUrl: 'https://example.com/calendar.ics',
        template: 'week-view',
        expandRecurringFrom: 0,
        expandRecurringTo: 0
      };

      const result = applyDefaults(config);
      
      expect(result.expandRecurringFrom).toBe(0);
      expect(result.expandRecurringTo).toBe(0);
    });
  });
});
