# Calendar2Image

Generate images from calendar data (ICS URLs) using customizable templates.

## About

The Calendar2Image add-on creates images from calendar events fetched from ICS URLs. It provides a REST API to generate images on-demand with highly customizable templates. Perfect for e-ink displays, dashboards, or any scenario where you need calendar data as an image.

## Configuration

### Add-on Options

```yaml
port: 3000  # Port number for the web server (default: 3000)
```

### Example Configuration

```yaml
port: 3000
```

## Usage

Once the add-on is running, you can access the API endpoints:

### Test Endpoint
```
GET http://homeassistant.local:3000/api/0
```

Returns a JSON response with status information.

### Health Check
```
GET http://homeassistant.local:3000/health
```

Returns the health status of the add-on.

## Development Status

**Current Version:** 0.1.0 (Step 1 - Skeleton Implementation)

This is the initial skeleton version with basic web server functionality. Future versions will include:
- ICS calendar data fetching
- Configuration system for multiple calendars
- Template engine with built-in templates
- Image generation with Puppeteer
- Localization support

## Support

For issues and feature requests, please use the [GitHub issue tracker](https://github.com/jantielens/ha-calendar2image/issues).
