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

### Calendar Configuration Files

Calendar configurations are stored in `/addon_configs/17f877f5_calendar2image/` on your Home Assistant host.

**Sample files**: The add-on automatically creates `sample-0.json` and `README.md` in this directory on first startup to help you get started. Copy `sample-0.json` to `0.json` and customize it for your calendar.

See [Configuration Guide](./docs/CONFIGURATION.md) for details.

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

**Current Version:** 0.1.0 (Steps 1-5 Complete)

Completed features:
- ✅ Basic web server functionality
- ✅ ICS calendar data fetching and parsing
- ✅ Configuration system for multiple calendars
- ✅ Template engine with built-in templates (week-view, today-view)
- ✅ Image generation with Puppeteer
- ✅ Image format options (PNG, JPG, BMP)
- ✅ Grayscale conversion and bit depth control
- ✅ Comprehensive unit and integration tests (104 tests, 88.96% coverage)

Upcoming features:
- Express API integration (/api/{index} endpoint)
- Localization support

## Testing

The add-on includes comprehensive testing at multiple levels:

**Unit Tests (104 tests):**
```bash
npm test
npm run test:coverage  # With coverage report
```

**Integration Tests:**
```bash
# API Integration Tests
./test-api.sh         # Linux/Mac
.\test-api.ps1        # Windows

# Docker Integration Tests  
./test-docker.sh      # Linux/Mac
.\test-docker.ps1     # Windows
```

See [tests/integration/README.md](./tests/integration/README.md) for details.

## Documentation

- **User Documentation**: See [docs/](./docs) for configuration guides and usage instructions
- **Developer Documentation**: See [/docs](/docs) in the repository root for implementation details

### User Docs

- [Configuration Guide](./docs/CONFIGURATION.md) - How to configure calendar settings

## Support

For issues and feature requests, please use the [GitHub issue tracker](https://github.com/jantielens/ha-calendar2image/issues).
