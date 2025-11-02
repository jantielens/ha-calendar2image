const { parseICS } = require('../../src/calendar/icsParser');

describe('ICS Parser - Localization', () => {
  describe('timezone conversion', () => {
    it('should convert event times to specified timezone', () => {
      const icsData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:test-event-1
SUMMARY:Test Event
DTSTART:20251030T100000Z
DTEND:20251030T110000Z
END:VEVENT
END:VCALENDAR`;

      const events = parseICS(icsData, { timezone: 'America/New_York' });
      
      expect(events).toHaveLength(1);
      expect(events[0].timezone).toBe('America/New_York');
      // The times should be converted to New York timezone
      expect(events[0].start).toBeDefined();
      expect(events[0].end).toBeDefined();
    });

    it('should handle events without timezone conversion when not specified', () => {
      const icsData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:test-event-1
SUMMARY:Test Event
DTSTART:20251030T100000Z
DTEND:20251030T110000Z
END:VEVENT
END:VCALENDAR`;

      const events = parseICS(icsData);
      
      expect(events).toHaveLength(1);
      expect(new Date(events[0].start).toISOString()).toBe('2025-10-30T10:00:00.000Z');
      expect(new Date(events[0].end).toISOString()).toBe('2025-10-30T11:00:00.000Z');
    });

    it('should convert recurring events to specified timezone', () => {
      // Use tomorrow's date to ensure the recurring events are in the future
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0].replace(/-/g, '');
      
      const icsData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:recurring-event
SUMMARY:Daily Meeting
DTSTART:${dateStr}T100000Z
DTEND:${dateStr}T110000Z
RRULE:FREQ=DAILY;COUNT=3
END:VEVENT
END:VCALENDAR`;

      const events = parseICS(icsData, { 
        timezone: 'Europe/Berlin',
        expandRecurringFrom: 0,
        expandRecurringTo: 7
      });
      
      expect(events.length).toBeGreaterThan(0);
      events.forEach(event => {
        expect(event.timezone).toBe('Europe/Berlin');
        expect(event.start).toBeDefined();
        expect(event.end).toBeDefined();
      });
    });

    it('should handle multiple timezones correctly', () => {
      const icsData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:test-event-1
SUMMARY:Morning Event
DTSTART:20251030T080000Z
DTEND:20251030T090000Z
END:VEVENT
BEGIN:VEVENT
UID:test-event-2
SUMMARY:Afternoon Event
DTSTART:20251030T140000Z
DTEND:20251030T150000Z
END:VEVENT
END:VCALENDAR`;

      const timezones = ['America/Los_Angeles', 'Europe/London', 'Asia/Tokyo'];
      
      timezones.forEach(timezone => {
        const events = parseICS(icsData, { timezone });
        
        expect(events).toHaveLength(2);
        events.forEach(event => {
          expect(event.timezone).toBe(timezone);
        });
      });
    });

    it('should handle all-day events with timezone', () => {
      const icsData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:all-day-event
SUMMARY:All Day Event
DTSTART;VALUE=DATE:20251030
DTEND;VALUE=DATE:20251031
END:VEVENT
END:VCALENDAR`;

      const events = parseICS(icsData, { timezone: 'Europe/Paris' });
      
      expect(events).toHaveLength(1);
      expect(events[0].isAllDay).toBe(true);
      expect(events[0].timezone).toBe('Europe/Paris');
    });

    it('should handle invalid timezone gracefully', () => {
      const icsData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:test-event-1
SUMMARY:Test Event
DTSTART:20251030T100000Z
DTEND:20251030T110000Z
END:VEVENT
END:VCALENDAR`;

      // Should not throw, but log warning and continue
      const events = parseICS(icsData, { timezone: 'Invalid/Timezone' });
      
      expect(events).toHaveLength(1);
      // Original times should be preserved when conversion fails
      expect(events[0].start).toBeDefined();
      expect(events[0].end).toBeDefined();
    });

    it('should convert multi-day events correctly', () => {
      const icsData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:multi-day-event
SUMMARY:Conference
DTSTART:20251030T090000Z
DTEND:20251101T170000Z
END:VEVENT
END:VCALENDAR`;

      const events = parseICS(icsData, { timezone: 'America/Chicago' });
      
      expect(events).toHaveLength(1);
      expect(events[0].timezone).toBe('America/Chicago');
      
      const start = new Date(events[0].start);
      const end = new Date(events[0].end);
      
      // Event should span multiple days
      expect(end.getTime() - start.getTime()).toBeGreaterThan(24 * 60 * 60 * 1000);
    });

    it('should handle events in different source timezones', () => {
      const icsData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:event-with-tz
SUMMARY:Event with Timezone
DTSTART;TZID=America/New_York:20251030T100000
DTEND;TZID=America/New_York:20251030T110000
END:VEVENT
END:VCALENDAR`;

      const events = parseICS(icsData, { timezone: 'Europe/London' });
      
      expect(events).toHaveLength(1);
      expect(events[0].timezone).toBe('Europe/London');
    });

    it('should preserve event order after timezone conversion', () => {
      const icsData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:event-1
SUMMARY:First Event
DTSTART:20251030T080000Z
DTEND:20251030T090000Z
END:VEVENT
BEGIN:VEVENT
UID:event-2
SUMMARY:Second Event
DTSTART:20251030T100000Z
DTEND:20251030T110000Z
END:VEVENT
BEGIN:VEVENT
UID:event-3
SUMMARY:Third Event
DTSTART:20251030T120000Z
DTEND:20251030T130000Z
END:VEVENT
END:VCALENDAR`;

      const events = parseICS(icsData, { timezone: 'Asia/Tokyo' });
      
      expect(events).toHaveLength(3);
      expect(events[0].summary).toBe('First Event');
      expect(events[1].summary).toBe('Second Event');
      expect(events[2].summary).toBe('Third Event');
      
      // Verify chronological order is maintained
      const start1 = new Date(events[0].start).getTime();
      const start2 = new Date(events[1].start).getTime();
      const start3 = new Date(events[2].start).getTime();
      
      expect(start2).toBeGreaterThan(start1);
      expect(start3).toBeGreaterThan(start2);
    });
  });

  describe('timezone edge cases', () => {
    it('should handle empty calendar with timezone option', () => {
      const icsData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
END:VCALENDAR`;

      const events = parseICS(icsData, { timezone: 'Europe/Berlin' });
      
      expect(events).toEqual([]);
    });

    it('should handle events at timezone boundaries', () => {
      // Event at midnight UTC
      const icsData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:midnight-event
SUMMARY:Midnight Event
DTSTART:20251030T000000Z
DTEND:20251030T010000Z
END:VEVENT
END:VCALENDAR`;

      const events = parseICS(icsData, { timezone: 'America/New_York' });
      
      expect(events).toHaveLength(1);
      expect(events[0].start).toBeDefined();
    });

    it('should handle very short events with timezone', () => {
      const icsData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:short-event
SUMMARY:1 Minute Event
DTSTART:20251030T100000Z
DTEND:20251030T100100Z
END:VEVENT
END:VCALENDAR`;

      const events = parseICS(icsData, { timezone: 'Pacific/Auckland' });
      
      expect(events).toHaveLength(1);
      const start = new Date(events[0].start);
      const end = new Date(events[0].end);
      
      // Duration should be preserved (approximately 1 minute)
      expect(end.getTime() - start.getTime()).toBeLessThan(2 * 60 * 1000);
    });
  });
});
