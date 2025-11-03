# Local Container Development

This guide explains how to build and run the calendar2image container locally for development and testing purposes.

## Quick Start

```bash
# Build the local development container
docker-compose -f docker-compose.local.yml build

# Start the container
docker-compose -f docker-compose.local.yml up

# Stop the container
docker-compose -f docker-compose.local.yml down

# View logs
docker logs calendar2image-local -f
```

The application will be available at: **http://localhost:3000**

## Why Two Different Dockerfiles?

The project includes two Docker configurations:

### 1. `Dockerfile` - Home Assistant Add-on (Production)
- **Base Image**: `ghcr.io/home-assistant/amd64-base:3.20` (Alpine with s6-overlay)
- **Init System**: Home Assistant's s6-overlay service manager
- **Dependencies**: Requires `bashio` (Home Assistant's Bash library)
- **Configuration**: Uses Home Assistant's addon configuration system
- **Purpose**: Runs as a managed Home Assistant add-on with full HA integration

**Key Features**:
- s6-overlay manages the Node.js process lifecycle
- bashio provides HA-specific configuration helpers
- Automatic addon configuration and service discovery
- Integrates with Home Assistant's logging and health checks

### 2. `Dockerfile.local` - Local Development (Testing)
- **Base Image**: `node:22-alpine` (Standard Node.js Alpine image)
- **Init System**: Direct Node.js execution (no s6-overlay)
- **Dependencies**: No Home Assistant-specific tools
- **Configuration**: Uses environment variables directly
- **Purpose**: Standalone development and testing without Home Assistant

**Key Features**:
- Simple, direct container startup
- Standard Node.js development workflow
- No Home Assistant dependencies
- Easier debugging and iteration

## Configuration Differences

### Home Assistant Add-on Setup
```yaml
# Uses Home Assistant's addon configuration
# Config directory automatically mounted by HA
# Environment managed by s6-overlay and bashio
```

### Local Development Setup
```yaml
# docker-compose.local.yml
environment:
  - CONFIG_DIR=/config
  - CACHE_DIR=/data/cache
  - NODE_ENV=production
volumes:
  - ../data/calendar2image:/config
  - ../data/cache:/data/cache
```

## Directory Structure

When running locally, the following directories are mapped:

| Host Path | Container Path | Purpose |
|-----------|---------------|---------|
| `../data/calendar2image/` | `/config` | Configuration JSON files |
| `../data/cache/` | `/data/cache` | Generated images and timeline data |
| `../data/calendar2image/templates/` | `/data/calendar2image/templates` | Custom templates |

## Development Workflow

### 1. Make Code Changes
Edit files in the `src/` directory on your host machine.

### 2. Rebuild Container
```bash
docker-compose -f docker-compose.local.yml build
```

### 3. Restart Container
```bash
docker-compose -f docker-compose.local.yml up
```

### 4. Test Changes
- Access the web interface at http://localhost:3000
- View timeline at http://localhost:3000/timeline/0
- Check logs with `docker logs calendar2image-local -f`

## Testing Timeline Feature

The timeline feature logs events to `/data/cache/{index}.timeline.json`. To view timeline data:

```bash
# View timeline in browser
http://localhost:3000/timeline/0

# Or check the raw JSON file
cat ../data/cache/0.timeline.json
```

Timeline events are automatically logged for:
- Image generation (startup, scheduled, on-demand)
- Image downloads (PNG, CRC32, CRC32 history)
- ICS calendar fetches
- Configuration changes
- Errors

## Troubleshooting

### Container Won't Start
```bash
# Check if port 3000 is already in use
netstat -an | grep 3000  # Linux/Mac
Get-NetTCPConnection -LocalPort 3000  # Windows PowerShell

# Stop any existing container
docker-compose -f docker-compose.local.yml down
```

### Configuration Issues
```bash
# Verify config files exist
ls -la ../data/calendar2image/*.json

# Check container logs
docker logs calendar2image-local
```

### Chromium/Puppeteer Issues
```bash
# Enter the container to debug
docker exec -it calendar2image-local sh

# Check Chromium installation
which chromium-browser
chromium-browser --version
```

## Differences from Home Assistant Environment

| Aspect | Local Development | Home Assistant Add-on |
|--------|------------------|---------------------|
| **Base Image** | `node:22-alpine` | `ghcr.io/home-assistant/amd64-base:3.20` |
| **Init System** | Direct Node.js | s6-overlay |
| **Configuration** | Environment variables | Home Assistant addon config |
| **Config Loading** | bashio not available | bashio integration |
| **Service Management** | Docker only | HA + s6-overlay |
| **Logging** | Docker logs | HA supervisor logs |
| **Restart Policy** | `unless-stopped` | Managed by HA |
| **Network** | Port 3000 exposed | Port mapped by HA config |

## Building for Home Assistant

To test the full Home Assistant add-on build:

```bash
# Build with HA base image (requires HA environment)
docker-compose build

# Note: This will fail init without Home Assistant's bashio
# Use docker-compose.local.yml for standalone testing
```

## Additional Resources

- [Dockerfile.local](../Dockerfile.local) - Simplified Dockerfile for development
- [docker-compose.local.yml](../docker-compose.local.yml) - Local development compose file
- [Dockerfile](../Dockerfile) - Production Home Assistant add-on
- [docker-compose.yml](../docker-compose.yml) - Original development compose file (requires HA base)
- [TESTING.md](./TESTING.md) - General testing documentation
- [DEV-GUIDE.md](./DEV-GUIDE.md) - Developer setup and workflow

## Next Steps

Once you've verified your changes work locally:

1. Commit your changes to the repository
2. Push to GitHub to trigger the CI/CD pipeline
3. The GitHub Actions workflow will build multi-arch images
4. Test the built add-on in a real Home Assistant environment
5. Update version and CHANGELOG.md for release
