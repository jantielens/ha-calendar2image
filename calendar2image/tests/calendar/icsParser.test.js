const { parseICS } = require('../../src/calendar/icsParser');

describe('icsParser', () => {
  describe('parseICS', () => {
    it('should parse a simple non-recurring event', () => {
      const icsData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:test-event-1
SUMMARY:Test Event
DTSTART:20251030T100000Z
DTEND:20251030T110000Z
DESCRIPTION:Test description
LOCATION:Test location
END:VEVENT
END:VCALENDAR`;

      const events = parseICS(icsData);
      
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        uid: 'test-event-1',
        summary: 'Test Event',
        description: 'Test description',
        location: 'Test location',
        isRecurring: false
      });
      expect(new Date(events[0].start).toISOString()).toBe('2025-10-30T10:00:00.000Z');
      expect(new Date(events[0].end).toISOString()).toBe('2025-10-30T11:00:00.000Z');
    });

    it('should parse multiple non-recurring events', () => {
      const icsData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:event-1
SUMMARY:Event 1
DTSTART:20251030T100000Z
DTEND:20251030T110000Z
END:VEVENT
BEGIN:VEVENT
UID:event-2
SUMMARY:Event 2
DTSTART:20251031T140000Z
DTEND:20251031T150000Z
END:VEVENT
END:VCALENDAR`;

      const events = parseICS(icsData);
      
      expect(events).toHaveLength(2);
      expect(events[0].summary).toBe('Event 1');
      expect(events[1].summary).toBe('Event 2');
    });

    it('should sort events by start date', () => {
      const icsData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:event-2
SUMMARY:Later Event
DTSTART:20251031T100000Z
DTEND:20251031T110000Z
END:VEVENT
BEGIN:VEVENT
UID:event-1
SUMMARY:Earlier Event
DTSTART:20251030T100000Z
DTEND:20251030T110000Z
END:VEVENT
END:VCALENDAR`;

      const events = parseICS(icsData);
      
      expect(events).toHaveLength(2);
      expect(events[0].summary).toBe('Earlier Event');
      expect(events[1].summary).toBe('Later Event');
    });

    it('should respect expandRecurringFrom and expandRecurringTo options', () => {
      const icsData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:recurring-1
SUMMARY:Daily Event
DTSTART:20251030T100000Z
DTEND:20251030T110000Z
RRULE:FREQ=DAILY;COUNT=100
END:VEVENT
END:VCALENDAR`;

      const events = parseICS(icsData, { expandRecurringFrom: 0, expandRecurringTo: 7 });
      
      // Should only include events within 7 days from today
      expect(events.length).toBeLessThan(100);
    });

    it('should handle empty calendar', () => {
      const icsData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
END:VCALENDAR`;

      const events = parseICS(icsData);
      
      expect(events).toEqual([]);
    });

    it('should handle events with timezone information', () => {
      const icsData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VTIMEZONE
TZID:America/New_York
BEGIN:STANDARD
DTSTART:20251103T020000
TZOFFSETFROM:-0400
TZOFFSETTO:-0500
END:STANDARD
END:VTIMEZONE
BEGIN:VEVENT
UID:tz-event
SUMMARY:Event with Timezone
DTSTART;TZID=America/New_York:20251030T100000
DTEND;TZID=America/New_York:20251030T110000
END:VEVENT
END:VCALENDAR`;

      const events = parseICS(icsData);
      
      expect(events).toHaveLength(1);
      expect(events[0].summary).toBe('Event with Timezone');
      expect(events[0].timezone).toBe('America/New_York');
    });

    it('should handle all-day events', () => {
      const icsData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:allday-1
SUMMARY:All Day Event
DTSTART;VALUE=DATE:20251030
DTEND;VALUE=DATE:20251031
END:VEVENT
END:VCALENDAR`;

      const events = parseICS(icsData);
      
      expect(events).toHaveLength(1);
      expect(events[0].summary).toBe('All Day Event');
      expect(events[0].isAllDay).toBe(true);
    });

    it('should throw error for invalid ICS data', () => {
      expect(() => parseICS('not valid ics')).toThrow('Failed to parse ICS data');
    });

    it('should throw error for null data', () => {
      expect(() => parseICS(null)).toThrow('Invalid ICS data');
    });

    it('should throw error for empty string', () => {
      expect(() => parseICS('')).toThrow('Invalid ICS data');
    });

    it('should handle events with missing optional fields', () => {
      const icsData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:minimal-event
SUMMARY:Minimal Event
DTSTART:20251030T100000Z
DTEND:20251030T110000Z
END:VEVENT
END:VCALENDAR`;

      const events = parseICS(icsData);
      
      expect(events).toHaveLength(1);
      expect(events[0].description).toBe('');
      expect(events[0].location).toBe('');
    });

    it('should use default options when not provided', () => {
      const icsData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:event-1
SUMMARY:Test Event
DTSTART:20251030T100000Z
DTEND:20251030T110000Z
END:VEVENT
END:VCALENDAR`;

      const events = parseICS(icsData); // No options provided
      
      expect(events).toHaveLength(1);
      expect(events[0].summary).toBe('Test Event');
    });
  });
});
