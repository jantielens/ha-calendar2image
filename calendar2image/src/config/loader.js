const fs = require('fs').promises;
const path = require('path');
const { validateConfig, applyDefaults } = require('./schema');
const { sanitizeConfigName } = require('../utils/sanitize');

// Configuration directory
// Home Assistant mounts addon_config at /config inside the container
// On the host: /addon_configs/<slug>/ (e.g., /addon_configs/f5965daa_calendar2image/)
const CONFIG_DIR = process.env.CONFIG_DIR || '/config';
const HOST_CONFIG_PATH = process.env.HOST_CONFIG_PATH;

console.log(`Configuration directory: ${CONFIG_DIR}`);
if (HOST_CONFIG_PATH && HOST_CONFIG_PATH !== CONFIG_DIR) {
  console.log(`Host filesystem path: ${HOST_CONFIG_PATH}`);
}


/**
 * Loads a single configuration file by name
 * @param {string|number} name - Configuration name (e.g., 'kitchen', 'vacation-2024', or numeric like 0, 1, 2)
 * @param {string} [configDir] - Optional custom config directory
 * @returns {Promise<Object>} Configuration object with defaults applied
 * @throws {Error} If config file doesn't exist, is invalid, or fails validation
 */
async function loadConfig(name, configDir = CONFIG_DIR) {
  // Support both numeric (legacy) and string names
  let configName;
  if (typeof name === 'number') {
    if (name < 0) {
      throw new Error(`Invalid config index: ${name}. Must be a non-negative number`);
    }
    configName = name.toString();
  } else if (typeof name === 'string') {
    // Sanitize the name to prevent path traversal
    try {
      configName = sanitizeConfigName(name);
    } catch (error) {
      throw new Error(`Invalid config name: ${error.message}`);
    }
  } else {
    throw new Error(`Invalid config name: ${name}. Must be a string or non-negative number`);
  }

  const configPath = path.join(configDir, `${configName}.json`);
  
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
 * @returns {Promise<Array>} Array of objects with name and config
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

  // Filter for all JSON files (not just numeric ones)
  const configFiles = files.filter(file => file.endsWith('.json'));

  if (configFiles.length === 0) {
    throw new Error(`No configuration files found in ${configDir}. Expected .json files`);
  }

  const configs = [];
  const errors = [];

  for (const file of configFiles) {
    const name = path.basename(file, '.json');
    try {
      const config = await loadConfig(name, configDir);
      configs.push({ 
        name,
        // Keep 'index' for backward compatibility if the name is numeric
        index: /^\d+$/.test(name) ? parseInt(name, 10) : undefined,
        config 
      });
    } catch (error) {
      errors.push(`Config ${name}: ${error.message}`);
    }
  }

  // If any configs failed to load, throw error with all failures
  if (errors.length > 0) {
    throw new Error(`Failed to load configurations:\n${errors.join('\n')}`);
  }

  // Sort configs: numeric first (by number), then alphabetic
  configs.sort((a, b) => {
    const aIsNumeric = typeof a.index === 'number';
    const bIsNumeric = typeof b.index === 'number';
    
    if (aIsNumeric && bIsNumeric) {
      return a.index - b.index;
    } else if (aIsNumeric) {
      return -1; // a comes first
    } else if (bIsNumeric) {
      return 1; // b comes first
    } else {
      // Both are non-numeric, sort alphabetically
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    }
  });

  return configs;
}

/**
 * Validates that the configuration directory exists and contains valid configs
 * This should be called at startup to fail fast if configs are invalid
 * @param {string} [configDir] - Optional custom config directory
 * @returns {Promise<Array>} Array of objects with index and config
 * @throws {Error} If validation fails
 */
async function validateConfigs(configDir = CONFIG_DIR) {
  console.log(`Loading configurations from ${configDir}...`);
  const configs = await loadAllConfigs(configDir);
  const count = configs.length;
  console.log(`Successfully loaded ${count} configuration(s)`);
  return configs;
}

module.exports = {
  loadConfig,
  loadAllConfigs,
  validateConfigs,
  CONFIG_DIR,
  HOST_CONFIG_PATH
};
