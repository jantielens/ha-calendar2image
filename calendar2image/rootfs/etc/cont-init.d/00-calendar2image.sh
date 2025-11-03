#!/usr/bin/with-contenv bashio
# ==============================================================================
# Prepare calendar2image
# ==============================================================================

bashio::log.info "Preparing Calendar2Image..."

# Home Assistant mounts addon_config at /config inside the container
CONFIG_DIR="/config"

# Try to get the addon slug from Home Assistant
ADDON_SLUG=$(bashio::addon.slug 2>/dev/null || echo "calendar2image")

# Construct the host path based on Home Assistant's addon_configs structure
# Inside container: /config -> Host: /addon_configs/<slug>/
HOST_CONFIG_PATH="/addon_configs/${ADDON_SLUG}"

bashio::log.info "Using config directory: ${CONFIG_DIR}"
bashio::log.info "Add-on slug: ${ADDON_SLUG}"
bashio::log.info "Host path (reference): ${HOST_CONFIG_PATH}"

# Export paths for use by the application
export CONFIG_DIR
export ADDON_SLUG
export HOST_CONFIG_PATH

# Copy default configuration if it doesn't exist
if [ ! -f "${CONFIG_DIR}/0.json" ]; then
    bashio::log.info "Creating default configuration (0.json)..."
    cp /app/sample-0.json "${CONFIG_DIR}/0.json"
fi

if [ ! -f "${CONFIG_DIR}/README.md" ]; then
    bashio::log.info "Copying README.md..."
    cp /app/config-sample-README.md "${CONFIG_DIR}/README.md"
fi

# Create templates directory and copy built-in templates as custom templates
if [ ! -d "${CONFIG_DIR}/templates" ]; then
    bashio::log.info "Creating templates directory..."
    mkdir -p "${CONFIG_DIR}/templates"
fi

bashio::log.info "Copying built-in templates as custom templates..."
TEMPLATES_COPIED=0
for template in /app/src/templates/built-in/*.js; do
    if [ -f "$template" ]; then
        filename=$(basename "$template")
        custom_filename="custom-${filename}"
        if [ ! -f "${CONFIG_DIR}/templates/$custom_filename" ]; then
            cp "$template" "${CONFIG_DIR}/templates/$custom_filename"
            bashio::log.info "  ✓ Copied $filename as $custom_filename"
            TEMPLATES_COPIED=$((TEMPLATES_COPIED + 1))
        fi
    fi
done
if [ $TEMPLATES_COPIED -gt 0 ]; then
    bashio::log.info "Sample templates ready - you can customize them!"
else
    bashio::log.info "All custom templates already exist"
fi

bashio::log.info "Config directory contents:"
ls -la "${CONFIG_DIR}/"

# Export CONFIG_DIR for the app to use
export CONFIG_DIR
