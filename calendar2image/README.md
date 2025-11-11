# Calendar2Image for Home Assistant

Transform ICS calendar feeds into customizable images with optional extra data sources (weather, tasks, etc.) - perfect for e-ink displays and dashboards. Features multiple calendar support, REST API, intelligent caching, custom JavaScript templates, and optimized rendering.

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

## 🚀 Quick Start

1. **Start the add-on** and check the logs for:
   ```
   Startup complete - ready to serve requests
   ```

2. **Open the configuration dashboard**:
   ```
   http://homeassistant.local:3000/
   ```
   This shows all your configurations, API endpoints, and interactive documentation.

3. **Test the default configuration**:
   ```
   http://homeassistant.local:3000/api/0.png
   ```

### First Steps

The add-on automatically creates configuration files in `/addon_configs/17f877f5_calendar2image/`:
- `0.json` - Working configuration with sample calendar
- `templates/` - All built-in templates as custom templates (prefixed with `custom-`) for you to customize
- `README.md` - Configuration documentation

**Edit the configuration:**
1. Open `0.json` in File Editor add-on
   - ⚠️ **Important**: Set `enforce_basepath: false` in File Editor configuration to access add-on config folders ([docs](https://github.com/home-assistant/addons/blob/master/configurator/DOCS.md#option-enforce_basepath-required))
2. Replace `icsUrl` with your calendar's public ICS URL
3. Save and view the updated image at `http://homeassistant.local:3000/api/0.png`

## ⚙️ Add-on Configuration

### Add-on Options

```yaml
port: 3000  # Port number for the web server (default: 3000)
```

### Calendar Configuration

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

**Key Parameters:**
- `template` - Template name: `week-view`, `today-view`, `today-weather`, or custom (required)
- `icsUrl` - Your calendar's ICS feed URL or multiple sources (optional)
  - Single: `"https://calendar.example.com/feed.ics"`
  - Multiple: `[{"url": "https://work.ics", "sourceName": "Work"}, {"url": "https://personal.ics", "sourceName": "Personal"}]`
  - Omit for templates that only use `extraData` (e.g., weather dashboards)
- `width` / `height` - Image dimensions in pixels
- `imageType` - Output format: `png`, `jpg`, or `bmp`
- `preGenerateInterval` - Cron expression for scheduled generation (optional)

**Multiple Calendars:**
- `0.json` → `/api/0.png`
- `1.json` → `/api/1.png`
- `2.json` → `/api/2.png`

## 🔌 API Endpoints

### Image Endpoints

```bash
# Get calendar image (cached or fresh)
GET /api/:index.:ext
# Example: http://homeassistant.local:3000/api/0.png

# Force fresh generation (bypass cache)
GET /api/:index/fresh.:ext

# Get CRC32 checksum (without downloading image)
GET /api/:index.:ext.crc32

# Get CRC32 history (JSON)
GET /api/:index/crc32-history

# View CRC32 history (visual page)
GET /crc32-history/:index
```

**Note:** Extension must match the `imageType` in your config file.

### Response Headers

- `X-Cache` - Cache status: `HIT`, `MISS`, `DISABLED`, or `BYPASS`
- `X-CRC32` - Image checksum (lowercase hex)
- `X-Generated-At` - ISO timestamp of generation

### CRC32 History

Track the last 500 image generations for each config to debug display refresh issues:

- **Timeline view** - See when images were generated and which trigger caused them
- **Duration stats** - Monitor generation performance (min, max, avg)
- **CRC32 blocks** - Identify consecutive runs of the same CRC32 value
- **Trigger tracking** - Know what caused each generation (startup, scheduled, fresh, etc.)

Access via the dashboard's "CRC32 history" button or directly at `/crc32-history/:index`.

## 📚 Complete Documentation

For comprehensive documentation, see the main repository README:

**👉 [Full Documentation & Guides](https://github.com/jantielens/ha-calendar2image#readme)**

Including:
- **[Installation Guide](docs-user/INSTALLATION.md)** - Detailed setup instructions
- **[Configuration Guide](docs-user/CONFIGURATION.md)** - All configuration options
- **[Image Adjustments](docs-user/IMAGE-ADJUSTMENTS.md)** - Display optimization and adjustment parameters
- **[API Reference](docs-user/API-REFERENCE.md)** - Complete API documentation
- **[Template Development](docs-user/TEMPLATE-DEVELOPMENT.md)** - Creating custom templates
- **[Template Samples](docs-user/template-samples/)** - Ready-to-use template examples
- **[Extra Data Guide](docs-user/EXTRA-DATA.md)** - Using external data in templates
- **[Troubleshooting](docs-user/TROUBLESHOOTING.md)** - Common issues and solutions

## 💬 Support

- **Issues & Feature Requests:** [GitHub Issues](https://github.com/jantielens/ha-calendar2image/issues)
- **Discussions:** [GitHub Discussions](https://github.com/jantielens/ha-calendar2image/discussions)

## 📄 License

MIT License - see LICENSE file for details.
