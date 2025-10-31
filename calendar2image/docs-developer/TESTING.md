# Testing Strategy

## Overview

This project uses a two-tier testing strategy:
1. **Local Unit Tests** - Fast tests without external dependencies
2. **Integration Tests** - Tests against a running Docker container

## Test Commands

### `npm run test:local`
**Fast unit tests for local development**
- Runs tests without Puppeteer/Chrome dependencies
- Excludes integration tests
- **93 tests** - runs in ~5 seconds
- Perfect for TDD and rapid feedback during development

**Tests included:**
- Calendar parsing (`icsParser`, `icsClient`)
- Configuration loading and validation
- Template rendering
- Image conversion (Sharp operations, including rotation)
- Schema validation

### `npm run test:coverage`
**Generate coverage report for local tests**
- Same tests as `test:local` but with coverage reporting
- Creates HTML and LCOV reports in `./coverage`

### `npm run test:ci`
**Integration tests against running Docker container**
- Tests the complete application in a Docker container
- **Fully automated** - builds and manages its own container
- **22 tests** in docker.test.js
- Runs in ~30 seconds

**Tests included:**
- Container health checks
- HTTP endpoints
- Image generation (PNG, BMP)
- Cache behavior (HIT/MISS/BYPASS/DISABLED)
- CRC32 checksum endpoints
- Fresh generation endpoints
- Error handling
- Concurrent request handling
- Configuration loading

### `npm run test:all`
**Run all tests sequentially**
- Runs `test:local` → `test:coverage` → `test:ci`
- Use this for comprehensive validation before committing

## Test Organization

```
tests/
├── calendar/          # Calendar parsing tests (local)
├── config/            # Configuration tests (local)
├── image/
│   ├── converter.test.js   # Sharp image processing (local)
│   ├── browser.test.js     # Puppeteer tests (excluded from local)
│   └── index.test.js       # Image generation (excluded from local)
├── templates/         # Template rendering (local)
├── api/
│   └── handler.test.js     # API handler (excluded from local)
└── integration/       # Integration tests (Docker container)
    └── docker.test.js      # Fully automated Docker container tests
```

## CI/CD Recommendations

**GitHub Actions / CI Pipeline:**
1. Run `npm run test:local` first (fast feedback)
2. Build Docker image
3. Start container
4. Run `npm run test:ci`
5. Clean up container

**Local Development:**
- Use `npm run test:local` during development
- Run `npm run test:ci` before pushing to ensure container works
- Run `npm run test:all` before major releases

## Notes

- Local tests exclude Puppeteer dependencies to avoid requiring Chrome installation
- Integration tests require a running Docker container
- All Puppeteer-based tests are validated in the Docker container environment
- The `rotate` parameter is tested in `converter.test.js` (local) for unit validation
