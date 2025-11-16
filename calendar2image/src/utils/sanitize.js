const path = require('path');

/**
 * Sanitize a config name to prevent path traversal attacks
 * Removes path separators, parent directory references, and leading/trailing dots
 * 
 * @param {string} name - The config name to sanitize
 * @returns {string} Sanitized config name
 * @throws {Error} If the name is empty or invalid after sanitization
 */
function sanitizeConfigName(name) {
  if (typeof name !== 'string' || !name) {
    throw new Error('Config name must be a non-empty string');
  }

  // Remove .json extension if present (we'll add it back)
  let sanitized = name.replace(/\.json$/i, '');

  // Check for empty name after removing extension
  if (!sanitized) {
    throw new Error('Config name cannot be empty');
  }

  // Prevent path traversal by removing:
  // - Path separators (/, \)
  // - Parent directory references (..)
  // - Current directory reference (.)
  // - Leading/trailing whitespace
  sanitized = sanitized.replace(/[\/\\]/g, '');
  sanitized = sanitized.replace(/\.\./g, '');
  sanitized = sanitized.replace(/^\./g, '');
  sanitized = sanitized.trim();

  // Check if anything remains after sanitization
  if (!sanitized) {
    throw new Error('Config name is invalid after sanitization');
  }

  // Verify the sanitized name doesn't equal problematic values
  const normalized = sanitized.toLowerCase();
  if (normalized === '.' || normalized === '..' || normalized === 'con' || 
      normalized === 'prn' || normalized === 'aux' || normalized === 'nul') {
    throw new Error(`Config name '${name}' is reserved and cannot be used`);
  }

  return sanitized;
}

/**
 * Check if a string is a valid config name (filename without .json extension)
 * Valid names can contain letters, numbers, spaces, hyphens, underscores, and unicode characters
 * Invalid names contain path separators or parent directory references
 * 
 * @param {string} name - The config name to validate
 * @returns {boolean} True if valid, false otherwise
 */
function isValidConfigName(name) {
  try {
    const sanitized = sanitizeConfigName(name);
    // If sanitization doesn't change the name (except extension removal), it's valid
    const nameWithoutExt = name.replace(/\.json$/i, '');
    return sanitized === nameWithoutExt.trim();
  } catch {
    return false;
  }
}

/**
 * Convert a config name to a filesystem-safe cache key
 * Replaces spaces and special characters with safe alternatives
 * 
 * @param {string} name - The config name
 * @returns {string} Filesystem-safe name for cache files
 */
function toCacheName(name) {
  const sanitized = sanitizeConfigName(name);
  // For cache filenames, we want to avoid spaces and special chars
  // Replace spaces with underscores, keep alphanumeric, hyphens, and underscores
  return sanitized
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_\-\u0080-\uFFFF]/g, '_');
}

module.exports = {
  sanitizeConfigName,
  isValidConfigName,
  toCacheName
};
