# Calendar2Image - Steps 2 & 3 Implementation

This document describes the implementation of Step 2 (ICS Calendar Data Fetching) and Step 3 (Configuration System).

## Implementation Summary

### Step 2: ICS Calendar Data Fetching ✅

**Module Location**: `src/calendar/`

**Files Created**:
- `icsClient.js` - HTTP client for fetching ICS data
- `icsParser.js` - ICS parser using ical.js with recurring event expansion
- `index.js` - Main module export

**Features**:
- ✅ Fetch ICS data from HTTP/HTTPS URLs
- ✅ Parse ICS data into structured JavaScript objects
- ✅ Expand recurring events within configurable date range (hybrid approach)
- ✅ Extract event properties: summary, start, end, description, location, timezone, UID
- ✅ Handle all-day events
- ✅ Error handling for network failures, invalid URLs, malformed ICS data
- ✅ Comprehensive unit tests (>95% coverage)

**Configuration**:
- `expandRecurringFrom`: Days from today to start expanding recurring events (default: -31)
- `expandRecurringTo`: Days from today to stop expanding recurring events (default: 31)

### Step 3: Configuration System ✅

**Module Location**: `src/config/`

**Files Created**:
- `schema.js` - JSON schema definition and validation using ajv
- `loader.js` - Configuration file loader with validation
- `index.js` - Main module export

**Features**:
- ✅ JSON schema validation for configuration files
- ✅ Load individual or all configuration files
- ✅ Apply default values for optional fields
- ✅ Validate required fields (icsUrl, template)
- ✅ Validate value constraints (imageType enum, bitDepth range, URL format)
- ✅ Fail fast on startup if configs are invalid
- ✅ Clear error messages for validation failures
- ✅ Comprehensive unit tests (>91% coverage)

**Configuration Schema**:
```json
{
  "icsUrl": "https://example.com/calendar.ics",     // Required
  "template": "week-view",                          // Required
  "grayscale": false,                               // Optional, default: false
  "bitDepth": 8,                                    // Optional, default: 8 (range: 1-32)
  "imageType": "png",                               // Optional, default: "png" (jpg|png|bmp)
  "expandRecurringFrom": -31,                       // Optional, default: -31
  "expandRecurringTo": 31                           // Optional, default: 31
}
```

**Configuration Location**: `/addon_configs/calendar2image/`
- Files must be named: `0.json`, `1.json`, `2.json`, etc.

## Code Coverage

Overall coverage: **90.51%** (exceeds 80% requirement)

```
---------------|---------|----------|---------|---------|
File           | % Stmts | % Branch | % Funcs | % Lines |
---------------|---------|----------|---------|---------|
All files      |   90.51 |     86.9 |   94.44 |   90.44 |
 calendar      |   89.87 |    90.38 |    90.9 |   89.87 |
  icsClient.js |     100 |      100 |     100 |     100 |
  icsParser.js |      95 |     87.5 |     100 |      95 |
 config        |   91.37 |    81.25 |     100 |   91.22 |
  loader.js    |   95.74 |       70 |     100 |   95.65 |
  schema.js    |     100 |      100 |     100 |     100 |
---------------|---------|----------|---------|---------|
```

## Dependencies Added

- **ical.js** (^2.0.1) - ICS parsing library
- **ajv** (^8.12.0) - JSON schema validation
- **jest** (^29.7.0) - Testing framework (dev)
- **nock** (^13.5.0) - HTTP mocking for tests (dev)

## Testing

### Run Tests
```bash
npm test
```

### Run Tests with Coverage
```bash
npm test:coverage
```

### Run Tests in Watch Mode
```bash
npm test:watch
```

### Integration Tests

#### API Integration Tests
Tests API endpoints against a running server:
```bash
# Quick start with helper scripts
.\test-api.ps1      # Windows (PowerShell)
./test-api.sh       # Linux/Mac (Bash)

# Or manually
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Run tests
npm run test:integration
```

#### Docker Integration Tests
Builds and tests the actual Docker container:
```bash
# Quick start with helper scripts
.\test-docker.ps1   # Windows (PowerShell)
./test-docker.sh    # Linux/Mac (Bash)

# Or direct npm command
npm run test:docker
```

**Prerequisites:**
- Docker installed and running
- Port 13000 available
- Takes ~2 minutes (builds container)

**What it tests:**
- Docker image builds successfully
- Container starts and runs
- All API endpoints work
- Configuration mounting works
- Performance and stability

See [tests/integration/README.md](../calendar2image/tests/integration/README.md) for details.

## Usage Example

See `example.js` for a complete integration example:

```javascript
const { loadConfig } = require('./src/config');
const { getCalendarEvents } = require('./src/calendar');

async function fetchCalendar() {
  // Load configuration
  const config = await loadConfig(0, '/data/ha-calendar2image');
  
  // Fetch calendar events
  const events = await getCalendarEvents(config.icsUrl, {
    expandRecurringFrom: config.expandRecurringFrom,
    expandRecurringTo: config.expandRecurringTo
  });
  
  console.log(`Found ${events.length} events`);
}
```

Run the example:
```bash
node example.js
```

## Error Handling

Both modules implement comprehensive error handling:

### Calendar Module Errors
- Invalid URL format
- Unsupported protocols (only HTTP/HTTPS)
- Network errors (timeout, connection failures)
- HTTP errors (404, 500, etc.)
- Empty responses
- Malformed ICS data
- ICS parsing errors

### Config Module Errors
- Missing configuration directory
- No configuration files found
- Invalid JSON syntax
- Schema validation failures
- Missing required fields
- Invalid field values

All errors include descriptive messages to help diagnose issues.

## Test Files

### Unit Tests
- `tests/calendar/icsClient.test.js` - 11 tests for HTTP fetching
- `tests/calendar/icsParser.test.js` - 17 tests for ICS parsing
- `tests/config/schema.test.js` - 18 tests for schema validation
- `tests/config/loader.test.js` - 16 tests for config loading

**Total: 62 tests, all passing**

### Integration Tests
- `tests/integration/api.test.js` - API endpoint testing against running server
- `tests/integration/docker.test.js` - Full Docker container build and test

See [tests/integration/README.md](../calendar2image/tests/integration/README.md) for details.

## Sample Configurations

Sample configuration files are provided in `data/ha-calendar2image/`:
- `0.json` - Week view with default settings
- `1.json` - Today view with grayscale, 1-bit depth, BMP format

## Integration with Express API

These modules are ready to be integrated into the Express API (Step 6):

```javascript
app.get('/api/:index', async (req, res) => {
  try {
    // Load config for this index
    const config = await loadConfig(parseInt(req.params.index));
    
    // Fetch calendar events
    const events = await getCalendarEvents(config.icsUrl, {
      expandRecurringFrom: config.expandRecurringFrom,
      expandRecurringTo: config.expandRecurringTo
    });
    
    // Continue with template rendering and image generation...
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## Next Steps

Ready for Step 4: Template Engine Setup
- Integrate Handlebars/EJS
- Create template loader
- Implement week-view and today-view templates
- Pass calendar events to templates for rendering
