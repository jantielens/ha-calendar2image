# Configuration Files

This folder contains sample configuration files for the Calendar2Image add-on.

## Location

In Home Assistant, configuration files should be placed in:
```
/addon_configs/calendar2image/
```

During local development, use this `data/calendar2image/` folder.

## File Naming

Configuration files must be named with numeric IDs:
- `0.json` - First configuration (accessible via `/api/0.png` or other extension)
- `1.json` - Second configuration (accessible via `/api/1.png` or other extension)

**Note:** The API endpoint extension must match the `imageType` in the config file.
- `2.json` - Third configuration (accessible via `/api/2`)
- etc.

## Configuration Schema

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `icsUrl` | string | URL to your iCalendar (.ics) file. Supports `http://` and `https://` protocols. |
| `template` | string | Template name to use for rendering (e.g., `"default"`, `"compact"`, `"weekly"`) |

### Optional Fields

| Field | Type | Default | Valid Values | Description |
|-------|------|---------|--------------|-------------|
| `grayscale` | boolean | `false` | `true`, `false` | Convert output image to grayscale |
| `bitDepth` | integer | `8` | `1`, `4`, `8`, `16`, `24` | Bit depth for the output image |
| `imageType` | string | `"png"` | `"png"`, `"jpg"`, `"jpeg"`, `"bmp"`, `"gif"` | Output image format |
| `expandRecurringFrom` | integer | `-31` | Any negative integer | Number of days in the past to expand recurring events |
| `expandRecurringTo` | integer | `31` | Any positive integer | Number of days in the future to expand recurring events |
| `preGenerateInterval` | string | (none) | Cron expression | Schedule for automatic pre-generation (e.g., `"*/5 * * * *"` for every 5 minutes) |

## Examples

### Basic Configuration
```json
{
  "icsUrl": "https://calendar.google.com/calendar/ical/your-id/public/basic.ics",
  "template": "default"
}
```

### Full Configuration with All Options
```json
{
  "icsUrl": "https://calendar.google.com/calendar/ical/your-id/public/basic.ics",
  "template": "default",
  "grayscale": false,
  "bitDepth": 8,
  "imageType": "png",
  "expandRecurringFrom": -31,
  "expandRecurringTo": 31
}
```

### Grayscale PNG
```json
{
  "icsUrl": "https://example.com/calendar.ics",
  "template": "compact",
  "grayscale": true,
  "bitDepth": 8,
  "imageType": "png"
}
```

### JPEG Output
```json
{
  "icsUrl": "https://example.com/calendar.ics",
  "template": "weekly",
  "imageType": "jpg"
}
```

### Extended Time Range
```json
{
  "icsUrl": "https://example.com/calendar.ics",
  "template": "default",
  "expandRecurringFrom": -90,
  "expandRecurringTo": 90
}
```

### Pre-generated for E-ink Display (Recommended)
```json
{
  "icsUrl": "https://example.com/calendar.ics",
  "template": "default",
  "grayscale": true,
  "bitDepth": 2,
  "imageType": "png",
  "preGenerateInterval": "*/5 * * * *"
}
```
With `preGenerateInterval` set, images are regenerated every 5 minutes in the background. API responses are <100ms (from cache) instead of ~8 seconds (on-demand generation). Use the `/api/{index}.{ext}.crc32` endpoint (e.g., `/api/0.png.crc32`) to check if the image changed before downloading.

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
- `/api/0` → Uses `0.json` (returns image)
- `/api/0.crc32` → CRC32 checksum for `0.json`
- `/api/0/fresh` → Force fresh generation for `0.json`
- `/api/1` → Uses `1.json` (returns image)
- `/api/1.crc32` → CRC32 checksum for `1.json`
- `/api/2` → Uses `2.json` (returns image)
- `/api/3` → Uses `3.json` (returns image)
