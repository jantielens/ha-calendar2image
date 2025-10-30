#!/bin/sh
set -e

echo "=== Calendar2Image Entrypoint Starting ==="

# Home Assistant mounts addon_config at /addon_configs/<slug>
# where <slug> is defined in config.yaml
CONFIG_DIR="/addon_configs/calendar2image"

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

