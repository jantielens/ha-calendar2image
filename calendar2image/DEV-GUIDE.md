# Template Development Guide

This guide explains how to develop custom calendar templates with live reload functionality.

## TL;DR

```powershell
# Terminal 1: Start container
docker compose up

# Terminal 2: Create template & watch
node dev-setup.js my-template
npm run watch 99
```

## Overview

The template development workflow uses:
- **Docker container**: Runs the server with Puppeteer for image generation
- **Watch script**: Monitors template files and triggers regeneration
- **File system watcher**: Automatically detects changes and updates images

## Quick Start

### Option 1: New Template (Recommended for beginners)

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

### Option 2: Existing Template

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

## ⚠️ Common Mistakes

### ❌ DON'T USE
```powershell
npm run test:ci    # This STOPS the container after tests!
```

### ✅ USE INSTEAD
```powershell
docker compose up  # This keeps container running
```


## Container Commands

### Start (keeps running)
```powershell
docker compose up              # With logs
docker compose up -d           # Detached mode
```

### Stop
```powershell
docker compose down            # Stop and remove
Ctrl+C                         # Stop (if running in foreground)
```

### Check Status
```powershell
docker ps                      # List running containers
docker logs calendar2image-dev # View logs
```

## Commands

### `node dev-setup.js <template-name>`
Creates a new template file and config with sample code.

**Example:**
```powershell
node dev-setup.js vacation-planner
```

### `npm run watch <config-index> [template-file]`
Watches a template file and regenerates images on changes.

**Examples:**
```powershell
# Watch template from config 99
npm run watch 99

# Watch a specific template file for config 99
npm run watch 99 custom-template.js
```

## Directory Structure

```
calendar2image/
  dev-setup.js           # Create new template
  watch-template.js      # Watch & regenerate
  dev-watch.ps1          # PowerShell helper
  docker-compose.yml     # Container config

data/
  calendar2image/
    templates/               # Your custom templates go here
      my-template.js
      another-template.js
    0.json                   # Config files
    99.json                  # Dev config example
    
output/                      # Generated images appear here
  output-99.png
  output-99.html             # HTML preview (for debugging)
```

## Template File Format

Templates are JavaScript modules that export a function returning HTML:

```javascript
module.exports = function(data) {
  const { events, config, now } = data;
  
  // Your template logic here
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        /* Your CSS */
        body {
          width: ${config.width}px;
          height: ${config.height}px;
        }
      </style>
    </head>
    <body>
      <!-- Your HTML -->
    </body>
    </html>
  `;
};
```

### Template Data

Your template receives an object with:

| Property | Type | Description |
|----------|------|-------------|
| `events` | Array | Calendar events (see Event object below) |
| `config` | Object | Your config file settings |
| `now` | Number | Current timestamp |

### Event Object

Each event has:

```javascript
{
  title: "Event Title",
  start: 1698768000000,        // Unix timestamp
  end: 1698771600000,          // Unix timestamp
  allDay: false,               // Boolean
  description: "...",          // String or undefined
  location: "...",             // String or undefined
  // ... other ICS properties
}
```

## Configuration File

Create a JSON config file in `../data/calendar2image/`:

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


## Development Workflow

1. **Start container** (Terminal 1)
   ```powershell
   cd calendar2image
   docker compose up
   ```
   Wait for: `Startup complete - ready to serve requests`
   
   **Note:** Don't use `npm run test:ci` - that runs tests and stops the container!

2. **Create template** (Terminal 2)
   ```powershell
   cd calendar2image
   node dev-setup.js my-calendar
   ```

3. **Start watcher** (Terminal 2)
   ```powershell
   npm run watch 99
   # or
   .\dev-watch.ps1 99
   ```

4. **Edit template**
   ```
   Open: ..\data\calendar2image\templates\my-calendar.js
   Save → Image auto-updates!
   ```

5. **View output**
   ```
   ..\output\output-99.png
   ..\output\output-99.html
   ```

## Tips & Best Practices

### 1. Use the HTML Preview
The watcher saves both `.png` and `.html` files. Open the HTML file in a browser for faster iteration:
```
..\output\output-99.html
```

### 2. Test with Different Calendars
Update your config's `icsUrl` to test with various calendar feeds:
- Public holidays
- Personal calendars
- Test calendars with many events

### 3. Handle Edge Cases
Always handle empty event lists:
```javascript
const events = data.events || [];
if (events.length === 0) {
  return `<html><body>No events</body></html>`;
}
```

### 4. Escape HTML
Always escape user content to prevent injection:
```javascript
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
```

### 5. Debug with Console Logs
Template console output won't show in the watcher, but you can:
- View the generated HTML file
- Check the container logs
- Add debug divs to your template

### 6. Match Dimensions
Always set your HTML body to match config dimensions:
```css
body {
  width: ${config.width}px;
  height: ${config.height}px;
  overflow: hidden;
}
```

### 7. Multiple Watchers
Run multiple watcher instances in different terminals for testing multiple configs:
```powershell
# Terminal 2
npm run watch 99

# Terminal 3
npm run watch 100
```

### 8. Clean Restart
For a fresh start, completely stop and restart the container:
```powershell
docker compose down; docker compose up
```

## Troubleshooting

### Container won't start
```powershell
# Clean up old containers
docker compose down
docker ps -a | Select-String calendar2image

# Rebuild
docker compose build
docker compose up
```

### Watcher can't connect
- Make sure Docker container is running: `docker compose up`
- Don't use `npm run test:ci` (it stops after tests complete)
- Check the port (default: 3000)
- Verify container is running: `docker ps`
- Should see: `calendar2image-dev` with port `0.0.0.0:3000->3000/tcp`
- Set environment variables if needed:
  ```powershell
  $env:CONTAINER_PORT="3000"
  npm run watch 99
  ```

### Template not updating
- Restart container (clears template cache): `docker compose restart`
- Wait 500ms for debounce
- Check terminal output for errors
- Verify file is being saved (not just previewed)
- Try manually saving with Ctrl+S

### Port already in use
```powershell
# Stop any node processes
Stop-Process -Name node -Force -ErrorAction SilentlyContinue

# Or change port in docker-compose.yml
# ports: "3001:3000"  # Use 3001 instead
```

### Template Not Loading
1. Check template cache - restart the Docker container
2. Verify template exports a function
3. Check for syntax errors in the template file
4. Use `/fresh` endpoint to bypass cache: `curl http://localhost:3000/api/99/fresh.png -o test.png`

### Wrong Template Being Used
1. Check config file `template` field matches filename (without `.js`)
2. Restart Docker container to clear cache
3. Use the `/fresh` endpoint

## Advanced Usage

### Custom Container Host/Port
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
```

### Direct API Testing
Test the container API directly:
```powershell
# Get image (cached)
curl http://localhost:3000/api/99.png -o test.png

# Force fresh generation (bypasses cache)
curl http://localhost:3000/api/99/fresh.png -o test.png
```

## Example Templates

Check the built-in templates for inspiration:
- `calendar2image/src/templates/built-in/week-view.js`
- `calendar2image/src/templates/built-in/today-view.js`

## Next Steps

Once your template is ready:
1. Copy it to the Docker container's template directory
2. Update your production config to use the new template
3. Deploy and enjoy your custom calendar view!

