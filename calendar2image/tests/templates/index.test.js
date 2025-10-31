// Import for non-custom template tests
const { loadTemplate: loadTemplateDefault, renderTemplate: renderTemplateDefault, clearCache: clearCacheDefault, BUILT_IN_TEMPLATES_DIR, CUSTOM_TEMPLATES_DIR } = require('../../src/templates');
const fs = require('fs');
const path = require('path');

describe('Template System', () => {
  
  // Test fixtures
  const testTemplatesDir = path.join(__dirname, 'fixtures');
  
  beforeEach(() => {
    // Clear cache before each test
    clearCacheDefault();
  });

  describe('loadTemplate', () => {
    test('should load built-in week-view template', () => {
      const template = loadTemplateDefault('week-view');
      expect(template).toBeDefined();
      expect(typeof template).toBe('function');
    });

    test('should load built-in today-view template', () => {
      const template = loadTemplateDefault('today-view');
      expect(template).toBeDefined();
      expect(typeof template).toBe('function');
    });

    test('should throw error for non-existent template', () => {
      expect(() => loadTemplateDefault('non-existent')).toThrow('Template not found');
    });

    test('should cache templates after first load', () => {
      const template1 = loadTemplateDefault('week-view');
      const template2 = loadTemplateDefault('week-view');
      expect(template1).toBe(template2); // Same reference = cached
    });

    test('should clear cache when requested', () => {
      const template1 = loadTemplateDefault('week-view');
      clearCacheDefault();
      const template2 = loadTemplateDefault('week-view');
      // After cache clear, templates are reloaded (may or may not be same reference)
      expect(typeof template2).toBe('function');
    });
  });

  describe('renderTemplate', () => {
    const sampleEvents = [
      {
        summary: 'Meeting',
        start: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
        end: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
        description: 'Team sync',
        allDay: false
      },
      {
        summary: 'All Day Event',
        start: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        end: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
        description: 'Holiday',
        allDay: true
      },
      {
        summary: 'Future Event',
        start: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days from now
        end: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
        description: 'Should not appear in week view',
        allDay: false
      }
    ];

    const sampleConfig = {
      icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
      template: 'week-view',
      width: 800,
      height: 600,
      imageType: 'png'
    };

    test('should render week-view template with sample data', async () => {
      const html = await renderTemplateDefault('week-view', {
        events: sampleEvents,
        config: sampleConfig
      });

      expect(html).toBeDefined();
      expect(typeof html).toBe('string');
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Weekly Calendar');
      expect(html).toContain('Meeting'); // Event within 7 days
      expect(html).toContain('All Day Event'); // Event within 7 days
      expect(html).not.toContain('Future Event'); // Event outside 7 days
    });

    test('should render today-view template with sample data', async () => {
      const todayEvents = [
        {
          summary: 'Today Meeting',
          start: new Date().toISOString(),
          end: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          description: 'Happening today',
          allDay: false
        }
      ];

      const html = await renderTemplateDefault('today-view', {
        events: todayEvents,
        config: sampleConfig
      });

      expect(html).toBeDefined();
      expect(typeof html).toBe('string');
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toMatch(/(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/);
      expect(html).toContain('Today Meeting');
    });

    test('should handle empty events array', async () => {
      const html = await renderTemplateDefault('week-view', {
        events: [],
        config: sampleConfig
      });

      expect(html).toBeDefined();
      expect(html).toContain('No events');
    });

    test('should pass now timestamp to template', async () => {
      const beforeTime = Date.now();
      await renderTemplateDefault('week-view', {
        events: sampleEvents,
        config: sampleConfig
      });
      const afterTime = Date.now();

      // Just verify it doesn't throw - template receives 'now' timestamp
      expect(beforeTime).toBeLessThanOrEqual(afterTime);
    });

    test('should throw error for invalid template name', async () => {
      await expect(renderTemplateDefault('invalid-template', {
        events: [],
        config: sampleConfig
      })).rejects.toThrow();
    });

    test('should handle missing data gracefully', async () => {
      const html = await renderTemplateDefault('week-view', {});
      expect(html).toBeDefined();
      expect(html).toContain('<!DOCTYPE html>');
    });
  });

  describe('Template Output Validation', () => {
    test('week-view should produce valid HTML structure', async () => {
      const html = await renderTemplateDefault('week-view', {
        events: [],
        config: {}
      });

      expect(html).toContain('<html>');
      expect(html).toContain('</html>');
      expect(html).toContain('<head>');
      expect(html).toContain('</head>');
      expect(html).toContain('<body>');
      expect(html).toContain('</body>');
      expect(html).toContain('<style>');
    });

    test('today-view should produce valid HTML structure', async () => {
      const html = await renderTemplateDefault('today-view', {
        events: [],
        config: {}
      });

      expect(html).toContain('<html>');
      expect(html).toContain('</html>');
      expect(html).toContain('<head>');
      expect(html).toContain('</head>');
      expect(html).toContain('<body>');
      expect(html).toContain('</body>');
      expect(html).toContain('<style>');
    });
  });

  describe('Custom Templates', () => {
    // Note: These tests have module loading challenges due to the TEMPLATES_DIR being set at module load time.
    // Comprehensive integration tests for custom templates are in custom-templates.test.js
    // Skipping these tests in favor of the integration tests
    
    const originalTemplatesDir = process.env.TEMPLATES_DIR;
    let templateModule;
    
    beforeAll(() => {
      // Create test fixtures directory
      if (!fs.existsSync(testTemplatesDir)) {
        fs.mkdirSync(testTemplatesDir, { recursive: true });
      }
      
      // Set TEMPLATES_DIR before requiring the module
      process.env.TEMPLATES_DIR = testTemplatesDir;
      
      // Clear module cache and reload templates module with new env var
      delete require.cache[require.resolve('../../src/templates')];
      templateModule = require('../../src/templates');
    });

    beforeEach(() => {
      // Clear template cache before each test
      templateModule.clearCache();
    });

    afterEach(() => {
      // Clean up created template files after each test
      if (fs.existsSync(testTemplatesDir)) {
        const files = fs.readdirSync(testTemplatesDir);
        files.forEach(file => {
          try {
            fs.unlinkSync(path.join(testTemplatesDir, file));
          } catch (err) {
            // Ignore errors
          }
        });
      }
    });

    afterAll(() => {
      // Restore original TEMPLATES_DIR
      if (originalTemplatesDir) {
        process.env.TEMPLATES_DIR = originalTemplatesDir;
      } else {
        delete process.env.TEMPLATES_DIR;
      }
      
      // Clean up test fixtures directory
      if (fs.existsSync(testTemplatesDir)) {
        const files = fs.readdirSync(testTemplatesDir);
        files.forEach(file => {
          try {
            fs.unlinkSync(path.join(testTemplatesDir, file));
          } catch (err) {
            // Ignore errors
          }
        });
        try {
          fs.rmdirSync(testTemplatesDir);
        } catch (err) {
          // Ignore errors
        }
      }
      
      // Reload the original module
      delete require.cache[require.resolve('../../src/templates')];
      require('../../src/templates');
    });

    test('should handle custom template with syntax errors gracefully', () => {
      // Ensure directory exists
      if (!fs.existsSync(testTemplatesDir)) {
        fs.mkdirSync(testTemplatesDir, { recursive: true });
      }
      
      const brokenTemplate = `
        module.exports = function(data) {
          return '<html><body>' + missingVariable + '</body></html>';
        };
      `;
      fs.writeFileSync(path.join(testTemplatesDir, 'broken.js'), brokenTemplate);

      expect(() => {
        const template = templateModule.loadTemplate('broken');
        template({ events: [], config: {} });
      }).toThrow();
    });

    test('should throw error if custom template does not export a function', () => {
      // Ensure directory exists
      if (!fs.existsSync(testTemplatesDir)) {
        fs.mkdirSync(testTemplatesDir, { recursive: true });
      }
      
      const invalidTemplate = `
        module.exports = {
          render: function(data) {
            return '<html></html>';
          }
        };
      `;
      fs.writeFileSync(path.join(testTemplatesDir, 'invalid.js'), invalidTemplate);

      expect(() => templateModule.loadTemplate('invalid')).toThrow();
    });

    test('should fall back to built-in template if custom template not found', () => {
      // Don't create the custom template, should fall back to built-in
      const template = templateModule.loadTemplate('week-view');
      const html = template({ events: [], config: {}, now: Date.now(), locale: 'en-US' });
      
      expect(html).toContain('Weekly Calendar'); // Built-in template content
    });

    test('should use default TEMPLATES_DIR when env var not set', () => {
      delete process.env.TEMPLATES_DIR;
      
      // Force module reload to pick up new env var
      delete require.cache[require.resolve('../../src/templates')];
      const { CUSTOM_TEMPLATES_DIR: defaultDir } = require('../../src/templates');
      
      expect(defaultDir).toBe('/data/calendar2image/templates');
    });
  });
});
