#!/bin/sh
set -e

# Copy sample files to config directory if they don't exist
CONFIG_DIR="/addon_configs/calendar2image"

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
