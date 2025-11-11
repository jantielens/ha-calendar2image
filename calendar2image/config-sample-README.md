# Configuration Files

This folder contains configuration files for the Calendar2Image add-on.

## Quick Start

On first startup, the add-on automatically creates `0.json` with a **complete working configuration** including all available parameters. Simply update the `icsUrl` to point to your calendar and you're ready to go!

## Location

In Home Assistant, configuration files should be placed in:
```
/addon_configs/calendar2image/
```

During local development, use this `data/calendar2image/` folder.

## File Naming

Configuration files must be named with numeric IDs:
- `0.json` - First configuration (accessible via `/api/0`)
- `1.json` - Second configuration (accessible via `/api/1`)
- `2.json` - Third configuration (accessible via `/api/2`)
- etc.

## Configuration Schema

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `template` | string | Template name to use for rendering (e.g., `"default"`, `"compact"`, `"weekly"`) |

### Optional Fields

| Field | Type | Default | Valid Values | Description |
|-------|------|---------|--------------|-------------|
| `icsUrl` | string or array | (none) | Valid HTTP(S) URL(s) | Single ICS URL or array of calendar sources. For multiple sources, use objects with `url` (required) and `sourceName` (optional) fields. If omitted, template receives an empty events array (useful for extraData-only templates like weather dashboards). |
| `width` | integer | `800` | `100-4096` | Width of the output image in pixels |
| `height` | integer | `600` | `100-4096` | Height of the output image in pixels |
| `grayscale` | boolean | `false` | `true`, `false` | Convert output image to grayscale |
| `bitDepth` | integer | `8` | `1-32` | Bit depth for the output image |
| `imageType` | string | `"png"` | `"png"`, `"jpg"`, `"bmp"` | Output image format |
| `rotate` | integer | `0` | `0`, `90`, `180`, `270` | Rotate the output image (in degrees) |
| `expandRecurringFrom` | integer | `-31` | Any negative integer | Number of days in the past to expand recurring events (only applies when `icsUrl` is configured) |
| `expandRecurringTo` | integer | `31` | Any positive integer | Number of days in the future to expand recurring events (only applies when `icsUrl` is configured) |
| `preGenerateInterval` | string | (none) | Cron expression | Schedule for automatic pre-generation (e.g., `"*/5 * * * *"` for every 5 minutes) |
| `locale` | string | `"en-US"` | BCP 47 locale code | Locale for date/time formatting (e.g., `"de-DE"`, `"fr-FR"`) |
| `timezone` | string | (none) | IANA timezone name | Timezone to convert event times (e.g., `"Europe/Berlin"`, `"America/New_York"`) |
| `extraDataUrl` | string or array | (none) | Valid HTTP(S) URL(s) | URL(s) to fetch additional JSON data for templates (e.g., weather, tasks). See documentation for details. |
| `extraDataCacheTtl` | integer | `300` | 0 or higher | Cache TTL in seconds for extra data |
| `extraDataHeaders` | object | `{}` | Key-value pairs | HTTP headers for extra data requests (e.g., Authorization tokens) |

## Examples

### Basic Configuration
```json
{
  "icsUrl": "https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics",
  "template": "default"
}
```

### Full Configuration with All Options
```json
{
  "icsUrl": "https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics",
  "template": "default",
  "width": 800,
  "height": 600,
  "grayscale": false,
  "bitDepth": 8,
  "imageType": "png",
  "rotate": 0,
  "expandRecurringFrom": -31,
  "expandRecurringTo": 31,
  "preGenerateInterval": "*/5 * * * *",
  "locale": "en-US",
  "timezone": "UTC"
}
```
This is what the default `0.json` file contains - a complete configuration with all available parameters!

### Grayscale PNG
```json
{
  "icsUrl": "https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics",
  "template": "compact",
  "grayscale": true,
  "bitDepth": 8,
  "imageType": "png"
}
```

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
  "template": "week-view",
  "preGenerateInterval": "*/10 * * * *"
}
```
This configuration combines events from multiple calendars. Events will include `source` (0, 1, 2...) and `sourceName` fields for template customization. Failed calendars generate placeholder events.

### JPEG Output
```json
{
  "icsUrl": "https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics",
  "template": "weekly",
  "imageType": "jpg"
}
```

### Extended Time Range
```json
{
  "icsUrl": "https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics",
  "template": "default",
  "expandRecurringFrom": -90,
  "expandRecurringTo": 90
}
```

### Pre-generated for E-ink Display (Recommended)
```json
{
  "icsUrl": "https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics",
  "template": "default",
  "grayscale": true,
  "bitDepth": 2,
  "imageType": "png",
  "preGenerateInterval": "*/5 * * * *"
}
```
With `preGenerateInterval` set, images are regenerated every 5 minutes in the background. API responses are <100ms (from cache) instead of ~8 seconds (on-demand generation). Use the `/api/{index}.{ext}.crc32` endpoint (e.g., `/api/0.png.crc32`) to check if the image changed before downloading.

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
This configuration demonstrates a template that doesn't use any calendar data. The `icsUrl` field is omitted, and the template receives an empty events array. The template uses `extraData` to display weather information from the Open-Meteo API. Perfect for info screens, weather stations, or dashboards that don't need calendar events.

## Calendar Source Examples

### Google Calendar
1. Open your Google Calendar
2. Go to Settings → Settings for my calendars → [Your Calendar]
3. Scroll to "Integrate calendar"
4. Copy the "Public URL to this calendar" (iCal format)
5. Use this URL as the `icsUrl` value

### Apple iCloud Calendar
1. Open iCloud Calendar on the web
2. Click the share icon next to your calendar
3. Enable "Public Calendar"
4. Copy the URL and **change `webcal://` to `https://`**
5. Use this URL as the `icsUrl` value

### Office 365 / Outlook
1. Open Outlook Calendar on the web
2. Right-click your calendar → Sharing and permissions
3. Choose "Publish this calendar" → ICS
4. Copy the ICS URL
5. Use this URL as the `icsUrl` value

## Multiple Configurations

You can create multiple configuration files to generate different calendar images:

```
/addon_configs/calendar2image/
├── 0.json    # Personal calendar, color PNG
├── 1.json    # Work calendar, grayscale
├── 2.json    # Family calendar, weekly view
└── 3.json    # Event calendar, extended range
```

Each configuration will be accessible via its respective API endpoint:
- `/api/0.png` → Uses `0.json` (returns image)
- `/api/0.png.crc32` → CRC32 checksum for `0.json`
- `/api/0/fresh.png` → Force fresh generation for `0.json`
- `/api/1.png` → Uses `1.json` (returns image)
- `/api/1.png.crc32` → CRC32 checksum for `1.json`

**Note:** Extension (`.png`, `.jpg`, or `.bmp`) must match the `imageType` in the config file.
- `/api/2` → Uses `2.json` (returns image)
- `/api/3` → Uses `3.json` (returns image)

