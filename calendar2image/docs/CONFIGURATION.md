# Configuration Files

This folder contains sample configuration files for the HA Calendar2Image add-on.

## Configuration Location

Configuration files are stored in: `/addon_configs/17f877f5_calendar2image/`

This follows the Home Assistant standard for add-on configurations. The folder name includes the add-on ID (17f877f5_calendar2image).

**Sample files included**: When you first start the add-on, it automatically creates `sample-0.json` and `README.md` in this directory. You can copy and rename `sample-0.json` to `0.json` to get started quickly.

## File Naming Pattern

Configuration files must follow the naming pattern: `0.json`, `1.json`, `2.json`, etc.

## Configuration Schema

Each configuration file should contain:

```json
{
  "icsUrl": "https://example.com/calendar.ics",
  "template": "week-view",
  "grayscale": false,
  "bitDepth": 8,
  "imageType": "png",
  "expandRecurringFrom": -31,
  "expandRecurringTo": 31
}
```

### Required Fields

- **icsUrl** (string): URL to the ICS calendar file. Must start with `http://` or `https://`
- **template** (string): Name of the template to use (e.g., "week-view", "today-view")

### Optional Fields

- **grayscale** (boolean, default: `false`): Convert image to grayscale
- **bitDepth** (number, default: `8`): Color bit depth (1-32)
- **imageType** (string, default: `"png"`): Output image format. Options: `"jpg"`, `"png"`, `"bmp"`
- **expandRecurringFrom** (number, default: `-31`): Days from today to start expanding recurring events (negative for past)
- **expandRecurringTo** (number, default: `31`): Days from today to stop expanding recurring events
- **preGenerateInterval** (string, optional): Cron expression for automatic image pre-generation. When set, images are generated in the background on this schedule and served from cache for ultra-fast responses. **When NOT set, images are always generated fresh on each request** to ensure up-to-date calendar data. Examples:
  - `"*/5 * * * *"` - Every 5 minutes (recommended for cached mode)
  - `"*/1 * * * *"` - Every 1 minute (very frequent)
  - `"*/15 * * * *"` - Every 15 minutes
  - `"0 * * * *"` - Every hour at :00
  - **(omitted)** - No caching, always generate fresh (ensures real-time calendar data)

## Example Configurations

### Minimal Configuration
```json
{
  "icsUrl": "https://example.com/calendar.ics",
  "template": "week-view"
}
```

### Full Configuration
```json
{
  "icsUrl": "https://calendar.google.com/calendar/ical/example/public/basic.ics",
  "template": "today-view",
  "grayscale": true,
  "bitDepth": 1,
  "imageType": "bmp",
  "expandRecurringFrom": -60,
  "expandRecurringTo": 60,
  "preGenerateInterval": "*/5 * * * *"
}
```

### Configuration with Pre-generation (Recommended for E-ink Displays)
```json
{
  "icsUrl": "https://example.com/calendar.ics",
  "template": "week-view",
  "grayscale": true,
  "bitDepth": 2,
  "imageType": "png",
  "preGenerateInterval": "*/5 * * * *"
}
```
With pre-generation enabled, images are regenerated every 5 minutes in the background. API requests return cached images in <100ms instead of ~8 seconds for on-demand generation.

### Configuration without Pre-generation (Always Fresh)
```json
{
  "icsUrl": "https://example.com/calendar.ics",
  "template": "week-view",
  "grayscale": false,
  "imageType": "png"
}
```
Without `preGenerateInterval`, images are **always generated fresh** on each request, ensuring real-time calendar data at the cost of slower response times (~8 seconds).

## API Endpoints

Once configured, each calendar can be accessed via:

**Image Endpoints:**
- `/api/0.png` - First configuration (0.json) - Returns cached or generated image
- `/api/1.png` - Second configuration (1.json) - Returns cached or generated image
- `/api/{index}/fresh.png` - Force fresh generation, bypass cache

**Note:** Replace `.png` with `.jpg` or `.bmp` to match the `imageType` in your config file.

**CRC32 Checksum Endpoints:**
- `/api/0.png.crc32` - Get CRC32 checksum for first configuration
- `/api/1.png.crc32` - Get CRC32 checksum for second configuration
- `/api/{index}.{ext}.crc32` - Get CRC32 checksum (plain text, lowercase hex)

**E-ink Display Workflow Example:**
```python
import requests

# Check if image changed before downloading
crc = requests.get('http://homeassistant.local:3000/api/0.png.crc32').text

if crc != last_known_crc:
    # Image changed - download it
    image = requests.get('http://homeassistant.local:3000/api/0.png').content
    update_display(image)
    last_known_crc = crc
else:
    print('No update needed - saves bandwidth!')
```
