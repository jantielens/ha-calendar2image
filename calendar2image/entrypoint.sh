#!/bin/sh
set -e

echo "=== Calendar2Image Entrypoint Starting ==="

# Wait for /addon_configs to be mounted (up to 10 seconds)
WAIT_COUNT=0
while [ ! -d "/addon_configs" ] && [ $WAIT_COUNT -lt 20 ]; do
    echo "Waiting for /addon_configs to be mounted... ($WAIT_COUNT)"
    sleep 0.5
    WAIT_COUNT=$((WAIT_COUNT + 1))
done

# Home Assistant mounts addon_config with repository prefix
# Find the directory that matches *_calendar2image pattern
if [ -d "/addon_configs" ]; then
    echo "Found /addon_configs directory"
    echo "Contents:"
    ls -la /addon_configs/
    
    CONFIG_DIR=$(find /addon_configs -maxdepth 1 -type d -name "*_calendar2image" 2>/dev/null | head -n 1)
    
    if [ -z "$CONFIG_DIR" ]; then
        echo "Could not find *_calendar2image directory, creating default"
        CONFIG_DIR="/addon_configs/calendar2image"
        mkdir -p "$CONFIG_DIR"
    fi
else
    echo "WARNING: /addon_configs still not found after waiting"
    echo "Will create config directory anyway"
    CONFIG_DIR="/addon_configs/calendar2image"
    mkdir -p "$CONFIG_DIR" || true
fi

echo "Using config directory: $CONFIG_DIR"


# Create directory if it doesn't exist (though HA should create it)
if [ ! -d "$CONFIG_DIR" ]; then
    echo "Creating config directory: $CONFIG_DIR"
    mkdir -p "$CONFIG_DIR"
fi



# Create directory if it doesn't exist
if [ ! -d "$CONFIG_DIR" ]; then
    echo "Creating config directory: $CONFIG_DIR"
    mkdir -p "$CONFIG_DIR"
fi

# List what's in /app
echo "Files in /app:"
ls -la /app/

if [ ! -f "$CONFIG_DIR/sample-0.json" ]; then
    echo "Copying sample-0.json to $CONFIG_DIR..."
    cp /app/sample-0.json "$CONFIG_DIR/sample-0.json"
    echo "Copy completed"
else
    echo "sample-0.json already exists"
fi

if [ ! -f "$CONFIG_DIR/README.md" ]; then
    echo "Copying README.md to $CONFIG_DIR..."
    cp /app/config-sample-README.md "$CONFIG_DIR/README.md"
    echo "Copy completed"
else
    echo "README.md already exists"
fi

echo "Final config directory contents:"
ls -la "$CONFIG_DIR/"

echo "=== Starting Node.js application ==="
# Start the application
exec node src/index.js

