#!/bin/sh
set -e

# Copy sample files to config directory if they don't exist
# Home Assistant uses /data/addon_configs/<repo>_<slug> format
# Try to auto-detect the actual folder name
if [ -d "/data/addon_configs" ]; then
    # Find the directory that ends with _calendar2image
    CONFIG_DIR=$(find /data/addon_configs -maxdepth 1 -type d -name "*_calendar2image" | head -n 1)
    if [ -z "$CONFIG_DIR" ]; then
        echo "Warning: Could not find config directory matching *_calendar2image"
        CONFIG_DIR="/data/addon_configs/calendar2image"
    fi
else
    CONFIG_DIR="/addon_configs/calendar2image"
fi

echo "Using config directory: $CONFIG_DIR"

if [ ! -f "$CONFIG_DIR/sample-0.json" ]; then
    echo "Copying sample-0.json to $CONFIG_DIR..."
    cp /app/sample-0.json "$CONFIG_DIR/sample-0.json"
fi

if [ ! -f "$CONFIG_DIR/README.md" ]; then
    echo "Copying README.md to $CONFIG_DIR..."
    cp /app/config-sample-README.md "$CONFIG_DIR/README.md"
fi

# Start the application
exec node src/index.js
