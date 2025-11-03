# Week View with Weather Bar - Multi-ICS template

## Description

This template demonstrates the **multiple ICS URL support** (introduced in v0.4.0) by displaying a combined week view from multiple calendar sources. Each event is automatically prefixed with an emoji or label based on its calendar source, making it easy to distinguish between work, personal, family, and other calendars at a glance.

The template features:
- **Source identification** - Events are prefixed with customizable emojis/labels (e.g., 💼 for work, 🏠 for personal)
- **Multiple calendar sources** - Combine unlimited calendars into a single unified view
- **Weather integration** - Hourly forecast bar at the top (using Open-Meteo API)
- **Week overview** - Next 7 days with min/max temperature and weather icons
- **Past event dimming** - Events that have ended are shown in gray

![Screenshot will be added later](weekview-with-weather-bar-multiics.png)

## Multi-ICS Configuration

The key feature of this template is the `sourceMapping` configuration object at the top of the template. This maps calendar source names to prefixes that will be prepended to event titles:

```javascript
sourceMapping: {
  'Work': '💼 ',
  'Personal': '🏠 ',
  'Family': '👨‍👩‍👧 ',
  'Sports': '⚽ ',
  'Holidays': '🏖️ ',
  // Add more mappings as needed
}
```

**How it works:**
1. When you configure multiple ICS URLs with `sourceName` fields, each event gets a `sourceName` property
2. The template's `getEventPrefix()` function looks up the event's `sourceName` in the mapping
3. If found, it prepends the corresponding prefix to the event title
4. If no mapping exists, it falls back to showing the source index (e.g., `[1] `)

**Customization tips:**
- Use emojis for visual distinction (great for grayscale e-ink displays)
- Use short text labels like `[W] ` or `[P] ` for a more compact look
- Leave the prefix empty (`''`) for calendar sources you don't want to mark
- The mapping is case-sensitive, so `'Work'` ≠ `'work'`

## Configuration Example

Here's a complete configuration that combines multiple calendars:

```json
{
  "icsUrl": [
    {
      "url": "https://calendar.google.com/calendar/ical/work%40company.com/private/basic.ics",
      "sourceName": "Work"
    },
    {
      "url": "https://calendar.google.com/calendar/ical/personal%40gmail.com/private/basic.ics",
      "sourceName": "Personal"
    },
    {
      "url": "https://calendar.google.com/calendar/ical/family%40gmail.com/private/basic.ics",
      "sourceName": "Family"
    },
    {
      "url": "https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics",
      "sourceName": "Holidays"
    }
  ],
  "template": "weekview-with-weather-bar-multiics.js",
  "width": 720,
  "height": 1280,
  "grayscale": true,
  "bitDepth": 2,
  "imageType": "png",
  "expandRecurringFrom": -1,
  "expandRecurringTo": 7,
  "locale": "nl-BE",
  "timezone": "CET",
  "extraDataUrl": "https://api.open-meteo.com/v1/forecast?latitude=51.2194&longitude=4.4025&hourly=temperature_2m,weather_code",
  "extraDataCacheTtl": 3600
}
```

### Weather Configuration

The template requires weather data from the Open-Meteo API:

1. Find your location's latitude and longitude (use Google Maps or similar)
2. Update the `extraDataUrl` with your coordinates:
   - Replace `latitude=51.2194` with your latitude
   - Replace `longitude=4.4025` with your longitude
3. The URL format: `https://api.open-meteo.com/v1/forecast?latitude=YOUR_LAT&longitude=YOUR_LON&hourly=temperature_2m,weather_code`

### Single ICS URL Compatibility

This template is **fully backward compatible**. If you use a single ICS URL string instead of an array, events will have no prefix:

```json
{
  "icsUrl": "https://calendar.google.com/calendar/ical/your-calendar/private/basic.ics",
  "template": "weekview-with-weather-bar-multiics.js",
  ...
}
```

## Template Structure

This template extends the standard `weekview-with-weather-bar` template with multi-ICS support:

### 1. Multi-ICS Configuration (`CONFIG.sourceMapping`)
A mapping object where keys are calendar source names and values are prefixes:

```javascript
sourceMapping: {
  'Work': '💼 ',      // Work events get a briefcase emoji
  'Personal': '🏠 ',  // Personal events get a house emoji
  'Family': '👨‍👩‍👧 ',   // Family events get a family emoji
  // Add as many as you need
}
```

### 2. Multi-ICS Helper Function (`getEventPrefix()`)
This function determines what prefix to add to each event:

```javascript
const getEventPrefix = (event) => {
  // Check if event has a sourceName and we have a mapping for it
  if (event.sourceName && CONFIG.sourceMapping[event.sourceName]) {
    return CONFIG.sourceMapping[event.sourceName];
  }
  
  // Fallback to source index for events without sourceName
  if (typeof event.source === 'number' && event.source > 0) {
    return `[${event.source}] `;
  }
  
  // No prefix for single-source calendars
  return '';
};
```

**Event properties available:**
- `event.source` - Zero-based index of the calendar source (0, 1, 2, ...)
- `event.sourceName` - The `sourceName` you specified in the config (e.g., "Work", "Personal")

### 3. Event Rendering
When rendering events, the prefix is prepended to the title:

```javascript
const prefix = getEventPrefix(event);
const title = prefix + (event.summary || 'Untitled');
```

### 4. Standard Week View Features
All the features from the base `weekview-with-weather-bar` template are included:

- **Layout customization** - Adjust cell sizes, padding, and spacing
- **Color scheme** - Configure colors for background, borders, and past events
- **Typography** - Customize fonts for all text elements
- **Today's weather bar** - Hourly forecast with configurable time window
- **Localization** - Customize labels for your language

## Customization Guide

### Changing Prefix Style

**Option 1: Emojis (recommended for e-ink)**
```javascript
sourceMapping: {
  'Work': '💼 ',
  'Personal': '🏠 ',
  'Gym': '💪 '
}
```

**Option 2: Short text labels**
```javascript
sourceMapping: {
  'Work': '[W] ',
  'Personal': '[P] ',
  'Gym': '[G] '
}
```

**Option 3: Longer descriptive labels**
```javascript
sourceMapping: {
  'Work': 'Work: ',
  'Personal': 'Personal: ',
  'Gym': 'Gym: '
}
```

**Option 4: No prefix for specific sources**
```javascript
sourceMapping: {
  'Work': '💼 ',
  'Personal': '',  // Personal events have no prefix
  'Gym': '💪 '
}
```

### Adding New Calendar Sources

1. Add the new ICS URL to your config with a `sourceName`:
```json
{
  "url": "https://calendar.example.com/sports.ics",
  "sourceName": "Sports"
}
```

2. Add the mapping in the template's `CONFIG.sourceMapping`:
```javascript
sourceMapping: {
  'Work': '💼 ',
  'Personal': '🏠 ',
  'Sports': '⚽ ',  // New mapping
}
```

3. If you don't add a mapping, the event will show with a fallback prefix like `[2] `

### Adjusting for E-ink Displays

For optimal e-ink display rendering:

```json
{
  "grayscale": true,
  "bitDepth": 2,  // 4-color mode (black, white, 2 grays)
  "imageType": "png"
}
```

Emoji prefixes work particularly well on e-ink displays because they're high contrast and easily recognizable.

## Template Code

See [weekview-with-weather-bar-multiics.js](weekview-with-weather-bar-multiics.js) for the full template code.

## Related Documentation

- **[Configuration Guide](../CONFIGURATION.md)** - Learn about the `icsUrl` array format
- **[Week View with Weather Bar](weekview-with-weather-bar.md)** - The base template this extends
- **[Template Development](../TEMPLATE-DEVELOPMENT.md)** - Creating your own custom templates
