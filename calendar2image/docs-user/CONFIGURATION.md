# Configuration Files

This folder contains sample configuration files for the HA Calendar2Image add-on.

> 💡 **Tip**: You can view an interactive visualization of your configuration with validation at `http://homeassistant.local:3000/config/sample` (replace `sample` with your config filename without .json). Click the orange "Config" button from the dashboard to access it.

## Configuration Location

Configuration files are stored in: `/addon_configs/17f877f5_calendar2image/`

This follows the Home Assistant standard for add-on configurations. The folder name includes the add-on ID (17f877f5_calendar2image).

> ⚠️ **File Editor Setup**: To edit configuration files with the File Editor add-on, you must set `enforce_basepath: false` in its configuration ([documentation](https://github.com/home-assistant/addons/blob/master/configurator/DOCS.md#option-enforce_basepath-required)). This allows access to add-on config folders which are outside the default `/config` directory.

**Default configuration**: When you first start the add-on, it automatically creates `sample.json` and `README.md` in this directory. The `sample.json` file is a fully working configuration with all available parameters set to sensible defaults - just update the `icsUrl` to point to your calendar and you're ready to go!

**Custom templates**: All built-in templates are automatically copied to the `templates/` folder with a `custom-` prefix (e.g., `custom-week-view.js`, `custom-today-view.js`) as examples for you to customize. To use a custom template instead of a built-in one, change `"template": "week-view"` to `"template": "custom-week-view"` in your config file.

## File Naming Pattern

Configuration files can use any valid filename:
- **Descriptive names**: `kitchen.json`, `vacation-2024.json`, `Work Calendar.json`, `café.json`
- **Numeric names**: `0.json`, `1.json`, `2.json` (backward compatible, auto-created on first run)
- **Valid characters**: Letters, numbers, spaces, hyphens, underscores, unicode characters
- **Invalid characters**: Path separators (`/`, `\`), parent references (`..`), leading dots (`.`)

**API Endpoints:**
- Config filename (without `.json`) becomes the API identifier
- Spaces and special characters must be URL-encoded:
  - `kitchen.json` → `/api/kitchen.png`
  - `vacation-2024.json` → `/api/vacation-2024.png`
  - `Work Calendar.json` → `/api/Work%20Calendar.png` (spaces URL-encoded)
  - `sample.json` → `/api/sample.png`
  - `kitchen.json` → `/api/kitchen.png`
  - `0.json` → `/api/0.png` (numeric still works)

The dashboard automatically lists all configs, sorted with numeric configs first (0, 1, 2...) followed by alphabetically sorted named configs.

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

- **template** (string): Name of the template to use (e.g., "week-view", "today-view", "today-weather")

### Optional Fields

- **icsUrl** (string or array, optional): Calendar source configuration. Must start with `http://` or `https://`
  - **String format**: Single ICS URL (e.g., `"https://calendar.example.com/feed.ics"`)
  - **Array format**: Multiple calendar sources with optional names
    - `url` (string, required): ICS URL to fetch
    - `sourceName` (string, optional): Human-readable name for the calendar source
    - `rejectUnauthorized` (boolean, optional, default: `true`): Verify SSL certificates. Set to `false` only for trusted sources with certificate issues.
  - **When omitted**: Templates receive an empty events array `[]`. Useful for templates that only use `extraData` (e.g., weather dashboards, info screens).
- **grayscale** (boolean, default: `false`): Convert image to grayscale
- **bitDepth** (number, default: `8`): Color bit depth (1-32)
- **imageType** (string, default: `"png"`): Output image format. Options: `"jpg"`, `"png"`, `"bmp"`
- **expandRecurringFrom** (number, default: `-31`): Days from today to start expanding recurring events (negative for past)
- **expandRecurringTo** (number, default: `31`): Days from today to stop expanding recurring events
- **preGenerateInterval** (string, optional): Cron expression for automatic image pre-generation. When set, images are generated in the background on this schedule and served from cache for ultra-fast responses. **When NOT set, images are always generated fresh on each request** to ensure up-to-date calendar data. 
  
  **⚠️ Timezone Awareness**: The schedule respects the `timezone` configuration. For example, if set to `"0 8 * * *"` (8am daily) with `timezone: "Europe/Brussels"`, the image will be generated at 8am Brussels time, not 8am UTC.
  
  Examples:
  - `"*/5 * * * *"` - Every 5 minutes (recommended for cached mode)
  - `"*/1 * * * *"` - Every 1 minute (very frequent) 
  - `"*/15 * * * *"` - Every 15 minutes
  - `"0 * * * *"` - Every hour at :00
  - `"0 8 * * *"` - Every day at 8am (in configured timezone)
  - **(omitted)** - No caching, always generate fresh (ensures real-time calendar data)
  
  **⚠️ Queue Protection**: The system automatically prevents duplicate jobs for the same configuration. If a config is already being generated when a new scheduled request arrives, the new request is skipped and logged to both console and timeline view. This prevents infinite queue growth on slower devices (e.g., Raspberry Pi with 25+ second generation times).
- **locale** (string, default: `"en-US"`): BCP 47 locale code for date/time formatting (e.g., `"en-US"`, `"de-DE"`, `"fr-FR"`)
- **timezone** (string, optional): IANA timezone name that affects both event time conversion AND the `preGenerateInterval` schedule. 
  - **Event Times**: Calendar event times are converted to this timezone for display
  - **Schedule Timing**: When `preGenerateInterval` is set, the schedule runs in this timezone (e.g., `"0 8 * * *"` means 8am in this timezone, not UTC)
  - **Default**: If not specified, defaults to UTC for both event times and scheduling
  - **⚠️ Important**: Only [IANA timezone database](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones) names are accepted. 
  - Timezone abbreviations like `"CET"`, `"EST"`, `"PST"` are **NOT valid** and will cause validation errors.
  - Use the full timezone name from the IANA database (e.g., use `"Europe/Brussels"` instead of `"CET"`, `"America/New_York"` instead of `"EST"`)
- **extraDataUrl** (string or array, optional): URL(s) to fetch additional JSON data for templates. See [Extra Data Guide](EXTRA-DATA.md) for details.
  - **String format** (simple): Single URL
  - **Array format** (advanced): Array of data source objects with per-source configuration
- **extraDataHeaders** (object, optional): Global HTTP headers for extra data requests (e.g., Authorization for Home Assistant)
- **extraDataCacheTtl** (number, default: `300`): Global cache TTL in seconds for extra data
- **adjustments** (object, optional): Image adjustments for display optimization. See [IMAGE-ADJUSTMENTS.md](IMAGE-ADJUSTMENTS.md) for detailed documentation and visual examples.

## Image Adjustments

The `adjustments` field allows you to optimize images for specific display hardware (e-ink, LCD, OLED, outdoor displays). All adjustment parameters are optional.

**For complete documentation with visual examples**, see **[IMAGE-ADJUSTMENTS.md](IMAGE-ADJUSTMENTS.md)**.

### Quick Reference

| Parameter | Type | Range | Description |
|-----------|------|-------|-------------|
| `brightness` | number | -100 to +100 | Adjust overall brightness. Negative values darken, positive values brighten. |
| `contrast` | number | -100 to +100 | Adjust contrast. Negative values flatten, positive values enhance. |
| `saturation` | number | -100 to +100 | Adjust color saturation. No effect on grayscale images. |
| `gamma` | number | 0.1 to 3.0 | Gamma correction for mid-tones. Values < 1.0 brighten mid-tones, > 1.0 darken. |
| `sharpen` | boolean | - | Apply sharpening filter to improve text readability. |
| `invert` | boolean | - | Invert colors (useful for dark mode or specific e-ink displays). |
| `hue` | number | -180 to +180 | Shift color hue in degrees. No effect on grayscale images. |
| `normalize` | boolean | - | Auto-enhance contrast via histogram normalization. |
| `threshold` | number | 0 to 255 | Black/white threshold for 1-bit displays (default: 127). |
| `dither` | boolean or string | `false`, `true`, `"floyd-steinberg"`, `"atkinson"` | Apply dithering for low bit-depth displays. `true` uses Floyd-Steinberg, `"atkinson"` uses lighter Atkinson pattern (better for e-ink). |

### When to Use Adjustments

- **E-ink displays**: Often show washed-out images → increase `contrast` and `gamma`, enable `sharpen`, use `dither: "atkinson"`
- **Outdoor LCD**: Sunlight readability → increase `brightness` and `contrast`, enable `normalize`
- **OLED displays**: Enhance colors → increase `saturation`, adjust `hue` for color preference
- **Dark mode**: Use `invert: true` to flip black/white for better display compatibility

### Adjustment Examples

#### E-ink Display (Waveshare 4-bit grayscale)
```json
{
  "icsUrl": "https://calendar.example.com/feed.ics",
  "template": "week-view",
  "grayscale": true,
  "bitDepth": 4,
  "adjustments": {
    "contrast": 30,
    "gamma": 1.3,
    "sharpen": true,
    "dither": "atkinson"
  }
}
```
**Purpose**: Enhance contrast for washed-out e-ink displays, apply Atkinson dithering for smooth gradients on limited palette.

#### Outdoor LCD (bright sunlight)
```json
{
  "icsUrl": "https://calendar.example.com/feed.ics",
  "template": "today-view",
  "adjustments": {
    "brightness": 15,
    "contrast": 25,
    "normalize": true,
    "sharpen": true
  }
}
```
**Purpose**: Boost brightness and contrast for sunlight readability, normalize for auto-enhancement.

**Note**: For complete parameter descriptions, use cases, performance considerations, and visual comparison matrices, see **[IMAGE-ADJUSTMENTS.md](IMAGE-ADJUSTMENTS.md)**.

#### OLED Dashboard (vibrant colors)
```json
{
  "icsUrl": "https://calendar.example.com/feed.ics",
  "template": "month-view",
  "adjustments": {
    "saturation": 20,
    "hue": 10,
    "contrast": 15
  }
}
```
**Purpose**: Enhance color vibrancy and contrast for OLED displays.

### Dithering Explained

Dithering improves visual quality on low bit-depth displays (1-bit, 2-bit, 4-bit) by creating smooth gradients using error diffusion:

- **Without dithering**: Sharp color bands (posterization)
- **With dithering**: Smooth gradients using patterns of available colors

**Floyd-Steinberg** (default): More aggressive pattern, good for general use
**Atkinson**: Lighter pattern, better for e-ink displays (less ghosting)

**Note**: Dithering only applies when `bitDepth <= 8`. It works with existing bit-depth quantization.

### Performance Impact

- Basic adjustments (brightness, contrast, gamma): ~10-30ms
- Normalize: ~20-40ms  
- Sharpen: ~30-50ms
- Dithering (800×480 image): ~100-150ms
- **Total worst case**: ~250ms

When adjustments are not configured, there is no performance impact.

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

### Weather Dashboard (No Calendar)
```json
{
  "template": "today-weather",
  "extraDataUrl": "https://api.open-meteo.com/v1/forecast?latitude=50.8505&longitude=4.3488&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code,rain,showers,snowfall,precipitation_probability&timezone=Europe/Brussels",
  "width": 800,
  "height": 480,
  "imageType": "png",
  "grayscale": true,
  "bitDepth": 8,
  "preGenerateInterval": "*/15 * * * *"
}
```
This configuration demonstrates a template that **doesn't require calendar data**. The `icsUrl` field is omitted, and the template receives an empty events array. The `today-weather` built-in template displays weather information from the Open-Meteo API. Perfect for info screens, dashboards, or e-ink displays that need data visualization without calendar events.

**Update the coordinates** in the `extraDataUrl` to match your location:
- Replace `latitude=50.8505&longitude=4.3488` with your coordinates
- Replace `timezone=Europe/Brussels` with your timezone

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
- `/api/sample.png` - Sample configuration (sample.json) - Returns cached or generated image
- `/api/0.png` - Numeric configuration (0.json) - Returns cached or generated image
- `/api/1.png` - Second configuration (1.json) - Returns cached or generated image
- `/api/{name}/fresh.png` - Force fresh generation, bypass cache

**Note:** Replace `.png` with `.jpg` or `.bmp` to match the `imageType` in your config file.

**CRC32 Checksum Endpoints:**
- `/api/sample.png.crc32` - Get CRC32 checksum for sample configuration
- `/api/1.png.crc32` - Get CRC32 checksum for second configuration
- `/api/{name}.{ext}.crc32` - Get CRC32 checksum (plain text, lowercase hex)

**E-ink Display Workflow Example:**
```python
import requests

# Check if image changed before downloading
crc = requests.get('http://homeassistant.local:3000/api/sample.png.crc32').text

if crc != last_known_crc:
    # Image changed - download it
    image = requests.get('http://homeassistant.local:3000/api/sample.png').content
    update_display(image)
    last_known_crc = crc
else:
    print('No update needed - saves bandwidth!')
```

