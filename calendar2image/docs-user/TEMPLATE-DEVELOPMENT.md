# Template Development Guide

Complete guide for developing custom calendar templates with live reload functionality.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Overview](#overview)
- [Container Commands](#container-commands)
- [Development Workflow](#development-workflow)
- [Template Format](#template-format)
- [Configuration](#configuration)
- [Directory Structure](#directory-structure)
- [Tips & Best Practices](#tips--best-practices)
- [Troubleshooting](#troubleshooting)
- [Advanced Usage](#advanced-usage)

---

## Quick Start

### TL;DR

```powershell
# Terminal 1: Start container
docker compose up

# Terminal 2: Create template & watch
node dev-setup.js my-template
npm run watch 99
```

### New Template (Recommended)

```powershell
# 1. Create a new template and config
node dev-setup.js my-awesome-calendar

# 2. Start the Docker container (in terminal 1)
docker compose up

# 3. Start the template watcher (in terminal 2)
npm run watch 99  # Or whatever config index was created

# 4. Edit your template
# Open: ..\data\calendar2image\templates\my-awesome-calendar.js
# Save changes and watch the image auto-update!
```

### Existing Template

```powershell
# 1. Create your custom template
# File: ..\data\calendar2image\templates\my-template.js

# 2. Create or update a config file
# File: ..\data\calendar2image\99.json
# Set: "template": "my-template"

# 3. Start the Docker container (in terminal 1)
docker compose up

# 4. Start the watcher (in terminal 2)
npm run watch 99

# 5. Edit ..\data\calendar2image\templates\my-template.js
# Image auto-regenerates in ..\output\output-99.png
```

---

## Overview

The template development workflow uses:
- **Docker container**: Runs the server with Puppeteer for image generation
- **Watch script**: Monitors template files and triggers regeneration
- **File system watcher**: Automatically detects changes and updates images
- **Hot-reload**: Custom templates are automatically reloaded from disk on every request (no container restart needed!)

**Why Docker?** Puppeteer requires Chromium and native dependencies that are complex to install locally. The Docker container has everything pre-configured, so your local machine only needs Node.js to run the watcher.

**Hot-Reload Feature:** Custom templates are automatically reloaded from disk every time an image is generated. This means you can edit your template, save it, and immediately see the changes without restarting the container. Built-in templates are cached for performance since they don't change.

---

## Container Commands

### Start Container (keeps running)

```powershell
docker compose up              # With logs (recommended for development)
docker compose up -d           # Detached mode (runs in background)
```

Wait for: `Startup complete - ready to serve requests`

### Stop Container

```powershell
docker compose down            # Stop and remove container
Ctrl+C                         # Stop (if running in foreground)
```

### Check Status

```powershell
docker ps                      # List running containers
docker logs calendar2image-dev # View container logs
docker compose restart         # Restart container (clears template cache)
```

### ⚠️ Common Mistakes

**❌ DON'T USE:**
```powershell
npm run test:ci    # This runs tests then STOPS the container!
```

**✅ USE INSTEAD:**
```powershell
docker compose up  # This keeps the container running
```

---

## Development Workflow

### Complete Step-by-Step

1. **Terminal 1**: Start Docker container
   ```powershell
   cd calendar2image
   docker compose up
   ```
   
   **Note:** Don't use `npm run test:ci` - that runs tests and stops the container!

2. **Terminal 2**: Create template
   ```powershell
   cd calendar2image
   node dev-setup.js my-calendar
   ```
   
   This creates:
   - Template file: `..\data\calendar2image\templates\my-calendar.js`
   - Config file: `..\data\calendar2image\99.json`

3. **Terminal 2**: Start watcher
   ```powershell
   npm run watch 99
   # or use PowerShell helper:
   .\dev-watch.ps1 99
   ```

4. **Editor**: Edit your template
   ```
   Open: ..\data\calendar2image\templates\my-calendar.js
   ```

4. **Save** → Image auto-regenerates in `../output/`
   - Custom templates are **hot-reloaded** automatically
   - No need to restart the container!

5. **View**: Open the generated image

6. **View**: Open the generated files
   ```
   ..\output\output-99.png   # Generated image
   ..\output\output-99.html  # HTML preview (for debugging)
   ```

### Available Commands

| Command | Description |
|---------|-------------|
| `node dev-setup.js <name>` | Create new template with sample code |
| `npm run watch <index> [file]` | Watch template and auto-regenerate |
| `.\dev-watch.ps1 <index>` | PowerShell helper with health checks |

---

## Template Format

### Basic Structure

Templates are JavaScript modules that export a function returning HTML:

```javascript
module.exports = function(data) {
  const { events, config, now } = data;
  
  // Your template logic here
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          width: ${config.width}px;
          height: ${config.height}px;
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
        }
      </style>
    </head>
    <body>
      <h1>My Calendar</h1>
      <div class="events">
        ${events.map(e => `
          <div class="event">
            <strong>${escapeHtml(e.title)}</strong>
            <span>${formatDate(e.start)}</span>
          </div>
        `).join('')}
      </div>
    </body>
    </html>
  `;
  
  // Helper functions
  function escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  
  function formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  }
};
```

### Template Data

Your template receives an object with:

| Property | Type | Description |
|----------|------|-------------|
| `events` | Array | Calendar events (see Event object below) |
| `config` | Object | Your config file settings (width, height, etc.) |
| `now` | Number | Current timestamp (milliseconds since epoch) |

### Event Object

Each event in the `events` array has:

```javascript
{
  title: "Event Title",           // String
  start: 1698768000000,           // Unix timestamp (milliseconds)
  end: 1698771600000,             // Unix timestamp (milliseconds)
  allDay: false,                  // Boolean
  description: "Details...",      // String or undefined
  location: "Location...",        // String or undefined
  source: 0,                      // Number (calendar source index, 0-based)
  sourceName: "Work",             // String or undefined (optional source name)
  error: "Network error: ...",    // String or undefined (only present on error events)
  // ... other ICS properties
}
```

**Multiple Calendar Support:**
- `source`: Index (0, 1, 2...) indicating which calendar the event came from
- `sourceName`: Optional human-readable name for the calendar source (if provided in config)

**Error Events:**
- For failed calendar sources, error events are created with detailed error messages
- `title`: Includes truncated error message (e.g., "Failed loading ICS 0: unable to verify...")
- `description`: Contains the full error message
- `error`: The raw error message for programmatic access
- These events span the entire date range to make fetch failures visible

### Config Object

The `config` object contains your JSON configuration:

```javascript
{
  icsUrl: "https://...",
  template: "my-template",
  width: 800,
  height: 600,
  imageType: "png",
  grayscale: false,
  bitDepth: 8,
  expandRecurringFrom: -31,
  expandRecurringTo: 31,
  preGenerateInterval: "*/5 * * * *"
}
```

---

## Configuration

### Config File Location

Create JSON config files in `../data/calendar2image/`:

```
data/calendar2image/
  0.json      # Production config
  1.json      # Production config
  99.json     # Development config
  100.json    # Development config
```

**Tip:** Use index 99+ for development to avoid conflicts with production configs.

### Config File Format

```json
{
  "icsUrl": "https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics",
  "template": "my-template",
  "width": 800,
  "height": 600,
  "grayscale": false,
  "bitDepth": 8,
  "imageType": "png",
  "expandRecurringFrom": -31,
  "expandRecurringTo": 31,
  "preGenerateInterval": "*/5 * * * *"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `icsUrl` | String | URL to ICS calendar feed |
| `template` | String | Template name (without `.js` extension) |
| `width` | Number | Image width in pixels |
| `height` | Number | Image height in pixels |
| `imageType` | String | Output format: `png`, `jpg`, or `bmp` |
| `grayscale` | Boolean | Convert to grayscale |
| `bitDepth` | Number | Bit depth: `1`, `4`, or `8` |
| `expandRecurringFrom` | Number | Days before today to expand recurring events |
| `expandRecurringTo` | Number | Days after today to expand recurring events |
| `preGenerateInterval` | String | Cron expression for auto-generation (optional) |

---

## Directory Structure

### Project Layout

```
calendar2image/
  dev-setup.js           # Create new template
  watch-template.js      # Watch & regenerate
  dev-watch.ps1          # PowerShell helper
  docker-compose.yml     # Container config
  src/
    templates/
      built-in/          # Built-in templates
        week-view.js
        today-view.js
  
data/calendar2image/
  templates/             # Your custom templates
    my-template.js
    another-template.js
  0.json                # Production configs
  99.json               # Development configs
  
output/
  output-99.png         # Generated images
  output-99.html        # HTML previews
```

### Template Directory

Custom templates go in `../data/calendar2image/templates/`:

```
templates/
  my-calendar.js        # Your custom template
  vacation-planner.js   # Another custom template
```

The watcher looks for templates in this directory first, then falls back to built-in templates.

---

## Tips & Best Practices

### 1. Use the HTML Preview

The watcher saves both `.png` and `.html` files. Open the HTML file in a browser for faster iteration:

```
..\output\output-99.html
```

This lets you:
- See the HTML structure
- Inspect with browser DevTools
- Test without waiting for image generation

### 2. Test with Different Calendars

Update your config's `icsUrl` to test with various calendar feeds:
- Public holidays (Google Calendar)
- Personal calendars
- Test calendars with many events
- Empty calendars (edge case testing)

### 3. Handle Edge Cases

Always handle empty event lists:

```javascript
module.exports = function(data) {
  const events = data.events || [];
  
  if (events.length === 0) {
    return `
      <html>
        <body>
          <h1>No upcoming events</h1>
        </body>
      </html>
    `;
  }
  
  // Render events...
};
```

### 4. Escape HTML

Always escape user content to prevent injection:

```javascript
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
```

### 5. Match Dimensions

Always set your HTML body to match config dimensions:

```css
body {
  width: ${config.width}px;
  height: ${config.height}px;
  overflow: hidden;
}
```

### 6. Debug with Visual Cues

Add debug information to your template during development:

```javascript
return `
  <html>
    <body>
      <!-- Debug info -->
      <div style="position: absolute; top: 0; right: 0; background: yellow; padding: 5px; font-size: 10px;">
        Events: ${events.length} | Updated: ${new Date(now).toLocaleString()}
      </div>
      
      <!-- Your content -->
    </body>
  </html>
`;
```

### 7. Debug with Console Logging

Use `console.log()` in your templates - output appears in Home Assistant logs:

```javascript
module.exports = function(data) {
  const { events, config, now, locale, timezone, extra } = data;
  
  // Debug logging - appears in HA logs
  console.log('[Template] Processing', events.length, 'events');
  console.log('[Template] Config:', config.template);
  console.log('[Template] Extra data keys:', Object.keys(extra));
  
  // Your template logic...
  return `<html>...</html>`;
};
```

**Benefits:**
- Real-time debugging without modifying image output
- Visible in Home Assistant add-on logs
- Helps troubleshoot data processing issues
- No need to add visual debug elements to images

### 8. Use Helper Functions

Keep your template code clean with helper functions:

```javascript
module.exports = function(data) {
  const { events, config, now } = data;
  
  return `<!-- Your HTML -->`;
  
  // Helper functions at the bottom
  function formatDate(timestamp) { /* ... */ }
  function formatTime(timestamp) { /* ... */ }
  function escapeHtml(text) { /* ... */ }
  function filterUpcoming(events) { /* ... */ }
};
```

### 8. Test Image Generation Time

Complex templates take longer to render. Monitor the watcher output:

```
✓ Generated 45678 bytes  # Larger = slower
```

Optimize by:
- Reducing DOM complexity
- Minimizing large background images
- Limiting number of events displayed

---

## Troubleshooting

### Container won't start

```powershell
# Clean up old containers
docker compose down
docker ps -a | Select-String calendar2image

# Rebuild and start
docker compose build
docker compose up
```

### "Container connection failed"

- Make sure Docker container is running: `docker compose up`
- Don't use `npm run test:ci` (it stops after tests complete)
- Check the port (default: 3000)
- Verify container is running: `docker ps`
- Check container logs: `docker logs calendar2image-dev`
- Set environment variables if needed:
  ```powershell
  $env:CONTAINER_PORT="3000"
  npm run watch 99
  ```

### Watcher can't connect

```powershell
# Check container is running
docker ps

# Should see something like:
# CONTAINER ID   IMAGE              PORTS                    NAMES
# abc123def456   calendar2image     0.0.0.0:3000->3000/tcp   calendar2image-dev
```

If not running, start it:
```powershell
docker compose up
```

### Template Not Loading

1. **Check for syntax errors** - Look at the watcher output for errors

2. **Verify template exports a function**:
   ```javascript
   // ✅ Correct
   module.exports = function(data) { return `<html>...</html>`; };
   
   // ❌ Wrong
   module.exports = { template: function() {} };
   ```

3. **Templates are hot-reloaded automatically** - Custom templates are reloaded from disk on every request, so you don't need to restart the container

4. **Check container logs** for error messages:
   ```powershell
   docker logs calendar2image-dev --tail 20
   ```

### Image Not Updating

1. **Wait for debounce** - The watcher waits 500ms after the last change
2. **Check terminal output** - Look for errors in Terminal 2 (watcher)
3. **Verify file is saved** - Not just previewed in editor
4. **Try manual save** - Press `Ctrl+S` explicitly
5. **Check container logs** - Look for hot-reload confirmation:
   ```powershell
   docker logs calendar2image-dev --tail 5
   # Should see: "Loaded custom template: your-template (hot-reloaded)"
   ```
6. **Restart watcher if needed** - Stop (`Ctrl+C`) and restart (`npm run watch 99`)

### Wrong Template Being Used

1. **Check config file** - Verify `template` field matches filename (without `.js`):
   ```json
   {
     "template": "my-template"  // Looks for my-template.js
   }
   ```

2. **Templates auto-reload** - Custom templates are hot-reloaded automatically, no restart needed

3. **Force fresh generation** - Use the `/fresh` endpoint to bypass image cache:
   ```powershell
   curl http://localhost:3000/api/99/fresh.png -o test.png
   ```

4. **Check container logs** - Verify which template is being loaded:
   ```powershell
   docker logs calendar2image-dev --tail 20
   # Should see: "Loaded custom template: your-template (hot-reloaded)"
   ```

### Template not updating

Custom templates are **automatically hot-reloaded** - you don't need to restart the container! If your changes aren't showing:

1. **Check the watcher detected the change** - Look for output in Terminal 2
2. **Verify file was saved** - Not just auto-save preview
3. **Check container logs** for hot-reload confirmation:
   ```powershell
   docker logs calendar2image-dev --tail 5
   # Should see: "Loaded custom template: your-template (hot-reloaded)"
   ```
4. **Force fresh generation** via watcher by saving the file again (triggers regeneration)

### Port already in use

```powershell
# Stop any node processes
Stop-Process -Name node -Force -ErrorAction SilentlyContinue

# Or change port in docker-compose.yml
# ports: "3001:3000"  # Use 3001 instead
```

Then edit `docker-compose.yml`:
```yaml
ports:
  - "3001:3000"  # External:Internal
```

And set environment variable:
```powershell
$env:CONTAINER_PORT="3001"
npm run watch 99
```

---

## Advanced Usage

### Custom Container Host/Port

If your container runs on a different host or port:

```powershell
$env:CONTAINER_HOST="192.168.1.100"
$env:CONTAINER_PORT="8080"
npm run watch 99
```

### Watch Multiple Templates

Run multiple watcher instances in different terminals:

```powershell
# Terminal 2
npm run watch 99

# Terminal 3
npm run watch 100

# Terminal 4
npm run watch 101
```

Each watcher monitors a different config/template combination.

### Direct API Testing

Test the container API directly without the watcher:

```powershell
# Get image (uses cache if available)
curl http://localhost:3000/api/99.png -o test.png

# Force fresh generation (bypasses cache)
curl http://localhost:3000/api/99/fresh.png -o test.png

# Get CRC32 checksum (without downloading image)
curl http://localhost:3000/api/99.png.crc32
```

### Manual Docker Run

If you prefer not to use docker-compose:

```powershell
# Build image
docker build -t calendar2image .

# Run container
docker run -d `
  --name calendar2image-dev `
  -p 3000:3000 `
  -v "${PWD}\..\data:/config" `
  calendar2image

# Stop and remove
docker stop calendar2image-dev
docker rm calendar2image-dev
```

### Production Deployment

Once your template is ready for production:

1. **Copy template** to production template directory
2. **Update config** to use the new template:
   ```json
   {
     "template": "my-production-template",
     ...
   }
   ```
3. **Test with production data**
4. **Deploy** to Home Assistant

---

## Example Templates

### Minimal Template

```javascript
module.exports = function(data) {
  const { events = [], config } = data;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { 
          width: ${config.width}px; 
          height: ${config.height}px; 
          margin: 0;
          padding: 20px;
          font-family: Arial, sans-serif;
        }
      </style>
    </head>
    <body>
      <h1>Events: ${events.length}</h1>
      ${events.slice(0, 5).map(e => `
        <div>${e.title} - ${new Date(e.start).toLocaleDateString()}</div>
      `).join('')}
    </body>
    </html>
  `;
};
```

### Multi-Calendar Template with Source Display

```javascript
module.exports = function(data) {
  const { events = [], config } = data;
  
  // Define colors for different calendar sources
  const sourceColors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57'];
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { 
          width: ${config.width}px; 
          height: ${config.height}px; 
          margin: 0; padding: 20px;
          font-family: Arial, sans-serif;
        }
        .event {
          margin: 10px 0; padding: 10px;
          border-radius: 5px; color: white;
        }
        .source-label {
          font-size: 0.8em; opacity: 0.9;
          float: right;
        }
      </style>
    </head>
    <body>
      <h1>Multi-Calendar View (${events.length} events)</h1>
      ${events.slice(0, 10).map(e => {
        const sourceColor = sourceColors[e.source % sourceColors.length];
        const sourceLabel = e.sourceName || \`Source \${e.source}\`;
        return \`
          <div class="event" style="background: \${sourceColor}">
            <span class="source-label">\${sourceLabel}</span>
            <strong>\${e.title}</strong><br>
            \${new Date(e.start).toLocaleDateString()} 
            \${e.allDay ? '(All Day)' : 'at ' + new Date(e.start).toLocaleTimeString()}
          </div>
        \`;
      }).join('')}
    </body>
    </html>
  `;
};
```

### Built-in Templates

Check these for inspiration:
- `calendar2image/src/templates/built-in/week-view.js` - Week calendar view
- `calendar2image/src/templates/built-in/today-view.js` - Today's events

Located at: `c:\dev\ha-calendar2image\calendar2image\src\templates\built-in\`

### Community Template Samples

See the **[template-samples](template-samples/)** directory for complete, real-world template examples with documentation:
- Full-featured templates ready to use
- Configuration examples
- Screenshots and explanations

---

## Summary

**Quick workflow:**
1. `docker compose up` (Terminal 1)
2. `node dev-setup.js my-template` (Terminal 2)
3. `npm run watch 99` (Terminal 2)
4. Edit template → **Auto-reloads & regenerates!**

**Key files:**
- Templates: `../data/calendar2image/templates/*.js`
- Configs: `../data/calendar2image/*.json`
- Output: `../output/output-*.png`

**Common commands:**
- Start: `docker compose up`
- Stop: `docker compose down`
- Watch: `npm run watch <index>`
- Check: `docker ps`
- Logs: `docker logs calendar2image-dev --tail 20`

**Hot-Reload Feature:**
- ✅ Custom templates reload automatically (no restart needed!)
- ✅ Built-in templates are cached for performance
- ✅ Changes appear immediately after file save
- ✅ Look for `(hot-reloaded)` in container logs

**Tips:**
- Use HTML preview for faster debugging
- Keep Terminal 1 visible for container logs
- Use index 99+ for development configs
- Check logs to verify hot-reload is working

Happy template development! 🎨
