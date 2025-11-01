# Using Extra Data in Templates

Calendar2Image allows you to fetch additional data from any JSON API and use it in your templates. This is perfect for adding weather, holidays, tasks, or any other contextual information to your calendar images.

---

## Quick Start

### 1. Configure Extra Data URL

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

### 2. Access Data in Template

The fetched JSON data is available as `extraData` in your template:

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

---

## Configuration Options

### extraDataUrl

**Type:** `string` (optional)  
**Description:** URL to fetch JSON data from

**Examples:**
```json
// Home Assistant sensor
"extraDataUrl": "http://homeassistant.local:8123/api/states/sensor.weather"

// External API
"extraDataUrl": "https://api.weather.com/v1/forecast?location=amsterdam"

// Local service
"extraDataUrl": "http://192.168.1.100:3001/api/data"
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

Fetch multiple endpoints by creating a simple aggregation service:

**Option 1: Home Assistant REST sensor**
```yaml
# configuration.yaml
rest:
  - resource: http://api1.example.com/data
    sensor:
      - name: "Data Source 1"
        value_template: "{{ value_json }}"

# Then use:
"extraDataUrl": "http://homeassistant.local:8123/api/states/sensor.data_source_1"
```

**Option 2: Simple aggregation endpoint**

Create a simple Node.js endpoint that fetches multiple sources:

```javascript
// aggregator.js
const express = require('express');
const app = express();

app.get('/aggregate', async (req, res) => {
  const [weather, tasks] = await Promise.all([
    fetch('http://weather-api.com/data').then(r => r.json()),
    fetch('http://tasks-api.com/data').then(r => r.json())
  ]);
  
  res.json({ weather, tasks });
});

app.listen(3001);
```

Then use:
```json
{
  "extraDataUrl": "http://localhost:3001/aggregate"
}
```

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

Extra data is cached independently from image generation:

1. **First request:** Fetches data, caches for `extraDataCacheTtl` seconds
2. **Subsequent requests:** Uses cached data if still valid
3. **Cache expiry:** Automatically fetches fresh data

**Cache is shared across all image generations** for the same URL and headers.

**Example timeline:**
```
00:00 - Request 1: Fetch data, cache for 300s
00:05 - Request 2: Use cached data (295s remaining)
00:10 - Request 3: Use cached data (290s remaining)
05:00 - Request 4: Cache expired, fetch fresh data
```

**Force fresh data:**
- Set `extraDataCacheTtl: 0`
- Or wait for cache to expire
- Or restart the add-on (clears cache)

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
   - Weather: 300-600s (5-10 minutes)
   - Slowly changing data: 3600s (1 hour)
   - Real-time data: 60s (1 minute)

2. **Keep payloads small:**
   - Filter data server-side if possible
   - Only fetch what you need

3. **Use fast endpoints:**
   - Local Home Assistant sensors are fastest
   - External APIs may be slower

4. **Monitor logs:**
   ```
   [ExtraData] Fetching data from http://... (123ms)
   [ExtraData] Using cached data (age: 45s)
   ```

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
