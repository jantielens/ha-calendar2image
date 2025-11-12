# Changelog

## [0.12.2] - 2025-11-12

### Fixed
- **Timezone Handling for Scheduled Generation** (#46)
  - Fixed scheduler to respect configured timezone instead of hardcoded UTC
  - `preGenerateInterval` schedules now execute in the configured timezone (e.g., "0 8 * * *" runs at 8am Europe/Brussels, not 8am UTC)
  - Worker process now passes timezone to `getCalendarEvents()` for consistent event rendering
  - Both scheduled and manual `/fresh` generation now use the same timezone for event times
  - Added timezone field to job status tracking for monitoring
  - If no timezone is configured, defaults to UTC (backward compatible)
  
### Added
- **Timezone Tests** - Added comprehensive test coverage for scheduler timezone handling
  - Test for configured timezone (Europe/Brussels example)
  - Test for UTC default when timezone not specified
  - All 258 tests passing (2 new tests added)

### Documentation
- Updated CONFIGURATION.md to clarify that `timezone` affects both event display AND schedule execution
- Added "Timezone Awareness" warning to `preGenerateInterval` documentation
- Updated config-sample-README.md to reflect timezone's dual purpose

## [0.12.1] - 2025-11-11

### Fixed
- **Levels Gamma Correction** - Fixed gamma correction to match Paint.NET behavior
  - Replaced Sharp's `gamma()` function with LUT-based pixel manipulation
  - Sharp's `gamma()` is designed for resize operations and doesn't apply simple value^gamma transformation
  - Implemented `createGammaLUT()` to generate 256-element lookup table for any gamma 0.1-8.0
  - Implemented `applyLUT()` to apply lookup table to pixel data (skips alpha channel)
  - Gamma correction now produces mathematically correct output matching Paint.NET
  - All 256 tests pass with the corrected implementation
  - Regenerated all documentation matrix images with correct gamma behavior

### Technical Details
Sharp's built-in `gamma()` function is optimized for image resize operations and doesn't perform standalone gamma correction as expected. It also clamps values above 3.0. The fix implements a lookup table (LUT) approach that correctly applies the formula: `output = 255 * (input/255)^gamma` for each pixel value, matching Paint.NET's Levels adjustment behavior exactly.

## [0.12.0] - 2025-11-11

### Added
- **Paint.NET-Style Levels Adjustment** (#43)
  - New `adjustments.levels` object providing professional-grade tonal control
  - Full control over input/output black/white points (0-255) and gamma (0.1-8.0)
  - Parameters exactly match Paint.NET's Levels adjustment dialog
  - Processing order: Input mapping → Gamma → Output mapping
  - Use case: Darken mid-tones (e.g., emoji icons) without affecting pure white backgrounds
  - Extended gamma range to 0.1-8.0 (vs legacy 0.1-3.0) for extreme adjustments
  - All parameters optional with sensible defaults (inputBlack: 0, inputWhite: 255, gamma: 1.0, outputBlack: 0, outputWhite: 255)
  
### Changed
- **Adjustment Pipeline Order** - Levels now replaces legacy gamma step for cleaner processing
  - New order: Normalize → **Levels** → Brightness → Contrast → Saturation → Hue → Sharpen → Invert → Threshold → Dithering
  - Legacy `gamma` parameter now internally converted to `levels.gamma` for backward compatibility
  - If both `gamma` and `levels.gamma` are present, `levels.gamma` takes precedence
  
### Deprecated
- **Legacy gamma parameter** - Still supported but marked as legacy in documentation
  - Prefer `levels.gamma` for new configurations (supports wider range: 0.1-8.0)
  - Old configs continue working unchanged (zero breaking changes)
  - Documentation updated with migration examples

### Documentation
- Added comprehensive Levels section to IMAGE-ADJUSTMENTS.md with Paint.NET mapping
- Updated adjustment order documentation across all examples
- Added examples for common use cases: darkening emojis, e-ink optimization, output range compression
- Marked legacy gamma parameter with migration guidance

## [0.11.2] - 2025-11-11

### Changed
- **Updated project description** across all documentation to better reflect data source flexibility
  - New description emphasizes support for calendars, other data sources, or both
  - Highlights optional ICS feeds and external data source capabilities
  - Makes it clear the add-on can work with calendars only, data only, or combined
  - Updated in: config.yaml, package.json, and both README files

## [0.11.1] - 2025-11-11

### Fixed
- **Image adjustments now applied to /fresh endpoint** (#83)
  - Fixed bug where `config.adjustments` parameter was not passed to `generateImage()` function
  - Both `/api/:index.:ext` and `/api/:index/fresh.:ext` endpoints now consistently apply configured adjustments
  - Ensures e-ink displays, LCDs, and OLEDs receive properly adjusted images regardless of endpoint used
  - Added comprehensive test coverage for adjustments parameter handling

## [0.11.0] - 2025-11-11

### Added
- **Image Adjustments for Display Optimization**
  - New optional `adjustments` configuration field to optimize images for different display hardware
  - **Tier 1 (Essential) adjustments**: brightness (-100 to +100), contrast (-100 to +100), saturation (-100 to +100), gamma (0.1 to 3.0), sharpen (boolean), invert (boolean)
  - **Tier 2 (Display-specific) adjustments**: hue (-180 to +180), normalize (boolean), threshold (0-255), dithering (Floyd-Steinberg and Atkinson algorithms)
  - All adjustments implemented using native Sharp operations for optimal performance
  - Floyd-Steinberg dithering for general use (more aggressive error diffusion)
  - Atkinson dithering optimized for e-ink displays (lighter pattern, less ghosting)
  - Dithering works with existing bit-depth quantization (1, 2, 4, 8-bit)
  - All processing is fully deterministic (same config produces identical output)
  - Non-breaking change: existing configurations without `adjustments` work unchanged
- **Example configurations** for common display types:
  - E-ink display (Waveshare 4-bit): contrast, gamma, sharpen, Atkinson dither
  - Outdoor LCD (sunlight): brightness, contrast, normalize, sharpen
  - OLED dashboard: saturation, hue, contrast
- **Comprehensive documentation** in CONFIGURATION.md:
  - All adjustment parameters with ranges and descriptions
  - When to use each adjustment type
  - Performance impact details (~250ms worst case)
  - Dithering algorithm explanation

### Changed
- **Image processing pipeline** - Adjustments applied after rotation, before bit-depth quantization for optimal quality
- **Bit-depth quantization** - Enhanced to support dithering algorithms alongside existing rounding quantization

### Performance
- Basic adjustments: ~10-30ms overhead
- Normalize: ~20-40ms overhead
- Sharpen: ~30-50ms overhead
- Dithering (800×480): ~100-150ms overhead
- Total worst case: ~250ms (within 300ms requirement)
- No performance impact when adjustments not configured

### Documentation
- Updated CONFIGURATION.md with Image Adjustments section
- Added adjustment parameter reference table
- Included 3 practical example configurations
- Explained dithering algorithms and when to use them

## [0.10.0] - 2025-11-11

### Added
- **Optional icsUrl for extraData-only templates**
  - The `icsUrl` field is now optional in configuration files
  - Templates receive an empty events array `[]` when `icsUrl` is not provided
  - Enables new use cases: weather dashboards, info screens, data visualizations without calendar events
  - Maintains full backward compatibility - existing configurations with `icsUrl` work unchanged
- **New built-in template: today-weather**
  - Weather dashboard template using Open-Meteo API data
  - Displays current temperature, weather conditions, humidity, wind speed
  - Shows 12-hour forecast with temperature and precipitation
  - Clean design optimized for e-ink displays
  - Example of extraData-only template usage (no calendar required)
- **Sample weather configuration**
  - Added `sample-weather.json` demonstrating weather dashboard setup
  - Uses Open-Meteo API for Brussels, Belgium coordinates
  - Pre-generation enabled for fast responses (every 15 minutes)
  - Grayscale PNG format optimized for e-ink displays

### Changed
- **Configuration schema**
  - `template` is now the only required field
  - `icsUrl` moved from required to optional fields
  - Calendar fetching is skipped when `icsUrl` is not present
  - Empty events array passed to templates when no calendar configured

### Documentation
- Updated CONFIGURATION.md to reflect optional `icsUrl`
- Added weather dashboard example without calendar
- Updated README.md with new `today-weather` template
- Updated config-sample-README.md schema documentation
- Clarified use cases for extraData-only templates

## [0.9.0] - 2025-11-11

### Changed
- **Timezone Configuration - Breaking Change for Deprecated Abbreviations**
  - ⚠️ **Action Required**: If you use timezone abbreviations like `"CET"`, `"EST"`, `"PST"`, etc., update your configuration to use proper IANA timezone names
  - Replace `"CET"` with region-based names like `"Europe/Brussels"`, `"Europe/Berlin"`, etc.
  - Replace `"EST"` with `"America/New_York"`, `"PST"` with `"America/Los_Angeles"`, etc.
  - See [IANA Timezone Database](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones) for valid timezone names

### Fixed
- **Documentation: Corrected all timezone examples**
  - Updated all template sample documentation to use proper IANA timezone format (`"Europe/Brussels"` instead of `"CET"`)
  - Updated template samples: dayview-with-weather, weekview-with-weather-bar, weekview-with-weather-bar-small, weekview-with-weather-bar-multiics
  - Added comprehensive IANA timezone reference and guidance to CONFIGURATION.md

### Added
- **Enhanced timezone validation on config page**
  - Config page now displays clear validation error badge when deprecated timezone abbreviations are detected
  - Error message: "Invalid timezone abbreviation - use IANA region/city format (e.g., 'Europe/Berlin', not 'CET')"
  - Console warnings logged when invalid or deprecated timezones are detected during validation
  - Warnings include link to IANA timezone database for reference

### Documentation
- **CONFIGURATION.md**: Added explicit warning about timezone abbreviations not being valid
- **CONFIGURATION.md**: Added link to [IANA Timezone Database](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)
- Clarified that only IANA region/city format is accepted (e.g., `"Europe/Berlin"`, `"America/New_York"`)
- Added examples of correct and incorrect timezone formats throughout documentation

## [0.8.9] - 2025-11-08

### Fixed
- **Timeline Page: Display absolute timestamps instead of relative times**
  - Removed JavaScript code that converted timestamps to relative format ("25s ago", "3m ago")
  - Events now display precise, locale-aware timestamps (e.g., "11/8/2025, 5:44:31 PM")
  - Timestamps remain accurate and don't require periodic client-side updates
  - Improves debugging, troubleshooting, and historical event tracking

## [0.8.8] - 2025-11-08

### Added
- **Version display in web interface and logs**
  - Version now displayed in web interface header (e.g., "Version 0.8.8")
  - Startup logs show version in banner (e.g., "Calendar2Image Add-on v0.8.8")
  - Image generation logs include version for easier troubleshooting
  - Created `src/utils/version.js` to centrally read version from package.json

## [0.8.7] - 2025-11-08

### Fixed
- **Timeline: Optimized ExtraData cache logging to preserve CRC32 block continuity**
  - Removed `EXTRA_DATA_CACHE_HIT` and `EXTRA_DATA_STALE_SERVE` timeline events
  - These frequent events were breaking CRC32 block grouping on the timeline page
  - Cache hits and stale serves are still logged to console for debugging
  - Only cache refreshes (`EXTRA_DATA_REFRESH`) are logged to timeline, which are significant events
  - CRC32 blocks now properly group consecutive events with the same image version
  - Non-CRC32 events (ICS, config, system, errors) continue to display in chronological order

### Technical Details
- ExtraData cache hits and stale serves no longer create timeline events
- Timeline page CRC32 grouping now works correctly without interruptions from cache events
- Console logging still provides full visibility into cache behavior for debugging

## [0.8.6] - 2025-11-08

### Added
- **File-based ExtraData caching** - ExtraData cache now stored on disk (survives restarts, works across worker processes)
- **Stale-while-revalidate pattern** - ExtraData never blocks image generation or downloads
  - Returns cached data immediately, even if expired
  - Refreshes data in background without blocking
- **Enhanced timeline logging for ExtraData** - Track cache hits, misses, stale serves, and background refreshes
- **Multi-process support** - Cache shared between main process and all worker processes (critical for PR #22 architecture)

### Fixed
- ExtraData cache now compatible with multi-process worker architecture from PR #22
- ExtraData downloads never delay image generation or CRC32/image downloads

### Technical Details
- ExtraData cache files stored in cache directory with MD5-hashed filenames
- Background refresh prevents duplicate fetches with tracking
- Comprehensive logging: cache hits, stale serves, refreshes, and errors
- Timeline events: `EXTRA_DATA_FETCH`, `EXTRA_DATA_CACHE_HIT`, `EXTRA_DATA_STALE_SERVE`, `EXTRA_DATA_REFRESH`, `EXTRA_DATA_ERROR`

## [0.8.5] - 2025-11-08

### Fixed
- **Critical: Fixed worker process browser resource conflicts causing generation timeouts**
  - Implemented sequential worker processing to prevent multiple Puppeteer browsers from competing for resources
  - Fixed protocol errors: "Session closed. Most likely the page has been closed" during scheduled generation
  - Increased worker timeout from 30s to 60s since workers now run sequentially without resource contention
  - Added worker queue management to ensure reliable image generation under all load conditions
- **Critical: Fixed "[object Object]" display issue in generated calendar images**
  - Fixed missing `await` keyword when calling `renderTemplate()` in worker process
  - Template system was returning Promise objects instead of rendered HTML strings
  - Images now display proper calendar content instead of "[object Object]" placeholder
- **Fixed Buffer serialization issue in IPC communication**
  - Fixed "data argument must be of type Buffer" error when saving generated images
  - Worker processes now properly serialize Buffer data as base64 for IPC transport
  - Scheduler correctly reconstructs Buffer from base64 string before caching
- **Fixed missing timeline events for scheduled generations**
  - Worker processes now properly log generation events to timeline
  - Added support for passing trigger type from scheduler to worker
  - Timeline now shows all scheduled generation events with proper metadata
  - Template `console.log()` statements now appear in Home Assistant logs for debugging
- **Improved test coverage for scheduler and worker processes**
  - Fixed scheduler unit tests to properly simulate IPC Buffer serialization
  - Added comprehensive scheduler integration tests that validate end-to-end worker communication
  - Tests now catch Buffer serialization issues that were previously missed

### Added
- **Queue Protection: Automatic prevention of duplicate scheduled jobs**
  - System now skips generation requests if the same configuration is already queued for processing
  - Prevents infinite queue growth when generation time exceeds scheduling interval (e.g., 25s generation with 1min schedule)
  - Logs warning messages to console: `⚠️ Skipping config X (trigger: scheduled) - already queued for generation`
  - Timeline logging captures skipped jobs with metadata (trigger, reason, queue length) for monitoring
  - Per-configuration protection ensures each config can have max 1 queued job while allowing other configs to proceed
  - Essential for Raspberry Pi deployments where generation can take 20+ seconds

### Technical Details
PR #22 introduced a regression where multiple worker processes would launch Puppeteer browsers simultaneously, causing resource exhaustion and timeouts. Each worker creating its own browser instance led to memory/CPU contention. Additionally, Buffer objects were not properly serialized through IPC, causing cache save failures. The fix ensures workers execute sequentially, sharing system resources efficiently while maintaining the event loop isolation benefits, and properly handles Buffer serialization via base64 encoding.

The queue protection feature prevents a critical issue where frequent scheduling (e.g., every minute) combined with slow generation times (25+ seconds on Raspberry Pi) would cause exponential queue growth, eventually consuming all available memory. The per-config duplicate detection ensures that while Config A waits for generation, Config B can still be processed normally.

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