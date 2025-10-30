# Changelog

## [0.1.0] - 2025-10-29

### Added
- Initial release with basic add-on skeleton
- Express web server with configurable port (default: 3000)
- `/health` endpoint for health checks
- Full calendar image generation via `/api/{index}` endpoints
- Dynamic route handling for multiple calendar configurations
- Binary image responses (PNG, JPG, BMP)
- Comprehensive error handling with proper HTTP status codes (400, 404, 500, 502)
- Verbose logging with performance metrics
- ICS calendar data fetching and parsing with recurring event expansion
- JSON configuration system with schema validation
- Template engine with built-in templates (week-view, today-view)
- Puppeteer-based image generation with Sharp conversion
- Grayscale and bit depth control
- Emoji and international character support (Noto fonts)
- Custom template support via file system
- Support for aarch64 and armv7 architectures (Raspberry Pi)
- Configuration option to customize web server port
- Graceful shutdown handling
- Request logging with timestamps
- Error handling for 404 and 500 errors

### Changed
- `/api/{index}` endpoints now return actual calendar images instead of JSON
- Updated response headers to include Content-Type and Content-Length
- Enhanced error responses with detailed error messages

### Technical Details
- Node.js 22 LTS runtime
- Express.js 4.18.2 web framework
- Complete API orchestration pipeline (config → fetch → render → generate)
- Puppeteer 21.11.0 with Chromium for HTML rendering
- Sharp 0.33.0 for high-performance image processing
- ical.js 2.0.1 for ICS parsing
- ajv 8.12.0 for JSON schema validation
- 124 unit tests with 92.47% code coverage
- Integration tests for API and Docker container
- Docker-based containerization
- Home Assistant add-on configuration via options.json

[0.1.0]: https://github.com/jantielens/ha-calendar2image/releases/tag/v0.1.0

---
All notable changes to this add-on will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).