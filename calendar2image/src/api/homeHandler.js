const { loadAllConfigs, CONFIG_DIR } = require('../config/loader');
const fs = require('fs').promises;
const path = require('path');

/**
 * Express middleware handler for the home page (/)
 * Displays all configurations with links to API endpoints
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function handleHomePage(req, res) {
  try {
    console.log('[Home] Rendering home page...');
    
    // Load all configurations
    const configs = await loadAllConfigs(CONFIG_DIR);
    
    // Sort by index
    configs.sort((a, b) => a.index - b.index);
    
    // Get base URL from request
    const protocol = req.get('x-forwarded-proto') || req.protocol || 'http';
    const host = req.get('x-forwarded-host') || req.get('host') || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;
    
    // Generate HTML
    const html = generateHomePageHTML(configs, baseUrl);
    
    res.type('html').send(html);
    
  } catch (error) {
    console.error('[Home] Error rendering home page:', error.message);
    
    // Send error page
    const errorHtml = generateErrorPageHTML(error.message);
    res.status(500).type('html').send(errorHtml);
  }
}

/**
 * Express middleware handler for the config JSON API endpoint
 * Returns all configurations as JSON
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function handleConfigListAPI(req, res) {
  try {
    console.log('[API] Loading all configurations...');
    
    // Load all configurations
    const configs = await loadAllConfigs(CONFIG_DIR);
    
    // Sort by index
    configs.sort((a, b) => a.index - b.index);
    
    res.json({
      count: configs.length,
      configurations: configs
    });
    
  } catch (error) {
    console.error('[API] Error loading configurations:', error.message);
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to load configurations',
      details: error.message
    });
  }
}

/**
 * Express middleware handler for individual config JSON endpoint
 * Returns a single configuration as JSON
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function handleConfigAPI(req, res) {
  const indexParam = req.params.index;
  
  // Validate index parameter
  const index = parseInt(indexParam, 10);
  
  if (isNaN(index) || index < 0 || indexParam !== index.toString()) {
    console.warn(`[API] Invalid index parameter: "${indexParam}"`);
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid index parameter',
      details: 'Index must be a non-negative integer (0, 1, 2, etc.)'
    });
  }
  
  try {
    console.log(`[API] Loading configuration ${index}...`);
    
    // Use the loadConfig function which already applies defaults and validates
    const { loadConfig } = require('../config/loader');
    const config = await loadConfig(index);
    
    res.json({
      index,
      config
    });
    
  } catch (error) {
    console.error(`[API] Error loading configuration ${index}:`, error.message);
    
    // Determine appropriate status code
    const statusCode = error.message.includes('not found') ? 404 : 500;
    
    res.status(statusCode).json({
      error: statusCode === 404 ? 'Not Found' : 'Internal Server Error',
      message: `Failed to load configuration ${index}`,
      details: error.message
    });
  }
}

/**
 * Generate the HTML for the home page
 * @param {Array} configs - Array of configuration objects
 * @param {string} baseUrl - Base URL for generating links
 * @returns {string} HTML content
 */
function generateHomePageHTML(configs, baseUrl) {
  const configRows = configs.map(({ index, config }) => {
    const ext = config.imageType;
    const imageUrl = `${baseUrl}/api/${index}.${ext}`;
    const freshUrl = `${baseUrl}/api/${index}/fresh.${ext}`;
    const crc32Url = `${baseUrl}/api/${index}.${ext}.crc32`;
    const configUrl = `${baseUrl}/config/${index}`;
    const historyUrl = `${baseUrl}/crc32-history/${index}`;
    
    const hasSchedule = config.preGenerateInterval ? `Yes (${config.preGenerateInterval})` : 'No';
    
    return `
      <tr>
        <td class="index-col">${index}</td>
        <td class="template-col">${escapeHtml(config.template)}</td>
        <td class="size-col">${config.width}x${config.height}</td>
        <td class="type-col">${ext}</td>
        <td class="schedule-col">${hasSchedule}</td>
        <td class="links-col">
          <a href="${imageUrl}" target="_blank" class="link-btn" title="Get image (cached if available)">Image</a>
          <a href="${freshUrl}" target="_blank" class="link-btn" title="Force fresh generation">Fresh</a>
          <a href="${crc32Url}" target="_blank" class="link-btn crc32-btn" data-crc32-url="${crc32Url}" title="Get CRC32 checksum">CRC32: Loading...</a>
          <a href="${historyUrl}" class="link-btn crc32-history-btn" style="background:linear-gradient(135deg,#ff9800 0%,#ff5722 100%);color:white;" title="View CRC32 history">CRC32 history</a>
          <a href="${configUrl}" class="link-btn config-btn" style="background:linear-gradient(135deg,#ff9800 0%,#ff5722 100%);color:white;" title="View configuration details">Config</a>
        </td>
      </tr>`;
  }).join('\n');
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Calendar2Image - Configuration Dashboard</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    
    .container {
      max-width: 1400px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      overflow: hidden;
    }
    
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px;
      text-align: center;
    }
    
    .header h1 {
      font-size: 2.5em;
      margin-bottom: 10px;
      font-weight: 600;
    }
    
    .header p {
      font-size: 1.1em;
      opacity: 0.9;
    }
    
    .info-section {
      background: #f8f9fa;
      padding: 30px 40px;
      border-bottom: 1px solid #e9ecef;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
    }
    
    .info-card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #667eea;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    
    .info-card h3 {
      color: #667eea;
      font-size: 0.9em;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    
    .info-card p {
      color: #495057;
      font-size: 1.3em;
      font-weight: 600;
    }
    
    .content {
      padding: 40px;
    }
    
    .section-title {
      font-size: 1.8em;
      color: #333;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 3px solid #667eea;
    }
    
    .table-container {
      overflow-x: auto;
      margin-top: 20px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      background: white;
    }
    
    thead {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    
    th {
      padding: 16px;
      text-align: left;
      font-weight: 600;
      text-transform: uppercase;
      font-size: 0.85em;
      letter-spacing: 0.5px;
    }
    
    td {
      padding: 16px;
      border-bottom: 1px solid #e9ecef;
    }
    
    tbody tr {
      transition: background-color 0.2s;
    }
    
    tbody tr:hover {
      background-color: #f8f9fa;
    }
    
    .index-col {
      font-weight: 600;
      color: #667eea;
      font-size: 1.1em;
    }
    
    .template-col {
      font-family: 'Courier New', monospace;
      color: #495057;
    }
    
    .links-col {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    
    .link-btn {
      display: inline-block;
      padding: 6px 12px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-decoration: none;
      border-radius: 4px;
      font-size: 0.85em;
      font-weight: 500;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    
    .link-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
    
    .api-docs {
      margin-top: 40px;
      padding: 30px;
      background: #f8f9fa;
      border-radius: 8px;
      border: 1px solid #e9ecef;
    }
    
    .api-docs h2 {
      color: #333;
      margin-bottom: 20px;
      font-size: 1.5em;
    }
    
    .endpoint {
      background: white;
      padding: 15px;
      margin-bottom: 15px;
      border-radius: 6px;
      border-left: 4px solid #667eea;
      font-family: 'Courier New', monospace;
    }
    
    .endpoint code {
      color: #667eea;
      font-weight: 600;
    }
    
    .endpoint p {
      color: #6c757d;
      margin-top: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 0.9em;
    }
    
    .footer {
      text-align: center;
      padding: 30px;
      color: #6c757d;
      background: #f8f9fa;
      border-top: 1px solid #e9ecef;
    }
    
    .badge {
      display: inline-block;
      padding: 4px 8px;
      background: #28a745;
      color: white;
      border-radius: 4px;
      font-size: 0.8em;
      font-weight: 600;
      margin-left: 10px;
    }
    
    .no-config {
      text-align: center;
      padding: 60px 20px;
      color: #6c757d;
    }
    
    .no-config h3 {
      font-size: 1.5em;
      margin-bottom: 10px;
    }
    
    @media (max-width: 768px) {
      .header h1 {
        font-size: 1.8em;
      }
      
      .content {
        padding: 20px;
      }
      
      table {
        font-size: 0.9em;
      }
      
      th, td {
        padding: 10px 8px;
      }
      
      .links-col {
        flex-direction: column;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📅 Calendar2Image</h1>
      <p>Configuration Dashboard & API Documentation</p>
    </div>
    
    <div class="info-section">
      <div class="info-grid">
        <div class="info-card">
          <h3>Total Configurations</h3>
          <p>${configs.length}</p>
        </div>
        <div class="info-card">
          <h3>Configuration Directory</h3>
          <p>${escapeHtml(CONFIG_DIR)}</p>
        </div>
        <div class="info-card">
          <h3>API Endpoints</h3>
          <p>${configs.length * 4}</p>
        </div>
        <div class="info-card">
          <h3>Status</h3>
          <p>Healthy <span class="badge">✓</span></p>
        </div>
      </div>
    </div>
    
    <div class="content">
      <h2 class="section-title">Active Configurations</h2>
      
      ${configs.length > 0 ? `
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Index</th>
              <th>Template</th>
              <th>Size</th>
              <th>Type</th>
              <th>Auto-Generate</th>
              <th>API Endpoints</th>
            </tr>
          </thead>
          <tbody>
            ${configRows}
          </tbody>
        </table>
      </div>
      ` : `
      <div class="no-config">
        <h3>No configurations found</h3>
        <p>Add configuration files (0.json, 1.json, etc.) to ${escapeHtml(CONFIG_DIR)}</p>
      </div>
      `}
      
      <div class="api-docs">
        <h2>📚 API Documentation</h2>
        
        <div class="endpoint">
          <code>GET /api/{index}.{ext}</code>
          <p>Get calendar image (cached if available). Extension must match config's imageType.</p>
        </div>
        
        <div class="endpoint">
          <code>GET /api/{index}/fresh.{ext}</code>
          <p>Force fresh image generation, bypassing cache. Updates cache with new image.</p>
        </div>
        
        <div class="endpoint">
          <code>GET /api/{index}.{ext}.crc32</code>
          <p>Get CRC32 checksum of the image (returns plain text).</p>
        </div>
        
        <div class="endpoint">
          <code>GET /api/config/{index}</code>
          <p>Get configuration as JSON for the specified index.</p>
        </div>
        
        <div class="endpoint">
          <code>GET /api/configs</code>
          <p>Get all configurations as JSON array.</p>
        </div>
        
        <div class="endpoint">
          <code>GET /health</code>
          <p>Health check endpoint (returns JSON status).</p>
        </div>
      </div>
    </div>
    
    <div class="footer">
      <p>Calendar2Image Add-on for Home Assistant</p>
      <p style="margin-top: 5px; font-size: 0.9em;">Generated at ${new Date().toISOString()}</p>
    </div>
  </div>
  
  <script>
    // Fetch CRC32 values for all configurations
    document.addEventListener('DOMContentLoaded', async () => {
      const crc32Buttons = document.querySelectorAll('.crc32-btn');
      
      for (const button of crc32Buttons) {
        const crc32Url = button.getAttribute('data-crc32-url');
        
        try {
          const response = await fetch(crc32Url);
          if (response.ok) {
            const crc32 = await response.text();
            // Add 0x prefix for proper hex notation
            button.textContent = \`CRC32: 0x\${crc32}\`;
          } else {
            button.textContent = 'CRC32: Error';
          }
        } catch (error) {
          console.error('Failed to fetch CRC32:', error);
          button.textContent = 'CRC32: Error';
        }
      }
    });
  </script>
</body>
</html>`;
}

/**
 * Generate an error page HTML
 * @param {string} errorMessage - Error message to display
 * @returns {string} HTML content
 */
function generateErrorPageHTML(errorMessage) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Calendar2Image - Error</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    
    .error-container {
      background: white;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      max-width: 600px;
      text-align: center;
    }
    
    h1 {
      color: #dc3545;
      font-size: 2em;
      margin-bottom: 20px;
    }
    
    p {
      color: #6c757d;
      line-height: 1.6;
    }
    
    .error-details {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      margin-top: 20px;
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
      color: #495057;
      text-align: left;
      word-break: break-word;
    }
  </style>
</head>
<body>
  <div class="error-container">
    <h1>⚠️ Error Loading Configurations</h1>
    <p>The application encountered an error while loading the configuration files.</p>
    <div class="error-details">${escapeHtml(errorMessage)}</div>
    <p style="margin-top: 20px;">Please check your configuration files in <code>${escapeHtml(CONFIG_DIR)}</code></p>
  </div>
</body>
</html>`;
}

/**
 * Escape HTML special characters
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

module.exports = {
  handleHomePage,
  handleConfigListAPI,
  handleConfigAPI
};
