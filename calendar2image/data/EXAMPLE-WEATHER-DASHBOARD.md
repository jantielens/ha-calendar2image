# Weather Dashboard Example

This example demonstrates using Calendar2Image **without a calendar** (icsUrl is optional).

## Configuration

The `example-weather-dashboard.json` file shows a complete configuration that:
- **Does NOT include `icsUrl`** - demonstrates the new optional icsUrl feature
- Uses the `weather-dashboard` template
- Fetches weather data from Open-Meteo API via `extraDataUrl`
- Configured for e-ink displays (grayscale, 2-bit depth)
- Pre-generates every 15 minutes for fast responses

## Usage

### 1. Customize Location

Edit `example-weather-dashboard.json` and update the `extraDataUrl` with your coordinates:

```json
{
  "extraDataUrl": "https://api.open-meteo.com/v1/forecast?latitude=YOUR_LAT&longitude=YOUR_LON&hourly=temperature_2m,weather_code,precipitation_probability&daily=temperature_2m_max,temperature_2m_min,weather_code"
}
```

Find your coordinates:
- Use Google Maps: right-click on your location → "What's here?"
- Use https://www.latlong.net/

### 2. Copy to Config Directory

Copy the file to your calendar2image config directory with a numeric name:

**Home Assistant:**
```bash
cp example-weather-dashboard.json /addon_configs/17f877f5_calendar2image/5.json
```

**Local Development:**
```bash
cp example-weather-dashboard.json data/calendar2image/5.json
```

### 3. Access the Dashboard

The weather dashboard will be available at:
- Image: `http://your-host:3000/api/5.png`
- CRC32: `http://your-host:3000/api/5.png.crc32`
- Config page: `http://your-host:3000/config/5`

## Features Demonstrated

This example shows:
- ✅ **Optional icsUrl**: No calendar required
- ✅ **extraData-only template**: Works purely with external data
- ✅ **Weather API integration**: Uses Open-Meteo free API
- ✅ **E-ink optimized**: Grayscale, 2-bit depth
- ✅ **Pre-generation**: Fast responses with caching
- ✅ **Empty events array**: Template receives `events: []`

## Template Details

The `weather-dashboard` template (`src/templates/built-in/weather-dashboard.js`) displays:
- Current temperature and weather condition
- High/low for today
- Precipitation probability
- Forecast for next 6 hours
- Weather emojis for visual clarity

## API Details

Open-Meteo API (free, no API key required):
- **Base URL**: `https://api.open-meteo.com/v1/forecast`
- **Parameters**:
  - `latitude` and `longitude`: Your location
  - `hourly`: Hourly forecast variables
  - `daily`: Daily forecast variables
- **Documentation**: https://open-meteo.com/en/docs

## Customization

Modify the template configuration in `weather-dashboard.js`:
- Colors
- Fonts
- Spacing
- Number of forecast hours
- Weather descriptions

## Notes

- The Open-Meteo API is free and doesn't require authentication
- Weather data is cached for 30 minutes (`extraDataCacheTtl: 1800`)
- Pre-generation runs every 15 minutes
- Perfect for info screens, weather stations, or smart home displays
