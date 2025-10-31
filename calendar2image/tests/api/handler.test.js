const { generateCalendarImage, handleImageRequest } = require('../../src/api/handler');
const { loadConfig } = require('../../src/config');
const { getCalendarEvents } = require('../../src/calendar');
const { renderTemplate } = require('../../src/templates');
const { generateImage } = require('../../src/image');

// Mock all dependencies
jest.mock('../../src/config');
jest.mock('../../src/calendar');
jest.mock('../../src/templates');
jest.mock('../../src/image');

describe('API Handler', () => {
  // Sample test data
  const mockConfig = {
    icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
    template: 'week-view',
    width: 800,
    height: 600,
    imageType: 'png',
    grayscale: false,
    bitDepth: 8,
    expandRecurringFrom: -31,
    expandRecurringTo: 31
  };

  const mockEvents = [
    { title: 'Event 1', start: '2024-01-01T10:00:00Z', end: '2024-01-01T11:00:00Z' },
    { title: 'Event 2', start: '2024-01-02T14:00:00Z', end: '2024-01-02T15:00:00Z' }
  ];

  const mockHtml = '<html><body><h1>Calendar</h1></body></html>';

  const mockImageResult = {
    buffer: Buffer.from('fake-image-data'),
    contentType: 'image/png'
  };

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Suppress console logs during tests
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    // Restore console
    console.log.mockRestore();
    console.error.mockRestore();
    console.warn.mockRestore();
  });

  describe('generateCalendarImage', () => {
    it('should successfully generate an image with valid config', async () => {
      // Setup mocks
      loadConfig.mockResolvedValue(mockConfig);
      getCalendarEvents.mockResolvedValue(mockEvents);
      renderTemplate.mockResolvedValue(mockHtml);
      generateImage.mockResolvedValue(mockImageResult);

      // Execute
      const result = await generateCalendarImage(0);

      // Verify
      expect(loadConfig).toHaveBeenCalledWith(0);
      expect(getCalendarEvents).toHaveBeenCalledWith(mockConfig.icsUrl, {
        expandRecurringFrom: mockConfig.expandRecurringFrom,
        expandRecurringTo: mockConfig.expandRecurringTo
      });
      expect(renderTemplate).toHaveBeenCalledWith(mockConfig.template, {
        events: mockEvents,
        config: mockConfig
      });
      expect(generateImage).toHaveBeenCalledWith(mockHtml, {
        width: mockConfig.width,
        height: mockConfig.height,
        imageType: mockConfig.imageType,
        grayscale: mockConfig.grayscale,
        bitDepth: mockConfig.bitDepth
      });
      expect(result).toEqual(mockImageResult);
    });

    it('should throw 404 error when config file not found', async () => {
      loadConfig.mockRejectedValue(new Error('Configuration file not found: /config/5.json'));

      await expect(generateCalendarImage(5)).rejects.toMatchObject({
        message: 'Configuration 5 not found',
        statusCode: 404
      });
    });

    it('should throw 400 error for invalid config index', async () => {
      loadConfig.mockRejectedValue(new Error('Invalid config index: -1. Must be a non-negative number'));

      await expect(generateCalendarImage(-1)).rejects.toMatchObject({
        message: expect.stringContaining('Invalid configuration'),
        statusCode: 400
      });
    });

    it('should throw 400 error for configuration validation failure', async () => {
      loadConfig.mockRejectedValue(new Error('Configuration validation failed for /config/2.json: icsUrl is required'));

      await expect(generateCalendarImage(2)).rejects.toMatchObject({
        message: expect.stringContaining('Invalid configuration'),
        statusCode: 400
      });
    });

    it('should throw 502 error when ICS fetch fails', async () => {
      loadConfig.mockResolvedValue(mockConfig);
      getCalendarEvents.mockRejectedValue(new Error('Failed to fetch ICS from https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics'));

      await expect(generateCalendarImage(0)).rejects.toMatchObject({
        message: 'Failed to fetch calendar data from ICS URL',
        statusCode: 502
      });
    });

    it('should throw 500 error when template not found', async () => {
      loadConfig.mockResolvedValue(mockConfig);
      getCalendarEvents.mockResolvedValue(mockEvents);
      renderTemplate.mockRejectedValue(new Error('Template not found: custom-template'));

      await expect(generateCalendarImage(0)).rejects.toMatchObject({
        message: 'Template rendering failed',
        statusCode: 500
      });
    });

    it('should throw 500 error when template rendering fails', async () => {
      loadConfig.mockResolvedValue(mockConfig);
      getCalendarEvents.mockResolvedValue(mockEvents);
      renderTemplate.mockRejectedValue(new Error('Failed to render template week-view: syntax error'));

      await expect(generateCalendarImage(0)).rejects.toMatchObject({
        message: 'Template rendering failed',
        statusCode: 500
      });
    });

    it('should throw 500 error when image generation fails', async () => {
      loadConfig.mockResolvedValue(mockConfig);
      getCalendarEvents.mockResolvedValue(mockEvents);
      renderTemplate.mockResolvedValue(mockHtml);
      generateImage.mockRejectedValue(new Error('Image generation failed: Puppeteer timeout'));

      await expect(generateCalendarImage(0)).rejects.toMatchObject({
        message: 'Image generation failed',
        statusCode: 500
      });
    });

    it('should throw 500 error for unexpected errors', async () => {
      loadConfig.mockRejectedValue(new Error('Unexpected database error'));

      await expect(generateCalendarImage(0)).rejects.toMatchObject({
        message: 'Internal server error during image generation',
        statusCode: 500
      });
    });

    it('should log verbose information during successful generation', async () => {
      loadConfig.mockResolvedValue(mockConfig);
      getCalendarEvents.mockResolvedValue(mockEvents);
      renderTemplate.mockResolvedValue(mockHtml);
      generateImage.mockResolvedValue(mockImageResult);

      await generateCalendarImage(0);

      // Verify logging calls
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('[API] Starting image generation'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('[API] Loading configuration'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('[API] Fetching calendar events'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('[API] Rendering template'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('[API] Generating image'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('[API] Total processing time'));
    });

    it('should handle different image types correctly', async () => {
      const jpegConfig = { ...mockConfig, imageType: 'jpg' };
      const jpegResult = { ...mockImageResult, contentType: 'image/jpeg' };

      loadConfig.mockResolvedValue(jpegConfig);
      getCalendarEvents.mockResolvedValue(mockEvents);
      renderTemplate.mockResolvedValue(mockHtml);
      generateImage.mockResolvedValue(jpegResult);

      const result = await generateCalendarImage(0);

      expect(generateImage).toHaveBeenCalledWith(mockHtml, expect.objectContaining({
        imageType: 'jpg'
      }));
      expect(result.contentType).toBe('image/jpeg');
    });
  });

  describe('handleImageRequest', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
      mockReq = {
        params: {}
      };
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis()
      };
      mockNext = jest.fn();
    });

    it('should return 400 for non-numeric index', async () => {
      mockReq.params.index = 'abc';

      await handleImageRequest(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Bad Request',
        message: 'Invalid index parameter',
        details: 'Index must be a non-negative integer (0, 1, 2, etc.)'
      });
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Invalid index parameter'));
    });

    it('should return 400 for negative index', async () => {
      mockReq.params.index = '-5';

      await handleImageRequest(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Bad Request',
        message: 'Invalid index parameter'
      }));
    });

    it('should return 400 for decimal index', async () => {
      mockReq.params.index = '3.14';

      await handleImageRequest(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should successfully return image for valid index', async () => {
      mockReq.params.index = '0';
      
      loadConfig.mockResolvedValue(mockConfig);
      getCalendarEvents.mockResolvedValue(mockEvents);
      renderTemplate.mockResolvedValue(mockHtml);
      generateImage.mockResolvedValue(mockImageResult);

      await handleImageRequest(mockReq, mockRes, mockNext);

      expect(mockRes.set).toHaveBeenCalledWith('Content-Type', 'image/png');
      expect(mockRes.set).toHaveBeenCalledWith('Content-Length', mockImageResult.buffer.length);
      expect(mockRes.send).toHaveBeenCalledWith(mockImageResult.buffer);
      expect(mockRes.status).not.toHaveBeenCalled(); // No error status
    });

    it('should return 404 when config not found', async () => {
      mockReq.params.index = '99';
      
      const notFoundError = new Error('Configuration file not found: /config/99.json');
      loadConfig.mockRejectedValue(notFoundError);

      await handleImageRequest(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Not Found',
        message: 'Configuration 99 not found',
        details: expect.any(String)
      });
    });

    it('should return 502 when ICS fetch fails', async () => {
      mockReq.params.index = '0';
      
      loadConfig.mockResolvedValue(mockConfig);
      getCalendarEvents.mockRejectedValue(new Error('Failed to fetch ICS from https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics'));

      await handleImageRequest(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(502);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Bad Gateway',
        message: 'Failed to fetch calendar data from ICS URL',
        details: expect.any(String)
      });
    });

    it('should return 500 for template errors', async () => {
      mockReq.params.index = '0';
      
      loadConfig.mockResolvedValue(mockConfig);
      getCalendarEvents.mockResolvedValue(mockEvents);
      renderTemplate.mockRejectedValue(new Error('Template not found: missing-template'));

      await handleImageRequest(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        message: 'Template rendering failed',
        details: expect.any(String)
      });
    });

    it('should return 500 for image generation errors', async () => {
      mockReq.params.index = '0';
      
      loadConfig.mockResolvedValue(mockConfig);
      getCalendarEvents.mockResolvedValue(mockEvents);
      renderTemplate.mockResolvedValue(mockHtml);
      generateImage.mockRejectedValue(new Error('Image generation failed: browser crashed'));

      await handleImageRequest(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        message: 'Image generation failed',
        details: expect.any(String)
      });
    });

    it('should set correct headers for different image types', async () => {
      mockReq.params.index = '1';
      
      const jpegConfig = { ...mockConfig, imageType: 'jpg' };
      const jpegResult = { buffer: Buffer.from('jpeg-data'), contentType: 'image/jpeg' };

      loadConfig.mockResolvedValue(jpegConfig);
      getCalendarEvents.mockResolvedValue(mockEvents);
      renderTemplate.mockResolvedValue(mockHtml);
      generateImage.mockResolvedValue(jpegResult);

      await handleImageRequest(mockReq, mockRes, mockNext);

      expect(mockRes.set).toHaveBeenCalledWith('Content-Type', 'image/jpeg');
      expect(mockRes.set).toHaveBeenCalledWith('Content-Length', jpegResult.buffer.length);
    });
  });
});

