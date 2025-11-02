# Changelog

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