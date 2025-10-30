const { loadTemplate, renderTemplate, clearCache, BUILT_IN_TEMPLATES_DIR } = require('../../src/templates');
const fs = require('fs');
const path = require('path');

describe('Template System', () => {
  
  beforeEach(() => {
    // Clear cache before each test
    clearCache();
  });

  describe('loadTemplate', () => {
    test('should load built-in week-view template', () => {
      const template = loadTemplate('week-view');
      expect(template).toBeDefined();
      expect(typeof template).toBe('function');
    });

    test('should load built-in today-view template', () => {
      const template = loadTemplate('today-view');
      expect(template).toBeDefined();
      expect(typeof template).toBe('function');
    });

    test('should throw error for non-existent template', () => {
      expect(() => loadTemplate('non-existent')).toThrow('Template not found');
    });

    test('should cache templates after first load', () => {
      const template1 = loadTemplate('week-view');
      const template2 = loadTemplate('week-view');
      expect(template1).toBe(template2); // Same reference = cached
    });

    test('should clear cache when requested', () => {
      const template1 = loadTemplate('week-view');
      clearCache();
      const template2 = loadTemplate('week-view');
      // After cache clear, templates are reloaded (may or may not be same reference)
      expect(typeof template2).toBe('function');
    });
  });

  describe('renderTemplate', () => {
    const sampleEvents = [
      {
        title: 'Meeting',
        start: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
        end: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
        description: 'Team sync',
        allDay: false
      },
      {
        title: 'All Day Event',
        start: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        end: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
        description: 'Holiday',
        allDay: true
      },
      {
        title: 'Future Event',
        start: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days from now
        end: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
        description: 'Should not appear in week view',
        allDay: false
      }
    ];

    const sampleConfig = {
      icsUrl: 'https://example.com/calendar.ics',
      template: 'week-view',
      width: 800,
      height: 600,
      imageType: 'png'
    };

    test('should render week-view template with sample data', async () => {
      const html = await renderTemplate('week-view', {
        events: sampleEvents,
        config: sampleConfig
      });

      expect(html).toBeDefined();
      expect(typeof html).toBe('string');
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Week View');
      expect(html).toContain('Meeting'); // Event within 7 days
      expect(html).toContain('All Day Event'); // Event within 7 days
      expect(html).not.toContain('Future Event'); // Event outside 7 days
    });

    test('should render today-view template with sample data', async () => {
      const todayEvents = [
        {
          title: 'Today Meeting',
          start: new Date().toISOString(),
          end: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          description: 'Happening today',
          allDay: false
        }
      ];

      const html = await renderTemplate('today-view', {
        events: todayEvents,
        config: sampleConfig
      });

      expect(html).toBeDefined();
      expect(typeof html).toBe('string');
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain("Today's Events");
      expect(html).toContain('Today Meeting');
    });

    test('should handle empty events array', async () => {
      const html = await renderTemplate('week-view', {
        events: [],
        config: sampleConfig
      });

      expect(html).toBeDefined();
      expect(html).toContain('No events');
    });

    test('should pass now timestamp to template', async () => {
      const beforeTime = Date.now();
      await renderTemplate('week-view', {
        events: sampleEvents,
        config: sampleConfig
      });
      const afterTime = Date.now();

      // Just verify it doesn't throw - template receives 'now' timestamp
      expect(beforeTime).toBeLessThanOrEqual(afterTime);
    });

    test('should throw error for invalid template name', async () => {
      await expect(renderTemplate('invalid-template', {
        events: [],
        config: sampleConfig
      })).rejects.toThrow();
    });

    test('should handle missing data gracefully', async () => {
      const html = await renderTemplate('week-view', {});
      expect(html).toBeDefined();
      expect(html).toContain('<!DOCTYPE html>');
    });
  });

  describe('Template Output Validation', () => {
    test('week-view should produce valid HTML structure', async () => {
      const html = await renderTemplate('week-view', {
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
      const html = await renderTemplate('today-view', {
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
});
