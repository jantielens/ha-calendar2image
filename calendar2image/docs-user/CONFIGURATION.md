# Configuration Files

This folder contains sample configuration files for the HA Calendar2Image add-on.

> 💡 **Tip**: You can view an interactive visualization of your configuration with validation at `http://homeassistant.local:3000/config/0` (replace `0` with your config index). Click the orange "Config" button from the dashboard to access it.

## Configuration Location

Configuration files are stored in: `/addon_configs/17f877f5_calendar2image/`

This follows the Home Assistant standard for add-on configurations. The folder name includes the add-on ID (17f877f5_calendar2image).

> ⚠️ **File Editor Setup**: To edit configuration files with the File Editor add-on, you must set `enforce_basepath: false` in its configuration ([documentation](https://github.com/home-assistant/addons/blob/master/configurator/DOCS.md#option-enforce_basepath-required)). This allows access to add-on config folders which are outside the default `/config` directory.

**Default configuration**: When you first start the add-on, it automatically creates `0.json` and `README.md` in this directory. The `0.json` file is a fully working configuration with all available parameters set to sensible defaults - just update the `icsUrl` to point to your calendar and you're ready to go!

**Custom templates**: All built-in templates are automatically copied to the `templates/` folder with a `custom-` prefix (e.g., `custom-week-view.js`, `custom-today-view.js`) as examples for you to customize. To use a custom template instead of a built-in one, change `"template": "week-view"` to `"template": "custom-week-view"` in your config file.

## File Naming Pattern

Configuration files must follow the naming pattern: `0.json`, `1.json`, `2.json`, etc.

## Configuration Schema

Each configuration file should contain:

```json
{
  "icsUrl": "https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics",
  "template": "week-view",
  "grayscale": false,
  "bitDepth": 8,
  "imageType": "png",
  "expandRecurringFrom": -31,
  "expandRecurringTo": 31
}
```

### Required Fields

- **template** (string): Name of the template to use (e.g., "week-view", "today-view")

### Optional Fields

- **icsUrl** (string or array, optional): Calendar source configuration. Must start with `http://` or `https://`. **If omitted, the template receives an empty events array**, enabling extraData-only templates like weather dashboards or info screens.
  - **String format**: Single ICS URL (e.g., `"https://calendar.example.com/feed.ics"`)
  - **Array format**: Multiple calendar sources with optional names
    - `url` (string, required): ICS URL to fetch
    - `sourceName` (string, optional): Human-readable name for the calendar source
    - `rejectUnauthorized` (boolean, optional, default: `true`): Verify SSL certificates. Set to `false` only for trusted sources with certificate issues.
- **grayscale** (boolean, default: `false`): Convert image to grayscale
- **bitDepth** (number, default: `8`): Color bit depth (1-32)
- **imageType** (string, default: `"png"`): Output image format. Options: `"jpg"`, `"png"`, `"bmp"`
- **expandRecurringFrom** (number, default: `-31`): Days from today to start expanding recurring events (negative for past). Only applies when `icsUrl` is configured.
- **expandRecurringTo** (number, default: `31`): Days from today to stop expanding recurring events. Only applies when `icsUrl` is configured.
- **preGenerateInterval** (string, optional): Cron expression for automatic image pre-generation. When set, images are generated in the background on this schedule and served from cache for ultra-fast responses. **When NOT set, images are always generated fresh on each request** to ensure up-to-date calendar data. Examples:
  - `"*/5 * * * *"` - Every 5 minutes (recommended for cached mode)
  - `"*/1 * * * *"` - Every 1 minute (very frequent) 
  - `"*/15 * * * *"` - Every 15 minutes
  - `"0 * * * *"` - Every hour at :00
  - **(omitted)** - No caching, always generate fresh (ensures real-time calendar data)
  
  **⚠️ Queue Protection**: The system automatically prevents duplicate jobs for the same configuration. If a config is already being generated when a new scheduled request arrives, the new request is skipped and logged to both console and timeline view. This prevents infinite queue growth on slower devices (e.g., Raspberry Pi with 25+ second generation times).
- **locale** (string, default: `"en-US"`): BCP 47 locale code for date/time formatting (e.g., `"en-US"`, `"de-DE"`, `"fr-FR"`)
- **timezone** (string, optional): IANA timezone name to convert event times (e.g., `"Europe/Berlin"`, `"America/New_York"`, `"Asia/Tokyo"`). 
  - **⚠️ Important**: Only [IANA timezone database](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones) names are accepted. 
  - Timezone abbreviations like `"CET"`, `"EST"`, `"PST"` are **NOT valid** and will cause validation errors.
  - Use the full timezone name from the IANA database (e.g., use `"Europe/Brussels"` instead of `"CET"`, `"America/New_York"` instead of `"EST"`)
- **extraDataUrl** (string or array, optional): URL(s) to fetch additional JSON data for templates. See [Extra Data Guide](EXTRA-DATA.md) for details.
  - **String format** (simple): Single URL
  - **Array format** (advanced): Array of data source objects with per-source configuration
- **extraDataHeaders** (object, optional): Global HTTP headers for extra data requests (e.g., Authorization for Home Assistant)
- **extraDataCacheTtl** (number, default: `300`): Global cache TTL in seconds for extra data

## Example Configurations

### Minimal Configuration
```json
{
  "icsUrl": "https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics",
  "template": "week-view"
}
```

### Full Configuration
```json
{
  "icsUrl": "https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics",
  "template": "today-view",
  "grayscale": true,
  "bitDepth": 1,
  "imageType": "bmp",
  "expandRecurringFrom": -60,
  "expandRecurringTo": 60,
  "preGenerateInterval": "*/5 * * * *"
}
```

### Configuration with Pre-generation (Recommended for E-ink Displays)
```json
{
  "icsUrl": "https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics",
  "template": "week-view",
  "grayscale": true,
  "bitDepth": 2,
  "imageType": "png",
  "preGenerateInterval": "*/5 * * * *"
}
```
With pre-generation enabled, images are regenerated every 5 minutes in the background. API requests return cached images in <100ms instead of ~8 seconds for on-demand generation.

### Multiple Calendar Sources
```json
{
  "icsUrl": [
    {
      "url": "https://calendar.google.com/calendar/ical/work-calendar/public/basic.ics",
      "sourceName": "Work"
    },
    {
      "url": "https://calendar.google.com/calendar/ical/personal-calendar/public/basic.ics", 
      "sourceName": "Personal"
    },
    {
      "url": "https://calendar.google.com/calendar/ical/family-calendar/public/basic.ics"
    }
  ],
  "template": "week-view"
}
```
This configuration combines events from multiple calendars into a single view. Events include `source` (index) and `sourceName` (if provided) fields for templates that want to display calendar source information. Failed calendar sources will generate error events with the actual error message.

### Calendar Source with SSL Certificate Issues
```json
{
  "icsUrl": [
    {
      "url": "https://problematic-server.com/calendar.ics",
      "sourceName": "My Calendar",
      "rejectUnauthorized": false
    }
  ],
  "template": "week-view"
}
```
**⚠️ Security Warning**: The `rejectUnauthorized: false` option disables SSL certificate verification for this specific calendar source only. Use this **only** if:
- You trust the calendar source
- The server has a self-signed or incomplete certificate chain
- You're getting "unable to verify the first certificate" errors

**Default**: `rejectUnauthorized: true` (secure). See [Troubleshooting](TROUBLESHOOTING.md#ssl-certificate-errors) for more details.

### Configuration without Pre-generation (Always Fresh)
```json
{
  "icsUrl": "https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics",
  "template": "week-view",
  "grayscale": false,
  "imageType": "png"
}
```
Without `preGenerateInterval`, images are **always generated fresh** on each request, ensuring real-time calendar data at the cost of slower response times (~8 seconds).

### Configuration with Extra Data (Single Source)
```json
{
  "icsUrl": "https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics",
  "template": "week-view",
  "extraDataUrl": "http://homeassistant.local:8123/api/states/sensor.weather",
  "extraDataHeaders": {
    "Authorization": "Bearer YOUR_TOKEN"
  },
  "extraDataCacheTtl": 300
}
```
Fetches weather data from Home Assistant to use in templates. See [Extra Data Guide](EXTRA-DATA.md) for more details.

### Weather Dashboard (No Calendar)
```json
{
  "template": "weather-dashboard",
  "width": 800,
  "height": 480,
  "grayscale": true,
  "bitDepth": 2,
  "imageType": "png",
  "extraDataUrl": "https://api.open-meteo.com/v1/forecast?latitude=50.8505&longitude=4.3488&hourly=temperature_2m,weather_code,rain,showers,snowfall,snow_depth,precipitation,precipitation_probability",
  "extraDataCacheTtl": 1800,
  "preGenerateInterval": "*/15 * * * *"
}
```
This configuration demonstrates a template that **doesn't use any calendar data**. The `icsUrl` field is omitted entirely, and the template receives an empty events array. The template uses `extraData` to display weather information from the Open-Meteo API. Perfect for:
- Weather stations
- Info screens
- Dashboards that don't need calendar events
- Any display that uses external data sources without calendar integration

**Note**: Replace `latitude` and `longitude` with your location coordinates in the extraDataUrl.

### Configuration with Multiple Extra Data Sources (Advanced)
```json
{
  "icsUrl": "https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics",
  "template": "week-view",
  "extraDataHeaders": {
    "Authorization": "Bearer GLOBAL_TOKEN"
  },
  "extraDataCacheTtl": 300,
  "extraDataUrl": [
    {
      "url": "http://localhost:3001/weather"
    },
    {
      "url": "http://localhost:3001/tasks",
      "cacheTtl": 60
    },
    {
      "url": "http://localhost:3001/public",
      "headers": null
    },
    {
      "url": "http://localhost:3001/todos",
      "headers": {
        "X-API-Key": "custom-key"
      },
      "cacheTtl": 120
    }
  ]
}
```

**Multi-source configuration explained:**
- **First source** (`/weather`): Uses global headers and cacheTtl
- **Second source** (`/tasks`): Overrides cacheTtl to 60 seconds, uses global headers
- **Third source** (`/public`): Disables global headers by setting `headers: null`
- **Fourth source** (`/todos`): Uses custom headers and custom cacheTtl

**Header opt-out options:** To disable global headers for a specific URL, use:
- `"headers": null`
- `"headers": ""`
- `"headers": {}`

See [Extra Data Guide](EXTRA-DATA.md) for complete multi-source documentation and template usage.

## API Endpoints

Once configured, each calendar can be accessed via:

**Image Endpoints:**
- `/api/0.png` - First configuration (0.json) - Returns cached or generated image
- `/api/1.png` - Second configuration (1.json) - Returns cached or generated image
- `/api/{index}/fresh.png` - Force fresh generation, bypass cache

**Note:** Replace `.png` with `.jpg` or `.bmp` to match the `imageType` in your config file.

**CRC32 Checksum Endpoints:**
- `/api/0.png.crc32` - Get CRC32 checksum for first configuration
- `/api/1.png.crc32` - Get CRC32 checksum for second configuration
- `/api/{index}.{ext}.crc32` - Get CRC32 checksum (plain text, lowercase hex)

**E-ink Display Workflow Example:**
```python
import requests

# Check if image changed before downloading
crc = requests.get('http://homeassistant.local:3000/api/0.png.crc32').text

if crc != last_known_crc:
    # Image changed - download it
    image = requests.get('http://homeassistant.local:3000/api/0.png').content
    update_display(image)
    last_known_crc = crc
else:
    print('No update needed - saves bandwidth!')
```

