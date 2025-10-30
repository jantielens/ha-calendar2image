#!/usr/bin/with-contenv bashio
# ==============================================================================
# Prepare calendar2image
# ==============================================================================

bashio::log.info "Preparing Calendar2Image..."

# Home Assistant mounts addon_config at /config inside the container
CONFIG_DIR="/config"

bashio::log.info "Using config directory: ${CONFIG_DIR}"

# Copy default configuration if it doesn't exist
if [ ! -f "${CONFIG_DIR}/0.json" ]; then
    bashio::log.info "Creating default configuration (0.json)..."
    cp /app/sample-0.json "${CONFIG_DIR}/0.json"
fi

if [ ! -f "${CONFIG_DIR}/README.md" ]; then
    bashio::log.info "Copying README.md..."
    cp /app/config-sample-README.md "${CONFIG_DIR}/README.md"
fi

# Create templates directory and copy sample template
if [ ! -d "${CONFIG_DIR}/templates" ]; then
    bashio::log.info "Creating templates directory..."
    mkdir -p "${CONFIG_DIR}/templates"
fi

if [ ! -f "${CONFIG_DIR}/templates/custom-week-view.js" ]; then
    bashio::log.info "Creating sample custom template (custom-week-view.js)..."
    cp /app/custom-week-view.js "${CONFIG_DIR}/templates/custom-week-view.js"
fi

bashio::log.info "Config directory contents:"
ls -la "${CONFIG_DIR}/"

# Export CONFIG_DIR for the app to use
export CONFIG_DIR
