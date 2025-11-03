const { loadConfig } = require('../config/loader');
const { getTimeline, getTimelineStats } = require('../timeline');

/**
 * Express middleware handler for /timeline/:index page
 * Displays timeline visualization for a specific configuration
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function handleTimelinePage(req, res) {
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
    
    // Load timeline events and stats
    const [events, stats] = await Promise.all([
      getTimeline(index),
      getTimelineStats(index)
    ]);
    
    // Generate HTML
    const html = generateTimelinePageHTML(index, config, events, stats, baseUrl);
    
    res.type('html').send(html);
    
  } catch (error) {
    console.error(`[Timeline Page] Error rendering page for config ${index}:`, error.message);
    res.status(500).send(`Error loading timeline: ${error.message}`);
  }
}

/**
 * Generate the HTML for the timeline page
 * @param {number} index - Configuration index
 * @param {Object} config - Configuration object
 * @param {Array} events - Timeline events
 * @param {Object} stats - Timeline statistics
 * @param {string} baseUrl - Base URL for generating links
 * @returns {string} HTML content
 */
function generateTimelinePageHTML(index, config, events, stats, baseUrl) {
  // Calculate event type counts
  const eventCounts = {
    generation: 0,
    download: 0,
    ics: 0,
    config: 0,
    system: 0,
    error: 0
  };
  
  events.forEach(event => {
    if (eventCounts[event.eventType] !== undefined) {
      eventCounts[event.eventType]++;
    }
  });
  
  // Extract unique IPs from download events
  const uniqueIPs = new Set();
  events.forEach(event => {
    if (event.eventType === 'download' && event.metadata && event.metadata.ip) {
      uniqueIPs.add(event.metadata.ip);
    }
  });
  const sortedIPs = Array.from(uniqueIPs).sort();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Timeline - Config ${index}</title>
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
    }
    
    .header h1 {
      font-size: 2em;
      font-weight: 600;
      margin-bottom: 10px;
    }
    
    .header .subtitle {
      opacity: 0.9;
      font-size: 0.95em;
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
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 20px;
      margin-bottom: 20px;
    }
    
    .stat-card {
      background: white;
      padding: 15px;
      border-radius: 8px;
      border-left: 4px solid #667eea;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    
    .stat-card h3 {
      color: #667eea;
      font-size: 0.75em;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 5px;
    }
    
    .stat-card p {
      color: #495057;
      font-size: 1.5em;
      font-weight: 600;
    }
    
    .filters {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
    }
    
    .filter-label {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 5px 12px;
      background: white;
      border: 2px solid #e9ecef;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
      user-select: none;
    }
    
    .filter-label:hover {
      border-color: #667eea;
    }
    
    .filter-label input[type="checkbox"] {
      cursor: pointer;
    }
    
    .filter-label.active {
      background: #667eea;
      border-color: #667eea;
      color: white;
    }
    
    .auto-refresh {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 5px 12px;
      background: white;
      border: 2px solid #e9ecef;
      border-radius: 6px;
    }
    
    .ip-filter {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 5px 12px;
      background: white;
      border: 2px solid #e9ecef;
      border-radius: 6px;
    }
    
    .ip-filter select {
      padding: 4px 8px;
      border: 1px solid #dee2e6;
      border-radius: 4px;
      background: white;
      cursor: pointer;
      font-size: 14px;
    }
    
    .ip-filter label {
      font-weight: 500;
      color: #495057;
      font-size: 14px;
    }
    
    .content {
      padding: 40px;
    }
    
    .timeline {
      position: relative;
    }
    
    .timeline-item {
      position: relative;
      padding-left: 30px;
      margin-bottom: 5px;
      border-left: 2px solid #e9ecef;
    }
    
    .timeline-item:last-child {
      border-left: 2px solid transparent;
    }
    
    .timeline-dot {
      position: absolute;
      left: -7px;
      top: 8px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #6c757d;
      border: 2px solid white;
      box-shadow: 0 0 0 2px #e9ecef;
    }
    
    .timeline-item.type-generation .timeline-dot { background: #28a745; }
    .timeline-item.type-download .timeline-dot { background: #fd7e14; }
    .timeline-item.type-ics .timeline-dot { background: #28a745; }
    .timeline-item.type-config .timeline-dot { background: #ffc107; }
    .timeline-item.type-system .timeline-dot { background: #6c757d; }
    .timeline-item.type-error .timeline-dot { background: #dc3545; }
    
    .timeline-content {
      background: white;
      padding: 12px 15px;
      border-radius: 6px;
      border: 1px solid #e9ecef;
      cursor: pointer;
      transition: all 0.2s;
      margin-bottom: 10px;
    }
    
    .timeline-content:hover {
      border-color: #667eea;
      box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2);
    }
    
    .event-header {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      font-size: 0.9em;
    }
    
    .event-time {
      color: #6c757d;
      font-weight: 500;
      min-width: 120px;
    }
    
    .event-badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 0.85em;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    
    .badge-generation { background: #d4edda; color: #155724; }
    .badge-download { background: #fff3cd; color: #856404; }
    .badge-ics { background: #d1ecf1; color: #0c5460; }
    .badge-config { background: #fff3cd; color: #856404; }
    .badge-system { background: #e2e3e5; color: #383d41; }
    .badge-error { background: #f8d7da; color: #721c24; }
    
    .event-metadata {
      color: #495057;
      font-family: 'Courier New', monospace;
      font-size: 0.85em;
    }
    
    .event-details {
      display: none;
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid #e9ecef;
    }
    
    .event-details.expanded {
      display: block;
    }
    
    .event-details pre {
      background: #f8f9fa;
      padding: 10px;
      border-radius: 4px;
      overflow-x: auto;
      font-size: 0.85em;
    }
    
    .copy-btn {
      padding: 5px 10px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.85em;
      margin-top: 5px;
    }
    
    .copy-btn:hover {
      background: #5568d3;
    }
    
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: #6c757d;
    }
    
    .empty-state h2 {
      margin-bottom: 10px;
    }
    
    @media (max-width: 768px) {
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }
      
      .event-header {
        flex-direction: column;
        align-items: flex-start;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Timeline - Config ${index}</h1>
      <div class="subtitle">
        Template: ${config.template} | 
        Last 24 hours (${events.length} events)
      </div>
    </div>
    
    <a href="${baseUrl}/" class="back-btn">← Back to Dashboard</a>
    
    <div class="stats-section">
      <div class="stats-grid">
        <div class="stat-card">
          <h3>Total Events</h3>
          <p>${events.length}</p>
        </div>
        <div class="stat-card">
          <h3>Generations</h3>
          <p>${eventCounts.generation}</p>
        </div>
        <div class="stat-card">
          <h3>Downloads</h3>
          <p>${eventCounts.download}</p>
        </div>
        <div class="stat-card">
          <h3>ICS Events</h3>
          <p>${eventCounts.ics}</p>
        </div>
        <div class="stat-card">
          <h3>Errors</h3>
          <p>${eventCounts.error}</p>
        </div>
        <div class="stat-card">
          <h3>Other</h3>
          <p>${eventCounts.config + eventCounts.system}</p>
        </div>
      </div>
      
      <div class="filters">
        <strong>Filters:</strong>
        <label class="filter-label active">
          <input type="checkbox" checked data-filter="generation"> Generations
        </label>
        <label class="filter-label active">
          <input type="checkbox" checked data-filter="download"> Downloads
        </label>
        <label class="filter-label active">
          <input type="checkbox" checked data-filter="ics"> ICS
        </label>
        <label class="filter-label active">
          <input type="checkbox" checked data-filter="error"> Errors
        </label>
        <label class="filter-label active">
          <input type="checkbox" checked data-filter="config"> Config
        </label>
        <label class="filter-label active">
          <input type="checkbox" checked data-filter="system"> System
        </label>
        
        <div class="ip-filter">
          <label for="ip-filter-select">IP/Host:</label>
          <select id="ip-filter-select">
            <option value="all">All IPs</option>
            ${sortedIPs.map(ip => `<option value="${ip}">${ip}</option>`).join('')}
          </select>
        </div>
        
        <div class="auto-refresh">
          <label>
            <input type="checkbox" id="auto-refresh"> Auto-refresh
          </label>
          <select id="refresh-interval">
            <option value="10">10s</option>
            <option value="30" selected>30s</option>
            <option value="60">60s</option>
          </select>
        </div>
      </div>
    </div>
    
    <div class="content">
      ${events.length === 0 ? `
        <div class="empty-state">
          <h2>No Events Yet</h2>
          <p>Timeline events will appear here as they occur.</p>
        </div>
      ` : `
        <div class="timeline">
          ${events.map((event, i) => generateEventHTML(event, i)).join('')}
        </div>
      `}
    </div>
  </div>
  
  <script>
    // Event data
    const events = ${JSON.stringify(events)};
    
    // Filter functionality
    const filterCheckboxes = document.querySelectorAll('[data-filter]');
    const timelineItems = document.querySelectorAll('.timeline-item');
    
    filterCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', function() {
        const label = this.closest('.filter-label');
        if (this.checked) {
          label.classList.add('active');
        } else {
          label.classList.remove('active');
        }
        applyFilters();
      });
    });
    
    // IP filter functionality
    const ipFilterSelect = document.getElementById('ip-filter-select');
    if (ipFilterSelect) {
      ipFilterSelect.addEventListener('change', applyFilters);
    }
    
    function applyFilters() {
      const activeFilters = Array.from(filterCheckboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.dataset.filter);
      
      const selectedIP = ipFilterSelect ? ipFilterSelect.value : 'all';
      
      timelineItems.forEach(item => {
        const eventType = item.dataset.type;
        const itemIP = item.dataset.ip;
        
        // Check event type filter
        const typeMatch = activeFilters.includes(eventType);
        
        // Check IP filter (only applies to download events)
        let ipMatch = true;
        if (selectedIP !== 'all' && eventType === 'download') {
          ipMatch = (itemIP === selectedIP);
        }
        
        // Show item only if both filters match
        if (typeMatch && ipMatch) {
          item.style.display = '';
        } else {
          item.style.display = 'none';
        }
      });
    }
    
    // Expand/collapse event details
    document.querySelectorAll('.timeline-content').forEach((content, index) => {
      content.addEventListener('click', function(e) {
        if (e.target.classList.contains('copy-btn')) return;
        
        const details = this.querySelector('.event-details');
        details.classList.toggle('expanded');
      });
    });
    
    // Copy to clipboard
    document.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        const eventIndex = this.dataset.index;
        const eventData = JSON.stringify(events[eventIndex], null, 2);
        navigator.clipboard.writeText(eventData).then(() => {
          const originalText = this.textContent;
          this.textContent = 'Copied!';
          setTimeout(() => {
            this.textContent = originalText;
          }, 1500);
        });
      });
    });
    
    // Auto-refresh with localStorage persistence
    let refreshInterval = null;
    const autoRefreshCheckbox = document.getElementById('auto-refresh');
    const refreshIntervalSelect = document.getElementById('refresh-interval');
    const storageKey = 'timeline-autorefresh-${index}';
    
    // Restore saved settings from localStorage
    const savedSettings = localStorage.getItem(storageKey);
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        autoRefreshCheckbox.checked = settings.enabled || false;
        refreshIntervalSelect.value = settings.interval || '30';
      } catch (e) {
        console.error('Failed to restore auto-refresh settings:', e);
      }
    }
    
    function saveSettings() {
      localStorage.setItem(storageKey, JSON.stringify({
        enabled: autoRefreshCheckbox.checked,
        interval: refreshIntervalSelect.value
      }));
    }
    
    function startAutoRefresh() {
      const seconds = parseInt(refreshIntervalSelect.value);
      refreshInterval = setInterval(() => {
        location.reload();
      }, seconds * 1000);
    }
    
    function stopAutoRefresh() {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
      }
    }
    
    autoRefreshCheckbox.addEventListener('change', function() {
      saveSettings();
      if (this.checked) {
        startAutoRefresh();
      } else {
        stopAutoRefresh();
      }
    });
    
    refreshIntervalSelect.addEventListener('change', function() {
      saveSettings();
      if (autoRefreshCheckbox.checked) {
        stopAutoRefresh();
        startAutoRefresh();
      }
    });
    
    // Start auto-refresh if it was enabled
    if (autoRefreshCheckbox.checked) {
      startAutoRefresh();
    }
    
    // Format relative time
    function formatRelativeTime(timestamp) {
      const now = new Date();
      const then = new Date(timestamp);
      const diffMs = now - then;
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      
      if (diffSecs < 60) return \`\${diffSecs}s ago\`;
      if (diffMins < 60) return \`\${diffMins}m ago\`;
      if (diffHours < 24) return \`\${diffHours}h ago\`;
      return then.toLocaleString();
    }
    
    // Update relative times
    function updateRelativeTimes() {
      document.querySelectorAll('.event-time').forEach((el, index) => {
        if (events[index]) {
          el.textContent = formatRelativeTime(events[index].timestamp);
        }
      });
    }
    
    // Update times every 10 seconds
    setInterval(updateRelativeTimes, 10000);
    updateRelativeTimes();
  </script>
</body>
</html>`;
}

/**
 * Generate HTML for a single timeline event
 * @param {Object} event - Timeline event object
 * @param {number} index - Event index
 * @returns {string} HTML for the event
 */
function generateEventHTML(event, index) {
  const metadataStr = Object.entries(event.metadata || {})
    .map(([key, value]) => `${key}=${typeof value === 'object' ? JSON.stringify(value) : value}`)
    .join(' | ');
  
  // Extract IP for download events
  const ipAttr = (event.eventType === 'download' && event.metadata && event.metadata.ip) 
    ? `data-ip="${event.metadata.ip}"` 
    : '';
  
  // Add visual indicator for generation events with CRC32 changes
  const crc32Indicator = (event.eventType === 'generation' && event.metadata && event.metadata.changed === true)
    ? ' 🆕'
    : '';
  
  return `
    <div class="timeline-item type-${event.eventType}" data-type="${event.eventType}" ${ipAttr}>
      <div class="timeline-dot"></div>
      <div class="timeline-content">
        <div class="event-header">
          <span class="event-time">${new Date(event.timestamp).toLocaleString()}</span>
          <span class="event-badge badge-${event.eventType}">${event.eventType}:${event.eventSubtype}${crc32Indicator}</span>
          <span class="event-metadata">${metadataStr}</span>
        </div>
        <div class="event-details">
          <pre>${JSON.stringify(event, null, 2)}</pre>
          <button class="copy-btn" data-index="${index}">Copy JSON</button>
        </div>
      </div>
    </div>
  `;
}

module.exports = {
  handleTimelinePage
};
