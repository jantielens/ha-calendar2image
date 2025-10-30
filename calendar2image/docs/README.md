# User Documentation

This directory contains user-facing documentation for the Calendar2Image Home Assistant add-on.

## Contents

- [**CONFIGURATION.md**](./CONFIGURATION.md) - How to configure calendars, including:
  - Configuration file format
  - Required and optional fields
  - Example configurations
  - API endpoints

## Quick Start

### 1. Create Configuration Files

Create configuration files in `/config/ha-calendar2image/` (or your mapped data directory):

**Example: 0.json**
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
http://homeassistant.local:3000/api/0
http://homeassistant.local:3000/api/1
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
  "expandRecurringTo": 31
}
```

## Troubleshooting

### Add-on Won't Start

- Check the add-on logs for validation errors
- Ensure all configuration files have valid JSON syntax
- Verify `icsUrl` starts with `http://` or `https://`
- Ensure `template` and `icsUrl` are present in all config files

### No Configuration Files Found

- Ensure files are named `0.json`, `1.json`, etc.
- Check the file location matches your folder mapping
- Default location: `/data/ha-calendar2image/`

### Invalid ICS URL

- Test the URL in a browser to ensure it's accessible
- Ensure the URL returns valid ICS data
- Check for network connectivity issues

## Support

For issues and feature requests, please use the [GitHub issue tracker](https://github.com/jantielens/ha-calendar2image/issues).
