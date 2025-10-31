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

if [ ! -f "$CONFIG_DIR/0.json" ]; then
    echo "Copying default configuration to $CONFIG_DIR/0.json..."
    cp /app/sample-0.json "$CONFIG_DIR/0.json"
    echo "Copy completed - default configuration ready at 0.json"
else
    echo "0.json already exists"
fi

if [ ! -f "$CONFIG_DIR/README.md" ]; then
    echo "Copying README.md to $CONFIG_DIR..."
    cp /app/config-sample-README.md "$CONFIG_DIR/README.md"
    echo "Copy completed"
else
    echo "README.md already exists"
fi

# Create templates directory and copy built-in templates as custom templates
if [ ! -d "$CONFIG_DIR/templates" ]; then
    echo "Creating templates directory..."
    mkdir -p "$CONFIG_DIR/templates"
fi

echo "Copying built-in templates as custom templates..."
TEMPLATES_COPIED=0
for template in /app/src/templates/built-in/*.js; do
    if [ -f "$template" ]; then
        filename=$(basename "$template")
        custom_filename="custom-${filename}"
        if [ ! -f "$CONFIG_DIR/templates/$custom_filename" ]; then
            cp "$template" "$CONFIG_DIR/templates/$custom_filename"
            echo "  ✓ Copied $filename as $custom_filename"
            TEMPLATES_COPIED=$((TEMPLATES_COPIED + 1))
        else
            echo "  - $custom_filename already exists, skipping"
        fi
    fi
done
if [ $TEMPLATES_COPIED -gt 0 ]; then
    echo "Sample templates ready - you can customize them!"
else
    echo "All custom templates already exist"
fi

echo "Final config directory contents:"
ls -la "$CONFIG_DIR/"

echo "=== Starting Node.js application ==="
# Start the application
exec node src/index.js

