const fs = require('fs');
const path = require('path');

// Template cache to avoid reloading templates on every request
const templateCache = new Map();

// Paths for templates
const BUILT_IN_TEMPLATES_DIR = path.join(__dirname, 'built-in');
const CUSTOM_TEMPLATES_DIR = process.env.TEMPLATES_DIR || '/data/calendar2image/templates';

/**
 * Load a template by name
 * First checks custom templates directory, then falls back to built-in templates
 * Templates are cached after first load, but custom templates can be hot-reloaded
 * 
 * @param {string} templateName - Name of the template (without .js extension)
 * @param {boolean} forceReload - Force reload template from disk (useful for development)
 * @returns {Function} Template function that accepts data and returns HTML string
 * @throws {Error} If template is not found or fails to load
 */
function loadTemplate(templateName, forceReload = false) {
  // Try custom templates first
  const customPath = path.join(CUSTOM_TEMPLATES_DIR, `${templateName}.js`);
  if (fs.existsSync(customPath)) {
    try {
      // For custom templates, always clear require cache to enable hot-reload during development
      if (require.cache[require.resolve(customPath)]) {
        delete require.cache[require.resolve(customPath)];
      }
      
      const template = require(customPath);
      if (typeof template !== 'function') {
        throw new Error(`Template ${templateName} must export a function`);
      }
      
      // Update cache with fresh template
      templateCache.set(templateName, template);
      console.log(`Loaded custom template: ${templateName} (hot-reloaded)`);
      return template;
    } catch (error) {
      throw new Error(`Failed to load custom template ${templateName}: ${error.message}`);
    }
  }

  // For built-in templates, check cache first (they don't change)
  if (!forceReload && templateCache.has(templateName)) {
    return templateCache.get(templateName);
  }

  // Fall back to built-in templates
  const builtInPath = path.join(BUILT_IN_TEMPLATES_DIR, `${templateName}.js`);
  if (fs.existsSync(builtInPath)) {
    try {
      const template = require(builtInPath);
      if (typeof template !== 'function') {
        throw new Error(`Template ${templateName} must export a function`);
      }
      templateCache.set(templateName, template);
      console.log(`Loaded built-in template: ${templateName}`);
      return template;
    } catch (error) {
      throw new Error(`Failed to load built-in template ${templateName}: ${error.message}`);
    }
  }

  throw new Error(`Template not found: ${templateName}`);
}

/**
 * Render a template with calendar data
 * 
 * @param {string} templateName - Name of the template to render
 * @param {Object} data - Data to pass to the template
 * @param {Array} data.events - Array of calendar events
 * @param {Object} data.config - Configuration object
 * @returns {Promise<string>} Rendered HTML string
 */
async function renderTemplate(templateName, data) {
  try {
    const template = loadTemplate(templateName);
    
    // Prepare data for template
    const templateData = {
      events: data.events || [],
      config: data.config || {},
      now: Date.now()
    };

    // Execute template and get HTML
    const html = template(templateData);

    if (typeof html !== 'string') {
      throw new Error(`Template ${templateName} must return a string`);
    }

    return html;
  } catch (error) {
    throw new Error(`Failed to render template ${templateName}: ${error.message}`);
  }
}

/**
 * Clear the template cache
 * Useful for development or when templates are updated
 */
function clearCache() {
  templateCache.clear();
  console.log('Template cache cleared');
}

module.exports = {
  loadTemplate,
  renderTemplate,
  clearCache,
  BUILT_IN_TEMPLATES_DIR,
  CUSTOM_TEMPLATES_DIR
};
