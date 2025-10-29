# Changelog

## [0.1.0] - 2025-10-29

### Added
- Initial release with basic add-on skeleton
- Express web server with configurable port (default: 3000)
- `/api/0` endpoint returning "Hello World" JSON response
- `/health` endpoint for health checks
- Support for aarch64 and armv7 architectures (Raspberry Pi)
- Configuration option to customize web server port
- Graceful shutdown handling
- Request logging with timestamps
- Error handling for 404 and 500 errors

### Technical Details
- Node.js 22 LTS runtime
- Express.js 4.18.2 web framework
- Docker-based containerization
- Home Assistant add-on configuration via options.json

[0.1.0]: https://github.com/jantielens/ha-calendar2image/releases/tag/v0.1.0

---
All notable changes to this add-on will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).