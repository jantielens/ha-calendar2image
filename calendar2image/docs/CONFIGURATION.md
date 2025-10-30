# Configuration Files

This folder contains sample configuration files for the HA Calendar2Image add-on.

## Configuration Location

Configuration files are stored in: `/addon_configs/calendar2image/`

This follows the Home Assistant standard for add-on configurations.

**Sample files included**: The add-on includes `sample-0.json` and `README.md` in this directory by default. You can copy and rename `sample-0.json` to `0.json` to get started quickly.

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
  "expandRecurringTo": 60
}
```

## API Endpoints

Once configured, each calendar can be accessed via:
- `/api/0` - First configuration (0.json)
- `/api/1` - Second configuration (1.json)
- etc.
