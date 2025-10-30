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

### Calendar Image Endpoints
```
GET http://homeassistant.local:3000/api/0
GET http://homeassistant.local:3000/api/1
GET http://homeassistant.local:3000/api/{index}
```

Returns a binary image (PNG, JPG, or BMP) based on the configuration file (`0.json`, `1.json`, etc.).

**Response Headers:**
- `Content-Type`: `image/png`, `image/jpeg`, or `image/bmp`
- `Content-Length`: Size of the image in bytes

**Error Responses:**
- `400 Bad Request`: Invalid index parameter
- `404 Not Found`: Configuration file not found
- `500 Internal Server Error`: Template or image generation failure
- `502 Bad Gateway`: ICS calendar fetch failure

### Health Check
```
GET http://homeassistant.local:3000/health
```

Returns the health status of the add-on.

## Development Status

**Current Version:** 0.2.0 (Steps 1-6 Complete)

Completed features:
- ✅ Express API with dynamic `/api/{index}` endpoints
- ✅ Binary image generation and response
- ✅ ICS calendar data fetching and parsing
- ✅ Configuration system for multiple calendars
- ✅ Template engine with built-in templates (week-view, today-view)
- ✅ Image generation with Puppeteer and Sharp
- ✅ Image format options (PNG, JPG, BMP)
- ✅ Grayscale conversion and bit depth control
- ✅ Emoji and international character support
- ✅ Comprehensive error handling with HTTP status codes
- ✅ Verbose logging with performance metrics
- ✅ Comprehensive unit and integration tests (124 tests, 92.47% coverage)

Upcoming features:
- Localization support (locale and timezone configuration)
- Enhanced developer testing documentation

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
