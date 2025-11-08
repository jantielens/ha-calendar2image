# Changelog

## [0.8.4] - 2025-11-08

### Fixed
- **Event Loop Blocking During Image Generation** - Eliminated request timeouts during scheduled generation
  - Moved Puppeteer-based image generation to separate child processes using `child_process.fork()`
  - Main process remains responsive to HTTP requests even during 15-18 second generation cycles
  - CRC32 endpoint response times now consistently fast (no more 12,000ms spikes)
  - Scheduled generation runs in isolated worker processes with 30-second timeout protection
  - Worker processes automatically cleaned up after generation completes

### Technical Details
The optimization addresses event loop blocking where the main Node.js thread was unable to process incoming HTTP requests during CPU-intensive Puppeteer rendering. By forking image generation into separate child processes, the main process stays responsive and can serve cached data instantly while workers handle heavy rendering in parallel. This ensures sub-100ms response times regardless of concurrent generation activity, fixing the issue where client requests queued for 8+ seconds during generation.

## [0.8.3] - 2025-11-07

### Fixed
- **I/O Contention During Scheduled Generation** - Eliminated slow responses (1-17s) during scheduled image generation
  - Implemented in-memory cache layer to serve instant reads from RAM
  - Cache reads now bypass disk I/O entirely when image is in memory
  - All cached requests now consistently fast (<50ms) even during generation cycles
  - Concurrent read operations no longer blocked by write operations
  - Disk cache retained for persistence across restarts

### Added
- **Memory Cache Statistics** - New `getMemoryCacheStats()` function for monitoring cache performance
  - Reports number of cached entries, total memory usage, and per-config details
  - Accessible for debugging and performance monitoring
- **Memory Cache Management** - New `clearMemoryCache()` utility function
  - Useful for testing, manual maintenance, or memory management

### Technical Details
The optimization addresses a critical bottleneck where concurrent file reads were blocked during atomic cache file writes (write-then-rename), causing intermittent slow responses even with `cacheHit=true`. By adding a memory cache layer (Map), reads are now instant from RAM. When an image is saved to disk cache, it's also atomically added to the memory cache. On reads, memory is checked first (instant), falling back to disk only if not in memory. Memory footprint is minimal (~25KB per configuration). This ensures all user requests receive sub-50ms response times regardless of concurrent generation activity.

## [0.8.2] - 2025-11-07

### Fixed

- **Cache Race Condition** - Fixed race condition in cache updates that caused slow responses (6-9 seconds) during pre-generation
  - Implemented atomic file replacement using write-then-rename pattern
  - Cache files are now written to temporary files first, then atomically renamed
  - Eliminates race condition where user requests could read incomplete cache files during pre-generation
  - Users now always get fast cached responses (~20-50ms) even during image generation
  - Added cleanup of orphaned `.tmp` files on startup to handle crash recovery

## [0.8.1] - 2025-11-07

### Timeline UI Improvements

- Enhanced CRC32 display with `0x` prefix and monospace font
- Added duration display (in minutes) for CRC32 blocks
- Differentiated download types with color-coded badges (IMAGE: blue, CRC32: yellow)
- Added download duration tracking with SLOW warning for requests >500ms
- Improved metadata display with duration first and proper units (ms for downloads, s for generation)
- Removed collapse/expand state persistence for consistent UX
- Removed CRC32 History buttons from UI (functionality still available via API)

## [0.8.0] - 2025-11-06

### Performance

- **API Response Time Optimization** - Dramatically improved response times for CRC32 and image download endpoints
  - Made timeline logging non-blocking by moving it after HTTP response (fire-and-forget pattern)
  - **CRC32 endpoint**: 68% faster average (56ms → 18ms), 80% faster P95 (143ms → 28ms)
  - **Image download endpoint**: 72% faster average (93ms → 26ms), 88% faster P95 (301ms → 36ms)
  - **ESP32 workflow** (CRC32 + Image): 42% faster (78ms → 45ms average)
  - Eliminated all slow requests >500ms during concurrent operations
  - Maximum observed latency reduced by 80% (854ms → 174ms) during scheduler contention
  - All logging functionality preserved - no data loss

### Technical Details

The optimization addresses a critical bottleneck where timeline logging was blocking HTTP responses during file I/O operations. By returning responses immediately and logging asynchronously, ESP32 devices and automation clients now receive data in milliseconds instead of waiting for disk writes to complete. This is especially important during concurrent operations when the scheduler is regenerating images. Performance testing with realistic load simulation (scheduler every 5s, ESP32 polling every 2s) showed consistent sub-30ms response times (P95) with zero contention-related delays.

## [0.7.1] - 2025-11-05

### Fixed

- **PNG Bit Depth Support** - Fixed PNG output to properly honor the `bitDepth` configuration parameter
  - Added `palette: true` requirement for Sharp's `colours` option to take effect
  - Implemented proper mutually exclusive bit depth conditions (1-bit: 2 colors, 4-bit: 16 colors, 8-bit: 256 colors)
  - Added fixed-palette quantization for e-ink displays - pixels are pre-quantized to evenly-distributed levels matching e-ink hardware capabilities
  - Grayscale and color images now properly use limited color palettes for bit depths ≤ 8
  - Standard 8-bit per channel output (no palette) for bit depths > 8

### Changed

- **JPEG Quality** - Changed from bit-depth-based calculation to sensible default quality of 90
- **BMP Support Removed** - Removed incomplete BMP support to avoid confusion (was converting to PNG anyway)

### Technical Details

E-ink displays use fixed, evenly-distributed color palettes (e.g., 1-bit: [0, 255], 4-bit: [0, 17, 34, 51, 68, 85, 102, 119, 136, 153, 170, 187, 204, 221, 238, 255]). The new quantization ensures pixel values exactly match these hardware capabilities, eliminating additional dithering and improving image quality on e-ink displays.

## [0.7.0] - 2025-11-03

### Added

- **Timeline Visualization** - New debugging/monitoring page for each configuration
  - 24-hour rolling event history with automatic pruning
  - Track generations (scheduled/boot/on-demand), downloads, ICS fetches, config changes, and errors
  - Visual indicators: 🆕 emoji for CRC32 changes, event type filters, IP/host filtering for downloads
  - Auto-refresh with configurable intervals (10s/30s/60s), settings persist in localStorage
  - Git-style compact timeline with expandable JSON details
  - Accessible via Timeline button on home page and `/timeline/:index` endpoint


## [0.6.0] - 2025-11-03

### Added

- **Per-Source SSL Certificate Control** - New `rejectUnauthorized` option for individual calendar sources
  - Allows disabling SSL verification for specific calendars with certificate issues
  - Secure by default (defaults to `true`)
  - Per-source configuration prevents disabling SSL globally
  - Documented in configuration and troubleshooting guides

### Improved

- **Error Messages** - Calendar fetch errors now include actual error messages in events
  - Error events display full error details instead of generic "failed loading ics X"
  - Error messages truncated in title for display, full message in description
  - Helps users diagnose SSL, network, and server issues

### Fixed

- **SSL Certificate Chain Issues** - Resolved "unable to verify the first certificate" errors
  - Added per-source `rejectUnauthorized` configuration option
  - Config page displays warning badge for sources with SSL verification disabled
  - Comprehensive troubleshooting documentation added

## [0.5.0] - 2025-11-03

### Added

- **Interactive Configuration Viewer** - New HTML visualization page for each configuration accessible via dashboard
  - Visual representation of all settings with organized cards
  - Real-time validation with error indicators and banner
  - JSON property path tooltips showing exact configuration structure
  - Image preview with CRC32 checksum display
  - Copy-to-clipboard for paths, templates, and JSON
  - Collapsible sections for configuration and template content
  - Section descriptions explaining each setting's purpose

### Changed

- **Dashboard** - Orange "Config" button now links to interactive HTML page instead of raw JSON
- **Code Quality** - Refactored configuration handler (30% smaller, better maintainability)

### Removed

- **Dependencies** - Removed unused `croner` package (using `node-cron` instead)

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