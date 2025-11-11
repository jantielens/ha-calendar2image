const { generateCalendarImage, handleImageRequest } = require('../../src/api/handler');
const { loadConfig } = require('../../src/config');
const { getCalendarEvents } = require('../../src/calendar');
const { renderTemplate } = require('../../src/templates');
const { generateImage } = require('../../src/image');
const { fetchExtraData } = require('../../src/extraData');

// Mock all dependencies
jest.mock('../../src/config');
jest.mock('../../src/calendar');
jest.mock('../../src/templates');
jest.mock('../../src/image');
jest.mock('../../src/extraData');

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
        bitDepth: mockConfig.bitDepth,
        adjustments: undefined
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

    describe('extraData handling', () => {
      it('should fetch extraData with string URL format', async () => {
        const configWithExtraData = {
          ...mockConfig,
          extraDataUrl: 'http://localhost:3001/weather',
          extraDataHeaders: { 'Authorization': 'Bearer token' },
          extraDataCacheTtl: 300
        };
        const mockExtraData = { temperature: 22, condition: 'sunny' };

        loadConfig.mockResolvedValue(configWithExtraData);
        getCalendarEvents.mockResolvedValue(mockEvents);
        fetchExtraData.mockResolvedValue(mockExtraData);
        renderTemplate.mockResolvedValue(mockHtml);
        generateImage.mockResolvedValue(mockImageResult);

        await generateCalendarImage(0);

        expect(fetchExtraData).toHaveBeenCalledWith('http://localhost:3001/weather', {
          cacheTtl: 300,
          headers: { 'Authorization': 'Bearer token' }
        });
        expect(renderTemplate).toHaveBeenCalledWith(configWithExtraData.template, {
          events: mockEvents,
          config: configWithExtraData,
          extraData: mockExtraData
        });
      });

      it('should fetch extraData with array format - single source', async () => {
        const configWithExtraData = {
          ...mockConfig,
          extraDataUrl: [
            { url: 'http://localhost:3001/weather' }
          ],
          extraDataCacheTtl: 300
        };
        const mockExtraData = { temperature: 22, condition: 'sunny' };

        loadConfig.mockResolvedValue(configWithExtraData);
        getCalendarEvents.mockResolvedValue(mockEvents);
        fetchExtraData.mockResolvedValue(mockExtraData);
        renderTemplate.mockResolvedValue(mockHtml);
        generateImage.mockResolvedValue(mockImageResult);

        await generateCalendarImage(0);

        expect(fetchExtraData).toHaveBeenCalledTimes(1);
        expect(fetchExtraData).toHaveBeenCalledWith('http://localhost:3001/weather', {
          cacheTtl: 300,
          headers: {}
        });
        expect(renderTemplate).toHaveBeenCalledWith(configWithExtraData.template, {
          events: mockEvents,
          config: configWithExtraData,
          extraData: [mockExtraData]
        });
      });

      it('should fetch extraData with array format - multiple sources', async () => {
        const configWithExtraData = {
          ...mockConfig,
          extraDataUrl: [
            { url: 'http://localhost:3001/weather' },
            { url: 'http://localhost:3001/tasks' }
          ],
          extraDataCacheTtl: 300
        };
        const mockWeather = { temperature: 22, condition: 'sunny' };
        const mockTasks = { tasks: ['Buy milk', 'Call mom'] };

        loadConfig.mockResolvedValue(configWithExtraData);
        getCalendarEvents.mockResolvedValue(mockEvents);
        fetchExtraData
          .mockResolvedValueOnce(mockWeather)
          .mockResolvedValueOnce(mockTasks);
        renderTemplate.mockResolvedValue(mockHtml);
        generateImage.mockResolvedValue(mockImageResult);

        await generateCalendarImage(0);

        expect(fetchExtraData).toHaveBeenCalledTimes(2);
        expect(renderTemplate).toHaveBeenCalledWith(configWithExtraData.template, {
          events: mockEvents,
          config: configWithExtraData,
          extraData: [mockWeather, mockTasks]
        });
      });

      it('should use per-source cacheTtl overrides', async () => {
        const configWithExtraData = {
          ...mockConfig,
          extraDataUrl: [
            { url: 'http://localhost:3001/weather', cacheTtl: 600 },
            { url: 'http://localhost:3001/tasks', cacheTtl: 60 }
          ],
          extraDataCacheTtl: 300
        };

        loadConfig.mockResolvedValue(configWithExtraData);
        getCalendarEvents.mockResolvedValue(mockEvents);
        fetchExtraData.mockResolvedValue({});
        renderTemplate.mockResolvedValue(mockHtml);
        generateImage.mockResolvedValue(mockImageResult);

        await generateCalendarImage(0);

        expect(fetchExtraData).toHaveBeenNthCalledWith(1, 'http://localhost:3001/weather', {
          cacheTtl: 600,
          headers: {}
        });
        expect(fetchExtraData).toHaveBeenNthCalledWith(2, 'http://localhost:3001/tasks', {
          cacheTtl: 60,
          headers: {}
        });
      });

      it('should use per-source headers overrides', async () => {
        const configWithExtraData = {
          ...mockConfig,
          extraDataUrl: [
            { url: 'http://localhost:3001/weather', headers: { 'X-Weather-Key': 'abc' } },
            { url: 'http://localhost:3001/tasks', headers: { 'X-Tasks-Key': 'xyz' } }
          ],
          extraDataHeaders: { 'Authorization': 'Bearer global' },
          extraDataCacheTtl: 300
        };

        loadConfig.mockResolvedValue(configWithExtraData);
        getCalendarEvents.mockResolvedValue(mockEvents);
        fetchExtraData.mockResolvedValue({});
        renderTemplate.mockResolvedValue(mockHtml);
        generateImage.mockResolvedValue(mockImageResult);

        await generateCalendarImage(0);

        expect(fetchExtraData).toHaveBeenNthCalledWith(1, 'http://localhost:3001/weather', {
          cacheTtl: 300,
          headers: { 'X-Weather-Key': 'abc' }
        });
        expect(fetchExtraData).toHaveBeenNthCalledWith(2, 'http://localhost:3001/tasks', {
          cacheTtl: 300,
          headers: { 'X-Tasks-Key': 'xyz' }
        });
      });

      it('should use global headers when not specified per-source', async () => {
        const configWithExtraData = {
          ...mockConfig,
          extraDataUrl: [
            { url: 'http://localhost:3001/weather' },
            { url: 'http://localhost:3001/tasks' }
          ],
          extraDataHeaders: { 'Authorization': 'Bearer global' },
          extraDataCacheTtl: 300
        };

        loadConfig.mockResolvedValue(configWithExtraData);
        getCalendarEvents.mockResolvedValue(mockEvents);
        fetchExtraData.mockResolvedValue({});
        renderTemplate.mockResolvedValue(mockHtml);
        generateImage.mockResolvedValue(mockImageResult);

        await generateCalendarImage(0);

        expect(fetchExtraData).toHaveBeenNthCalledWith(1, 'http://localhost:3001/weather', {
          cacheTtl: 300,
          headers: { 'Authorization': 'Bearer global' }
        });
        expect(fetchExtraData).toHaveBeenNthCalledWith(2, 'http://localhost:3001/tasks', {
          cacheTtl: 300,
          headers: { 'Authorization': 'Bearer global' }
        });
      });

      it('should disable global headers with empty string', async () => {
        const configWithExtraData = {
          ...mockConfig,
          extraDataUrl: [
            { url: 'http://localhost:3001/public', headers: '' }
          ],
          extraDataHeaders: { 'Authorization': 'Bearer token' },
          extraDataCacheTtl: 300
        };

        loadConfig.mockResolvedValue(configWithExtraData);
        getCalendarEvents.mockResolvedValue(mockEvents);
        fetchExtraData.mockResolvedValue({});
        renderTemplate.mockResolvedValue(mockHtml);
        generateImage.mockResolvedValue(mockImageResult);

        await generateCalendarImage(0);

        expect(fetchExtraData).toHaveBeenCalledWith('http://localhost:3001/public', {
          cacheTtl: 300,
          headers: {}
        });
      });

      it('should disable global headers with empty object', async () => {
        const configWithExtraData = {
          ...mockConfig,
          extraDataUrl: [
            { url: 'http://localhost:3001/public', headers: {} }
          ],
          extraDataHeaders: { 'Authorization': 'Bearer token' },
          extraDataCacheTtl: 300
        };

        loadConfig.mockResolvedValue(configWithExtraData);
        getCalendarEvents.mockResolvedValue(mockEvents);
        fetchExtraData.mockResolvedValue({});
        renderTemplate.mockResolvedValue(mockHtml);
        generateImage.mockResolvedValue(mockImageResult);

        await generateCalendarImage(0);

        expect(fetchExtraData).toHaveBeenCalledWith('http://localhost:3001/public', {
          cacheTtl: 300,
          headers: {}
        });
      });

      it('should disable global headers with null', async () => {
        const configWithExtraData = {
          ...mockConfig,
          extraDataUrl: [
            { url: 'http://localhost:3001/public', headers: null }
          ],
          extraDataHeaders: { 'Authorization': 'Bearer token' },
          extraDataCacheTtl: 300
        };

        loadConfig.mockResolvedValue(configWithExtraData);
        getCalendarEvents.mockResolvedValue(mockEvents);
        fetchExtraData.mockResolvedValue({});
        renderTemplate.mockResolvedValue(mockHtml);
        generateImage.mockResolvedValue(mockImageResult);

        await generateCalendarImage(0);

        expect(fetchExtraData).toHaveBeenCalledWith('http://localhost:3001/public', {
          cacheTtl: 300,
          headers: {}
        });
      });

      it('should handle mixed configuration with some defaults', async () => {
        const configWithExtraData = {
          ...mockConfig,
          extraDataUrl: [
            { url: 'http://localhost:3001/weather' },
            { url: 'http://localhost:3001/tasks', cacheTtl: 60 },
            { url: 'http://localhost:3001/public', headers: null },
            { url: 'http://localhost:3001/todos', headers: { 'X-API-Key': 'custom' }, cacheTtl: 120 }
          ],
          extraDataHeaders: { 'Authorization': 'Bearer global' },
          extraDataCacheTtl: 300
        };

        loadConfig.mockResolvedValue(configWithExtraData);
        getCalendarEvents.mockResolvedValue(mockEvents);
        fetchExtraData.mockResolvedValue({});
        renderTemplate.mockResolvedValue(mockHtml);
        generateImage.mockResolvedValue(mockImageResult);

        await generateCalendarImage(0);

        expect(fetchExtraData).toHaveBeenNthCalledWith(1, 'http://localhost:3001/weather', {
          cacheTtl: 300,
          headers: { 'Authorization': 'Bearer global' }
        });
        expect(fetchExtraData).toHaveBeenNthCalledWith(2, 'http://localhost:3001/tasks', {
          cacheTtl: 60,
          headers: { 'Authorization': 'Bearer global' }
        });
        expect(fetchExtraData).toHaveBeenNthCalledWith(3, 'http://localhost:3001/public', {
          cacheTtl: 300,
          headers: {}
        });
        expect(fetchExtraData).toHaveBeenNthCalledWith(4, 'http://localhost:3001/todos', {
          cacheTtl: 120,
          headers: { 'X-API-Key': 'custom' }
        });
      });

      it('should handle empty array extraDataUrl', async () => {
        const configWithExtraData = {
          ...mockConfig,
          extraDataUrl: [],
          extraDataCacheTtl: 300
        };

        loadConfig.mockResolvedValue(configWithExtraData);
        getCalendarEvents.mockResolvedValue(mockEvents);
        renderTemplate.mockResolvedValue(mockHtml);
        generateImage.mockResolvedValue(mockImageResult);

        await generateCalendarImage(0);

        expect(fetchExtraData).not.toHaveBeenCalled();
        expect(renderTemplate).toHaveBeenCalledWith(configWithExtraData.template, {
          events: mockEvents,
          config: configWithExtraData,
          extraData: []
        });
      });

      it('should not fetch extraData when not configured', async () => {
        loadConfig.mockResolvedValue(mockConfig);
        getCalendarEvents.mockResolvedValue(mockEvents);
        renderTemplate.mockResolvedValue(mockHtml);
        generateImage.mockResolvedValue(mockImageResult);

        await generateCalendarImage(0);

        expect(fetchExtraData).not.toHaveBeenCalled();
        expect(renderTemplate).toHaveBeenCalledWith(mockConfig.template, {
          events: mockEvents,
          config: mockConfig,
          extraData: {}
        });
      });
    });

    describe('image adjustments', () => {
      it('should pass adjustments to generateImage when configured', async () => {
        const configWithAdjustments = {
          ...mockConfig,
          adjustments: {
            brightness: 10,
            contrast: 20,
            gamma: 1.2,
            sharpen: true
          }
        };

        loadConfig.mockResolvedValue(configWithAdjustments);
        getCalendarEvents.mockResolvedValue(mockEvents);
        renderTemplate.mockResolvedValue(mockHtml);
        generateImage.mockResolvedValue(mockImageResult);

        await generateCalendarImage(0);

        expect(generateImage).toHaveBeenCalledWith(mockHtml, {
          width: configWithAdjustments.width,
          height: configWithAdjustments.height,
          imageType: configWithAdjustments.imageType,
          grayscale: configWithAdjustments.grayscale,
          bitDepth: configWithAdjustments.bitDepth,
          rotate: configWithAdjustments.rotate,
          adjustments: configWithAdjustments.adjustments
        });
      });

      it('should pass undefined adjustments when not configured', async () => {
        loadConfig.mockResolvedValue(mockConfig);
        getCalendarEvents.mockResolvedValue(mockEvents);
        renderTemplate.mockResolvedValue(mockHtml);
        generateImage.mockResolvedValue(mockImageResult);

        await generateCalendarImage(0);

        expect(generateImage).toHaveBeenCalledWith(mockHtml, expect.objectContaining({
          adjustments: undefined
        }));
      });

      it('should handle all adjustment options', async () => {
        const configWithAllAdjustments = {
          ...mockConfig,
          adjustments: {
            brightness: -10,
            contrast: 15,
            saturation: -20,
            gamma: 0.8,
            sharpen: true,
            invert: false,
            hue: 45,
            normalize: true,
            threshold: 128
          }
        };

        loadConfig.mockResolvedValue(configWithAllAdjustments);
        getCalendarEvents.mockResolvedValue(mockEvents);
        renderTemplate.mockResolvedValue(mockHtml);
        generateImage.mockResolvedValue(mockImageResult);

        await generateCalendarImage(0);

        expect(generateImage).toHaveBeenCalledWith(mockHtml, expect.objectContaining({
          adjustments: configWithAllAdjustments.adjustments
        }));
      });

      it('should pass empty adjustments object when configured but empty', async () => {
        const configWithEmptyAdjustments = {
          ...mockConfig,
          adjustments: {}
        };

        loadConfig.mockResolvedValue(configWithEmptyAdjustments);
        getCalendarEvents.mockResolvedValue(mockEvents);
        renderTemplate.mockResolvedValue(mockHtml);
        generateImage.mockResolvedValue(mockImageResult);

        await generateCalendarImage(0);

        expect(generateImage).toHaveBeenCalledWith(mockHtml, expect.objectContaining({
          adjustments: {}
        }));
      });
    });

    describe('config without icsUrl (extraData-only)', () => {
      it('should successfully generate image without icsUrl', async () => {
        const configWithoutIcsUrl = {
          template: 'today-weather',
          width: 800,
          height: 480,
          imageType: 'png',
          grayscale: true,
          bitDepth: 8
        };

        loadConfig.mockResolvedValue(configWithoutIcsUrl);
        renderTemplate.mockResolvedValue(mockHtml);
        generateImage.mockResolvedValue(mockImageResult);

        const result = await generateCalendarImage(0);

        expect(loadConfig).toHaveBeenCalledWith(0);
        expect(getCalendarEvents).not.toHaveBeenCalled();
        expect(renderTemplate).toHaveBeenCalledWith(configWithoutIcsUrl.template, {
          events: [],
          config: configWithoutIcsUrl,
          extraData: {}
        });
        expect(generateImage).toHaveBeenCalledWith(mockHtml, {
          width: configWithoutIcsUrl.width,
          height: configWithoutIcsUrl.height,
          imageType: configWithoutIcsUrl.imageType,
          grayscale: configWithoutIcsUrl.grayscale,
          bitDepth: configWithoutIcsUrl.bitDepth,
          rotate: undefined,
          adjustments: undefined
        });
        expect(result).toEqual(mockImageResult);
      });

      it('should pass empty events array when icsUrl is absent', async () => {
        const configWithoutIcsUrl = {
          template: 'today-weather',
          width: 800,
          height: 480
        };

        loadConfig.mockResolvedValue(configWithoutIcsUrl);
        renderTemplate.mockResolvedValue(mockHtml);
        generateImage.mockResolvedValue(mockImageResult);

        await generateCalendarImage(0);

        expect(renderTemplate).toHaveBeenCalledWith(
          configWithoutIcsUrl.template,
          expect.objectContaining({ events: [] })
        );
      });

      it('should fetch extraData even when icsUrl is absent', async () => {
        const configWithoutIcsUrl = {
          template: 'today-weather',
          extraDataUrl: 'https://api.open-meteo.com/v1/forecast?latitude=50.8505&longitude=4.3488&current=temperature_2m',
          extraDataCacheTtl: 300,
          width: 800,
          height: 480
        };
        const mockWeatherData = {
          current: { temperature_2m: 22, weather_code: 0 }
        };

        loadConfig.mockResolvedValue(configWithoutIcsUrl);
        fetchExtraData.mockResolvedValue(mockWeatherData);
        renderTemplate.mockResolvedValue(mockHtml);
        generateImage.mockResolvedValue(mockImageResult);

        await generateCalendarImage(0);

        expect(getCalendarEvents).not.toHaveBeenCalled();
        expect(fetchExtraData).toHaveBeenCalledWith(
          configWithoutIcsUrl.extraDataUrl,
          expect.objectContaining({
            cacheTtl: 300,
            headers: {}
          })
        );
        expect(renderTemplate).toHaveBeenCalledWith(configWithoutIcsUrl.template, {
          events: [],
          config: configWithoutIcsUrl,
          extraData: mockWeatherData
        });
      });

      it('should work with array format extraDataUrl without icsUrl', async () => {
        const configWithoutIcsUrl = {
          template: 'today-weather',
          extraDataUrl: [
            { url: 'https://api.open-meteo.com/v1/forecast?latitude=50.8505&longitude=4.3488&current=temperature_2m' }
          ],
          width: 800,
          height: 480
        };
        const mockWeatherData = {
          current: { temperature_2m: 22, weather_code: 0 }
        };

        loadConfig.mockResolvedValue(configWithoutIcsUrl);
        fetchExtraData.mockResolvedValue(mockWeatherData);
        renderTemplate.mockResolvedValue(mockHtml);
        generateImage.mockResolvedValue(mockImageResult);

        await generateCalendarImage(0);

        expect(getCalendarEvents).not.toHaveBeenCalled();
        expect(fetchExtraData).toHaveBeenCalledTimes(1);
        expect(renderTemplate).toHaveBeenCalledWith(configWithoutIcsUrl.template, {
          events: [],
          config: configWithoutIcsUrl,
          extraData: [mockWeatherData]
        });
      });

      it('should handle minimal config with only template field', async () => {
        const minimalConfig = {
          template: 'today-weather',
          width: 800,
          height: 600,
          imageType: 'png'
        };

        loadConfig.mockResolvedValue(minimalConfig);
        renderTemplate.mockResolvedValue(mockHtml);
        generateImage.mockResolvedValue(mockImageResult);

        await generateCalendarImage(0);

        expect(getCalendarEvents).not.toHaveBeenCalled();
        expect(fetchExtraData).not.toHaveBeenCalled();
        expect(renderTemplate).toHaveBeenCalledWith(minimalConfig.template, {
          events: [],
          config: minimalConfig,
          extraData: {}
        });
      });
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

