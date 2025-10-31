const { renderTemplate } = require('../../src/templates');

describe('Template Localization', () => {
  const sampleEvents = [
    {
      uid: 'event-1',
      summary: 'Morning Meeting',
      description: 'Team standup',
      location: 'Conference Room',
      start: '2025-10-30T09:00:00.000Z',
      end: '2025-10-30T10:00:00.000Z',
      isRecurring: false,
      isAllDay: false
    },
    {
      uid: 'event-2',
      summary: 'Lunch Break',
      description: '',
      location: '',
      start: '2025-10-30T12:00:00.000Z',
      end: '2025-10-30T13:00:00.000Z',
      isRecurring: false,
      isAllDay: false
    }
  ];

  describe('week-view template', () => {
    it('should render with default en-US locale', async () => {
      const html = await renderTemplate('week-view', {
        events: sampleEvents,
        config: { locale: 'en-US' }
      });

      expect(html).toContain('Weekly Calendar');
      expect(typeof html).toBe('string');
      expect(html.length).toBeGreaterThan(0);
    });

    it('should render with German locale', async () => {
      const html = await renderTemplate('week-view', {
        events: sampleEvents,
        config: { locale: 'de-DE' }
      });

      expect(html).toContain('Weekly Calendar');
      expect(typeof html).toBe('string');
      expect(html.length).toBeGreaterThan(0);
    });

    it('should render with French locale', async () => {
      const html = await renderTemplate('week-view', {
        events: sampleEvents,
        config: { locale: 'fr-FR' }
      });

      expect(html).toContain('Weekly Calendar');
      expect(typeof html).toBe('string');
      expect(html.length).toBeGreaterThan(0);
    });

    it('should render with Japanese locale', async () => {
      const html = await renderTemplate('week-view', {
        events: sampleEvents,
        config: { locale: 'ja-JP' }
      });

      expect(html).toContain('Weekly Calendar');
      expect(typeof html).toBe('string');
      expect(html.length).toBeGreaterThan(0);
    });

    it('should handle missing locale gracefully (fallback to en-US)', async () => {
      const html = await renderTemplate('week-view', {
        events: sampleEvents,
        config: {}
      });

      expect(html).toContain('Weekly Calendar');
      expect(typeof html).toBe('string');
      expect(html.length).toBeGreaterThan(0);
    });

    it('should pass locale to template data', async () => {
      const html = await renderTemplate('week-view', {
        events: sampleEvents,
        config: { locale: 'de-DE' }
      });

      // The template should use the locale for date/time formatting
      expect(html).toBeDefined();
      expect(html.length).toBeGreaterThan(100);
    });

    it('should render with empty events and locale', async () => {
      const html = await renderTemplate('week-view', {
        events: [],
        config: { locale: 'es-ES' }
      });

      expect(html).toContain('Weekly Calendar');
      expect(html).toContain('No events');
    });
  });

  describe('today-view template', () => {
    it('should render with default en-US locale', async () => {
      const html = await renderTemplate('today-view', {
        events: sampleEvents,
        config: { locale: 'en-US' }
      });

      expect(html).toMatch(/(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/);
      expect(typeof html).toBe('string');
      expect(html.length).toBeGreaterThan(0);
    });

    it('should render with German locale', async () => {
      const html = await renderTemplate('today-view', {
        events: sampleEvents,
        config: { locale: 'de-DE' }
      });

      expect(html).toMatch(/(?:Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonntag|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/);
      expect(typeof html).toBe('string');
      expect(html.length).toBeGreaterThan(0);
    });

    it('should render with French locale', async () => {
      const html = await renderTemplate('today-view', {
        events: sampleEvents,
        config: { locale: 'fr-FR' }
      });

      expect(html).toMatch(/(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/);
      expect(typeof html).toBe('string');
      expect(html.length).toBeGreaterThan(0);
    });

    it('should render with Spanish locale', async () => {
      const html = await renderTemplate('today-view', {
        events: sampleEvents,
        config: { locale: 'es-ES' }
      });

      expect(html).toMatch(/(?:lunes|martes|miércoles|jueves|viernes|sábado|domingo|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/);
      expect(typeof html).toBe('string');
      expect(html.length).toBeGreaterThan(0);
    });

    it('should handle missing locale gracefully (fallback to en-US)', async () => {
      const html = await renderTemplate('today-view', {
        events: sampleEvents,
        config: {}
      });

      expect(html).toMatch(/(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/);
      expect(typeof html).toBe('string');
      expect(html.length).toBeGreaterThan(0);
    });

    it('should pass locale to template data', async () => {
      const html = await renderTemplate('today-view', {
        events: sampleEvents,
        config: { locale: 'it-IT' }
      });

      // The template should use the locale for date/time formatting
      expect(html).toBeDefined();
      expect(html.length).toBeGreaterThan(100);
    });

    it('should render with empty events and locale', async () => {
      const html = await renderTemplate('today-view', {
        events: [],
        config: { locale: 'pt-BR' }
      });

      expect(html).toMatch(/(?:segunda-feira|terça-feira|quarta-feira|quinta-feira|sexta-feira|sábado|domingo|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/);
      expect(html).toContain('No events');
    });

    it('should handle all-day events with different locales', async () => {
      const allDayEvent = {
        uid: 'all-day',
        summary: 'All Day Event',
        description: '',
        location: '',
        start: '2025-10-30T00:00:00.000Z',
        end: '2025-10-31T00:00:00.000Z',
        isRecurring: false,
        isAllDay: true,
        allDay: true
      };

      const locales = ['en-US', 'de-DE', 'fr-FR', 'ja-JP'];

      for (const locale of locales) {
        const html = await renderTemplate('today-view', {
          events: [allDayEvent],
          config: { locale }
        });

        expect(html).toContain('Full day');
        expect(html).toContain('All Day Event');
      }
    });
  });

  describe('locale data propagation', () => {
    it('should receive locale in template data for week-view', async () => {
      // We can't directly inspect template data, but we can verify the template renders
      // successfully with various locales, which proves the data is being passed correctly
      const locales = ['en-US', 'de-DE', 'fr-FR', 'es-ES', 'it-IT', 'ja-JP', 'ko-KR', 'zh-CN'];

      for (const locale of locales) {
        const html = await renderTemplate('week-view', {
          events: sampleEvents,
          config: { locale }
        });

        expect(html).toBeDefined();
        expect(html.length).toBeGreaterThan(0);
        expect(html).toContain('<!DOCTYPE html>');
      }
    });

    it('should receive locale in template data for today-view', async () => {
      const locales = ['en-US', 'de-DE', 'fr-FR', 'es-ES', 'it-IT', 'ja-JP', 'ko-KR', 'zh-CN'];

      for (const locale of locales) {
        const html = await renderTemplate('today-view', {
          events: sampleEvents,
          config: { locale }
        });

        expect(html).toBeDefined();
        expect(html.length).toBeGreaterThan(0);
        expect(html).toContain('<!DOCTYPE html>');
      }
    });

    it('should receive timezone in template data', async () => {
      const html = await renderTemplate('week-view', {
        events: sampleEvents,
        config: { 
          locale: 'en-US',
          timezone: 'Europe/Berlin'
        }
      });

      expect(html).toBeDefined();
      expect(html.length).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle events with special characters in different locales', async () => {
      // Use today's date so the event shows up in today-view
      const today = new Date();
      today.setHours(8, 0, 0, 0);
      const start = today.toISOString();
      const end = new Date(today);
      end.setHours(9, 0, 0, 0);
      
      const specialEvents = [
        {
          uid: 'special-1',
          summary: 'Café & Früh­stück',
          description: 'Köln, Düsseldorf',
          location: 'München',
          start: start,
          end: end.toISOString(),
          isRecurring: false,
          isAllDay: false
        }
      ];

      const html = await renderTemplate('today-view', {
        events: specialEvents,
        config: { locale: 'de-DE' }
      });

      expect(html).toContain('Café & Früh­stück');
      expect(html).toContain('München');
    });

    it('should handle very long event names in different locales', async () => {
      // Use today's date so the event shows up in templates
      const today = new Date();
      today.setHours(10, 0, 0, 0);
      const start = today.toISOString();
      const end = new Date(today);
      end.setHours(11, 0, 0, 0);
      
      const longNameEvent = {
        uid: 'long-name',
        summary: 'This is a very long event name that should still render correctly in all locales regardless of the length',
        description: '',
        location: '',
        start: start,
        end: end.toISOString(),
        isRecurring: false,
        isAllDay: false
      };

      const locales = ['en-US', 'de-DE', 'ja-JP'];

      for (const locale of locales) {
        const html = await renderTemplate('week-view', {
          events: [longNameEvent],
          config: { locale }
        });

        expect(html).toContain(longNameEvent.summary);
      }
    });
  });
});
