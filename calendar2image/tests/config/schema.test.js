const { validateConfig, applyDefaults } = require('../../src/config/schema');

describe('config schema', () => {
  describe('validateConfig', () => {
    it('should validate a valid minimal configuration', () => {
      const config = {
        icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
        template: 'week-view'
      };

      const result = validateConfig(config);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should validate a full configuration with all fields', () => {
      const config = {
        icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
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

    it('should accept configuration without icsUrl (template only)', () => {
      const config = {
        template: 'today-weather'
      };

      const result = validateConfig(config);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should accept configuration with template and extraDataUrl but no icsUrl', () => {
      const config = {
        template: 'today-weather',
        extraDataUrl: 'https://api.open-meteo.com/v1/forecast?latitude=50.8505&longitude=4.3488&current=temperature_2m'
      };

      const result = validateConfig(config);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject configuration missing template', () => {
      const config = {
        icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics'
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

    describe('icsUrl array format', () => {
      it('should accept array with single source', () => {
        const config = {
          icsUrl: [
            { url: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics' }
          ],
          template: 'week-view'
        };

        const result = validateConfig(config);
        expect(result.valid).toBe(true);
      });

      it('should accept array with multiple sources', () => {
        const config = {
          icsUrl: [
            { url: 'https://calendar1.google.com/calendar/ical/test1/public/basic.ics' },
            { url: 'https://calendar2.google.com/calendar/ical/test2/public/basic.ics' }
          ],
          template: 'week-view'
        };

        const result = validateConfig(config);
        expect(result.valid).toBe(true);
      });

      it('should accept array with sourceName', () => {
        const config = {
          icsUrl: [
            { url: 'https://work.calendar.com/ics', sourceName: 'Work Calendar' },
            { url: 'https://personal.calendar.com/ics', sourceName: 'Personal' }
          ],
          template: 'week-view'
        };

        const result = validateConfig(config);
        expect(result.valid).toBe(true);
      });

      it('should accept mixed array with some having sourceName', () => {
        const config = {
          icsUrl: [
            { url: 'https://work.calendar.com/ics', sourceName: 'Work' },
            { url: 'https://personal.calendar.com/ics' },
            { url: 'https://family.calendar.com/ics', sourceName: 'Family' }
          ],
          template: 'week-view'
        };

        const result = validateConfig(config);
        expect(result.valid).toBe(true);
      });

      it('should reject empty array', () => {
        const config = {
          icsUrl: [],
          template: 'week-view'
        };

        const result = validateConfig(config);
        expect(result.valid).toBe(false);
      });

      it('should reject array entry without url', () => {
        const config = {
          icsUrl: [
            { sourceName: 'Work Calendar' }
          ],
          template: 'week-view'
        };

        const result = validateConfig(config);
        expect(result.valid).toBe(false);
      });

      it('should reject array entry with empty url', () => {
        const config = {
          icsUrl: [
            { url: '' }
          ],
          template: 'week-view'
        };

        const result = validateConfig(config);
        expect(result.valid).toBe(false);
      });

      it('should reject array entry with invalid url protocol', () => {
        const config = {
          icsUrl: [
            { url: 'ftp://example.com/calendar.ics' }
          ],
          template: 'week-view'
        };

        const result = validateConfig(config);
        expect(result.valid).toBe(false);
      });

      it('should reject array entry with empty sourceName', () => {
        const config = {
          icsUrl: [
            { url: 'https://calendar.com/ics', sourceName: '' }
          ],
          template: 'week-view'
        };

        const result = validateConfig(config);
        expect(result.valid).toBe(false);
      });

      it('should reject array entry with unknown properties', () => {
        const config = {
          icsUrl: [
            { url: 'https://calendar.com/ics', unknownProp: 'value' }
          ],
          template: 'week-view'
        };

        const result = validateConfig(config);
        expect(result.valid).toBe(false);
      });
    });

    it('should reject empty template', () => {
      const config = {
        icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
        template: ''
      };

      const result = validateConfig(config);
      
      expect(result.valid).toBe(false);
    });

    it('should reject invalid imageType', () => {
      const config = {
        icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
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
          icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
          template: 'week-view',
          imageType: type
        };

        const result = validateConfig(config);
        expect(result.valid).toBe(true);
      });
    });

    it('should reject bitDepth below minimum', () => {
      const config = {
        icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
        template: 'week-view',
        bitDepth: 0
      };

      const result = validateConfig(config);
      
      expect(result.valid).toBe(false);
    });

    it('should reject bitDepth above maximum', () => {
      const config = {
        icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
        template: 'week-view',
        bitDepth: 33
      };

      const result = validateConfig(config);
      
      expect(result.valid).toBe(false);
    });

    it('should reject non-boolean grayscale', () => {
      const config = {
        icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
        template: 'week-view',
        grayscale: 'yes'
      };

      const result = validateConfig(config);
      
      expect(result.valid).toBe(false);
    });

    it('should reject additional unknown properties', () => {
      const config = {
        icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
        template: 'week-view',
        unknownField: 'value'
      };

      const result = validateConfig(config);
      
      expect(result.valid).toBe(false);
    });

    it('should accept http URLs', () => {
      const config = {
        icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
        template: 'week-view'
      };

      const result = validateConfig(config);
      
      expect(result.valid).toBe(true);
    });

    it('should accept valid rotate values', () => {
      const validAngles = [0, 90, 180, 270];
      
      validAngles.forEach(angle => {
        const config = {
          icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
          template: 'week-view',
          rotate: angle
        };

        const result = validateConfig(config);
        expect(result.valid).toBe(true);
      });
    });

    it('should reject invalid rotate values', () => {
      const invalidAngles = [45, 135, 225, 315, -90, 360];
      
      invalidAngles.forEach(angle => {
        const config = {
          icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
          template: 'week-view',
          rotate: angle
        };

        const result = validateConfig(config);
        expect(result.valid).toBe(false);
      });
    });

    it('should accept valid locale values', () => {
      const validLocales = ['en-US', 'de-DE', 'fr-FR', 'ja-JP', 'en', 'de', 'fr'];
      
      validLocales.forEach(locale => {
        const config = {
          icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
          template: 'week-view',
          locale
        };

        const result = validateConfig(config);
        expect(result.valid).toBe(true);
      });
    });

    it('should reject invalid locale values', () => {
      const invalidLocales = ['EN-US', 'en_US', 'english', '123', 'en-us-extra'];
      
      invalidLocales.forEach(locale => {
        const config = {
          icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
          template: 'week-view',
          locale
        };

        const result = validateConfig(config);
        expect(result.valid).toBe(false);
      });
    });

    it('should accept valid timezone values', () => {
      const config = {
        icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
        template: 'week-view',
        timezone: 'Europe/Berlin'
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(true);
    });

    it('should accept configuration without timezone (optional)', () => {
      const config = {
        icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
        template: 'week-view'
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(true);
    });

    describe('extraDataUrl validation', () => {
      it('should accept string format extraDataUrl', () => {
        const config = {
          icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
          template: 'week-view',
          extraDataUrl: 'http://localhost:3001/weather'
        };

        const result = validateConfig(config);
        expect(result.valid).toBe(true);
      });

      it('should accept array format with single source', () => {
        const config = {
          icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
          template: 'week-view',
          extraDataUrl: [
            { url: 'http://localhost:3001/weather' }
          ]
        };

        const result = validateConfig(config);
        expect(result.valid).toBe(true);
      });

      it('should accept array format with multiple sources', () => {
        const config = {
          icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
          template: 'week-view',
          extraDataUrl: [
            { url: 'http://localhost:3001/weather' },
            { url: 'http://localhost:3001/tasks' }
          ]
        };

        const result = validateConfig(config);
        expect(result.valid).toBe(true);
      });

      it('should accept empty array for extraDataUrl', () => {
        const config = {
          icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
          template: 'week-view',
          extraDataUrl: []
        };

        const result = validateConfig(config);
        expect(result.valid).toBe(true);
      });

      it('should accept array with custom headers per source', () => {
        const config = {
          icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
          template: 'week-view',
          extraDataUrl: [
            { url: 'http://localhost:3001/weather', headers: { 'Authorization': 'Bearer token123' } },
            { url: 'http://localhost:3001/tasks', headers: { 'X-API-Key': 'custom' } }
          ]
        };

        const result = validateConfig(config);
        expect(result.valid).toBe(true);
      });

      it('should accept array with custom cacheTtl per source', () => {
        const config = {
          icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
          template: 'week-view',
          extraDataUrl: [
            { url: 'http://localhost:3001/weather', cacheTtl: 600 },
            { url: 'http://localhost:3001/tasks', cacheTtl: 60 }
          ]
        };

        const result = validateConfig(config);
        expect(result.valid).toBe(true);
      });

      it('should accept empty string to disable headers', () => {
        const config = {
          icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
          template: 'week-view',
          extraDataUrl: [
            { url: 'http://localhost:3001/public', headers: '' }
          ]
        };

        const result = validateConfig(config);
        expect(result.valid).toBe(true);
      });

      it('should accept empty object to disable headers', () => {
        const config = {
          icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
          template: 'week-view',
          extraDataUrl: [
            { url: 'http://localhost:3001/public', headers: {} }
          ]
        };

        const result = validateConfig(config);
        expect(result.valid).toBe(true);
      });

      it('should accept null to disable headers', () => {
        const config = {
          icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
          template: 'week-view',
          extraDataUrl: [
            { url: 'http://localhost:3001/public', headers: null }
          ]
        };

        const result = validateConfig(config);
        expect(result.valid).toBe(true);
      });

      it('should accept array with mixed configuration', () => {
        const config = {
          icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
          template: 'week-view',
          extraDataUrl: [
            { url: 'http://localhost:3001/weather' },
            { url: 'http://localhost:3001/tasks', cacheTtl: 60 },
            { url: 'http://localhost:3001/public', headers: null },
            { url: 'http://localhost:3001/todos', headers: { 'X-API-Key': 'custom' }, cacheTtl: 120 }
          ]
        };

        const result = validateConfig(config);
        expect(result.valid).toBe(true);
      });

      it('should reject array entry without url', () => {
        const config = {
          icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
          template: 'week-view',
          extraDataUrl: [
            { headers: { 'Authorization': 'Bearer token' } }
          ]
        };

        const result = validateConfig(config);
        expect(result.valid).toBe(false);
      });

      it('should reject array entry with empty url', () => {
        const config = {
          icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
          template: 'week-view',
          extraDataUrl: [
            { url: '' }
          ]
        };

        const result = validateConfig(config);
        expect(result.valid).toBe(false);
      });

      it('should reject array entry with invalid url protocol', () => {
        const config = {
          icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
          template: 'week-view',
          extraDataUrl: [
            { url: 'ftp://localhost:3001/data' }
          ]
        };

        const result = validateConfig(config);
        expect(result.valid).toBe(false);
      });

      it('should reject array entry with negative cacheTtl', () => {
        const config = {
          icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
          template: 'week-view',
          extraDataUrl: [
            { url: 'http://localhost:3001/weather', cacheTtl: -10 }
          ]
        };

        const result = validateConfig(config);
        expect(result.valid).toBe(false);
      });

      it('should reject array entry with unknown properties', () => {
        const config = {
          icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
          template: 'week-view',
          extraDataUrl: [
            { url: 'http://localhost:3001/weather', unknownProp: 'value' }
          ]
        };

        const result = validateConfig(config);
        expect(result.valid).toBe(false);
      });

      it('should reject string extraDataUrl without http/https', () => {
        const config = {
          icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
          template: 'week-view',
          extraDataUrl: 'ftp://example.com/data'
        };

        const result = validateConfig(config);
        expect(result.valid).toBe(false);
      });

      it('should accept extraDataHeaders with extraDataUrl string', () => {
        const config = {
          icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
          template: 'week-view',
          extraDataUrl: 'http://localhost:3001/weather',
          extraDataHeaders: { 'Authorization': 'Bearer token' }
        };

        const result = validateConfig(config);
        expect(result.valid).toBe(true);
      });

      it('should accept extraDataCacheTtl with extraDataUrl string', () => {
        const config = {
          icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
          template: 'week-view',
          extraDataUrl: 'http://localhost:3001/weather',
          extraDataCacheTtl: 600
        };

        const result = validateConfig(config);
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('applyDefaults', () => {
    it('should apply all default values to config without icsUrl', () => {
      const config = {
        template: 'today-weather'
      };

      const result = applyDefaults(config);
      
      expect(result).toEqual({
        template: 'today-weather',
        width: 800,
        height: 600,
        grayscale: false,
        bitDepth: 8,
        imageType: 'png',
        rotate: 0,
        expandRecurringFrom: -31,
        expandRecurringTo: 31,
        locale: 'en-US',
        extraDataCacheTtl: 300
      });
    });

    it('should apply all default values to minimal config', () => {
      const config = {
        icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
        template: 'week-view'
      };

      const result = applyDefaults(config);
      
      expect(result).toEqual({
        icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
        template: 'week-view',
        width: 800,
        height: 600,
        grayscale: false,
        bitDepth: 8,
        imageType: 'png',
        rotate: 0,
        expandRecurringFrom: -31,
        expandRecurringTo: 31,
        locale: 'en-US',
        extraDataCacheTtl: 300
      });
    });

    it('should not override provided values', () => {
      const config = {
        icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
        template: 'today-view',
        width: 800,
        height: 600,
        grayscale: true,
        bitDepth: 16,
        imageType: 'jpg',
        expandRecurringFrom: -60,
        expandRecurringTo: 60,
        rotate: 0,
        locale: 'de-DE',
        extraDataCacheTtl: 300
      };

      const result = applyDefaults(config);
      
      expect(result).toEqual(config);
    });

    it('should handle partial defaults', () => {
      const config = {
        icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
        template: 'week-view',
        grayscale: true,
        imageType: 'bmp'
      };

      const result = applyDefaults(config);
      
      expect(result).toEqual({
        icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
        template: 'week-view',
        width: 800,
        height: 600,
        grayscale: true,
        bitDepth: 8,
        imageType: 'bmp',
        rotate: 0,
        expandRecurringFrom: -31,
        expandRecurringTo: 31,
        locale: 'en-US',
        extraDataCacheTtl: 300
      });
    });

    it('should handle grayscale: false explicitly', () => {
      const config = {
        icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
        template: 'week-view',
        grayscale: false
      };

      const result = applyDefaults(config);
      
      expect(result.grayscale).toBe(false);
    });

    it('should handle zero values for expandRecurring fields', () => {
      const config = {
        icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
        template: 'week-view',
        expandRecurringFrom: 0,
        expandRecurringTo: 0
      };

      const result = applyDefaults(config);
      
      expect(result.expandRecurringFrom).toBe(0);
      expect(result.expandRecurringTo).toBe(0);
    });

    it('should apply default locale when not provided', () => {
      const config = {
        icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
        template: 'week-view'
      };

      const result = applyDefaults(config);
      
      expect(result.locale).toBe('en-US');
    });

    it('should not override provided locale', () => {
      const config = {
        icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
        template: 'week-view',
        locale: 'de-DE'
      };

      const result = applyDefaults(config);
      
      expect(result.locale).toBe('de-DE');
    });

    it('should preserve timezone when provided', () => {
      const config = {
        icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
        template: 'week-view',
        timezone: 'Europe/Berlin'
      };

      const result = applyDefaults(config);
      
      expect(result.timezone).toBe('Europe/Berlin');
    });
  });
});

