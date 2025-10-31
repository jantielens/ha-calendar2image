const nock = require('nock');
const { fetchICS } = require('../../src/calendar/icsClient');

describe('icsClient', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  describe('fetchICS', () => {
    it('should successfully fetch ICS data from valid URL', async () => {
      const testData = 'BEGIN:VCALENDAR\nEND:VCALENDAR';
      
      nock('https://example.com')
        .get('/calendar.ics')
        .reply(200, testData);

      const result = await fetchICS('https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics');
      expect(result).toBe(testData);
    });

    it('should handle HTTP URLs', async () => {
      const testData = 'BEGIN:VCALENDAR\nEND:VCALENDAR';
      
      nock('http://example.com')
        .get('/calendar.ics')
        .reply(200, testData);

      const result = await fetchICS('https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics');
      expect(result).toBe(testData);
    });

    it('should throw error for invalid URL', async () => {
      await expect(fetchICS('not-a-url')).rejects.toThrow('Invalid URL format');
    });

    it('should throw error for null URL', async () => {
      await expect(fetchICS(null)).rejects.toThrow('Invalid URL');
    });

    it('should throw error for empty URL', async () => {
      await expect(fetchICS('')).rejects.toThrow('Invalid URL');
    });

    it('should throw error for unsupported protocol', async () => {
      await expect(fetchICS('ftp://example.com/calendar.ics')).rejects.toThrow('Unsupported protocol');
    });

    it('should handle 404 errors', async () => {
      nock('https://example.com')
        .get('/calendar.ics')
        .reply(404, 'Not Found');

      await expect(fetchICS('https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics')).rejects.toThrow('HTTP Error: 404');
    });

    it('should handle 500 errors', async () => {
      nock('https://example.com')
        .get('/calendar.ics')
        .reply(500, 'Internal Server Error');

      await expect(fetchICS('https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics')).rejects.toThrow('HTTP Error: 500');
    });

    it('should follow redirects', async () => {
      const testData = 'BEGIN:VCALENDAR\nEND:VCALENDAR';
      
      nock('https://example.com')
        .get('/old-calendar.ics')
        .reply(301, undefined, { location: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics' });

      nock('https://example.com')
        .get('/new-calendar.ics')
        .reply(200, testData);

      const result = await fetchICS('https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics');
      expect(result).toBe(testData);
    });

    it('should handle network errors', async () => {
      nock('https://example.com')
        .get('/calendar.ics')
        .replyWithError('Network error');

      await expect(fetchICS('https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics')).rejects.toThrow('Network error');
    });

    it('should handle empty response', async () => {
      nock('https://example.com')
        .get('/calendar.ics')
        .reply(200, '');

      await expect(fetchICS('https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics')).rejects.toThrow('Empty response');
    });

    it('should handle timeout', async () => {
      nock('https://example.com')
        .get('/calendar.ics')
        .delay(35000) // Longer than 30s timeout
        .reply(200, 'data');

      await expect(fetchICS('https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics')).rejects.toThrow('timeout');
    }, 35000);
  });
});

