const { loadConfig } = require('../config/loader');
const { getHistory, getHistoryStats, MAX_HISTORY_ENTRIES } = require('../cache/crc32History');
const { logDownload, EVENT_SUBTYPES } = require('../timeline');

/**
 * Express middleware handler for /api/:index/crc32-history endpoint
 * Returns CRC32 history as JSON
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function handleCRC32HistoryAPI(req, res) {
  const indexParam = req.params.index;
  
  // Validate index parameter
  const index = parseInt(indexParam, 10);
  
  if (isNaN(index) || index < 0 || indexParam !== index.toString()) {
    console.warn(`[CRC32History API] Invalid index parameter: "${indexParam}"`);
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid index parameter',
      details: 'Index must be a non-negative integer (0, 1, 2, etc.)'
    });
  }

  try {
    // Verify config exists
    try {
      await loadConfig(index);
    } catch (configError) {
      const errorMessage = configError.message || 'Unknown error';
      if (errorMessage.includes('Configuration file not found')) {
        return res.status(404).json({
          error: 'Not Found',
          message: `Configuration ${index} not found`,
          details: errorMessage
        });
      }
      throw configError;
    }
    
    // Get history and stats
    const [history, stats] = await Promise.all([
      getHistory(index),
      getHistoryStats(index)
    ]);
    
    console.log(`[CRC32History API] Returning history for config ${index}: ${history.length} entries`);
    
    // Log download to timeline
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';
    logDownload(index, EVENT_SUBTYPES.CRC32_HISTORY, {
      ip: clientIp,
      userAgent,
      entryCount: history.length
    }).catch(err => console.warn(`[Timeline] Failed to log CRC32 history download: ${err.message}`));
    
    res.json({
      index,
      history,
      stats,
      maxEntries: MAX_HISTORY_ENTRIES
    });

  } catch (error) {
    console.error(`[CRC32History API] Error fetching history for config ${index}:`, error.message);
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: `Failed to fetch CRC32 history for config ${index}`,
      details: error.message
    });
  }
}

/**
 * Express middleware handler for /crc32-history/:index page
 * Displays CRC32 history visualization
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function handleCRC32HistoryPage(req, res) {
  const indexParam = req.params.index;
  
  // Validate index parameter
  const index = parseInt(indexParam, 10);
  
  if (isNaN(index) || index < 0 || indexParam !== index.toString()) {
    return res.status(400).send('Invalid index parameter');
  }

  try {
    // Verify config exists
    let config;
    try {
      config = await loadConfig(index);
    } catch (configError) {
      const errorMessage = configError.message || 'Unknown error';
      if (errorMessage.includes('Configuration file not found')) {
        return res.status(404).send(`Configuration ${index} not found`);
      }
      throw configError;
    }
    
    // Get base URL from request
    const protocol = req.get('x-forwarded-proto') || req.protocol || 'http';
    const host = req.get('x-forwarded-host') || req.get('host') || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;
    
    // Generate HTML
    const html = generateHistoryPageHTML(index, config, baseUrl);
    
    res.type('html').send(html);
    
  } catch (error) {
    console.error(`[CRC32History Page] Error rendering page for config ${index}:`, error.message);
    res.status(500).send(`Error loading CRC32 history: ${error.message}`);
  }
}

/**
 * Generate the HTML for the CRC32 history page
 * @param {number} index - Configuration index
 * @param {Object} config - Configuration object
 * @param {string} baseUrl - Base URL for generating links
 * @returns {string} HTML content
 */
function generateHistoryPageHTML(index, config, baseUrl) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CRC32 History - Config ${index}</title>
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
      padding: 30px 40px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .header h1 {
      font-size: 2em;
      font-weight: 600;
    }
    
    .header .config-info {
      text-align: right;
      opacity: 0.9;
    }
    
    .header .config-info div {
      margin: 5px 0;
      font-size: 0.9em;
    }
    
    .back-btn {
      display: inline-block;
      margin: 20px 40px;
      padding: 10px 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 500;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    
    .back-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
    
    .stats-section {
      background: #f8f9fa;
      padding: 30px 40px;
      border-bottom: 1px solid #e9ecef;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
    }
    
    .stat-card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #667eea;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    
    .stat-card h3 {
      color: #667eea;
      font-size: 0.85em;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    
    .stat-card p {
      color: #495057;
      font-size: 1.5em;
      font-weight: 600;
    }
    
    .stat-card .subtext {
      color: #6c757d;
      font-size: 0.7em;
      margin-top: 5px;
      font-weight: normal;
    }
    
    .content {
      padding: 40px;
    }
    
    .loading {
      text-align: center;
      padding: 60px 20px;
      color: #6c757d;
    }
    
    .loading-spinner {
      border: 4px solid #f3f3f3;
      border-top: 4px solid #667eea;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 20px auto;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .timeline {
      margin-top: 30px;
    }
    
    .timeline-header {
      font-size: 1.3em;
      color: #333;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #667eea;
    }
    
    .timeline-item {
      position: relative;
      padding-left: 40px;
      padding-bottom: 30px;
      border-left: 2px solid #e9ecef;
    }
    
    .timeline-item:last-child {
      border-left: 2px solid transparent;
    }
    
    .timeline-item.changed {
      border-left-color: #667eea;
    }
    
    .timeline-dot {
      position: absolute;
      left: -8px;
      top: 0;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #e9ecef;
      border: 2px solid white;
    }
    
    .timeline-item.changed .timeline-dot {
      background: #667eea;
      width: 16px;
      height: 16px;
      left: -9px;
      box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.2);
    }
    
    .timeline-content {
      background: white;
      padding: 15px;
      border-radius: 8px;
      border: 1px solid #e9ecef;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    }
    
    .timeline-item.changed .timeline-content {
      border-color: #667eea;
      background: #f8f9ff;
    }
    
    .timeline-crc32 {
      font-family: 'Courier New', monospace;
      font-size: 1.1em;
      color: #667eea;
      font-weight: 600;
      margin-bottom: 8px;
    }
    
    .timeline-meta {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
      font-size: 0.9em;
      color: #6c757d;
    }
    
    .timeline-meta-item {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    
    .timeline-meta-item strong {
      color: #495057;
    }
    
    .trigger-badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 0.85em;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    
    .trigger-scheduled {
      background: #d4edda;
      color: #155724;
    }
    
    .trigger-fresh {
      background: #d1ecf1;
      color: #0c5460;
    }
    
    .trigger-startup {
      background: #fff3cd;
      color: #856404;
    }
    
    .trigger-config_change {
      background: #f8d7da;
      color: #721c24;
    }
    
    .trigger-cache_miss {
      background: #e2e3e5;
      color: #383d41;
    }
    
    .trigger-on_demand {
      background: #cce5ff;
      color: #004085;
    }
    
    .trigger-crc32_check {
      background: #e7e8ea;
      color: #383d41;
    }
    
    .trigger-unknown {
      background: #f0f0f0;
      color: #6c757d;
    }
    
    .change-indicator {
      background: #667eea;
      color: white;
      padding: 5px 10px;
      border-radius: 4px;
      font-size: 0.85em;
      font-weight: 600;
      margin-bottom: 8px;
      display: inline-block;
    }
    
    .no-data {
      text-align: center;
      padding: 60px 20px;
      color: #6c757d;
    }
    
    .no-data h3 {
      font-size: 1.5em;
      margin-bottom: 10px;
    }
    
    @media (max-width: 768px) {
      .header {
        flex-direction: column;
        text-align: center;
      }
      
      .header .config-info {
        text-align: center;
        margin-top: 15px;
      }
      
      .content {
        padding: 20px;
      }
      
      .timeline-meta {
        flex-direction: column;
        gap: 8px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <h1>📊 CRC32 History</h1>
      </div>
      <div class="config-info">
        <div><strong>Config Index:</strong> ${index}</div>
        <div><strong>Template:</strong> ${escapeHtml(config.template)}</div>
        <div><strong>Size:</strong> ${config.width}x${config.height}</div>
      </div>
    </div>
    
    <a href="${baseUrl}/" class="back-btn">← Back to Dashboard</a>
    
    <div class="stats-section" id="stats-section">
      <div class="loading">
        <div class="loading-spinner"></div>
        <p>Loading statistics...</p>
      </div>
    </div>
    
    <div class="content">
      <div id="history-content">
        <div class="loading">
          <div class="loading-spinner"></div>
          <p>Loading history...</p>
        </div>
      </div>
    </div>
  </div>
  
  <script>
    const API_URL = '${baseUrl}/api/${index}/crc32-history';
    
    async function loadHistory() {
      try {
        const response = await fetch(API_URL);
        if (!response.ok) {
          throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
        }
        
        const data = await response.json();
        renderStats(data.stats, data.maxEntries);
        renderHistory(data.history);
      } catch (error) {
        console.error('Failed to load history:', error);
        document.getElementById('stats-section').innerHTML = \`
          <div class="no-data">
            <h3>⚠️ Error Loading Data</h3>
            <p>\${escapeHtml(error.message)}</p>
          </div>
        \`;
        document.getElementById('history-content').innerHTML = \`
          <div class="no-data">
            <h3>⚠️ Error Loading History</h3>
            <p>\${escapeHtml(error.message)}</p>
          </div>
        \`;
      }
    }
    
    function renderStats(stats, maxEntries) {
      const statsSection = document.getElementById('stats-section');
      
      if (!stats || !stats.durationStats) {
        statsSection.innerHTML = \`
          <div class="no-data">
            <h3>No History Available</h3>
            <p>This configuration hasn't been generated yet.</p>
          </div>
        \`;
        return;
      }
      const changeRate = stats.blocks.length > 0 
        ? ((stats.changes / stats.blocks.length) * 100).toFixed(1)
        : 0;
      
      const blocksList = stats.blocks.map(block => {
        const startTime = new Date(block.start);
        const endTime = new Date(block.end);
        const diffMs = startTime - endTime;
        const diffMinutes = Math.round(diffMs / 60000);
        const timespanText = diffMinutes === 0 ? 'Less than 1 minute' : \`\${diffMinutes} minute\${diffMinutes !== 1 ? 's' : ''}\`;
        
        return \`
        <li style="margin-bottom:12px;padding:10px 18px;background:#f8f9fa;border-radius:8px;border-left:4px solid #667eea;">
          <span style="font-family:'Courier New',monospace;font-weight:600;color:#667eea;">0x\${block.crc32}</span>
          <span style="margin-left:12px;">Count: <strong>\${block.count}</strong></span>
          <span style="margin-left:12px;">Timespan: <strong>\${timespanText}</strong> (from \${formatDateTime(block.end)} to \${formatDateTime(block.start)})</span>
        </li>
      \`;
      }).join('');
      
      statsSection.innerHTML = \`
        <div class="stats-grid">
          <div class="stat-card">
            <h3>CRC32 Changes</h3>
            <p>\${stats.changes}</p>
            <div class="subtext">\${changeRate}% of blocks</div>
          </div>
          <div class="stat-card">
            <h3>Changes in Past Hour</h3>
            <p>\${stats.changesInPastHour}</p>
            <div class="subtext">Last 60 minutes</div>
          </div>
          <div class="stat-card">
            <h3>Changes in Past 24 Hours</h3>
            <p>\${stats.changesInPast24Hours}</p>
            <div class="subtext">Last day</div>
          </div>
          <div class="stat-card">
            <h3>Unique CRC32s</h3>
            <p>\${stats.uniqueCRC32Values}</p>
            <div class="subtext">Different CRC32s</div>
          </div>
          <div class="stat-card">
            <h3>Generation Duration</h3>
            <p>Min: \${stats.durationStats.min}ms<br>Max: \${stats.durationStats.max}ms<br>Avg: \${stats.durationStats.avg}ms</p>
            <div class="subtext">Based on \${stats.blocks.reduce((a,b)=>a+b.count,0)} entries</div>
          </div>
        </div>
        <div style="margin-top:30px;">
          <h3>CRC32 Blocks</h3>
          <ul style="list-style:none;padding:0;">
            \${blocksList}
          </ul>
        </div>
      \`;
    }
    
    function renderHistory(history) {
      const historyContent = document.getElementById('history-content');
      
      if (!history || history.length === 0) {
        historyContent.innerHTML = \`
          <div class="no-data">
            <h3>No History Available</h3>
            <p>This configuration hasn't been generated yet.</p>
          </div>
        \`;
        return;
      }
      
      let html = '<div class="timeline"><h2 class="timeline-header">Generation Timeline</h2>';
      
      for (let i = 0; i < history.length; i++) {
        const entry = history[i];
        const prevEntry = i < history.length - 1 ? history[i + 1] : null;
        const isChanged = prevEntry && entry.crc32 !== prevEntry.crc32;
        
        html += \`
          <div class="timeline-item \${isChanged ? 'changed' : ''}">
            <div class="timeline-dot"></div>
            <div class="timeline-content">
              \${isChanged ? '<div class="change-indicator">🔄 CRC32 Changed</div>' : ''}
              <div class="timeline-crc32">0x\${entry.crc32}</div>
              <div class="timeline-meta">
                <div class="timeline-meta-item">
                  <strong>⏰</strong>
                  <span>\${formatDateTime(entry.timestamp)}</span>
                </div>
                <div class="timeline-meta-item">
                  <strong>Trigger:</strong>
                  <span class="trigger-badge trigger-\${entry.trigger}">\${entry.trigger.replace('_', ' ')}</span>
                </div>
                \${entry.generationDuration ? \`
                  <div class="timeline-meta-item">
                    <strong>⚡</strong>
                    <span>\${entry.generationDuration}ms</span>
                  </div>
                \` : ''}
                \${entry.imageSize ? \`
                  <div class="timeline-meta-item">
                    <strong>📦</strong>
                    <span>\${formatBytes(entry.imageSize)}</span>
                  </div>
                \` : ''}
              </div>
            </div>
          </div>
        \`;
      }
      
      html += '</div>';
      historyContent.innerHTML = html;
    }
    
    function formatDateTime(timestamp) {
      const date = new Date(timestamp);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    }
    
    function formatDate(timestamp) {
      const date = new Date(timestamp);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    }
    
    function formatTime(timestamp) {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    function formatBytes(bytes) {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }
    
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
    
    // Load history on page load
    loadHistory();
  </script>
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
  handleCRC32HistoryAPI,
  handleCRC32HistoryPage
};
