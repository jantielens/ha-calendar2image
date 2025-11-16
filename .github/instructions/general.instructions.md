---
title: GitHub Copilot Instructions for ha-calendar2image
description: General instructions for working with the ha-calendar2image Home Assistant Add-On
applyTo: "**/*"
---

# GitHub Copilot Instructions for ha-calendar2image

## Project Overview
This is a Home Assistant Add-On that generates images from calendar data (ICS format) using customizable templates. The add-on serves images via a REST API, supports caching, pre-generation, and is optimized for e-ink displays and ESP32 devices.

## Code Style and Conventions
- Use JavaScript ES6+ syntax
- Follow Home Assistant add-on best practices
- Ensure compatibility with Home Assistant's Docker environment
- Follow the KISS principle (Keep It Simple, Stupid)
- Use async/await for asynchronous operations
- Add JSDoc comments for public functions and complex logic
- Keep functions focused and single-purpose

## Key Architecture Points
- **Calendar Parsing**: ICS data is fetched and parsed using `ical.js`
- **Image Generation**: HTML templates are rendered to images using Puppeteer (headless Chrome)
- **Caching System**: Multi-layer cache (memory + disk) with CRC32 checksums for change detection
- **Scheduler**: Cron-based pre-generation system for ultra-fast responses
- **API Server**: Express.js REST API serving images, CRC32s, and configuration data
- **Performance Critical**: Always optimize to continuously serve CRC32 & image downloads as fast as possible to minimize battery consumption of consuming ESP32 devices

## Directory Structure
```
calendar2image/
├── src/                      # Main source code
│   ├── api/                  # Express.js API handlers
│   ├── calendar/             # ICS fetching and parsing
│   ├── cache/                # Caching system
│   ├── config/               # Configuration loading and validation
│   ├── extraData/            # External data source integration
│   ├── image/                # Image generation (Puppeteer)
│   ├── scheduler/            # Cron-based pre-generation
│   ├── templates/            # Built-in HTML templates
│   └── utils/                # Utility functions
├── tests/                    # Jest test suites
├── docs-user/                # User documentation
├── docs-developer/           # Developer documentation
├── data/                     # Sample data and configs
└── rootfs/                   # Docker container files
```

## Development Environment

### Prerequisites
- Node.js >= 22.0.0
- npm
- Docker (for container testing)

### Setup
```bash
cd calendar2image
npm install
```

### Running Tests
```bash
# Run unit tests
npm run test:local

# Run with coverage
npm run test:coverage

# Run integration tests (requires Docker)
npm run test:ci

# Run all tests
npm run test:all
```

### Local Development
```bash
# Start the server
npm start

# Development with auto-reload
npm run dev

# Template development with live reload
npm run watch <config-index>
```

### Building Docker Container
```bash
# Build locally
docker build -t calendar2image:local .

# Test locally
docker run -p 3000:3000 -v $(pwd)/data/calendar2image:/data calendar2image:local
```

## Testing Guidelines
- The project has automated tests; execute them **before** committing code
- All tests must pass before submitting changes
- Write tests for new features following existing patterns
- Integration tests require Docker and test the full container environment
- Mock external dependencies (HTTP requests, file system when appropriate)

## Dependencies Management
- **Core Dependencies**: 
  - `ical.js` for calendar parsing
  - `puppeteer` for image generation
  - `express` for API server
  - `node-cron` for scheduling
  - `sharp` for image processing
- **Before adding new dependencies**: Consider bundle size impact on Docker image
- **Updating dependencies**: Test thoroughly, especially Puppeteer upgrades (Chrome version changes)
- **Security**: Run `npm audit` before committing and address high/critical vulnerabilities

## Common Pitfalls

### Docker Environment
- File paths differ between local and Docker; use relative paths from config directory
- Docker volume mounts can have permission issues; handle gracefully
- Chromium in Docker requires `--no-sandbox` flag (already configured)

### Performance
- Image generation is CPU-intensive; use pre-generation with caching
- CRC32 checks are fast; leverage them for e-ink displays to avoid unnecessary updates
- Don't block the API server thread; use child processes for heavy operations

### Template Development
- Templates are cached; restart server or use `/fresh` endpoint during development
- HTML must be valid and self-contained (inline CSS/fonts preferred)
- Test templates with various event counts (0 events, 1 event, many events)

### Configuration
- Config file changes are auto-detected via file watcher
- Invalid configs should fail gracefully with clear error messages
- Always validate against JSON schema before processing

## Security Considerations
- **Input Validation**: Always validate and sanitize user-provided configuration
- **ICS URLs**: Validate URLs before fetching; support authentication headers
- **Template Security**: User templates execute in Puppeteer; avoid XSS vulnerabilities
- **File System**: Restrict file operations to designated directories
- **API Exposure**: The API is exposed on the network; document security implications
- **Dependencies**: Keep Puppeteer and Sharp updated for security patches

## Performance Optimization
- **CRC32 First**: Always check CRC32 before downloading full image
- **Pre-generation**: Use `preGenerateInterval` for frequently accessed calendars
- **Memory Cache**: Hot configs are cached in memory for <100ms response times
- **Disk Cache**: Persistent cache survives container restarts
- **Image Formats**: BMP for e-ink, PNG for general use, JPEG for photos

## Documentation
- User documentation in `docs-user/` focuses on configuration and usage
- Developer documentation in `docs-developer/` covers architecture and implementation
- Keep README.md up-to-date with major features
- Update CHANGELOG.md with all user-facing changes

## Pull Request Checklist
When creating a PR, ensure you:
- [ ] Update the version in both `package.json` and `config.yaml`
- [ ] Update the CHANGELOG with your changes
- [ ] Review all `.md` files and update if needed
- [ ] All tests pass (`npm run test:all`)
- [ ] No new high/critical security vulnerabilities (`npm audit`)
- [ ] Code follows style conventions
- [ ] Complex changes include JSDoc comments
- [ ] Breaking changes are clearly documented
