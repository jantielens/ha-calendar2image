#!/usr/bin/with-contenv bashio
# ==============================================================================
# Prepare calendar2image
# ==============================================================================

bashio::log.info "Preparing Calendar2Image..."

# Home Assistant mounts addon_config at /config inside the container
CONFIG_DIR="/config"

bashio::log.info "Using config directory: ${CONFIG_DIR}"

# Copy sample files if they don't exist
if [ ! -f "${CONFIG_DIR}/sample-0.json" ]; then
    bashio::log.info "Copying sample-0.json..."
    cp /app/sample-0.json "${CONFIG_DIR}/sample-0.json"
fi

if [ ! -f "${CONFIG_DIR}/README.md" ]; then
    bashio::log.info "Copying README.md..."
    cp /app/config-sample-README.md "${CONFIG_DIR}/README.md"
fi

bashio::log.info "Config directory contents:"
ls -la "${CONFIG_DIR}/"

# Export CONFIG_DIR for the app to use
export CONFIG_DIR
