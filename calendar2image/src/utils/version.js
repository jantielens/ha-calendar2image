const path = require('path');
const fs = require('fs');

let cachedVersion = null;

/**
 * Get the addon version from package.json
 * @returns {string} Version string (e.g., "0.8.7")
 */
function getVersion() {
  if (cachedVersion) {
    return cachedVersion;
  }

  try {
    const packageJsonPath = path.join(__dirname, '..', '..', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    cachedVersion = packageJson.version || 'unknown';
    return cachedVersion;
  } catch (error) {
    console.warn('[Version] Failed to read version from package.json:', error.message);
    return 'unknown';
  }
}

module.exports = {
  getVersion
};
