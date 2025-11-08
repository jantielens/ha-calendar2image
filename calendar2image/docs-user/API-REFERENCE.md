# API Reference

Complete reference for all Calendar2Image API endpoints.

---

## Base URL

```
http://homeassistant.local:3000
```

Replace `homeassistant.local` with your Home Assistant IP address if needed.

---

## Endpoints

### GET /api/:index.:ext

**Returns a calendar image** (cached or fresh depending on configuration)

**Parameters:**
- `:index` - Configuration index (0, 1, 2, etc.)
- `:ext` - Image format (`png`, `jpg`, or `bmp`)

**Important:** The extension must match the `imageType` in the corresponding configuration file, or you'll get a 404 error.

**Examples:**
```bash
# Get first calendar as PNG
curl http://homeassistant.local:3000/api/0.png -o calendar.png

# Get second calendar as JPG
curl http://homeassistant.local:3000/api/1.jpg -o calendar.jpg

# Get third calendar as BMP
curl http://homeassistant.local:3000/api/2.bmp -o calendar.bmp
```

**Response Headers:**
- `Content-Type`: `image/png`, `image/jpeg`, or `image/bmp`
- `Content-Length`: Size in bytes
- `X-Cache`: Cache status
  - `HIT` - Served from cache (when `preGenerateInterval` is configured)
  - `DISABLED` - Fresh generation (when `preGenerateInterval` is NOT configured)
  - `MISS` - Cache miss, generated fresh
- `X-CRC32`: CRC32 checksum (lowercase hex)
- `X-Generated-At`: ISO timestamp of when the image was generated

**Caching Behavior:**
- **With `preGenerateInterval`:** Images are pre-generated on schedule, served from cache (~100ms response)
- **Without `preGenerateInterval`:** Images are generated fresh on each request (~8 seconds on Raspberry Pi)

**Status Codes:**
- `200 OK` - Success
- `400 Bad Request` - Invalid index parameter
- `404 Not Found` - Configuration not found or extension mismatch
- `500 Internal Server Error` - Template or generation error
- `502 Bad Gateway` - Calendar fetch failed

---

### GET /api/:index/fresh.:ext

**Forces fresh image generation**, bypassing cache

**Parameters:**
- `:index` - Configuration index (0, 1, 2, etc.)
- `:ext` - Image format (`png`, `jpg`, or `bmp`)

**Important:** The extension must match the `imageType` in the configuration file.

**Examples:**
```bash
# Force fresh generation
curl http://homeassistant.local:3000/api/0/fresh.png -o calendar.png
```

**Use Cases:**
- Need absolutely up-to-date calendar data
- Testing configuration changes immediately
- Manual refresh after calendar updates

**Response Headers:**
- Same as regular endpoint, plus:
- `X-Cache`: Always `BYPASS`

**Status Codes:**
- Same as regular endpoint

---

### GET /api/:index.:ext.crc32

**Returns the CRC32 checksum** of the image without downloading it

**Parameters:**
- `:index` - Configuration index (0, 1, 2, etc.)
- `:ext` - Image format (`png`, `jpg`, or `bmp`)

**Important:** The extension must match the `imageType` in the configuration file.

**Examples:**
```bash
# Get CRC32 checksum
curl http://homeassistant.local:3000/api/0.png.crc32
# Output: 8f8ea89f
```

**Response:**
- **Content-Type:** `text/plain`
- **Body:** CRC32 checksum as lowercase hexadecimal (8 characters)

**Use Cases:**
- Check if image changed before downloading
- Bandwidth optimization for e-ink displays
- Change detection in automations

**Status Codes:**
- `200 OK` - Success
- `400 Bad Request` - Invalid index parameter
- `404 Not Found` - Configuration not found or extension mismatch
- `500 Internal Server Error` - Generation error

---

### GET /api/:index/crc32-history

**Returns the CRC32 history** for a configuration (last 500 generations)

**Parameters:**
- `:index` - Configuration index (0, 1, 2, etc.)

**Examples:**
```bash
# Get CRC32 history for config 0
curl http://homeassistant.local:3000/api/0/crc32-history
```

**Response:**
```json
{
  "index": 0,
  "history": [
    {
      "crc32": "8f8ea89f",
      "timestamp": "2025-10-31T20:26:11.263Z",
      "trigger": "fresh",
      "generationDuration": 2479,
      "imageSize": 16180
    },
    {
      "crc32": "8ceb9829",
      "timestamp": "2025-10-31T20:26:03.880Z",
      "trigger": "cache_miss",
      "generationDuration": 4145,
      "imageSize": 16180
    }
  ],
  "stats": {
    "uniqueCRC32Values": 2,
    "changes": 1,
    "durationStats": {
      "min": 2479,
      "max": 4145,
      "avg": 3312
    },
    "blocks": [
      {
        "crc32": "8f8ea89f",
        "start": "2025-10-31T20:26:11.263Z",
        "end": "2025-10-31T20:26:11.263Z",
        "count": 1
      },
      {
        "crc32": "8ceb9829",
        "start": "2025-10-31T20:26:03.880Z",
        "end": "2025-10-31T20:26:03.880Z",
        "count": 1
      }
    ]
  },
  "maxEntries": 500
}
```

**Use Cases:**
- Debug when images changed (for display refresh troubleshooting)
- Track generation performance over time
- Identify patterns in CRC32 changes

**Status Codes:**
- `200 OK` - Success
- `400 Bad Request` - Invalid index parameter
- `404 Not Found` - Configuration not found
- `500 Internal Server Error` - Error fetching history

---

### GET /crc32-history/:index

**Displays a visual CRC32 history page** with timeline and statistics

**Parameters:**
- `:index` - Configuration index (0, 1, 2, etc.)

**Examples:**
- Navigate to `http://homeassistant.local:3000/crc32-history/0` in your browser

**Features:**
- Timeline of all generations with trigger types
- Duration statistics (min, max, avg)
- CRC32 blocks showing consecutive runs of the same value
- Visual indicators for when CRC32 changed

**Use Cases:**
- Visual debugging of display refresh issues
- Understanding generation patterns
- Performance monitoring

---

### GET /

**Configuration dashboard** - Interactive HTML page listing all configurations

**Example:**
```bash
# Open in browser
http://homeassistant.local:3000/
```

**Features:**
- View all configurations with status indicators
- Quick access to images, CRC32 history, and configuration pages
- Real-time validation status
- Direct links to all API endpoints

---

### GET /config/:index

**Interactive configuration viewer** - Detailed HTML visualization of a specific configuration

**Parameters:**
- `:index` - Configuration index (0, 1, 2, etc.)

**Example:**
```bash
# Open in browser
http://homeassistant.local:3000/config/0
```

**Features:**
- Visual representation of all settings organized in cards
- Real-time validation with error indicators and summary banner
- JSON property path tooltips showing exact configuration structure
- Image preview with CRC32 checksum
- Copy-to-clipboard for file paths, templates, and JSON
- Collapsible sections for configuration and template content
- Section descriptions explaining each setting's purpose
- Quick action buttons for common operations

**Status Codes:**
- `200 OK` - Success
- `400 Bad Request` - Invalid index parameter
- `404 Not Found` - Configuration not found
- `500 Internal Server Error` - Error loading configuration

---

### GET /api/config/:index

**Get configuration as JSON** - Returns raw configuration file

**Parameters:**
- `:index` - Configuration index (0, 1, 2, etc.)

**Example:**
```bash
curl http://homeassistant.local:3000/api/config/0
```

**Response:**
```json
{
  "icsUrl": "https://calendar.example.com/calendar.ics",
  "template": "week-view",
  "width": 800,
  "height": 600,
  "imageType": "png",
  "preGenerateInterval": "*/5 * * * *",
  ...
}
```

**Status Codes:**
- `200 OK` - Success
- `400 Bad Request` - Invalid index parameter
- `404 Not Found` - Configuration not found

---

### GET /health

**Health check endpoint**

**Example:**
```bash
curl http://homeassistant.local:3000/health
```

**Response:**
```json
{
  "status": "healthy"
}
```

**Status Codes:**
- `200 OK` - Service is running

---

## Error Responses

All error responses return JSON:

```json
{
  "error": "Error Type",
  "message": "Human-readable message",
  "details": "Detailed error information"
}
```

**Example - Configuration Not Found:**
```json
{
  "error": "Not Found",
  "message": "Configuration 5 not found",
  "details": "Configuration file not found: /config/calendar2image/5.json"
}
```

**Example - Extension Mismatch:**
```json
{
  "error": "Not Found",
  "message": "Config 0 serves png images, not jpg",
  "details": "Use /api/0.png instead"
}
```

---

## Common Usage Patterns

### Basic Image Display

**HTML:**
```html
<img src="http://homeassistant.local:3000/api/0.png" alt="Calendar">
```

**Markdown (Home Assistant):**
```markdown
![Calendar](http://homeassistant.local:3000/api/0.png)
```

---

### E-ink Display Optimization

**Check for changes before downloading:**

```python
import requests

CALENDAR_URL = "http://homeassistant.local:3000/api/0.png"
CRC_URL = "http://homeassistant.local:3000/api/0.png.crc32"

# Get current checksum
current_crc = requests.get(CRC_URL).text

# Compare with last known
if current_crc != last_known_crc:
    # Image changed - download it
    image_data = requests.get(CALENDAR_URL).content
    update_display(image_data)
    last_known_crc = current_crc
else:
    print("No update needed")
```

**Saves bandwidth and extends e-ink display life!**

---

### Home Assistant Automation

**Update dashboard on calendar change:**

```yaml
automation:
  - alias: "Update Calendar Image"
    trigger:
      - platform: time_pattern
        minutes: "/5"
    action:
      - service: shell_command.update_calendar_crc
      - condition: template
        value_template: "{{ states('sensor.calendar_crc') != state_attr('sensor.calendar_crc', 'previous') }}"
      - service: camera.snapshot
        data:
          entity_id: camera.calendar_view
          filename: "/config/www/calendar.png"

shell_command:
  update_calendar_crc: >
    curl -s http://localhost:3000/api/0.png.crc32 > /tmp/calendar_crc.txt
```

---

### Testing and Debugging

**Test all endpoints:**

```bash
# Health check
curl http://localhost:3000/health

# Get image
curl http://localhost:3000/api/0.png -o test.png

# Get CRC32
curl http://localhost:3000/api/0.png.crc32

# Force fresh generation
curl http://localhost:3000/api/0/fresh.png -o fresh.png

# Verify they match
curl http://localhost:3000/api/0.png.crc32
# Compare with CRC32 of test.png file
```

**Check response headers:**

```bash
curl -I http://localhost:3000/api/0.png
```

Output:
```
HTTP/1.1 200 OK
Content-Type: image/png
Content-Length: 45678
X-Cache: HIT
X-CRC32: 8f8ea89f
X-Generated-At: 2025-10-31T12:00:00.000Z
```

---

### Programmatic Access

**Node.js:**
```javascript
const axios = require('axios');
const fs = require('fs');

async function downloadCalendar(index, filename) {
  const response = await axios.get(
    `http://homeassistant.local:3000/api/${index}.png`,
    { responseType: 'arraybuffer' }
  );
  
  fs.writeFileSync(filename, response.data);
  
  console.log('Cache:', response.headers['x-cache']);
  console.log('CRC32:', response.headers['x-crc32']);
  console.log('Generated:', response.headers['x-generated-at']);
}

downloadCalendar(0, 'calendar.png');
```

**Python:**
```python
import requests

def download_calendar(index, filename):
    response = requests.get(
        f'http://homeassistant.local:3000/api/{index}.png'
    )
    
    with open(filename, 'wb') as f:
        f.write(response.content)
    
    print(f"Cache: {response.headers['X-Cache']}")
    print(f"CRC32: {response.headers['X-CRC32']}")
    print(f"Generated: {response.headers['X-Generated-At']}")

download_calendar(0, 'calendar.png')
```

---

## Performance Tips

1. **Use pre-generation** - Set `preGenerateInterval` in your config for fast cached responses
2. **Use CRC32 endpoint** - Check for changes before downloading large images
3. **Monitor response headers** - Use `X-Cache` to verify caching is working
4. **Use appropriate image format:**
   - `png` - Best quality, larger files
   - `jpg` - Smaller files, good for photos
   - `bmp` - Uncompressed, best for e-ink displays

---

## Rate Limiting & Queue Protection

Currently, there is **no rate limiting**. However:

- Fresh generation takes ~8 seconds on Raspberry Pi
- Multiple simultaneous requests may slow down the server
- Use caching (`preGenerateInterval`) for high-traffic scenarios

### Automatic Queue Protection

The system includes **automatic queue protection** to prevent infinite queue growth:

- **Per-config duplicate prevention**: If a configuration is already queued for generation, new requests for that same config are automatically skipped
- **Timeline logging**: Skipped requests are logged to both console and timeline view for monitoring
- **Warning indicators**: Console shows `⚠️ Skipping config X (trigger: scheduled) - already queued for generation`

This prevents queue buildup when generation time exceeds scheduling interval (e.g., 25-second generation with 1-minute scheduling).

---

## CORS

CORS is **not enabled** by default. The API is designed for:
- Home Assistant internal use
- Local network access
- Server-to-server communication

For external access, use a reverse proxy with CORS headers.

---

## Support

For API issues or questions:
- GitHub Issues: https://github.com/jantielens/ha-calendar2image/issues
