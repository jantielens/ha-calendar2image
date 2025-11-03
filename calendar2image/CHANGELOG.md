# Changelog

## [0.4.0] - 2025-11-03

### Added

- **Multiple ICS URL Support** - `icsUrl` now supports array format for combining multiple calendars into a single view
  - Each source can have an optional `sourceName` for identification
  - Events include `source` (index) and `sourceName` fields for template customization
  - Parallel fetching of all calendar sources for optimal performance
  - Failed sources generate "failed loading ics X" placeholder events instead of breaking the entire request
  - Full backwards compatibility with existing single-string format

### Changed

- **Event Objects** - Added `source` and `sourceName` fields to all events for multi-calendar scenarios
- **Documentation** - Updated configuration guides and template examples with multi-calendar usage

## [0.3.0] - 2025-11-02

### Added

- **Multiple Extra Data Sources** - `extraDataUrl` now supports array format for fetching from multiple APIs simultaneously
  - Each source can have independent `headers` and `cacheTtl` configuration
  - Global `extraDataHeaders` and `extraDataCacheTtl` serve as defaults
  - Header opt-out: Use `null`, `""`, or `{}` to disable global headers for specific URLs
  - Sources are fetched in parallel for optimal performance
  - Template data structure: string format → object, array format → array
  - Full backwards compatibility with existing single-string format

### Changed

- **Template Context** - `extraData` is now an array when using array format for `extraDataUrl`, remains an object for legacy string format
- **Documentation** - Updated all guides with multi-source examples and migration instructions

See [Extra Data Guide](docs-user/EXTRA-DATA.md) for complete documentation.

## [0.2.0] - 2025-11-02

### Added

- **CRC32 History Statistics** - Added "Changes in Past Hour" and "Changes in Past 24 Hours" statistics to the CRC32 history page for better monitoring of calendar update frequency

## [0.1.0] - 2025-10-31

First release with complete calendar-to-image generation functionality.

### Features

- **Generate images from calendar data** - Fetch events from any ICS URL and render as PNG/JPG/BMP
- **REST API** - Simple HTTP endpoints for on-demand or cached image generation
- **Customizable templates** - Use built-in templates or create your own with JavaScript
- **Pre-generation & caching** - Ultra-fast responses (<100ms) with scheduled background generation
- **CRC32 checksums** - Bandwidth-efficient change detection for e-ink displays
- **Extra data integration** - Fetch weather, tasks, or other JSON data for enhanced templates
- **Grayscale & bit depth control** - Optimize images for e-ink displays
- **Multiple calendars** - Configure as many calendars as needed
- **Image rotation** - Support for landscape/portrait orientations
- **Dynamic configuration detection** - Automatic detection of new/modified/deleted configuration files

---
All notable changes to this add-on will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).