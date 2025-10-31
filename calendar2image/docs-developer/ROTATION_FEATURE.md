# Image Rotation Feature

## Overview
The rotation feature allows you to rotate the captured calendar image by 0, 90, 180, or 270 degrees.

## Configuration

Add the `rotate` parameter to your configuration JSON file:

```json
{
  "icsUrl": "https://calendar.google.com/calendar/ical/...",
  "template": "week-view",
  "width": 800,
  "height": 600,
  "imageType": "png",
  "rotate": 90
}
```

## Parameter Details

- **Parameter**: `rotate`
- **Type**: Number
- **Valid Values**: `0`, `90`, `180`, `270`
- **Default**: `0` (no rotation)
- **Description**: Rotates the image clockwise by the specified degrees

## Behavior

- **0°**: No rotation (default)
- **90°**: Rotates image 90° clockwise - **dimensions will swap** (800x600 becomes 600x800)
- **180°**: Rotates image 180° - dimensions remain same
- **270°**: Rotates image 270° clockwise (or 90° counter-clockwise) - **dimensions will swap**

## Important Notes

1. **Dimension Changes**: When rotating by 90° or 270°, the width and height are automatically swapped
2. **Validation**: Invalid rotation values (e.g., 45°, 135°) will be rejected with a validation error
3. **Processing Order**: Rotation is applied after the screenshot is captured but before format conversion:
   - Screenshot → Rotation → Grayscale (if enabled) → Format Conversion
4. **Cache**: Rotated images are cached just like normal images, ensuring minimal downtime during updates

## Example Use Cases

### Portrait Display
If you have a portrait-oriented display, rotate a landscape calendar:
```json
{
  "width": 1920,
  "height": 1080,
  "rotate": 90
}
```
Result: 1080x1920 image suitable for portrait display

### Inverted Display
For upside-down mounted displays:
```json
{
  "rotate": 180
}
```

## Implementation Details

The rotation feature uses Sharp's image processing library to apply rotation transformations efficiently. The rotation is applied in the image processing pipeline to minimize performance impact while maintaining image quality.
