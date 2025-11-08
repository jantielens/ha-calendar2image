# Troubleshooting Guide

Common issues and solutions for Calendar2Image.

> 💡 **Quick Diagnostics**: Visit `http://homeassistant.local:3000/config/0` (replace `0` with your config index) to see validation errors and configuration details in a visual format.

---

## Installation Issues

### Add-on won't start

**Symptoms:** Add-on status shows "stopped" or crashes immediately

**Check the logs:**
1. Go to add-on **Info** tab
2. Click **Log** tab
3. Look for error messages

**Common causes:**

**Port already in use:**
```
Error: listen EADDRINUSE: address already in use :::3000
```
**Solution:** Change port in configuration:
```yaml
port: 3001
```

**Insufficient memory:**
```
Error: Cannot allocate memory
```
**Solution:** 
- Restart Home Assistant
- Free up memory by stopping other add-ons
- Increase memory limit in add-on configuration (if available)

**Docker issues:**
```
Error starting userland proxy
```
**Solution:**
- Restart Home Assistant host
- Restart Docker service: `systemctl restart docker`

---

### Can't access API endpoints

**Symptoms:** `http://homeassistant.local:3000/api/0.png` returns connection error

**Check if add-on is running:**
```bash
# Test health endpoint
curl http://homeassistant.local:3000/health
```

Should return:
```json
{"status": "healthy"}
```

**Troubleshooting steps:**

1. **Verify add-on is started:**
   - Check add-on Info tab shows "Started"
   - Check logs for "Startup complete"

2. **Check network connectivity:**
   ```bash
   # From Home Assistant host
   curl http://localhost:3000/health
   
   # From your computer
   curl http://YOUR_HA_IP:3000/health
   ```

3. **Verify port configuration:**
   - Check add-on configuration for port number
   - Ensure firewall allows the port

4. **Check Home Assistant proxy settings:**
   - Some setups require accessing via different hostname
   - Try IP address instead of hostname

---

### Configuration files not created

**Symptoms:** `/addon_configs/17f877f5_calendar2image/` is empty

**Solution:**

1. **Stop the add-on**
2. **Check directory permissions:**
   ```bash
   ls -la /addon_configs/
   ```
3. **Manually create if needed:**
   ```bash
   mkdir -p /addon_configs/17f877f5_calendar2image/templates
   ```
4. **Restart add-on** - files will be auto-created

---

## Configuration Issues

> ⚠️ **Note**: If you're using the File Editor add-on to edit configuration files, make sure you've set `enforce_basepath: false` in its configuration ([documentation](https://github.com/home-assistant/addons/blob/master/configurator/DOCS.md#option-enforce_basepath-required)). This allows access to add-on config folders at `/addon_configs/`.

### "Configuration file not found"

**Error:**
```json
{
  "error": "Not Found",
  "message": "Configuration 1 not found"
}
```

**Causes:**
- Config file doesn't exist: `/addon_configs/17f877f5_calendar2image/1.json`
- File has wrong name (must be `0.json`, `1.json`, etc.)
- File has invalid JSON syntax

**Solution:**

1. **Check file exists:**
   ```bash
   ls /addon_configs/17f877f5_calendar2image/
   ```

2. **Validate JSON syntax:**
   - Use online JSON validator
   - Check for missing commas, quotes, brackets

3. **Use correct filename:**
   - Must be numeric: `0.json`, `1.json`, `2.json`
   - Not: `calendar.json`, `config1.json`, etc.

---

### "Extension mismatch" error

**Error:**
```json
{
  "error": "Not Found",
  "message": "Config 0 serves png images, not jpg"
}
```

**Cause:** Requesting wrong file extension in URL

**Solution:**

Check `imageType` in your config file:
```json
{
  "imageType": "png"  // ← Must match URL extension
}
```

Then use matching extension in URL:
```
http://homeassistant.local:3000/api/0.png  ✓
http://homeassistant.local:3000/api/0.jpg  ✗
```

---

### Invalid configuration

**Error:**
```json
{
  "error": "Bad Request",
  "message": "Configuration validation failed"
}
```

**Common issues:**

1. **Invalid icsUrl:**
   ```json
   // ✗ Wrong
   "icsUrl": "not-a-url"
   
   // ✓ Correct
   "icsUrl": "https://calendar.google.com/calendar/ical/..."
   ```

2. **Invalid template name:**
   ```json
   // ✗ Wrong - includes .js
   "template": "my-template.js"
   
   // ✓ Correct - no extension
   "template": "my-template"
   ```

3. **Invalid image type:**
   ```json
   // ✗ Wrong
   "imageType": "gif"
   
   // ✓ Correct - only png, jpg, bmp
   "imageType": "png"
   ```

4. **Invalid cron expression:**
   ```json
   // ✗ Wrong
   "preGenerateInterval": "every 5 minutes"
   
   // ✓ Correct - cron format
   "preGenerateInterval": "*/5 * * * *"
   ```

---

## Calendar Issues

### SSL Certificate Errors

**Error messages in logs or error events:**
```
Network error: unable to verify the first certificate
unable to verify the first certificate
UNABLE_TO_VERIFY_LEAF_SIGNATURE
SELF_SIGNED_CERT_IN_CHAIN
```

**What this means:**
The calendar server has an SSL certificate issue:
- Self-signed certificate
- Incomplete certificate chain (missing intermediate certificates)
- Expired or invalid certificate

**Why browsers work but Calendar2Image doesn't:**
Modern browsers automatically download missing intermediate certificates and are more lenient with SSL validation. Node.js (which Calendar2Image uses) strictly requires the complete certificate chain to be sent by the server.

**Solution:**

Use the `rejectUnauthorized: false` option for the specific calendar source:

```json
{
  "icsUrl": [
    {
      "url": "https://your-server.com/calendar.ics",
      "sourceName": "My Calendar",
      "rejectUnauthorized": false
    }
  ],
  "template": "week-view"
}
```

**⚠️ Security Warning:**
- Only use this for calendar sources you trust
- This disables SSL certificate verification for **this specific URL only**
- Other calendar sources remain secure with normal verification
- Default is `rejectUnauthorized: true` (secure)

**Better solution (if possible):**
Contact the calendar server administrator to fix their SSL configuration by:
- Installing intermediate certificates
- Using a properly signed certificate from a trusted CA
- Ensuring the complete certificate chain is sent

---

### "Failed to fetch calendar data"

**Error:**
```json
{
  "error": "Bad Gateway",
  "message": "Failed to fetch calendar data from ICS URL"
}
```

**Troubleshooting:**

1. **Test URL directly:**
   ```bash
   curl "YOUR_ICS_URL"
   ```
   Should return ICS data starting with `BEGIN:VCALENDAR`

2. **Check URL is accessible:**
   - Private calendars need public ICS URL
   - Firewall may block container access
   - URL may require authentication

3. **Google Calendar specific:**
   - Make calendar public
   - Get the **public iCal address**
   - Format: `https://calendar.google.com/calendar/ical/.../public/basic.ics`

4. **Timeout issues:**
   - Some calendars are slow to respond
   - Try a different calendar to test

---

### No events showing

**Symptoms:** Image generates but shows no events

**Possible causes:**

1. **Calendar is empty:**
   - Add test events
   - Check calendar has events in the date range

2. **Wrong date range:**
   ```json
   {
     "expandRecurringFrom": -31,  // 31 days in past
     "expandRecurringTo": 31       // 31 days in future
   }
   ```
   **Solution:** Expand range if events are further out

3. **Events are filtered by template:**
   - Check template code
   - Some templates only show upcoming events
   - Test with built-in template: `"template": "week-view"`

---

### Recurring events not showing

**Symptoms:** One-time events show, but recurring events don't

**Cause:** Recurring events need to be expanded

**Solution:** Ensure config has expansion settings:
```json
{
  "expandRecurringFrom": -31,  // Look back 31 days
  "expandRecurringTo": 365     // Look forward 365 days
}
```

Increase values if events are further in the future.

---

## Image Generation Issues

### Blank/empty image

**Symptoms:** Image downloads but is blank or white

**Troubleshooting:**

1. **Check template HTML:**
   - Download the `.html` file: `/output/output-0.html` (during dev)
   - Open in browser to see rendered output
   - Look for CSS/layout issues

2. **Common CSS issues:**
   ```css
   /* ✗ Wrong - content might be hidden */
   body {
     width: 800px;
     height: 600px;
     overflow: hidden;  /* Content outside viewport is cut */
   }
   
   /* ✓ Correct */
   body {
     width: 800px;
     height: 600px;
     background: white;  /* Ensure background color */
   }
   ```

3. **Font rendering issues:**
   - Some fonts may not load
   - Use web-safe fonts or include font files

---

### Image shows errors or "undefined"

**Symptoms:** Image contains text like "undefined" or JavaScript errors

**Cause:** Template accessing missing data

**Solution:** Add null checks:

```javascript
// ✗ Wrong - crashes if location is undefined
const location = event.location.toUpperCase();

// ✓ Correct - safe access
const location = event.location || 'No location';
const location = event.location?.toUpperCase() || 'No location';
```

---

### Characters not displaying (emoji, special chars)

**Symptoms:** Boxes or missing characters instead of emoji

**Cause:** Font doesn't include those characters

**Solution:**

1. **Add charset meta tag:**
   ```html
   <head>
     <meta charset="UTF-8">
   </head>
   ```

2. **Use system fonts with emoji support:**
   ```css
   body {
     font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 
                  Arial, sans-serif;
   }
   ```

3. **Test with simple emojis first:** ☀ ⛅ ☁

---

### Image generation is slow

**Symptoms:** Requests take 8+ seconds

**Cause:** Fresh generation on every request

**Solutions:**

1. **Enable pre-generation:**
   ```json
   {
     "preGenerateInterval": "*/5 * * * *"  // Every 5 minutes
   }
   ```
   Response time: ~8s → <100ms

2. **Optimize template:**
   - Reduce DOM complexity
   - Minimize large images
   - Limit number of events rendered

3. **Use faster hardware:**
   - Raspberry Pi 3: ~8 seconds
   - Raspberry Pi 4: ~4 seconds
   - Modern PC: ~1 second

---

## Template Issues

### "Template not found"

**Error:**
```json
{
  "error": "Internal Server Error",
  "message": "Template rendering failed",
  "details": "Template not found: my-template"
}
```

**Troubleshooting:**

1. **Check template filename:**
   - Must be: `my-template.js`
   - Located in: `/addon_configs/17f877f5_calendar2image/templates/`

2. **Check config references it correctly:**
   ```json
   {
     "template": "my-template"  // No .js extension!
   }
   ```

3. **Built-in templates:**
   - Available: `week-view`, `today-view`
   - No files needed (built into add-on)

4. **Try a working example:**
   - Browse **[template-samples](template-samples/)** for ready-to-use examples
   - Copy a sample template to test your setup

---

### Template changes not showing

**Symptoms:** Edited template but image hasn't changed

**Cause:** Cache is serving old image

**Solutions:**

1. **Use fresh endpoint:**
   ```
   http://homeassistant.local:3000/api/0/fresh.png
   ```

2. **Disable caching temporarily:**
   ```json
   {
     // Remove or comment out preGenerateInterval
     // "preGenerateInterval": "*/5 * * * *"
   }
   ```

3. **Wait for next generation:**
   - If `preGenerateInterval` is set
   - Wait for next scheduled run
   - Check logs for regeneration

4. **Verify file was saved:**
   - Not just auto-save preview
   - Press Ctrl+S explicitly

---

### Template syntax errors

**Error in logs:**
```
SyntaxError: Unexpected token
```

**Common issues:**

1. **Missing module.exports:**
   ```javascript
   // ✗ Wrong
   function myTemplate(data) { ... }
   
   // ✓ Correct
   module.exports = function(data) { ... };
   ```

2. **Template literal errors:**
   ```javascript
   // ✗ Wrong - missing closing `
   return `<html>${data.events.map(...)
   
   // ✓ Correct
   return `<html>${data.events.map(...)}`
   ```

3. **Unclosed HTML tags:**
   ```javascript
   // Check all tags are closed
   return `
     <html>
       <body>
         <div>Content
       </body>  <!-- Missing </div> -->
     </html>
   `;
   ```

---

## Extra Data Issues

### Extra data not loading

**Symptoms:** `extraData` is empty object `{}`

**Troubleshooting:**

1. **Check logs:**
   ```
   [ExtraData] Failed to fetch extra data from http://...: Connection refused
   ```

2. **Test URL directly:**
   ```bash
   curl -H "Authorization: Bearer TOKEN" http://URL
   ```

3. **Common issues:**
   - URL not accessible from container
   - Invalid authorization token
   - Response is not valid JSON
   - Request timeout (>5 seconds)

3. **Debug in template:**
   ```javascript
   return `<pre>${JSON.stringify(extraData, null, 2)}</pre>`;
   ```

4. **Check Home Assistant logs for template debug info:**
   Templates can use `console.log()` for debugging - output appears in HA logs:
   ```javascript
   console.log('[Template] Processing', events.length, 'events');
   console.log('[Template] Extra data:', extraData);
   ```

See [Extra Data Guide](EXTRA-DATA.md) for more details.

---

## Cache Issues

### Cache not working

**Symptoms:** Every request takes 8+ seconds (X-Cache: DISABLED)

**Cause:** No `preGenerateInterval` configured

**Solution:**
```json
{
  "preGenerateInterval": "*/5 * * * *"  // Add this!
}
```

Check response headers:
```bash
curl -I http://homeassistant.local:3000/api/0.png
# Should see: X-Cache: HIT
```

---

### Cache serves stale data

**Symptoms:** Calendar updated but image still shows old events

**Expected behavior:**
- With cache: Updates on next scheduled generation
- Without cache: Always fresh data

**Solutions:**

1. **Force fresh generation:**
   ```
   http://homeassistant.local:3000/api/0/fresh.png
   ```

2. **Reduce generation interval:**
   ```json
   {
     "preGenerateInterval": "*/1 * * * *"  // Every minute
   }
   ```

3. **Disable caching for real-time data:**
   ```json
   {
     // Remove preGenerateInterval for always-fresh data
   }
   ```

4. **Check CRC32 history for debugging:**
   - View history page: `http://homeassistant.local:3000/crc32-history/0`
   - See when images were generated and if CRC32 values changed
   - Check generation triggers (scheduled, cache_miss, startup, etc.)
   - Analyze CRC32 blocks to identify when content actually changed

---

## Performance Issues

### High CPU usage

**Cause:** Chromium (Puppeteer) is CPU-intensive

**Normal behavior:**
- Spike during image generation
- Returns to idle after generation

**If constantly high:**
- Check for errors causing infinite loops
- Check if multiple instances running
- Restart add-on

---

### High memory usage

**Normal usage:** 200-400 MB

**High usage (>500 MB):**
- Complex templates with many elements
- Large images or backgrounds
- Memory leak (restart add-on)

**Solutions:**
- Simplify template
- Reduce image dimensions
- Restart add-on periodically

---

## Development Issues

### Container won't start (Docker Compose)

**Error:**
```
ERROR: Cannot start service calendar2image-dev
```

**Solutions:**

1. **Port already in use:**
   ```powershell
   # Find process using port
   netstat -ano | findstr :3000
   
   # Kill process or change port in docker-compose.yml
   ```

2. **Clean Docker:**
   ```powershell
   docker compose down
   docker system prune -f
   docker compose up
   ```

3. **Rebuild container:**
   ```powershell
   docker compose build --no-cache
   docker compose up
   ```

---

### Watcher can't connect to container

**Error:**
```
Container connection failed
```

**Check container is running:**
```powershell
docker ps
# Should show: calendar2image-dev
```

**Verify port:**
```powershell
docker ps
# PORTS column should show: 0.0.0.0:3000->3000/tcp
```

**Test connection:**
```powershell
curl http://localhost:3000/health
```

See [Template Development Guide](TEMPLATE-DEVELOPMENT.md) for more.

---

## Getting Help

### Before asking for help:

1. **Check the logs** - Most issues show error messages
2. **Test with built-in template** - Isolate if it's template-specific
3. **Test with sample calendar** - Isolate if it's calendar-specific
4. **Try fresh generation** - `/api/0/fresh.png`
5. **Restart add-on** - Clears cache and state

### When reporting issues:

Include:
1. **Add-on version** - From Info tab
2. **Error message** - From logs
3. **Configuration** - Sanitized (remove tokens!)
4. **Steps to reproduce** - What you did
5. **Expected vs actual** - What should happen vs what happened

### Where to get help:

- **GitHub Issues:** https://github.com/jantielens/ha-calendar2image/issues
- **Home Assistant Community:** [Link TBD]

---

## Quick Diagnostics

Run these to gather diagnostic info:

```bash
# Add-on logs
# From HA interface: Add-on → Log → Copy all

# Test health
curl http://localhost:3000/health

# Test image generation
curl http://localhost:3000/api/0.png -o test.png
ls -lh test.png

# Test CRC32
curl http://localhost:3000/api/0.png.crc32

# Check config files
ls -la /addon_configs/17f877f5_calendar2image/

# Validate config JSON
cat /addon_configs/17f877f5_calendar2image/0.json | python -m json.tool
```

Include results when reporting issues!
