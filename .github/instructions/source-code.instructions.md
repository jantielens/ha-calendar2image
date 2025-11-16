---
title: Source Code Instructions
description: Instructions for working with the main source code
applyTo: "calendar2image/src/**/*"
---

# Source Code Instructions for ha-calendar2image

## Code Organization

### Module Structure
The `src/` directory is organized by functionality:
- **api/**: Express.js routes and request handlers
- **calendar/**: ICS feed fetching and event parsing
- **cache/**: Multi-layer caching system (memory + disk)
- **config/**: Configuration file loading and JSON schema validation
- **extraData/**: External data source integration
- **image/**: Puppeteer-based image generation
- **scheduler/**: Cron-based background job scheduling
- **templates/**: Built-in template implementations
- **utils/**: Shared utility functions

### File Naming
- Use kebab-case for filenames: `fetch-calendar.js`
- Test files: `filename.test.js`
- Main entry point: `index.js`

## Coding Standards

### JavaScript Style
- Use ES6+ features (const/let, arrow functions, async/await)
- Prefer `async/await` over `.then()` chains
- Use destructuring for cleaner code
- Avoid var, always use const or let
- Use template literals for string interpolation

### Error Handling
```javascript
// Always handle errors in async functions
async function fetchData() {
  try {
    const result = await riskyOperation();
    return result;
  } catch (error) {
    console.error('Meaningful error message:', error);
    throw new Error('User-friendly error');
  }
}
```

### Function Structure
- Keep functions small and focused (single responsibility)
- Use descriptive function names (verbs for actions)
- Add JSDoc comments for public APIs
- Validate input parameters
- Return consistent types

### JSDoc Comments
```javascript
/**
 * Generates an image from calendar events
 * @param {Object} config - Configuration object
 * @param {Array} events - Array of calendar events
 * @param {number} config.width - Image width in pixels
 * @param {number} config.height - Image height in pixels
 * @returns {Promise<Buffer>} Generated image buffer
 * @throws {Error} When template rendering fails
 */
async function generateImage(config, events) {
  // Implementation
}
```

## Performance Considerations

### Critical Path Optimization
The API server must respond **fast** to minimize battery drain on ESP32 devices:
- CRC32 endpoints should respond in <100ms (use memory cache)
- Image endpoints should respond in <200ms when pre-generated
- Pre-generate images using scheduler for frequently accessed configs
- Use disk cache to survive container restarts

### Caching Strategy
```javascript
// 1. Check memory cache first (fastest)
if (memoryCache.has(key)) {
  return memoryCache.get(key);
}

// 2. Check disk cache (fast)
const cached = await diskCache.get(key);
if (cached) {
  memoryCache.set(key, cached); // Promote to memory
  return cached;
}

// 3. Generate and cache at both levels
const result = await expensiveOperation();
diskCache.set(key, result);
memoryCache.set(key, result);
return result;
```

### Puppeteer Usage
- Reuse browser instances (don't launch for every request)
- Use headless mode
- Close pages after rendering
- Handle browser crashes gracefully
- Set appropriate timeouts

## API Development

### Express.js Route Handlers
```javascript
router.get('/api/:index.png', async (req, res) => {
  try {
    const { index } = req.params;
    
    // Validate input
    if (!isValidIndex(index)) {
      return res.status(400).send('Invalid index');
    }
    
    // Generate or fetch from cache
    const image = await getImage(index);
    
    // Set appropriate headers
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=300');
    
    return res.send(image);
  } catch (error) {
    console.error('Error serving image:', error);
    return res.status(500).send('Internal server error');
  }
});
```

### Request Validation
- Always validate route parameters
- Check query parameters for type and range
- Return appropriate HTTP status codes
- Provide meaningful error messages

## Calendar Processing

### ICS Parsing
- Use `ical.js` for parsing
- Handle timezone conversions correctly
- Support recurring events
- Filter events by date range
- Handle malformed ICS data gracefully

### Event Filtering
```javascript
// Filter events within date range
function filterEvents(events, startDate, endDate) {
  return events.filter(event => {
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);
    return eventStart <= endDate && eventEnd >= startDate;
  });
}
```

## Image Generation

### Puppeteer Best Practices
- Set viewport size before navigation
- Wait for DOM content loaded
- Use `waitForSelector` for dynamic content
- Capture screenshots with appropriate options
- Handle navigation timeouts

### Template Rendering
- Templates should be self-contained HTML
- Inline CSS for better rendering
- Use data attributes for dynamic content
- Test with various event counts (0, 1, many)
- Support custom user templates

## Configuration

### JSON Schema Validation
- All config changes must pass schema validation
- Provide clear validation error messages
- Use defaults for optional fields
- Document all configuration options

### File Watching
- Watch config file for changes
- Reload configuration atomically
- Validate before applying new config
- Invalidate caches on config change

## Security

### Input Sanitization
```javascript
// Sanitize user input before using in templates
function sanitizeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
```

### URL Validation
- Validate ICS URLs before fetching
- Support authentication headers securely
- Prevent SSRF attacks
- Use HTTPS when possible

### Template Execution
- User templates run in Puppeteer context
- Avoid `eval()` in template processing
- Sanitize template output
- Document security implications

## Dependencies

### When Adding Dependencies
1. Check license compatibility (MIT, Apache 2.0, etc.)
2. Verify package is actively maintained
3. Consider bundle size impact on Docker image
4. Run `npm audit` after installation
5. Document why the dependency is needed

### Core Dependency Notes
- **puppeteer**: Pin to specific version, test upgrades thoroughly
- **sharp**: Native module, may require rebuild in Docker
- **ical.js**: Handles timezone complexities
- **express**: Keep middleware minimal
- **node-cron**: Use for scheduled pre-generation

## Logging

### Logging Levels
```javascript
// Info: Normal operational messages
console.log('Server started on port 3000');

// Warn: Recoverable issues
console.warn('Config file missing, using defaults');

// Error: Failures that need attention
console.error('Failed to generate image:', error);
```

### What to Log
- Server startup/shutdown
- Configuration changes
- Cache hits/misses (in debug mode)
- API request errors
- Image generation failures
- Schedule execution

### What Not to Log
- Sensitive data (passwords, tokens)
- Full image buffers
- Excessive per-request logging
- User calendar event details (privacy)

## Common Patterns

### Async Initialization
```javascript
class Service {
  constructor() {
    this.ready = false;
  }
  
  async init() {
    // Async initialization
    await this.loadResources();
    this.ready = true;
  }
  
  async operation() {
    if (!this.ready) {
      throw new Error('Service not initialized');
    }
    // Do work
  }
}
```

### Resource Cleanup
```javascript
// Clean up resources on exit
process.on('SIGTERM', async () => {
  await cache.flush();
  await browser.close();
  await server.close();
  process.exit(0);
});
```

### Error Recovery
```javascript
// Retry logic for transient failures
async function fetchWithRetry(url, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetch(url);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(1000 * Math.pow(2, i)); // Exponential backoff
    }
  }
}
```
