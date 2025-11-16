const { loadConfig, CONFIG_DIR, HOST_CONFIG_PATH } = require('../config/loader');
const path = require('path');
const fs = require('fs').promises;

/**
 * Express middleware handler for /config/:name page
 * Displays configuration visualization with debugging info
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function handleConfigPage(req, res) {
  const nameParam = decodeURIComponent(req.params.name);
  
  // Support both numeric and string names
  let name;
  try {
    if (/^\d+$/.test(nameParam)) {
      name = parseInt(nameParam, 10);
    } else {
      name = nameParam;
    }
  } catch (error) {
    console.warn(`[Config Page] Invalid name parameter: "${nameParam}"`);
    return res.status(400).send('Invalid config name parameter');
  }

  try {
    // Load config
    let config;
    try {
      config = await loadConfig(name);
    } catch (configError) {
      const errorMessage = configError.message || 'Unknown error';
      if (errorMessage.includes('Configuration file not found') || errorMessage.includes('not found')) {
        return res.status(404).send(`Configuration ${name} not found`);
      }
      throw configError;
    }
    
    // Get base URL from request
    const protocol = req.get('x-forwarded-proto') || req.protocol || 'http';
    const host = req.get('x-forwarded-host') || req.get('host') || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;
    
    // Generate HTML
    const html = await generateConfigPageHTML(name, config, baseUrl);
    
    res.type('html').send(html);
    
  } catch (error) {
    console.error(`[Config Page] Error rendering config page for ${name}:`, error.message);
    
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Error</title>
          <style>
            body { font-family: sans-serif; padding: 40px; background: #f5f5f5; }
            .error { background: white; padding: 30px; border-radius: 8px; border-left: 4px solid #dc3545; }
          </style>
        </head>
        <body>
          <div class="error">
            <h1>⚠️ Error Loading Configuration</h1>
            <p>${escapeHtml(error.message)}</p>
          </div>
        </body>
      </html>
    `);
  }
}

/**
 * Helper to create a property row with JSON preview
 */
function createPropertyRow(label, value, jsonPath, config, isDefault = false) {
  const preview = jsonPath ? generateJsonPreview(config, jsonPath) : '';
  const jsonBadge = jsonPath ? `<span class="json-path" data-json-preview="${escapeHtml(preview)}">${jsonPath}</span>` : '';
  const defaultBadge = isDefault ? '<span class="badge badge-secondary">default</span>' : '';
  
  return `
    <div class="setting-row">
      <span class="setting-label">${escapeHtml(label)} ${jsonBadge}</span>
      <span class="setting-value">${value} ${defaultBadge}</span>
    </div>`;
}

/**
 * Generate page styles
 */
function getPageStyles() {
  return `<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; padding: 20px; }
    .container { max-width: 1400px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3); overflow: hidden; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; }
    .header-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .header h1 { font-size: 2.5em; font-weight: 600; }
    .header-actions { display: flex; gap: 10px; }
    .header-btn { padding: 10px 20px; background: rgba(255, 255, 255, 0.2); color: white; text-decoration: none; border-radius: 6px; font-weight: 500; transition: background 0.2s; border: 1px solid rgba(255, 255, 255, 0.3); }
    .header-btn:hover { background: rgba(255, 255, 255, 0.3); }
    .template-info { font-size: 1.2em; opacity: 0.95; margin-top: 10px; }
    .template-name { font-family: 'Courier New', monospace; background: rgba(255, 255, 255, 0.2); padding: 5px 10px; border-radius: 4px; display: inline-block; }
    .content { padding: 40px; }
    .cards-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 24px; margin-bottom: 30px; }
    .card { background: white; border: 1px solid #e9ecef; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08); }
    .card-header { display: flex; align-items: center; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 2px solid #667eea; }
    .card-icon { font-size: 1.8em; margin-right: 12px; }
    .card-title { font-size: 1.3em; font-weight: 600; color: #333; }
    .card-content { color: #495057; }
    .setting-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f1f3f5; }
    .setting-row:last-child { border-bottom: none; }
    .setting-label { font-weight: 500; color: #6c757d; display: flex; align-items: flex-start; gap: 8px; flex-wrap: wrap; }
    .setting-value { font-weight: 600; color: #333; text-align: right; max-width: 60%; word-break: break-word; }
    .json-path { font-family: 'Courier New', monospace; font-size: 0.75em; color: #667eea; background: #e7f3ff; padding: 2px 6px; border-radius: 3px; font-weight: normal; white-space: nowrap; align-self: flex-start; margin-top: 2px; cursor: help; position: relative; }
    .json-path:hover::after { content: attr(data-json-preview); position: absolute; left: 0; top: 100%; margin-top: 8px; background: #1e1e1e; color: #d4d4d4; padding: 12px; border-radius: 6px; font-size: 11px; line-height: 1.4; white-space: pre; z-index: 1000; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3); min-width: 300px; max-width: 500px; border: 1px solid #667eea; pointer-events: none; }
    .json-path:hover::before { content: ''; position: absolute; left: 10px; top: 100%; margin-top: 2px; width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-bottom: 6px solid #667eea; z-index: 1001; pointer-events: none; }
    .section-description { background: #f8f9fa; padding: 12px; border-radius: 6px; margin-bottom: 16px; font-size: 0.9em; color: #495057; border-left: 3px solid #667eea; line-height: 1.5; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 0.85em; font-weight: 600; }
    .badge-success { background: #d4edda; color: #155724; }
    .badge-secondary { background: #e9ecef; color: #6c757d; }
    .badge-info { background: #d1ecf1; color: #0c5460; }
    .badge-danger { background: #f8d7da; color: #721c24; }
    .badge-warning { background: #fff3cd; color: #856404; border: 1px solid #ffc107; }
    .validation-indicator { display: inline-flex; align-items: center; gap: 5px; font-size: 0.9em; }
    .validation-banner { background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%); border: 2px solid #dc3545; border-radius: 8px; padding: 20px; margin-bottom: 30px; box-shadow: 0 4px 12px rgba(220, 53, 69, 0.2); }
    .validation-banner-title { color: #721c24; font-size: 1.3em; font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 10px; }
    .validation-banner-list { list-style: none; margin: 0; padding: 0; }
    .validation-banner-item { color: #721c24; padding: 8px 0; border-bottom: 1px solid rgba(220, 53, 69, 0.2); display: flex; align-items: center; gap: 8px; }
    .validation-banner-item:last-child { border-bottom: none; }
    .url-list { list-style: none; margin-top: 12px; }
    .url-item { background: #f8f9fa; padding: 12px; margin-bottom: 10px; border-radius: 6px; border-left: 3px solid #667eea; }
    .url-item:last-child { margin-bottom: 0; }
    .url-name { font-weight: 600; color: #667eea; margin-bottom: 6px; display: block; }
    .url-link { color: #495057; font-size: 0.9em; word-break: break-all; text-decoration: none; display: block; }
    .url-link:hover { color: #667eea; text-decoration: underline; }
    .url-meta { font-size: 0.85em; color: #6c757d; margin-top: 6px; }
    .code-block { background: #f8f9fa; padding: 12px; border-radius: 6px; font-family: 'Courier New', monospace; font-size: 0.9em; color: #495057; word-break: break-all; margin-top: 8px; }
    .file-path { background: #e7f3ff; padding: 8px 12px; border-radius: 6px; font-family: 'Courier New', monospace; font-size: 0.9em; color: #004085; margin-top: 8px; border-left: 3px solid #004085; display: flex; justify-content: space-between; align-items: center; }
    .copy-btn { background: #667eea; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 0.85em; font-weight: 500; transition: background 0.2s; margin-left: 10px; white-space: nowrap; }
    .copy-btn:hover { background: #5568d3; }
    .copy-btn:active { background: #4557c2; }
    .copy-btn.copied { background: #28a745; }
    .actions-section { background: #f8f9fa; padding: 30px 40px; border-top: 1px solid #e9ecef; margin-top: 30px; }
    .actions-title { font-size: 1.5em; color: #333; margin-bottom: 20px; font-weight: 600; }
    .action-buttons { display: flex; gap: 12px; flex-wrap: wrap; }
    .action-btn { padding: 12px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 6px; font-weight: 500; transition: transform 0.2s, box-shadow 0.2s; display: inline-block; }
    .action-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4); }
    .masked { background: #fff3cd; padding: 2px 6px; border-radius: 3px; font-family: monospace; color: #856404; }
    .rotation-indicator { display: inline-block; width: 20px; height: 20px; background: #667eea; border-radius: 3px; position: relative; margin-left: 8px; vertical-align: middle; }
    .rotation-indicator::after { content: '↻'; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; font-size: 14px; }
    @media (max-width: 768px) {
      .cards-grid { grid-template-columns: 1fr; }
      .header h1 { font-size: 1.8em; }
      .content { padding: 20px; }
      .action-buttons { flex-direction: column; }
      .action-btn { width: 100%; text-align: center; }
    }
  </style>`;
}

/**
 * Collect all validation errors
 */
function collectValidationErrors(config, validations, icsUrls) {
  const errors = [];
  
  validations.icsUrls.forEach((val, idx) => {
    if (!val.valid) {
      const sourceName = icsUrls[idx].sourceName || `Source ${idx}`;
      errors.push(`Calendar Source [${idx}] ${sourceName}: ${val.message}`);
    }
  });
  
  if (config.preGenerateInterval && !validations.cron.valid) {
    errors.push(`Pre-generation Schedule: ${validations.cron.message}`);
  }
  
  if (!validations.locale.valid) {
    errors.push(`Locale: ${validations.locale.message}`);
  }
  
  if (config.timezone && !validations.timezone.valid) {
    errors.push(`Timezone: ${validations.timezone.message}`);
  }
  
  if (!validations.template.valid) {
    errors.push(`Template: ${validations.template.message}`);
  }
  
  validations.extraDataUrls.forEach((val, idx) => {
    if (!val.valid) {
      errors.push(`Extra Data Source ${idx + 1}: ${val.message}`);
    }
  });
  
  return errors;
}

/**
 * Generate HTML for the configuration page
 */
async function generateConfigPageHTML(name, config, baseUrl) {
  const configFileName = `${name}.json`;
  const configFilePath = path.resolve(path.join(CONFIG_DIR, configFileName));
  
  // Determine template path (check custom first, then built-in)
  const customTemplatePath = path.resolve(path.join(CONFIG_DIR, 'templates', `${config.template}.js`));
  const builtInTemplatePath = path.resolve(path.join(__dirname, '..', 'templates', 'built-in', `${config.template}.js`));
  let templatePath = customTemplatePath;
  let isBuiltInTemplate = false;
  
  try {
    await fs.access(customTemplatePath);
  } catch (error) {
    // Custom template doesn't exist, use built-in path
    templatePath = builtInTemplatePath;
    isBuiltInTemplate = true;
  }
  
  // Parse URLs
  const icsUrls = parseIcsUrls(config.icsUrl);
  const extraDataUrls = parseExtraDataUrls(config.extraDataUrl);
  const cronDescription = parseCronExpression(config.preGenerateInterval);
  
  // Run validations
  const validations = await runValidations(name, config, icsUrls, extraDataUrls);
  const validationErrors = collectValidationErrors(config, validations, icsUrls);
  
  // Build URLs with proper encoding for names with spaces
  const encodedName = encodeURIComponent(name);
  const imageUrl = `${baseUrl}/api/${encodedName}.${config.imageType}`;
  const freshUrl = `${baseUrl}/api/${encodedName}/fresh.${config.imageType}`;
  const jsonApiUrl = `${baseUrl}/api/config/${encodedName}`;
  
  // Use API URL for cached image (browser will load it directly)
  const cachedImageUrl = `${baseUrl}/api/${encodedName}.${config.imageType}`;
  const imageCrc32Url = `${baseUrl}/api/${encodedName}.${config.imageType}.crc32`;
  
  // Load template content
  let templateContent = null;
  try {
    templateContent = await fs.readFile(templatePath, 'utf8');
  } catch (error) {
    console.log(`[Config Page] Could not load template: ${error.message}`);
  }
  
  // Display name: show "#N" for numeric, plain name for others
  const displayName = typeof name === 'number' ? `${name}.json` : `${escapeHtml(name)}.json`;
  const pageTitle = `Configuration: ${escapeHtml(String(name))}.json`;
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageTitle} - Calendar2Image</title>
  ${getPageStyles()}
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-top">
        <div>
          <h1>⚙️ ${pageTitle}</h1>
          <div class="template-info">
            Template: <span class="template-name">${escapeHtml(config.template)}</span>
          </div>
        </div>
        <div class="header-actions">
          <a href="${baseUrl}/" class="header-btn">← Dashboard</a>
          <a href="${jsonApiUrl}" target="_blank" class="header-btn">View JSON</a>
        </div>
      </div>
    </div>
    
    <div class="content">
      ${validationErrors.length > 0 ? `
      <!-- Validation Error Banner -->
      <div class="validation-banner">
        <div class="validation-banner-title">
          <span class="validation-banner-icon">⚠️</span>
          Configuration Validation Issues (${validationErrors.length})
        </div>
        <ul class="validation-banner-list">
          ${validationErrors.map(error => `
            <li class="validation-banner-item">
              <span class="validation-banner-item-icon">❌</span>
              ${escapeHtml(error)}
            </li>
          `).join('')}
        </ul>
      </div>
      ` : ''}
      
      <div class="cards-grid">
        
        <!-- Image Settings Card -->
        <div class="card">
          <div class="card-header">
            <div class="card-icon">📐</div>
            <div class="card-title">Image Settings</div>
          </div>
          <div class="card-content">
            <div class="section-description">
              Controls the dimensions, format, and visual properties of the generated calendar image.
            </div>
            <div class="setting-row">
              <span class="setting-label">Width <span class="json-path" data-json-preview="${escapeHtml(generateJsonPreview(config, 'width'))}">width</span></span>
              <span class="setting-value">${config.width} px ${config.width === 800 ? '<span class="badge badge-secondary">default</span>' : ''}</span>
            </div>
            <div class="setting-row">
              <span class="setting-label">Height <span class="json-path" data-json-preview="${escapeHtml(generateJsonPreview(config, 'height'))}">height</span></span>
              <span class="setting-value">${config.height} px ${config.height === 600 ? '<span class="badge badge-secondary">default</span>' : ''}</span>
            </div>
            <div class="setting-row">
              <span class="setting-label">Image Type <span class="json-path" data-json-preview="${escapeHtml(generateJsonPreview(config, 'imageType'))}">imageType</span></span>
              <span class="setting-value">${config.imageType.toUpperCase()} ${config.imageType === 'png' ? '<span class="badge badge-secondary">default</span>' : ''}</span>
            </div>
            <div class="setting-row">
              <span class="setting-label">Color Mode <span class="json-path" data-json-preview="${escapeHtml(generateJsonPreview(config, 'grayscale'))}">grayscale</span></span>
              <span class="setting-value">
                ${config.grayscale ? 
                  '<span class="badge badge-info">Grayscale</span>' : 
                  '<span class="badge badge-success">Color</span> <span class="badge badge-secondary">default</span>'}
              </span>
            </div>
            <div class="setting-row">
              <span class="setting-label">Bit Depth <span class="json-path" data-json-preview="${escapeHtml(generateJsonPreview(config, 'bitDepth'))}">bitDepth</span></span>
              <span class="setting-value">${config.bitDepth}-bit ${config.bitDepth === 8 ? '<span class="badge badge-secondary">default</span>' : ''}</span>
            </div>
            <div class="setting-row">
              <span class="setting-label">Rotation <span class="json-path" data-json-preview="${escapeHtml(generateJsonPreview(config, 'rotate'))}">rotate</span></span>
              <span class="setting-value">
                ${config.rotate}°
                ${config.rotate !== 0 ? '<span class="rotation-indicator"></span>' : '<span class="badge badge-secondary">default</span>'}
              </span>
            </div>
          </div>
        </div>
        
        <!-- Calendar Sources Card -->
        <div class="card">
          <div class="card-header">
            <div class="card-icon">📅</div>
            <div class="card-title">Calendar Sources</div>
          </div>
          <div class="card-content">
            <div class="section-description">
              ICS calendar URLs to fetch events from. Supports single URL (string) or multiple URLs (array of objects with <code>url</code> and <code>sourceName</code>).
            </div>
            <div class="setting-row">
              <span class="setting-label">Total Sources <span class="json-path" data-json-preview="${escapeHtml(generateJsonPreview(config, 'icsUrl'))}">icsUrl</span></span>
              <span class="setting-value"><span class="badge badge-info">${icsUrls.length} ${icsUrls.length === 1 ? 'calendar' : 'calendars'}</span></span>
            </div>
            <ul class="url-list">
              ${icsUrls.map((source, idx) => `
                <li class="url-item">
                  <span class="url-name">[${idx}] ${escapeHtml(source.sourceName || 'Unnamed source')} <span class="json-path" data-json-preview="${escapeHtml(generateJsonPreview(config, `icsUrl[${idx}].${source.sourceName ? 'sourceName' : 'url'}`))}">icsUrl[${idx}].${source.sourceName ? 'sourceName' : 'url'}</span></span>
                  <a href="${escapeHtml(source.url)}" target="_blank" class="url-link">${escapeHtml(truncateUrl(source.url))}</a>
                  ${source.rejectUnauthorized === false ? `<span class="badge badge-warning" title="SSL certificate verification disabled for this source">⚠️ SSL verification disabled</span>` : ''}
                  ${validations.icsUrls[idx] ? `<div class="url-meta">${getValidationBadge(validations.icsUrls[idx])}</div>` : ''}
                </li>
              `).join('')}
            </ul>
          </div>
        </div>
        
        <!-- Scheduling Card -->
        <div class="card">
          <div class="card-header">
            <div class="card-icon">⏰</div>
            <div class="card-title">Pre-Generation Schedule</div>
          </div>
          <div class="card-content">
            <div class="section-description">
              Automatic image generation schedule using cron syntax. When enabled, images are pre-generated at specified intervals. When disabled, images are only generated on API request.
            </div>
            ${config.preGenerateInterval ? `
              <div class="setting-row">
                <span class="setting-label">Status <span class="json-path" data-json-preview="${escapeHtml(generateJsonPreview(config, 'preGenerateInterval'))}">preGenerateInterval</span></span>
                <span class="setting-value"><span class="badge badge-success">✓ Enabled</span></span>
              </div>
              <div class="setting-row">
                <span class="setting-label">Frequency</span>
                <span class="setting-value">${escapeHtml(cronDescription)}</span>
              </div>
              <div class="code-block">${escapeHtml(config.preGenerateInterval)}</div>
              <div style="margin-top: 12px;">
                ${getValidationBadge(validations.cron)}
              </div>
            ` : `
              <div class="setting-row">
                <span class="setting-label">Status <span class="json-path">preGenerateInterval</span></span>
                <span class="setting-value"><span class="badge badge-secondary">Disabled</span></span>
              </div>
              <p style="color: #6c757d; margin-top: 12px; font-size: 0.95em;">
                Images are generated on-demand when requested via API.
              </p>
            `}
          </div>
        </div>
        
        <!-- Localization Card -->
        <div class="card">
          <div class="card-header">
            <div class="card-icon">🌍</div>
            <div class="card-title">Localization</div>
          </div>
          <div class="card-content">
            <div class="section-description">
              Regional settings for date/time formatting and calendar display. Locale affects day/month names, date formats, and week start day. Timezone determines how event times are displayed.
            </div>
            <div class="setting-row">
              <span class="setting-label">Locale <span class="json-path" data-json-preview="${escapeHtml(generateJsonPreview(config, 'locale'))}">locale</span></span>
              <span class="setting-value">
                ${getLocaleName(config.locale)} <span class="badge badge-secondary">${config.locale}</span>
                ${config.locale === 'en-US' ? '<span class="badge badge-secondary">default</span>' : ''}
              </span>
            </div>
            <div style="margin-top: 8px; margin-left: 0;">
              ${getValidationBadge(validations.locale)}
            </div>
            <div class="setting-row" style="margin-top: 12px;">
              <span class="setting-label">Timezone <span class="json-path" data-json-preview="${escapeHtml(generateJsonPreview(config, 'timezone'))}">timezone</span></span>
              <span class="setting-value">
                ${config.timezone ? escapeHtml(config.timezone) : '<span class="badge badge-secondary">Not set (UTC default)</span>'}
              </span>
            </div>
            ${config.timezone ? `
              <div style="margin-top: 8px; margin-left: 0;">
                ${getValidationBadge(validations.timezone)}
              </div>
            ` : ''}
          </div>
        </div>
        
        <!-- Recurring Events Card -->
        <div class="card">
          <div class="card-header">
            <div class="card-icon">🔄</div>
            <div class="card-title">Recurring Events Expansion</div>
          </div>
          <div class="card-content">
            <div class="section-description">
              Time window for expanding recurring events from ICS calendars. Events with RRULE patterns are expanded into individual occurrences within this date range.
            </div>
            <div class="setting-row">
              <span class="setting-label">Expand From <span class="json-path" data-json-preview="${escapeHtml(generateJsonPreview(config, 'expandRecurringFrom'))}">expandRecurringFrom</span></span>
              <span class="setting-value">${config.expandRecurringFrom} days ${config.expandRecurringFrom === -31 ? '<span class="badge badge-secondary">default</span>' : ''}</span>
            </div>
            <div class="setting-row">
              <span class="setting-label">Expand To <span class="json-path" data-json-preview="${escapeHtml(generateJsonPreview(config, 'expandRecurringTo'))}">expandRecurringTo</span></span>
              <span class="setting-value">+${config.expandRecurringTo} days ${config.expandRecurringTo === 31 ? '<span class="badge badge-secondary">default</span>' : ''}</span>
            </div>
            <div class="setting-row">
              <span class="setting-label">Total Range</span>
              <span class="setting-value"><span class="badge badge-info">${config.expandRecurringTo - config.expandRecurringFrom} days</span></span>
            </div>
          </div>
        </div>
        
        <!-- Extra Data Card -->
        <div class="card">
          <div class="card-header">
            <div class="card-icon">📊</div>
            <div class="card-title">Extra Data Sources</div>
          </div>
          <div class="card-content">
            <div class="section-description">
              Additional REST API endpoints to fetch data for template use (e.g., weather, tasks, sensor data). Each source can have custom cache TTL and HTTP headers. Data is available in templates via <code>extraData</code> array.
            </div>
            ${extraDataUrls.length > 0 ? `
              <div class="setting-row">
                <span class="setting-label">Data Sources <span class="json-path" data-json-preview="${escapeHtml(generateJsonPreview(config, 'extraDataUrl'))}">extraDataUrl</span></span>
                <span class="setting-value"><span class="badge badge-info">${extraDataUrls.length} ${extraDataUrls.length === 1 ? 'source' : 'sources'}</span></span>
              </div>
              <ul class="url-list">
                ${extraDataUrls.map((source, idx) => `
                  <li class="url-item">
                    <span class="url-name">Source ${idx + 1} <span class="json-path" data-json-preview="${escapeHtml(generateJsonPreview(config, `extraDataUrl[${idx}]`))}">extraDataUrl[${idx}]</span></span>
                    <a href="${escapeHtml(source.url)}" target="_blank" class="url-link">${escapeHtml(truncateUrl(source.url))}</a>
                    ${source.cacheTtl !== undefined ? `
                      <div class="url-meta">Cache TTL: ${source.cacheTtl}s (override) <span class="json-path" data-json-preview="${escapeHtml(generateJsonPreview(config, `extraDataUrl[${idx}].cacheTtl`))}">cacheTtl</span></div>
                    ` : ''}
                    ${source.headers !== undefined && source.headers !== null && JSON.stringify(source.headers) !== '{}' ? `
                      <div class="url-meta">Custom headers: ${maskHeaders(source.headers)} <span class="json-path" data-json-preview="${escapeHtml(generateJsonPreview(config, `extraDataUrl[${idx}].headers`))}">headers</span></div>
                    ` : source.headers === null || JSON.stringify(source.headers) === '{}' ? `
                      <div class="url-meta">Headers: Disabled <span class="json-path" data-json-preview="${escapeHtml(generateJsonPreview(config, `extraDataUrl[${idx}].headers`))}">headers: null</span></div>
                    ` : ''}
                    ${validations.extraDataUrls[idx] ? `<div class="url-meta">${getValidationBadge(validations.extraDataUrls[idx])}</div>` : ''}
                  </li>
                `).join('')}
              </ul>
            ` : `
              <div class="setting-row">
                <span class="setting-label">Data Sources <span class="json-path" data-json-preview="${escapeHtml(generateJsonPreview(config, 'extraDataUrl'))}">extraDataUrl</span></span>
                <span class="setting-value"><span class="badge badge-secondary">None configured</span></span>
              </div>
            `}
            
            <div class="setting-row">
              <span class="setting-label">Default Cache TTL <span class="json-path" data-json-preview="${escapeHtml(generateJsonPreview(config, 'extraDataCacheTtl'))}">extraDataCacheTtl</span></span>
              <span class="setting-value">${config.extraDataCacheTtl}s ${config.extraDataCacheTtl === 300 ? '<span class="badge badge-secondary">default</span>' : ''}</span>
            </div>
            
            ${config.extraDataHeaders ? `
              <div class="setting-row">
                <span class="setting-label">Global Headers <span class="json-path" data-json-preview="${escapeHtml(generateJsonPreview(config, 'extraDataHeaders'))}">extraDataHeaders</span></span>
                <span class="setting-value">${maskHeaders(config.extraDataHeaders)}</span>
              </div>
            ` : `
              <div class="setting-row">
                <span class="setting-label">Global Headers <span class="json-path" data-json-preview="${escapeHtml(generateJsonPreview(config, 'extraDataHeaders'))}">extraDataHeaders</span></span>
                <span class="setting-value"><span class="badge badge-secondary">None configured</span></span>
              </div>
            `}
          </div>
        </div>
        
      </div>
      
      <!-- Image Preview Card -->
      <div class="card" style="margin-bottom: 20px;">
        <div class="card-header">
          <div class="card-icon">🖼️</div>
          <div class="card-title">Last Generated Image</div>
        </div>
        <div class="card-content">
          <div class="setting-row">
            <span class="setting-label">CRC32 Checksum</span>
            <span class="setting-value" id="image-crc32"><code style="background:#f8f9fa;padding:4px 8px;border-radius:4px;">Loading...</code></span>
          </div>
          <div id="image-preview-container" style="margin-top: 15px; text-align: center; background: #f8f9fa; padding: 15px; border-radius: 8px;">
            <a href="${cachedImageUrl}" target="_blank" style="display: inline-block; cursor: pointer;">
              <img id="cached-image" src="${cachedImageUrl}" alt="Calendar Preview" style="max-width: 100%; max-height: 200px; height: auto; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); display: none;" 
                   onload="this.style.display='block'; document.getElementById('image-error').style.display='none';" 
                   onerror="this.style.display='none'; document.getElementById('image-error').style.display='block';" />
            </a>
            <p id="image-error" style="color: #6c757d; padding: 15px; display: none;">
              No cached image available. Generate one using the Quick Actions below.
            </p>
          </div>
        </div>
      </div>
      
      <!-- File Paths Section -->
      <div class="card" style="margin-bottom: 20px;">
        <div class="card-header">
          <div class="card-icon">📁</div>
          <div class="card-title">File Locations (Home Assistant Paths)</div>
        </div>
        <div class="card-content">
          <div class="section-description">
            File system paths within the Home Assistant environment. Configuration files are stored in <code>${escapeHtml(path.resolve(CONFIG_DIR))}/</code> and templates in <code>${escapeHtml(path.resolve(path.join(CONFIG_DIR, 'templates')))}/</code>.
            ${HOST_CONFIG_PATH ? `<br><small style="opacity: 0.8;">Host path (outside container): <code>${escapeHtml(HOST_CONFIG_PATH)}/</code></small>` : ''}
          </div>
          <div class="setting-row">
            <span class="setting-label">Configuration File <span class="json-path" data-json-preview="Configuration file: ${configFileName}">${escapeHtml(configFileName)}</span></span>
          </div>
          <div class="file-path">
            <code>${escapeHtml(configFilePath)}</code>
            <button class="copy-btn" onclick="copyToClipboard('${escapeJs(configFilePath)}', this)">Copy Path</button>
          </div>
          
          <div class="setting-row" style="margin-top: 20px;">
            <span class="setting-label">Template File <span class="json-path" data-json-preview="${escapeHtml(generateJsonPreview(config, 'template'))}">template</span></span>
          </div>
          <div class="file-path">
            <code>${escapeHtml(templatePath)}</code>
            <button class="copy-btn" onclick="copyToClipboard('${escapeJs(templatePath)}', this)">Copy Path</button>
          </div>
          <div style="margin-top: 8px; margin-left: 0;">
            ${getValidationBadge(validations.template)}
          </div>
          
        </div>
      </div>
      
      <!-- Full Config & Template Section -->
      <div class="card">
        <div class="card-header">
          <div class="card-icon">📄</div>
          <div class="card-title">Full Config & Template</div>
        </div>
        <div class="card-content">
          
          <!-- Configuration JSON Subsection -->
          <div style="border-bottom: 1px solid #e9ecef; padding-bottom: 15px; margin-bottom: 15px;">
            <h4 style="color: #667eea; margin-bottom: 10px; font-size: 1.1em;">📋 Configuration JSON</h4>
            <div style="display: flex; gap: 10px; margin-bottom: 10px;">
              <button class="copy-btn" onclick="copyConfigJson()">Copy JSON</button>
              <button class="copy-btn" onclick="toggleSection('config-json-section')">Expand/Collapse</button>
            </div>
            <div id="config-json-section" style="display: none;">
              <pre id="config-json" style="background: #f8f9fa; padding: 15px; border-radius: 6px; overflow-x: auto; margin-top: 12px; font-size: 0.85em; line-height: 1.5; max-height: 500px; overflow-y: auto;">${escapeHtml(JSON.stringify(config, null, 2))}</pre>
            </div>
          </div>
          
          <!-- Template Content Subsection -->
          <div>
            <h4 style="color: #667eea; margin-bottom: 10px; font-size: 1.1em;">📝 Template Content</h4>
            <div style="display: flex; gap: 10px; margin-bottom: 10px;">
              <button class="copy-btn" onclick="copyTemplateContent()">Copy Template</button>
              <button class="copy-btn" onclick="toggleSection('template-content')">Expand/Collapse</button>
            </div>
            <div id="template-content" style="display: none;">
              ${templateContent ? `
                <pre style="background: #f8f9fa; padding: 15px; border-radius: 6px; overflow-x: auto; margin-top: 12px; font-size: 0.85em; line-height: 1.5; max-height: 500px; overflow-y: auto;">${escapeHtml(templateContent)}</pre>
              ` : `
                <p style="color: #dc3545; margin-top: 12px;">Template file not found or could not be loaded.</p>
              `}
            </div>
          </div>
          
        </div>
      </div>
      
    </div>
    
    <!-- Quick Actions -->
    <div class="actions-section">
      <h2 class="actions-title">🚀 Quick Actions</h2>
      <div class="action-buttons">
        <a href="${imageUrl}" target="_blank" class="action-btn">🖼️ View Image</a>
        <a href="${freshUrl}" target="_blank" class="action-btn">🔄 Generate Fresh</a>
        <a href="${jsonApiUrl}" target="_blank" class="action-btn">{ } Raw JSON API</a>
      </div>
    </div>
  </div>
  
  <script>
    // Fetch CRC32 on page load
    fetch('${imageCrc32Url}')
      .then(response => response.text())
      .then(crc32 => {
        document.getElementById('image-crc32').innerHTML = '<code style="background:#f8f9fa;padding:4px 8px;border-radius:4px;">0x' + crc32.toUpperCase() + '</code>';
      })
      .catch(error => {
        document.getElementById('image-crc32').innerHTML = '<code style="background:#f8f9fa;padding:4px 8px;border-radius:4px; color: #6c757d;">N/A</code>';
      });
    
    // Toggle expand/collapse sections
    function toggleSection(id) {
      const section = document.getElementById(id);
      if (section) {
        section.style.display = section.style.display === 'none' ? 'block' : 'none';
      }
    }
    
    // Copy to clipboard function
    function copyToClipboard(text, button) {
      navigator.clipboard.writeText(text).then(() => {
        const originalText = button.textContent;
        button.textContent = '✓ Copied!';
        button.classList.add('copied');
        
        setTimeout(() => {
          button.textContent = originalText;
          button.classList.remove('copied');
        }, 2000);
      }).catch(err => {
        console.error('Failed to copy:', err);
        alert('Failed to copy to clipboard');
      });
    }
    
    // Copy full config JSON
    function copyConfigJson() {
      const button = event.target;
      const originalText = button.textContent;
      
      try {
        const configJson = document.getElementById('config-json').textContent;
        
        navigator.clipboard.writeText(configJson).then(() => {
          button.textContent = '✓ Copied!';
          button.classList.add('copied');
          
          setTimeout(() => {
            button.textContent = originalText;
            button.classList.remove('copied');
          }, 2000);
        }).catch(err => {
          console.error('Failed to copy:', err);
          button.textContent = '✗ Failed';
          setTimeout(() => {
            button.textContent = originalText;
          }, 2000);
        });
      } catch (err) {
        console.error('Failed to copy:', err);
        button.textContent = '✗ Failed';
        setTimeout(() => {
          button.textContent = originalText;
        }, 2000);
      }
    }
    
    // Copy template content
    function copyTemplateContent() {
      const button = event.target;
      const originalText = button.textContent;
      
      const templateContent = ${templateContent ? 'document.getElementById("template-content").querySelector("pre").textContent' : 'null'};
      
      if (!templateContent) {
        button.textContent = '✗ No Template';
        setTimeout(() => {
          button.textContent = originalText;
        }, 2000);
        return;
      }
      
      navigator.clipboard.writeText(templateContent).then(() => {
        button.textContent = '✓ Copied!';
        button.classList.add('copied');
        
        setTimeout(() => {
          button.textContent = originalText;
          button.classList.remove('copied');
        }, 2000);
      }).catch(err => {
        console.error('Failed to copy template:', err);
        button.textContent = '✗ Failed';
        setTimeout(() => {
          button.textContent = originalText;
        }, 2000);
      });
    }
  </script>
</body>
</html>`;
}

/**
 * Parse ICS URLs into array format
 */
function parseIcsUrls(icsUrl) {
  if (Array.isArray(icsUrl)) {
    return icsUrl;
  }
  return [{ url: icsUrl, sourceName: null }];
}

/**
 * Parse extra data URLs into array format
 */
function parseExtraDataUrls(extraDataUrl) {
  if (!extraDataUrl) return [];
  
  if (Array.isArray(extraDataUrl)) {
    return extraDataUrl;
  }
  
  return [{ url: extraDataUrl }];
}

/**
 * Parse cron expression to human-readable format
 */
function parseCronExpression(cronExpr) {
  if (!cronExpr) return 'Not configured';
  
  try {
    // Try to generate a human-readable description
    const parts = cronExpr.trim().split(/\s+/);
    
    if (parts.length >= 5) {
      const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
      
      // Check for common patterns
      if (cronExpr === '* * * * *') return 'Every minute';
      if (cronExpr.match(/^\*\/\d+ \* \* \* \*$/)) {
        const mins = cronExpr.match(/^\*\/(\d+)/)[1];
        return `Every ${mins} minute${mins > 1 ? 's' : ''}`;
      }
      if (cronExpr.match(/^\d+ \*\/\d+ \* \* \*$/)) {
        const hrs = cronExpr.match(/\*\/(\d+)/)[1];
        return `Every ${hrs} hour${hrs > 1 ? 's' : ''}`;
      }
      if (cronExpr === '0 * * * *') return 'Every hour (on the hour)';
      if (cronExpr === '0 0 * * *') return 'Daily at midnight';
      if (cronExpr.match(/^\d+ \d+ \* \* \*$/)) {
        return `Daily at ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
      }
      if (cronExpr.match(/^\d+ \d+ \* \* \d+$/)) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return `Weekly on ${days[parseInt(dayOfWeek)] || 'day ' + dayOfWeek} at ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
      }
    }
    
    return 'Custom schedule';
  } catch (error) {
    console.error('Failed to parse cron expression:', error);
    return 'Check cron syntax';
  }
}

/**
 * Get human-readable locale name
 */
function getLocaleName(locale) {
  const localeNames = {
    'en-US': 'English (US)',
    'en-GB': 'English (UK)',
    'de-DE': 'German',
    'fr-FR': 'French',
    'es-ES': 'Spanish',
    'it-IT': 'Italian',
    'nl-NL': 'Dutch',
    'pt-PT': 'Portuguese',
    'pt-BR': 'Portuguese (Brazil)',
    'ru-RU': 'Russian',
    'ja-JP': 'Japanese',
    'zh-CN': 'Chinese (Simplified)',
    'zh-TW': 'Chinese (Traditional)',
    'ko-KR': 'Korean'
  };
  
  return localeNames[locale] || locale;
}

/**
 * Mask sensitive headers
 */
function maskHeaders(headers) {
  if (!headers || typeof headers !== 'object') return 'None';
  
  const headerKeys = Object.keys(headers);
  if (headerKeys.length === 0) return 'None';
  
  const masked = headerKeys.map(key => {
    const value = headers[key];
    if (key.toLowerCase().includes('auth') || key.toLowerCase().includes('token')) {
      // Mask authorization headers
      if (value.length > 10) {
        return `${key}: ${value.substring(0, 8)}...****`;
      }
      return `${key}: ****`;
    }
    return `${key}: ${value}`;
  });
  
  return `<span class="masked">${masked.length} header(s) configured</span>`;
}

/**
 * Truncate URL for display
 */
function truncateUrl(url, maxLength = 60) {
  if (url.length <= maxLength) return url;
  
  const start = url.substring(0, maxLength - 20);
  const end = url.substring(url.length - 17);
  return `${start}...${end}`;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

/**
 * Escape text for use in JavaScript strings (for onclick handlers)
 */
function escapeJs(text) {
  if (text === null || text === undefined) return '';
  
  return String(text)
    .replace(/\\/g, '\\\\')  // Escape backslashes first
    .replace(/'/g, "\\'")    // Escape single quotes
    .replace(/"/g, '\\"')    // Escape double quotes
    .replace(/\n/g, '\\n')   // Escape newlines
    .replace(/\r/g, '\\r');  // Escape carriage returns
}

/**
 * Generate JSON preview with highlighted property for tooltip
 * @param {Object} config - Full configuration object
 * @param {string} propertyPath - Dot-notation path to property (e.g., "width", "icsUrl[0].sourceName")
 * @returns {string} Formatted JSON snippet with ANSI-like highlighting
 */
function generateJsonPreview(config, propertyPath) {
  try {
    // Parse the property path to extract value and context
    const pathParts = propertyPath.replace(/\[(\d+)\]/g, '.$1').split('.');
    let currentObj = config;
    let contextObj = config;
    let lastKey = pathParts[pathParts.length - 1];
    
    // Navigate to the property
    for (let i = 0; i < pathParts.length - 1; i++) {
      if (currentObj[pathParts[i]] !== undefined) {
        contextObj = currentObj;
        currentObj = currentObj[pathParts[i]];
      }
    }
    
    // For array properties, show the array context
    if (propertyPath.includes('[')) {
      const arrayMatch = propertyPath.match(/^([^\[]+)\[(\d+)\]\.?(.*)$/);
      if (arrayMatch) {
        const [, arrayName, index, subProp] = arrayMatch;
        const arrayValue = config[arrayName];
        if (Array.isArray(arrayValue)) {
          const item = arrayValue[parseInt(index)];
          if (subProp) {
            // Show the specific array item with highlighted property
            const itemJson = JSON.stringify(item, null, 2);
            const lines = itemJson.split('\n');
            const highlighted = lines.map(line => {
              if (line.includes(`"${subProp}":`)) {
                return '→ ' + line;
              }
              return '  ' + line;
            }).join('\n');
            return `${arrayName}[${index}]:\n${highlighted}`;
          } else {
            // Show array item index
            const preview = JSON.stringify(item, null, 2).split('\n').slice(0, 10).join('\n');
            return `${arrayName}[${index}]:\n→ ${preview}`;
          }
        }
      }
    }
    
    // For simple properties, show compact context
    const value = currentObj[lastKey];
    const valueStr = JSON.stringify(value, null, 2);
    const lines = valueStr.split('\n');
    const preview = lines.length > 8 ? lines.slice(0, 8).join('\n') + '\n  ...' : valueStr;
    
    return `"${lastKey}": ${preview}`;
    
  } catch (error) {
    return `"${propertyPath}": <value>`;
  }
}

/**
 * Run all validations
 */
async function runValidations(name, config, icsUrls, extraDataUrls) {
  const validations = {
    icsUrls: [],
    cron: { valid: true, message: 'N/A' },
    locale: { valid: true, message: 'Valid' },
    timezone: { valid: true, message: 'Valid' },
    template: { valid: true, message: 'Exists' },
    extraDataUrls: []
  };

  // Validate ICS URLs
  for (let i = 0; i < icsUrls.length; i++) {
    const source = icsUrls[i];
    try {
      const urlObj = new URL(source.url);
      validations.icsUrls.push({
        index: i,
        valid: true,
        message: 'Valid URL format',
        reachable: null // We'll check reachability async
      });
    } catch (error) {
      validations.icsUrls.push({
        index: i,
        valid: false,
        message: 'Invalid URL format',
        reachable: false
      });
    }
  }

  // Validate cron expression
  if (config.preGenerateInterval) {
    try {
      const parts = config.preGenerateInterval.trim().split(/\s+/);
      if (parts.length >= 5 && parts.length <= 6) {
        // Basic validation - cron should have 5 or 6 parts
        const validParts = parts.every(part => {
          return /^[\d\*\-,\/]+$/.test(part) || part === '?';
        });
        if (validParts) {
          validations.cron = { valid: true, message: 'Valid cron syntax' };
        } else {
          validations.cron = { valid: false, message: 'Invalid cron syntax' };
        }
      } else {
        validations.cron = { valid: false, message: `Invalid: expected 5-6 parts, got ${parts.length}` };
      }
    } catch (error) {
      validations.cron = { valid: false, message: 'Parse error' };
    }
  }

  // Validate locale
  if (config.locale) {
    try {
      // Use Intl.DateTimeFormat to check if locale is supported
      const supported = Intl.DateTimeFormat.supportedLocalesOf([config.locale]);
      if (supported.length > 0) {
        validations.locale = { valid: true, message: 'Supported locale' };
      } else {
        // Check if it matches locale format as fallback
        const localePattern = /^[a-z]{2,3}(-[A-Z]{2,3})?$/;
        if (localePattern.test(config.locale)) {
          validations.locale = { valid: false, message: 'Valid format but not supported by system' };
        } else {
          validations.locale = { valid: false, message: 'Invalid locale format (expected: aa-BB)' };
        }
      }
    } catch (error) {
      // Fallback to regex validation
      const localePattern = /^[a-z]{2,3}(-[A-Z]{2,3})?$/;
      if (localePattern.test(config.locale)) {
        validations.locale = { valid: true, message: 'Valid format' };
      } else {
        validations.locale = { valid: false, message: 'Invalid locale format (expected: aa-BB)' };
      }
    }
  }

  // Validate timezone
  if (config.timezone) {
    try {
      // Try to use Intl to validate timezone
      const testDate = new Date();
      const formatter = new Intl.DateTimeFormat('en-US', { timeZone: config.timezone });
      formatter.format(testDate);
      
      // Check if timezone is a deprecated abbreviation (CET, EST, PST, etc.)
      // These are technically valid but not recommended
      const deprecatedAbbreviations = ['CET', 'CEST', 'EST', 'EDT', 'CST', 'CDT', 'MST', 'MDT', 'PST', 'PDT', 'EET', 'EEST', 'WET', 'WEST', 'MET', 'MEST'];
      if (deprecatedAbbreviations.includes(config.timezone.toUpperCase())) {
        validations.timezone = { valid: false, message: 'Invalid timezone abbreviation - use IANA region/city format (e.g., "Europe/Berlin", not "CET")' };
        console.warn(`[Config Validation] Deprecated timezone abbreviation in config ${name}: "${config.timezone}". Use IANA region/city format like "Europe/Berlin" or "America/New_York" instead of abbreviations like "CET" or "EST". See: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones`);
      } else {
        validations.timezone = { valid: true, message: 'Valid IANA timezone' };
      }
    } catch (error) {
      validations.timezone = { valid: false, message: 'Invalid timezone name - use IANA timezone (e.g., "Europe/Berlin", not "CET")' };
      console.warn(`[Config Validation] Invalid timezone in config ${name}: "${config.timezone}". Use IANA timezone names like "Europe/Berlin" or "America/New_York", not abbreviations like "CET" or "EST". See: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones`);
    }
  }

  // Validate template exists (check custom first, then built-in)
  try {
    const customTemplatePath = path.join(CONFIG_DIR, 'templates', `${config.template}.js`);
    const builtInTemplatePath = path.join(__dirname, '..', 'templates', 'built-in', `${config.template}.js`);
    
    try {
      await fs.access(customTemplatePath);
      validations.template = { valid: true, message: 'Custom template' };
    } catch (customError) {
      // If custom not found, try built-in
      await fs.access(builtInTemplatePath);
      validations.template = { valid: true, message: 'Built-in template' };
    }
  } catch (error) {
    validations.template = { valid: false, message: 'Template not found' };
  }

  // Validate extra data URLs
  for (let i = 0; i < extraDataUrls.length; i++) {
    const source = extraDataUrls[i];
    try {
      const urlObj = new URL(source.url);
      validations.extraDataUrls.push({
        index: i,
        valid: true,
        message: 'Valid URL format'
      });
    } catch (error) {
      validations.extraDataUrls.push({
        index: i,
        valid: false,
        message: 'Invalid URL format'
      });
    }
  }

  return validations;
}

/**
 * Generate validation badge HTML
 * Only shows badges for validation failures (errors/warnings)
 */
function getValidationBadge(validation) {
  if (!validation) return '';
  
  // Only show badge if validation failed
  if (!validation.valid) {
    return `<span class="validation-indicator"><span class="validation-icon">❌</span><span class="badge badge-danger">${escapeHtml(validation.message)}</span></span>`;
  }
  
  // Return empty string for successful validations
  return '';
}

module.exports = {
  handleConfigPage
};
