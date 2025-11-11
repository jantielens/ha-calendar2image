/**
 * Integration test for optional icsUrl feature
 * Tests that configs without icsUrl work correctly
 */

const { validateConfig } = require('../../src/config/schema');
const { renderTemplate } = require('../../src/templates');

describe('Optional icsUrl Integration', () => {
  it('should validate config without icsUrl', () => {
    const config = {
      template: 'weather-dashboard',
      extraDataUrl: 'https://api.open-meteo.com/v1/forecast?latitude=50&longitude=4&hourly=temperature_2m'
    };

    const result = validateConfig(config);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should render template with empty events array when no icsUrl', async () => {
    // Mock proper Open-Meteo API response structure
    const mockExtraData = {
      hourly: {
        temperature_2m: Array(24).fill(20),
        weather_code: Array(24).fill(0),
        precipitation_probability: Array(24).fill(10)
      },
      daily: {
        temperature_2m_max: [25],
        temperature_2m_min: [15],
        weather_code: [0]
      }
    };

    const now = new Date();
    now.setHours(12, 0, 0, 0); // Set to noon for consistent test

    const html = await renderTemplate('weather-dashboard', {
      events: [], // Empty array when icsUrl is not configured
      config: {
        template: 'weather-dashboard',
        width: 800,
        height: 480
      },
      extraData: mockExtraData,
      now: now.toISOString(),
      locale: 'en-US'
    });

    expect(html).toBeDefined();
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('20°C'); // Should contain the mocked temperature
    expect(html).toContain('Next'); // Should contain forecast section
  });

  it('should handle missing extraData gracefully in weather-dashboard', async () => {
    const html = await renderTemplate('weather-dashboard', {
      events: [],
      config: {
        template: 'weather-dashboard',
        width: 800,
        height: 480
      },
      extraData: {}, // No weather data
      now: new Date().toISOString(),
      locale: 'en-US'
    });

    expect(html).toBeDefined();
    expect(html).toContain('No weather data available');
  });

  it('should validate config with both icsUrl and extraDataUrl', () => {
    const config = {
      icsUrl: 'https://calendar.example.com/cal.ics',
      template: 'week-view',
      extraDataUrl: 'https://api.example.com/weather'
    };

    const result = validateConfig(config);
    expect(result.valid).toBe(true);
  });

  it('should validate config with only icsUrl (backward compatibility)', () => {
    const config = {
      icsUrl: 'https://calendar.example.com/cal.ics',
      template: 'week-view'
    };

    const result = validateConfig(config);
    expect(result.valid).toBe(true);
  });

  it('should validate config with only template (extraData-only mode)', () => {
    const config = {
      template: 'custom-dashboard'
    };

    const result = validateConfig(config);
    expect(result.valid).toBe(true);
  });
});
