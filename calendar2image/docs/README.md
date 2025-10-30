# User Documentation

This directory contains user-facing documentation for the Calendar2Image Home Assistant add-on.

## Contents

- [**CONFIGURATION.md**](./CONFIGURATION.md) - How to configure calendars, including:
  - Configuration file format
  - Required and optional fields
  - Example configurations
  - API endpoints

## Quick Start

**Sample files included**: When you first start the add-on, it automatically creates `sample-0.json` and `README.md` in `/addon_configs/17f877f5_calendar2image/` to help you get started.

### 1. Create Configuration Files

Create configuration files in `/addon_configs/17f877f5_calendar2image/`:

**Example: 0.json** (based on the included sample)
```json
{
  "icsUrl": "https://example.com/calendar.ics",
  "template": "week-view"
}
```

### 2. Start the Add-on

The add-on will validate your configurations on startup. If any configuration is invalid, the add-on will fail to start with a clear error message.

### 3. Access the API

Once running, access your calendar images via:
```
http://homeassistant.local:3000/api/0.png           # Get image (cached or fresh)
http://homeassistant.local:3000/api/0.png.crc32     # Get CRC32 checksum
http://homeassistant.local:3000/api/0/fresh.png     # Force fresh generation
http://homeassistant.local:3000/api/1.png           # Second calendar image
```

**Note:** The file extension (`.png`, `.jpg`, or `.bmp`) must match the `imageType` configured in your JSON file.

These endpoints return binary image data (PNG, JPG, or BMP) based on your configuration.

**Performance:** If `preGenerateInterval` is configured, images are served from cache in <100ms. Otherwise, images are generated on-demand (~8 seconds on Raspberry Pi).

**Example using curl:**
```bash
# Download image
curl http://homeassistant.local:3000/api/0.png -o calendar.png

# Check if image changed (for e-ink displays)
curl http://homeassistant.local:3000/api/0.png.crc32
```

**Example in Home Assistant:**
```yaml
camera:
  - platform: generic
    name: "Calendar Image"
    still_image_url: "http://homeassistant.local:3000/api/0.png"
```

## Configuration Options

See [CONFIGURATION.md](./CONFIGURATION.md) for complete details on all configuration options.

### Minimal Configuration

```json
{
  "icsUrl": "https://example.com/calendar.ics",
  "template": "week-view"
}
```

### Full Configuration

```json
{
  "icsUrl": "https://example.com/calendar.ics",
  "template": "week-view",
  "grayscale": false,
  "bitDepth": 8,
  "imageType": "png",
  "expandRecurringFrom": -31,
  "expandRecurringTo": 31,
  "preGenerateInterval": "*/5 * * * *"
}
```

**Performance Tip:** Adding `preGenerateInterval` enables background pre-generation. Images are regenerated on schedule and served from cache, reducing response times from ~8 seconds to <100ms.

## Troubleshooting

### Add-on Won't Start

- Check the add-on logs for validation errors
- Ensure all configuration files have valid JSON syntax
- Verify `icsUrl` starts with `http://` or `https://`
- Ensure `template` and `icsUrl` are present in all config files

### No Configuration Files Found

- Ensure files are named `0.json`, `1.json`, etc.
- Check the file location matches your folder mapping
- Default location: `/addon_configs/17f877f5_calendar2image/`
- The add-on creates `sample-0.json` automatically on first run - check if this file exists

### Invalid ICS URL

- Test the URL in a browser to ensure it's accessible
- Ensure the URL returns valid ICS data
- Check for network connectivity issues

## Support

For issues and feature requests, please use the [GitHub issue tracker](https://github.com/jantielens/ha-calendar2image/issues).
