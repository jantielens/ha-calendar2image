const fs = require('fs').promises;
const path = require('path');
const { validateConfig, applyDefaults } = require('./schema');

// Configuration directory - Home Assistant mounts /config
const CONFIG_DIR = process.env.CONFIG_DIR || '/config/calendar2image';

console.log(`Configuration directory: ${CONFIG_DIR}`);


/**
 * Loads a single configuration file by index
 * @param {number} index - Configuration index (0, 1, 2, etc.)
 * @param {string} [configDir] - Optional custom config directory
 * @returns {Promise<Object>} Configuration object with defaults applied
 * @throws {Error} If config file doesn't exist, is invalid, or fails validation
 */
async function loadConfig(index, configDir = CONFIG_DIR) {
  if (typeof index !== 'number' || index < 0) {
    throw new Error(`Invalid config index: ${index}. Must be a non-negative number`);
  }

  const configPath = path.join(configDir, `${index}.json`);
  
  let configData;
  try {
    configData = await fs.readFile(configPath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`Configuration file not found: ${configPath}`);
    }
    throw new Error(`Failed to read configuration file ${configPath}: ${error.message}`);
  }

  let config;
  try {
    config = JSON.parse(configData);
  } catch (error) {
    throw new Error(`Invalid JSON in configuration file ${configPath}: ${error.message}`);
  }

  // Validate configuration
  const validation = validateConfig(config);
  if (!validation.valid) {
    const errorMessages = validation.errors.map(err => {
      const field = err.instancePath || err.params?.missingProperty || 'root';
      return `${field}: ${err.message}`;
    }).join('; ');
    throw new Error(`Configuration validation failed for ${configPath}: ${errorMessages}`);
  }

  // Apply defaults and return
  return applyDefaults(config);
}

/**
 * Loads all configuration files from the config directory
 * @param {string} [configDir] - Optional custom config directory
 * @returns {Promise<Object>} Object mapping index to configuration
 * @throws {Error} If config directory doesn't exist or any config is invalid
 */
async function loadAllConfigs(configDir = CONFIG_DIR) {
  let files;
  try {
    files = await fs.readdir(configDir);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`Configuration directory not found: ${configDir}`);
    }
    throw new Error(`Failed to read configuration directory ${configDir}: ${error.message}`);
  }

  // Filter for JSON files matching pattern: 0.json, 1.json, etc.
  const configFiles = files.filter(file => /^\d+\.json$/.test(file));

  if (configFiles.length === 0) {
    throw new Error(`No configuration files found in ${configDir}. Expected files like 0.json, 1.json, etc.`);
  }

  const configs = {};
  const errors = [];

  for (const file of configFiles) {
    const index = parseInt(path.basename(file, '.json'), 10);
    try {
      configs[index] = await loadConfig(index, configDir);
    } catch (error) {
      errors.push(`Config ${index}: ${error.message}`);
    }
  }

  // If any configs failed to load, throw error with all failures
  if (errors.length > 0) {
    throw new Error(`Failed to load configurations:\n${errors.join('\n')}`);
  }

  return configs;
}

/**
 * Validates that the configuration directory exists and contains valid configs
 * This should be called at startup to fail fast if configs are invalid
 * @param {string} [configDir] - Optional custom config directory
 * @returns {Promise<Object>} Object mapping index to configuration
 * @throws {Error} If validation fails
 */
async function validateConfigs(configDir = CONFIG_DIR) {
  console.log(`Loading configurations from ${configDir}...`);
  const configs = await loadAllConfigs(configDir);
  const count = Object.keys(configs).length;
  console.log(`Successfully loaded ${count} configuration(s)`);
  return configs;
}

module.exports = {
  loadConfig,
  loadAllConfigs,
  validateConfigs,
  CONFIG_DIR
};
