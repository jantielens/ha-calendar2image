# Adjustment Comparison Matrices

Comprehensive visual comparison matrices showing the effects of different image adjustment parameters on a colorful test pattern.

**For detailed parameter documentation**, see **[IMAGE-ADJUSTMENTS.md](IMAGE-ADJUSTMENTS.md)**.

## Matrix Configurations

Four matrix variations demonstrate adjustments across different output formats:

| Matrix | Description | File Size | Use Case |
|--------|-------------|-----------|----------|
| **Color** | Full RGB color | ~1.4 MB | General displays, documentation |
| **Grayscale 8-bit** | Full grayscale (256 levels) | ~1.3 MB | Monochrome displays |
| **Grayscale 4-bit** | 16 gray levels | ~0.5 MB | Limited grayscale displays |
| **Grayscale 2-bit** | 4 gray levels | ~0.4 MB | E-ink displays (4 levels) |

All matrices: **3795 × 3345 pixels**

## Matrix Structure

10 rows (one per parameter) × 2-9 columns (values per parameter):

```
Parameter    | Value 1 | Value 2 | Value 3 | ... | Value N
-------------|---------|---------|---------|-----|--------
BRIGHTNESS   |  -100   |   -75   |   -50   | ... |  +100
CONTRAST     |  -100   |   -75   |   -50   | ... |  +100
SATURATION   |  -100   |   -75   |   -50   | ... |  +100
GAMMA        |   1.0   |   1.2   |   1.5   | ... |   3.0
HUE          |  -180   |  -135   |   -90   | ... |  +180
SHARPEN      |   Off   |   On    |         |     |
NORMALIZE    |   Off   |   On    |         |     |
INVERT       |   Off   |   On    |         |     |
THRESHOLD    |    0    |   32    |   64    | ... |   255
DITHER       |   Off   | Floyd-S | Atkin.  |     |
```

## Parameters Tested

### Numeric Range (9 values each)
- **Brightness**: -100 to +100 (steps of 25)
- **Contrast**: -100 to +100 (steps of 25)
- **Saturation**: -100 to +100 (steps of 25)
- **Hue**: -180° to +180° (steps of 45°)
- **Threshold**: 0 to 255 (0, 32, 64, 96, 127, 159, 191, 223, 255)

### Gamma (7 values)
- 1.0, 1.2, 1.5, 1.8, 2.2, 2.5, 3.0

### Boolean (2 values each)
- **Sharpen**: Off, On
- **Normalize**: Off, On
- **Invert**: Off, On

### Dithering (3 values)
- Off, Floyd-Steinberg (7/16 diffusion), Atkinson (1/8 to 6 neighbors)

**Total**: 61 adjustments × 4 configurations = **244 images**

## Generation

### Docker (Recommended)
```bash
npm run test:matrix
```

Dedicated matrix test suite that:
- Generates all 4 configurations
- Validates dimensions and file integrity
- Requires Docker with Chromium

### Direct Script
```bash
# Inside Docker container only
node generate-adjustment-matrix.js
```

## Output Files

Located in `docs-user/images/`:
- `adjustment-matrix-color.png`
- `adjustment-matrix-grayscale-8bit.png`
- `adjustment-matrix-grayscale-4bit.png`
- `adjustment-matrix-grayscale-2bit.png`

## Purpose

- **Documentation**: Visual guide for users
- **Visual Regression**: Detect algorithm changes
- **Debugging**: Compare expected vs actual behavior
- **Display Preview**: See adjustments across output formats

Compare bit depth versions to understand how adjustments behave on color, grayscale, and e-ink displays.
