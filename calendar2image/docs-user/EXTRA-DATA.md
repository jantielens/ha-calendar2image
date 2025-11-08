# Using Extra Data in Templates

Calendar2Image allows you to fetch additional data from any JSON API and use it in your templates. This is perfect for adding weather, holidays, tasks, or any other contextual information to your calendar images.

**Advanced:** Support for multiple data sources with per-source configuration!

---

## Quick Start

### Single Data Source (Simple Format)

Add `extraDataUrl` to your configuration:

```json
{
  "icsUrl": "https://calendar.google.com/calendar/ical/...",
  "template": "week-view",
  "extraDataUrl": "http://homeassistant.local:8123/api/states/sensor.weather_forecast",
  "extraDataHeaders": {
    "Authorization": "Bearer YOUR_LONG_LIVED_ACCESS_TOKEN"
  }
}
```

Access data in template as an object:

```javascript
module.exports = function(data) {
  const { events, config, extraData } = data;
  
  return `
    <html>
      <body>
        <h1>Weather: ${extraData.state}</h1>
        <p>Temperature: ${extraData.attributes.temperature}°C</p>
      </body>
    </html>
  `;
};
```

### Multiple Data Sources (Advanced Array Format)

Fetch from multiple APIs with independent configuration:

```json
{
  "icsUrl": "https://calendar.google.com/calendar/ical/...",
  "template": "week-view",
  "extraDataHeaders": {
    "Authorization": "Bearer GLOBAL_TOKEN"
  },
  "extraDataCacheTtl": 300,
  "extraDataUrl": [
    { "url": "http://localhost:3001/weather" },
    { "url": "http://localhost:3001/tasks", "cacheTtl": 60 },
    { "url": "http://localhost:3001/public", "headers": null }
  ]
}
```

Access data in template as an array:

```javascript
module.exports = function(data) {
  const { events, config, extraData } = data;
  const [weather, tasks, publicData] = extraData;
  
  return `
    <html>
      <body>
        <h1>Weather: ${weather.temperature}°C</h1>
        <p>Tasks: ${tasks.items.length}</p>
      </body>
    </html>
  `;
};
```

---

## Configuration Options

### extraDataUrl

**Type:** `string` or `array` (optional)  
**Description:** URL(s) to fetch JSON data from

**String Format (Simple - Single Source):**
```json
"extraDataUrl": "http://homeassistant.local:8123/api/states/sensor.weather"
```
Template receives `extraData` as an **object**.

**Array Format (Advanced - Multiple Sources):**
```json
"extraDataUrl": [
  {
    "url": "http://localhost:3001/weather",
    "headers": { "X-Weather-Key": "abc123" },
    "cacheTtl": 600
  },
  {
    "url": "http://localhost:3001/tasks",
    "cacheTtl": 60
  },
  {
    "url": "http://localhost:3001/public",
    "headers": null
  }
]
```
Template receives `extraData` as an **array**.

**Array Entry Properties:**
- **url** (string, required): URL to fetch JSON data from (must start with `http://` or `https://`)
- **headers** (object/string/null, optional): HTTP headers for this specific URL
  - If omitted: uses global `extraDataHeaders`
  - If `null`, `""`, or `{}`: disables global headers for this URL
  - If object: uses these headers instead of global
- **cacheTtl** (number, optional): Cache TTL in seconds for this specific URL
  - If omitted: uses global `extraDataCacheTtl`
  - If provided: overrides global for this URL

**More Examples:**
```json
// External API
"extraDataUrl": "https://api.weather.com/v1/forecast?location=amsterdam"

// Local service
"extraDataUrl": "http://192.168.1.100:3001/api/data"

// Multiple sources with global defaults
"extraDataUrl": [
  { "url": "http://localhost:3001/weather" },
  { "url": "http://localhost:3001/tasks" }
]
```

### extraDataHeaders

**Type:** `object` (optional)  
**Description:** HTTP headers to include in the request

**Examples:**
```json
// Home Assistant authentication
"extraDataHeaders": {
  "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGc..."
}

// API key
"extraDataHeaders": {
  "X-API-Key": "your-api-key",
  "Accept": "application/json"
}

// Multiple headers
"extraDataHeaders": {
  "Authorization": "Bearer token123",
  "X-Custom-Header": "value",
  "User-Agent": "Calendar2Image/1.0"
}
```

### extraDataCacheTtl

**Type:** `number` (optional, default: 300)  
**Description:** Cache time-to-live in seconds

**Examples:**
```json
// Cache for 5 minutes (default)
"extraDataCacheTtl": 300

// Cache for 1 minute (frequently changing data)
"extraDataCacheTtl": 60

// Cache for 1 hour (slowly changing data)
"extraDataCacheTtl": 3600

// No caching (always fresh)
"extraDataCacheTtl": 0
```

---

## Multiple Data Sources (Advanced)

### Why Use Multiple Sources?

- **Different APIs**: Combine weather, tasks, calendar metadata, etc.
- **Different refresh rates**: Fast-changing data (60s) vs. slow-changing (1h)
- **Different authentication**: Some APIs need tokens, others are public
- **Independent caching**: Each source can have its own cache TTL

### Configuration Examples

**Example 1: Weather + Tasks with Different Cache Times**
```json
{
  "extraDataHeaders": {
    "Authorization": "Bearer GLOBAL_TOKEN"
  },
  "extraDataCacheTtl": 300,
  "extraDataUrl": [
    { "url": "http://localhost:3001/weather" },
    { "url": "http://localhost:3001/tasks", "cacheTtl": 60 }
  ]
}
```
- Weather uses global cache (300s)
- Tasks refresh faster (60s)
- Both use global auth token

**Example 2: Mixed Public and Private APIs**
```json
{
  "extraDataHeaders": {
    "Authorization": "Bearer SECRET_TOKEN"
  },
  "extraDataUrl": [
    {
      "url": "http://homeassistant.local:8123/api/states/sensor.weather"
    },
    {
      "url": "https://date.nager.at/api/v3/PublicHolidays/2025/US",
      "headers": null
    }
  ]
}
```
- Home Assistant sensor uses auth token
- Public holidays API has headers disabled (`headers: null`)

**Example 3: Different Auth per Source**
```json
{
  "extraDataUrl": [
    {
      "url": "http://api1.example.com/data",
      "headers": { "X-API-Key": "key1" }
    },
    {
      "url": "http://api2.example.com/data",
      "headers": { "X-API-Key": "key2" }
    },
    {
      "url": "http://public-api.com/data",
      "headers": {}
    }
  ]
}
```
Each API has its own authentication or none at all.

### Template Usage with Multiple Sources

**Array destructuring (recommended):**
```javascript
module.exports = function(data) {
  const { events, config, extraData } = data;
  const [weather, tasks, holidays] = extraData;
  
  return `
    <html>
      <body>
        <div>Temp: ${weather.temperature}°C</div>
        <div>Tasks: ${tasks.items.length}</div>
        <div>Next holiday: ${holidays[0]?.name}</div>
      </body>
    </html>
  `;
};
```

**Array indexing:**
```javascript
const weather = extraData[0];
const tasks = extraData[1];
```

**Backwards compatible template (handles both formats):**
```javascript
module.exports = function(data) {
  const { extraData } = data;
  
  // Detect format
  if (Array.isArray(extraData)) {
    // Advanced array format
    const [weather] = extraData;
    return renderWithWeather(weather);
  } else {
    // Legacy object format
    return renderWithWeather(extraData);
  }
};
```

### Migration from Single to Multiple Sources

**Before (single source):**
```json
{
  "extraDataUrl": "http://localhost:3001/weather",
  "extraDataHeaders": { "Authorization": "Bearer token" },
  "extraDataCacheTtl": 300
}
```

Template:
```javascript
const { extraData } = data;
const temp = extraData.temperature;
```

**After (array with single source):**
```json
{
  "extraDataHeaders": { "Authorization": "Bearer token" },
  "extraDataCacheTtl": 300,
  "extraDataUrl": [
    { "url": "http://localhost:3001/weather" }
  ]
}
```

Template:
```javascript
const { extraData } = data;
const [weather] = extraData;  // Note: extraData is now an array
const temp = weather.temperature;
```

**After (adding more sources):**
```json
{
  "extraDataHeaders": { "Authorization": "Bearer token" },
  "extraDataCacheTtl": 300,
  "extraDataUrl": [
    { "url": "http://localhost:3001/weather" },
    { "url": "http://localhost:3001/tasks", "cacheTtl": 60 }
  ]
}
```

Template:
```javascript
const { extraData } = data;
const [weather, tasks] = extraData;
const temp = weather.temperature;
const taskCount = tasks.items.length;
```

### Header Opt-Out Options

To disable global headers for a specific URL, use any of these:

```json
"extraDataUrl": [
  { "url": "http://public-api.com/data", "headers": null },
  { "url": "http://public-api.com/data", "headers": "" },
  { "url": "http://public-api.com/data", "headers": {} }
]
```

All three options prevent global `extraDataHeaders` from being applied to that URL.

---

## Common Use Cases

### Weather Data

**Configuration:**
```json
{
  "icsUrl": "https://...",
  "template": "week-with-weather",
  "extraDataUrl": "http://homeassistant.local:8123/api/mock-weather",
  "extraDataCacheTtl": 300
}
```

**Template:**
```javascript
module.exports = function(data) {
  const { events, extraData } = data;
  const weather = extraData.weather || {};
  
  return `
    <html>
      <body>
        ${Object.entries(weather).map(([date, info]) => `
          <div>
            <strong>${date}</strong>
            ${info.emoji} ${info.temp}°C
          </div>
        `).join('')}
      </body>
    </html>
  `;
};
```

**Expected JSON format:**
```json
{
  "weather": {
    "2025-10-31": { "emoji": "☀", "temp": 22 },
    "2025-11-01": { "emoji": "⛅", "temp": 20 }
  }
}
```

---

### Home Assistant Entities

**Get Long-Lived Access Token:**
1. Profile → Security → Long-Lived Access Tokens
2. Create Token → Copy token

**Configuration:**
```json
{
  "extraDataUrl": "http://homeassistant.local:8123/api/states/sensor.temperature",
  "extraDataHeaders": {
    "Authorization": "Bearer YOUR_TOKEN_HERE"
  }
}
```

**Template:**
```javascript
module.exports = function(data) {
  const { extraData } = data;
  
  const temperature = extraData.state;
  const unit = extraData.attributes?.unit_of_measurement || '';
  
  return `
    <html>
      <body>
        <h1>Current: ${temperature}${unit}</h1>
      </body>
    </html>
  `;
};
```

---

### Multiple Data Sources

**Advanced feature:** Native support for fetching from multiple APIs simultaneously!

See the [Multiple Data Sources (Advanced)](#multiple-data-sources-advanced) section above for complete documentation.

**Quick example:**
```json
{
  "extraDataUrl": [
    { "url": "http://localhost:3001/weather" },
    { "url": "http://localhost:3001/tasks", "cacheTtl": 60 }
  ]
}
```

Template:
```javascript
const [weather, tasks] = extraData;
```

Previously, you needed to create an aggregation endpoint. This is no longer necessary - just use the array format!

---

### Public Holidays

**Example with public API:**

```json
{
  "extraDataUrl": "https://date.nager.at/api/v3/PublicHolidays/2025/US"
}
```

**Template:**
```javascript
module.exports = function(data) {
  const { extraData } = data;
  const holidays = Array.isArray(extraData) ? extraData : [];
  
  return `
    <html>
      <body>
        <h2>Upcoming Holidays</h2>
        ${holidays.slice(0, 5).map(h => `
          <div>${h.date}: ${h.name}</div>
        `).join('')}
      </body>
    </html>
  `;
};
```

---

## Error Handling

Extra data fetching is **fail-safe** - errors never break your template:

**Automatic fallbacks:**
- Network errors → Returns `{}`
- Invalid JSON → Returns `{}`
- HTTP errors → Returns `{}`
- Timeouts → Returns `{}`

**Always check for data existence:**

```javascript
module.exports = function(data) {
  const { extraData } = data;
  
  // Safe checks
  const weather = extraData.weather || {};
  const temp = extraData.temperature ?? 'N/A';
  const forecast = extraData.forecast || [];
  
  // Check before using
  if (!extraData || Object.keys(extraData).length === 0) {
    return `<html><body>No extra data available</body></html>`;
  }
  
  // Use the data...
};
```

---

## Caching Behavior

Extra data uses a **file-based cache** with **stale-while-revalidate** pattern to ensure fast, non-blocking performance:

### How it works

1. **First request**: Fetches data, caches to disk for `extraDataCacheTtl` seconds
2. **Subsequent requests (cache fresh)**: Returns cached data immediately (< 1ms)
3. **Cache expired**: Returns stale cached data immediately + refreshes in background
4. **No blocking**: ExtraData fetches never delay image generation or downloads

### Key Benefits

- ✅ **Never blocks**: Image generation and downloads proceed without waiting
- ✅ **Multi-process safe**: Cache shared across all worker processes
- ✅ **Survives restarts**: Cache persists on disk
- ✅ **Background refresh**: Stale data served instantly while fresh data fetches
- ✅ **Timeline monitoring**: All cache events logged for visibility

### Cache Lifecycle Example

```
00:00 - Request 1: Fetch data, cache for 300s (fresh)
00:05 - Request 2: Cache HIT (295s remaining) - instant
00:10 - Request 3: Cache HIT (290s remaining) - instant
05:00 - Request 4: Cache STALE - serve stale instantly + refresh in background
05:01 - Background refresh completes, cache updated
05:05 - Request 5: Cache HIT (fresh) - instant
```

### Cache Storage

Cache files are stored in the cache directory (`/data/cache/`) with MD5-hashed filenames:
- Format: `extradata-{md5hash}.json`
- Each unique URL+headers combination gets its own cache file
- Shared across main process and all worker processes

### Timeline Events

Monitor cache behavior in the timeline page:
- `EXTRA_DATA_FETCH` - Fresh data fetched (first request or error recovery)
- `EXTRA_DATA_REFRESH` - Background refresh completed
- `EXTRA_DATA_ERROR` - Fetch failed (returns empty object, doesn't break rendering)

**Note:** Cache hits and stale serves are logged to console only (not timeline) to preserve CRC32 block continuity on the timeline page.

### Force Fresh Data

**Option 1**: Set `extraDataCacheTtl: 0` (no caching)
```json
{
  "extraDataCacheTtl": 0
}
```

**Option 2**: Wait for background refresh (after TTL expires)

**Option 3**: Restart the add-on (cache persists, but you can manually delete cache files if needed)

---

## Testing Extra Data

### Test Endpoint Directly

```bash
# Test the URL works
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://homeassistant.local:8123/api/states/sensor.weather

# Should return valid JSON
```

### Mock Data for Development

The add-on includes a mock weather endpoint for testing:

```json
{
  "extraDataUrl": "http://localhost:3000/api/mock-weather"
}
```

**Returns:**
```json
{
  "weather": {
    "2025-10-31": { "emoji": "☀", "temp": 18 },
    "2025-11-01": { "emoji": "⛅", "temp": 20 },
    ...
  }
}
```

### Debug in Template

Log the data structure:

```javascript
module.exports = function(data) {
  const { extraData } = data;
  
  return `
    <html>
      <body>
        <h1>Debug Extra Data</h1>
        <pre>${JSON.stringify(extraData, null, 2)}</pre>
      </body>
    </html>
  `;
};
```

Generate the image and check what data you're receiving.

---

## Performance Tips

1. **Set appropriate cache TTL:**
   - Weather: 300-600s (5-10 minutes) - good balance
   - Slowly changing data: 1800-3600s (30-60 minutes)
   - Frequently changing data: 60-120s (1-2 minutes)
   - Note: With stale-while-revalidate, even low TTLs don't block performance

2. **Keep payloads small:**
   - Filter data server-side if possible
   - Only fetch what you need in templates
   - Smaller payloads = faster parsing and caching

3. **Use local endpoints when possible:**
   - Local Home Assistant sensors are fastest (< 10ms)
   - External APIs may be slower (50-500ms)
   - All benefit from non-blocking cache pattern

4. **Monitor cache behavior:**
   - Check timeline page for significant cache events
   - Look for `EXTRA_DATA_FETCH` and `EXTRA_DATA_REFRESH` events in timeline
   - Console logs show all cache activity: `[ExtraData] Cache HIT (age: 45s, TTL: 300s)`
   - Console logs also show stale serves and background refreshes

5. **Multi-process safety:**
   - File-based cache works correctly across all worker processes
   - No risk of cache inconsistency or race conditions
   - Background refreshes prevent duplicate fetches

---

## Security Considerations

1. **Never commit tokens:** Don't put access tokens in git
2. **Use Home Assistant secrets:**
   ```yaml
   # secrets.yaml
   calendar_api_token: "Bearer eyJ0eXAi..."
   ```

3. **Restrict network access:** Use local URLs when possible
4. **HTTPS for external APIs:** Always use HTTPS for external services

---

## Troubleshooting

### No Data in Template

**Check logs:**
```
[ExtraData] Failed to fetch extra data from http://...: Connection refused
```

**Solutions:**
- Verify URL is accessible from container
- Check authorization headers
- Test URL directly with curl
- Verify JSON format is valid

### Data is Stale

**Check cache TTL:**
```json
{
  "extraDataCacheTtl": 60  // Reduce for fresher data
}
```

**Force cache clear:**
- Restart add-on
- Use `/api/X/fresh.png` endpoint

### Slow Image Generation

**If extra data fetch is slow:**
```
[ExtraData] Fetching data from http://... (5000ms)
```

**Solutions:**
- Increase `extraDataCacheTtl` to fetch less often
- Use local data source
- Optimize the API endpoint
- Set timeout lower (5s max currently)

---

## Examples

See the built-in templates for examples:
- `calendar2image/src/templates/built-in/week-view.js` - Uses extra data for weather

Or check the sample template:
- `data/calendar2image/templates/custom-week-view.js`

For complete, documented examples, see the **[template-samples](template-samples/)** directory:
- Full templates with extra data integration
- Configuration examples
- Screenshots and usage guides

---

## Support

For questions about extra data:
- GitHub Issues: https://github.com/jantielens/ha-calendar2image/issues
- Include your configuration (remove sensitive tokens!)
- Include relevant logs from the add-on
