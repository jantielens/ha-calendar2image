# Calendar2Image for Home Assistant

A Home Assistant add-on that generates calendar images from ICS feeds with customizable templates. Perfect for e-ink displays, dashboards, or any scenario where you need calendar data as an image.

> **⚠️ Network Access:** Generated images are served via the built-in web server (default port 3000) and will be accessible to any device or user on your internal network.



## ✨ Features

- **Generate images from calendar data** - Fetch events from any ICS URL and render as PNG/JPG/BMP
- **REST API** - Simple HTTP endpoints for on-demand or cached image generation
- **Customizable templates** - Use built-in templates or create your own with JavaScript
- **Pre-generation & caching** - Ultra-fast responses (<100ms) with scheduled background generation
- **CRC32 checksums** - Bandwidth-efficient change detection for e-ink displays
- **Extra data integration** - Fetch weather, tasks, or other JSON data for enhanced templates
- **Grayscale & bit depth control** - Optimize images for e-ink displays
- **Multiple calendars** - Configure as many calendars as needed
- **Image rotation** - Support for landscape/portrait orientations

## 🚀 Quick Start

### Installation

1. **Add repository** to Home Assistant Add-on Store:
   ```
   https://github.com/jantielens/ha-calendar2image
   ```

2. **Install** the Calendar2Image add-on

3. **Start** the add-on and check the logs for:
   ```
   Startup complete - ready to serve requests
   ```

4. **Open** the configuration dashboard in your browser:
   ```
   http://homeassistant.local:3000/
   ```
   This shows all your configurations, API endpoints, and interactive documentation.

5. **Test** the default configuration directly:
   ```
   http://homeassistant.local:3000/api/0.png
   ```

See the **[Installation Guide](calendar2image/docs-user/INSTALLATION.md)** for detailed instructions.

### First Steps

The add-on automatically creates:
- `0.json` - Working configuration with sample calendar
- `templates/` - All built-in templates as custom templates (prefixed with `custom-`) for you to customize
- `README.md` - Configuration documentation

**Location:** `/addon_configs/17f877f5_calendar2image/`

**Edit the configuration:**
1. Open `0.json` in File Editor
2. Replace `icsUrl` with your calendar's public ICS URL
3. Save and view the updated image at `http://homeassistant.local:3000/api/0.png`

## 🔌 API Endpoints

### Image Endpoints

```bash
# Get calendar image (cached or fresh)
GET /api/:index.:ext
# Example: http://homeassistant.local:3000/api/0.png

# Force fresh generation (bypass cache)
GET /api/:index/fresh.:ext
# Example: http://homeassistant.local:3000/api/0/fresh.png

# Get CRC32 checksum (without downloading image)
GET /api/:index.:ext.crc32
# Example: http://homeassistant.local:3000/api/0.png.crc32
```

**Note:** Extension (`.png`, `.jpg`, `.bmp`) must match the `imageType` in your config file.

### Response Headers

- `X-Cache` - Cache status: `HIT`, `MISS`, `DISABLED`, or `BYPASS`
- `X-CRC32` - Image checksum (lowercase hex)
- `X-Generated-At` - ISO timestamp of generation

See the **[API Reference](calendar2image/docs-user/API-REFERENCE.md)** for complete documentation.

## ⚙️ Configuration

### Basic Configuration

Create JSON files in `/addon_configs/17f877f5_calendar2image/`:

```json
{
  "icsUrl": "https://calendar.google.com/calendar/ical/.../public/basic.ics",
  "template": "week-view",
  "width": 600,
  "height": 900,
  "imageType": "png",
  "grayscale": false,
  "preGenerateInterval": "*/5 * * * *"
}
```

### Key Parameters

- `icsUrl` - Your calendar's ICS feed URL (required)
- `template` - Template name: `week-view`, `today-view`, or custom (required)
- `width` / `height` - Image dimensions in pixels
- `imageType` - Output format: `png`, `jpg`, or `bmp`
- `grayscale` - Convert to grayscale (for e-ink displays)
- `preGenerateInterval` - Cron expression for scheduled generation (optional)
  - With this: Images cached, ultra-fast responses (~100ms)
  - Without this: Always fresh data, slower responses (~8s)

### Multiple Calendars

Create multiple config files:
- `0.json` → Access via `/api/0.png`
- `1.json` → Access via `/api/1.png`
- `2.json` → Access via `/api/2.png`

See the **[Configuration Guide](calendar2image/docs-user/CONFIGURATION.md)** for all available options.

## 🎨 Custom Templates

### Using the Provisioned Templates

All built-in templates are automatically copied to your templates folder with a `custom-` prefix as examples:
- `templates/custom-week-view.js`
- `templates/custom-today-view.js`

To use a custom template:

1. Open `/addon_configs/17f877f5_calendar2image/0.json`
2. Change:
   ```json
   {
     "template": "custom-week-view"
   }
   ```
3. Edit the template file to customize it

### Creating Your Own Template

**Template structure:**

```javascript
module.exports = function(data) {
  const { events, config, extraData } = data;
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            width: ${config.width}px;
            height: ${config.height}px;
            font-family: Arial, sans-serif;
          }
        </style>
      </head>
      <body>
        <h1>My Calendar</h1>
        ${events.map(e => `
          <div>${e.title} - ${new Date(e.start).toLocaleDateString()}</div>
        `).join('')}
      </body>
    </html>
  `;
};
```

See the **[Template Development Guide](calendar2image/docs-user/TEMPLATE-DEVELOPMENT.md)** for:
- Live reload development workflow
- Template data reference
- Helper functions
- Built-in template examples

Browse **[template samples](calendar2image/docs-user/template-samples/)** for ready-to-use examples with configuration and screenshots.

## 🌐 Extra Data Integration

Fetch additional data (weather, tasks, etc.) from any JSON API:

**Configuration:**
```json
{
  "extraDataUrl": "http://homeassistant.local:8123/api/states/sensor.weather",
  "extraDataHeaders": {
    "Authorization": "Bearer YOUR_TOKEN"
  },
  "extraDataCacheTtl": 300
}
```

**Template usage:**
```javascript
module.exports = function(data) {
  const { extraData } = data;
  const temp = extraData.state || 'N/A';
  
  return `<html><body>Temperature: ${temp}°C</body></html>`;
};
```

See the **[Extra Data Guide](calendar2image/docs-user/EXTRA-DATA.md)** for examples and best practices.

## 💡 Use Cases

### E-ink Display

Optimize for e-ink with CRC32 change detection:

```python
import requests

# Check if image changed
crc = requests.get('http://ha.local:3000/api/0.png.crc32').text
if crc != last_crc:
    # Download and update display
    img = requests.get('http://ha.local:3000/api/0.png').content
    update_display(img)
    last_crc = crc
```

**Configuration for e-ink:**
```json
{
  "grayscale": true,
  "bitDepth": 2,
  "imageType": "bmp",
  "preGenerateInterval": "*/5 * * * *"
}
```

### Dashboard Integration

**Picture Entity Card:**
```yaml
type: picture-entity
entity: camera.calendar
image: http://homeassistant.local:3000/api/0.png
```

**Markdown Card:**
```yaml
type: markdown
content: |
  ![Calendar](http://homeassistant.local:3000/api/0.png)
```

## 🔧 Troubleshooting

### Common Issues

**Can't access API:**
- Verify add-on is started
- Check logs for "Startup complete"
- Test health endpoint: `http://homeassistant.local:3000/health`

**No events showing:**
- Verify ICS URL is accessible
- Check date range: `expandRecurringFrom` / `expandRecurringTo`
- Test with built-in template: `"template": "week-view"`

**Template not updating:**
- Use fresh endpoint: `/api/0/fresh.png`
- Wait for next scheduled generation
- Disable cache temporarily (remove `preGenerateInterval`)

**Extension mismatch error:**
- URL extension must match config `imageType`
- Example: `imageType: "png"` → use `/api/0.png`

See the **[Troubleshooting Guide](calendar2image/docs-user/TROUBLESHOOTING.md)** for comprehensive solutions.

## 📚 Documentation

### User Documentation
- **[Installation Guide](calendar2image/docs-user/INSTALLATION.md)** - Installing and initial setup
- **[Configuration Guide](calendar2image/docs-user/CONFIGURATION.md)** - All configuration options
- **[API Reference](calendar2image/docs-user/API-REFERENCE.md)** - Complete API documentation
- **[Template Development](calendar2image/docs-user/TEMPLATE-DEVELOPMENT.md)** - Creating custom templates
- **[Template Samples](calendar2image/docs-user/template-samples/)** - Ready-to-use template examples
- **[Extra Data Guide](calendar2image/docs-user/EXTRA-DATA.md)** - Using external data in templates
- **[Troubleshooting](calendar2image/docs-user/TROUBLESHOOTING.md)** - Common issues and solutions

### Developer Documentation
See the `calendar2image/` directory for detailed technical documentation.

## 💬 Support

- **Issues & Feature Requests:** [GitHub Issues](https://github.com/jantielens/ha-calendar2image/issues)
- **Discussions:** [GitHub Discussions](https://github.com/jantielens/ha-calendar2image/discussions)

## 📄 License

MIT License - see LICENSE file for details.