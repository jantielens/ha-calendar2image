const { getCalendarEvents, createErrorEvents } = require('../../src/calendar');
const { fetchICS } = require('../../src/calendar/icsClient');
const { parseICS } = require('../../src/calendar/icsParser');

// Mock dependencies
jest.mock('../../src/calendar/icsClient');
jest.mock('../../src/calendar/icsParser');

describe('Calendar Index Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.warn = jest.fn(); // Mock console.warn for error handling tests
  });

  afterEach(() => {
    console.warn.mockRestore();
  });

  describe('createErrorEvents', () => {
    it('should create error events for the configured date range', () => {
      const options = { expandRecurringFrom: -2, expandRecurringTo: 2 };
      const events = createErrorEvents(0, null, 'Network error', options);
      
      expect(events).toHaveLength(5); // -2, -1, 0, 1, 2
      
      events.forEach((event, index) => {
        expect(event.summary).toBe('Failed loading ICS 0: Network error');
        expect(event.title).toBe('Failed loading ICS 0: Network error');
        expect(event.description).toBe('Error loading calendar source 0: Network error');
        expect(event.error).toBe('Network error');
        expect(event.allDay).toBe(true);
        expect(event.isAllDay).toBe(true);
        expect(event.source).toBe(0);
        expect(event.start).toBeDefined();
        expect(event.end).toBeDefined();
      });
    });

    it('should include sourceName when provided', () => {
      const events = createErrorEvents(1, 'Work Calendar', 'Server error', { expandRecurringFrom: 0, expandRecurringTo: 0 });
      
      expect(events).toHaveLength(1);
      expect(events[0].source).toBe(1);
      expect(events[0].sourceName).toBe('Work Calendar');
      expect(events[0].error).toBe('Server error');
    });

    it('should not include sourceName when not provided', () => {
      const events = createErrorEvents(2, null, 'Timeout', { expandRecurringFrom: 0, expandRecurringTo: 0 });
      
      expect(events).toHaveLength(1);
      expect(events[0].source).toBe(2);
      expect(events[0]).not.toHaveProperty('sourceName');
    });

    it('should use default date range when options not provided', () => {
      const events = createErrorEvents(0, null, 'Test error');
      
      expect(events).toHaveLength(63); // Default -31 to 31 = 63 days
    });

    it('should truncate long error messages in title', () => {
      const longError = 'This is a very long error message that exceeds fifty characters and should be truncated';
      const events = createErrorEvents(0, null, longError, { expandRecurringFrom: 0, expandRecurringTo: 0 });
      
      expect(events).toHaveLength(1);
      expect(events[0].summary).toBe('Failed loading ICS 0: This is a very long error message that exceeds ...');
      expect(events[0].description).toContain(longError); // Full error in description
      expect(events[0].error).toBe(longError); // Full error in error property
    });
  });

  describe('getCalendarEvents', () => {
    const mockEvents = [
      {
        summary: 'Test Event',
        start: '2025-11-04T10:00:00Z',
        end: '2025-11-04T11:00:00Z',
        isAllDay: false
      }
    ];

    describe('single URL (string format - backward compatibility)', () => {
      it('should handle single URL string successfully', async () => {
        const url = 'https://calendar.example.com/test.ics';
        const mockIcsData = 'BEGIN:VCALENDAR\nEND:VCALENDAR';
        
        fetchICS.mockResolvedValue(mockIcsData);
        parseICS.mockReturnValue(mockEvents);

        const result = await getCalendarEvents(url, { expandRecurringFrom: -7, expandRecurringTo: 7 });

        expect(fetchICS).toHaveBeenCalledWith(url, { rejectUnauthorized: true });
        expect(parseICS).toHaveBeenCalledWith(mockIcsData, { expandRecurringFrom: -7, expandRecurringTo: 7 });
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
          ...mockEvents[0],
          title: 'Test Event',
          allDay: false,
          source: 0
        });
      });

      it('should handle single URL fetch failure', async () => {
        const url = 'https://calendar.example.com/test.ics';
        fetchICS.mockRejectedValue(new Error('Network error'));

        const result = await getCalendarEvents(url, { expandRecurringFrom: -1, expandRecurringTo: 1 });

        expect(console.warn).toHaveBeenCalledWith(
          expect.stringContaining('[Calendar] Failed to fetch ICS from source 0')
        );
        expect(result).toHaveLength(3); // Error events for 3 days
        expect(result[0].summary).toBe('Failed loading ICS 0: Network error');
        expect(result[0].error).toBe('Network error');
      });
    });

    describe('multiple URLs (array format)', () => {
      it('should handle multiple URLs successfully', async () => {
        const sources = [
          { url: 'https://calendar1.example.com/test.ics', sourceName: 'Work' },
          { url: 'https://calendar2.example.com/test.ics', sourceName: 'Personal' }
        ];
        const mockIcsData1 = 'BEGIN:VCALENDAR\nEND:VCALENDAR';
        const mockIcsData2 = 'BEGIN:VCALENDAR\nEND:VCALENDAR';
        const mockEvents2 = [
          {
            summary: 'Personal Event',
            start: '2025-11-05T14:00:00Z',
            end: '2025-11-05T15:00:00Z',
            isAllDay: false
          }
        ];
        
        fetchICS.mockImplementation((url) => {
          if (url.includes('calendar1')) return Promise.resolve(mockIcsData1);
          if (url.includes('calendar2')) return Promise.resolve(mockIcsData2);
        });
        
        parseICS
          .mockReturnValueOnce(mockEvents)
          .mockReturnValueOnce(mockEvents2);

        const result = await getCalendarEvents(sources);

        expect(fetchICS).toHaveBeenCalledTimes(2);
        expect(parseICS).toHaveBeenCalledTimes(2);
        expect(result).toHaveLength(2);
        
        // Check first event (source 0)
        expect(result[0]).toEqual({
          ...mockEvents[0],
          title: 'Test Event',
          allDay: false,
          source: 0,
          sourceName: 'Work'
        });
        
        // Check second event (source 1)
        expect(result[1]).toEqual({
          ...mockEvents2[0],
          title: 'Personal Event',
          allDay: false,
          source: 1,
          sourceName: 'Personal'
        });
      });

      it('should handle sources without sourceName', async () => {
        const sources = [
          { url: 'https://calendar1.example.com/test.ics' }
        ];
        const mockIcsData = 'BEGIN:VCALENDAR\nEND:VCALENDAR';
        
        fetchICS.mockResolvedValue(mockIcsData);
        parseICS.mockReturnValue(mockEvents);

        const result = await getCalendarEvents(sources);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
          ...mockEvents[0],
          title: 'Test Event',
          allDay: false,
          source: 0
        });
        expect(result[0]).not.toHaveProperty('sourceName');
      });

      it('should handle mixed success and failure', async () => {
        const sources = [
          { url: 'https://good-calendar.example.com/test.ics', sourceName: 'Working' },
          { url: 'https://bad-calendar.example.com/test.ics', sourceName: 'Broken' }
        ];
        const mockIcsData = 'BEGIN:VCALENDAR\nEND:VCALENDAR';
        
        fetchICS.mockImplementation((url) => {
          if (url.includes('good-calendar')) return Promise.resolve(mockIcsData);
          if (url.includes('bad-calendar')) return Promise.reject(new Error('Server error'));
        });
        
        parseICS.mockReturnValue(mockEvents);

        const result = await getCalendarEvents(sources, { expandRecurringFrom: 0, expandRecurringTo: 0 });

        expect(console.warn).toHaveBeenCalledWith(
          expect.stringContaining('[Calendar] Failed to fetch ICS from source 1')
        );
        
        // Should have 1 real event + 1 error event (one day)
        expect(result).toHaveLength(2);
        
        // First event should be successful
        expect(result[0]).toEqual({
          ...mockEvents[0],
          title: 'Test Event',
          allDay: false,
          source: 0,
          sourceName: 'Working'
        });
        
        // Second event should be error event
        expect(result[1].summary).toBe('Failed loading ICS 1: Server error');
        expect(result[1].error).toBe('Server error');
        expect(result[1].source).toBe(1);
        expect(result[1].sourceName).toBe('Broken');
      });

      it('should handle all sources failing', async () => {
        const sources = [
          { url: 'https://bad1.example.com/test.ics' },
          { url: 'https://bad2.example.com/test.ics' }
        ];
        
        fetchICS.mockRejectedValue(new Error('Network error'));

        const result = await getCalendarEvents(sources, { expandRecurringFrom: 0, expandRecurringTo: 1 });

        expect(console.warn).toHaveBeenCalledTimes(2);
        expect(result).toHaveLength(4); // 2 sources × 2 days = 4 error events
        
        // Check error events for both sources
        const source0Events = result.filter(e => e.source === 0);
        const source1Events = result.filter(e => e.source === 1);
        expect(source0Events).toHaveLength(2);
        expect(source1Events).toHaveLength(2);
      });

      it('should preserve event order within sources but merge across sources', async () => {
        const sources = [
          { url: 'https://calendar1.example.com/test.ics' },
          { url: 'https://calendar2.example.com/test.ics' }
        ];
        
        const mockEvents1 = [
          { summary: 'Event A', start: '2025-11-04T10:00:00Z', isAllDay: false },
          { summary: 'Event B', start: '2025-11-04T11:00:00Z', isAllDay: false }
        ];
        
        const mockEvents2 = [
          { summary: 'Event C', start: '2025-11-04T12:00:00Z', isAllDay: false }
        ];
        
        fetchICS.mockResolvedValue('mock-ics');
        parseICS.mockImplementation(() => mockEvents1).mockImplementationOnce(() => mockEvents1).mockImplementationOnce(() => mockEvents2);
        
        // Need to handle multiple calls correctly
        let callCount = 0;
        parseICS.mockImplementation(() => {
          callCount++;
          return callCount === 1 ? mockEvents1 : mockEvents2;
        });

        const result = await getCalendarEvents(sources);

        expect(result).toHaveLength(3);
        expect(result[0].title).toBe('Event A');
        expect(result[0].source).toBe(0);
        expect(result[1].title).toBe('Event B');
        expect(result[1].source).toBe(0);
        expect(result[2].title).toBe('Event C');
        expect(result[2].source).toBe(1);
      });
    });

    describe('edge cases', () => {
      it('should handle empty array of sources', async () => {
        const result = await getCalendarEvents([]);
        expect(result).toEqual([]);
      });

      it('should pass options correctly to parseICS', async () => {
        const url = 'https://calendar.example.com/test.ics';
        const options = { 
          expandRecurringFrom: -14, 
          expandRecurringTo: 14, 
          timezone: 'Europe/Berlin' 
        };
        
        fetchICS.mockResolvedValue('mock-ics');
        parseICS.mockReturnValue([]);

        await getCalendarEvents(url, options);

        expect(parseICS).toHaveBeenCalledWith('mock-ics', options);
      });
    });
  });
});