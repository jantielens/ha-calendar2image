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
 * Group events by CRC32 value
 * @param {Array} events - Timeline events (sorted newest first)
 * @returns {Array} Array of CRC32 groups with events
 */
function groupEventsByCRC32(events) {
  const groups = [];
  let currentCRC32 = null;
  let currentGroup = null;
  
  // Events are already sorted newest first
  // We want to group consecutive events with the same CRC32
  events.forEach(event => {
    // Extract CRC32 from event metadata
    // For generation and download events, use the CRC32 from metadata
    let eventCRC32 = 'unknown';
    
    if ((event.eventType === 'generation' || event.eventType === 'download') && event.metadata?.crc32) {
      eventCRC32 = event.metadata.crc32;
    }
    
    // Start a new group if CRC32 changes
    if (eventCRC32 !== currentCRC32) {
      if (currentGroup) {
        groups.push(currentGroup);
      }
      currentCRC32 = eventCRC32;
      currentGroup = {
        crc32: eventCRC32,
        events: [],
        startTime: event.timestamp,
        endTime: event.timestamp
      };
    }
    
    // Add event to current group
    currentGroup.events.push(event);
    // Update endTime (oldest event in the group, since we're going newest to oldest)
    currentGroup.endTime = event.timestamp;
  });
  
  // Add the last group
  if (currentGroup) {
    groups.push(currentGroup);
  }
  
  return groups;
}

/**
 * Calculate event type counts for a group
 * @param {Array} events - Events in the group
 * @returns {Object} Event counts by type
 */
function calculateEventCounts(events) {
  const counts = {
    generation: 0,
    download: 0,
    ics: 0,
    config: 0,
    system: 0,
    error: 0,
    imageDownload: 0,
    crc32Download: 0
  };
  
  events.forEach(event => {
    if (counts[event.eventType] !== undefined) {
      counts[event.eventType]++;
    }
    
    // Track download subtypes
    if (event.eventType === 'download') {
      if (event.eventSubtype === 'image') {
        counts.imageDownload++;
      } else if (event.eventSubtype === 'crc32') {
        counts.crc32Download++;
      }
    }
  });
  
  return counts;
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
  // Group events by CRC32
  const crc32Groups = groupEventsByCRC32(events);
  
  // Calculate overall event type counts
  const eventCounts = calculateEventCounts(events);
  
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
    
    .controls {
      display: flex;
      gap: 10px;
      align-items: center;
      margin-bottom: 15px;
    }
    
    .control-btn {
      padding: 8px 16px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.9em;
      font-weight: 500;
      transition: background 0.2s;
    }
    
    .control-btn:hover {
      background: #5568d3;
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
    
    .crc32-block {
      margin-bottom: 20px;
      border: 1px solid #dee2e6;
      border-radius: 8px;
      overflow: hidden;
    }
    
    .crc32-block:nth-child(odd) {
      background: #f8f9fa;
    }
    
    .crc32-block:nth-child(even) {
      background: #e9ecef;
    }
    
    .crc32-header {
      padding: 15px 20px;
      cursor: pointer;
      user-select: none;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: background 0.2s;
    }
    
    .crc32-header:hover {
      filter: brightness(0.98);
    }
    
    .crc32-title {
      font-weight: 600;
      font-size: 1.1em;
      color: #495057;
      flex: 1;
    }
    
    .crc32-info {
      display: flex;
      gap: 20px;
      align-items: center;
      font-size: 0.9em;
      color: #6c757d;
    }
    
    .crc32-summary {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    
    .summary-badge {
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 0.85em;
      font-weight: 500;
      background: white;
      border: 1px solid #dee2e6;
    }
    
    .expand-icon {
      font-size: 1.2em;
      transition: transform 0.3s;
    }
    
    .crc32-block.collapsed .expand-icon {
      transform: rotate(-90deg);
    }
    
    .crc32-content {
      max-height: 10000px;
      overflow: hidden;
      transition: max-height 0.3s ease-out;
    }
    
    .crc32-block.collapsed .crc32-content {
      max-height: 0;
    }
    
    .event-table {
      width: 100%;
      border-collapse: collapse;
    }
    
    .event-row {
      border-top: 1px solid #dee2e6;
      cursor: pointer;
      transition: background 0.2s;
    }
    
    .event-row:hover {
      background: rgba(102, 126, 234, 0.05);
    }
    
    .event-row.expanded {
      background: rgba(102, 126, 234, 0.08);
    }
    
    .event-row td {
      padding: 12px 20px;
    }
    
    .event-time {
      color: #6c757d;
      font-weight: 500;
      min-width: 140px;
      font-size: 0.9em;
    }
    
    .event-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 0.85em;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      white-space: nowrap;
    }
    
    .badge-generation { background: #d4edda; color: #155724; }
    .badge-download { background: #fff3cd; color: #856404; }
    .badge-download-image { background: #cce5ff; color: #004085; }
    .badge-download-crc32 { background: #fff3cd; color: #856404; }
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
      padding: 15px 20px;
      background: rgba(255, 255, 255, 0.5);
      border-top: 1px solid #dee2e6;
    }
    
    .event-details pre {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 4px;
      overflow-x: auto;
      font-size: 0.85em;
      margin: 0;
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
          <h3>CRC32 Blocks</h3>
          <p>${crc32Groups.length}</p>
        </div>
        <div class="stat-card">
          <h3>Generations</h3>
          <p>${eventCounts.generation}</p>
        </div>
        <div class="stat-card">
          <h3>Image Downloads</h3>
          <p>${eventCounts.imageDownload}</p>
        </div>
        <div class="stat-card">
          <h3>CRC32 Downloads</h3>
          <p>${eventCounts.crc32Download}</p>
        </div>
        <div class="stat-card">
          <h3>Errors</h3>
          <p>${eventCounts.error}</p>
        </div>
      </div>
      
      <div class="controls">
        <button class="control-btn" id="expand-all-btn">Expand All</button>
        <button class="control-btn" id="collapse-all-btn">Collapse All</button>
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
            <option value="20">20s</option>
            <option value="30" selected>30s</option>
          </select>
        </div>
      </div>
    </div>
    
    <div class="content">
      ${crc32Groups.length === 0 ? `
        <div class="empty-state">
          <h2>No Events Yet</h2>
          <p>Timeline events will appear here as they occur.</p>
        </div>
      ` : `
        ${crc32Groups.map((group, groupIndex) => generateCRC32BlockHTML(group, groupIndex, index)).join('')}
      `}
    </div>
  </div>
  
  <script>
    // Event data
    const events = ${JSON.stringify(events)};
    const crc32Groups = ${JSON.stringify(crc32Groups.map(g => ({ crc32: g.crc32, eventCount: g.events.length })))};
    
    // Expand/Collapse CRC32 blocks
    document.querySelectorAll('.crc32-header').forEach(header => {
      header.addEventListener('click', function() {
        const block = this.closest('.crc32-block');
        block.classList.toggle('collapsed');
      });
    });
    
    // Expand all / Collapse all buttons
    document.getElementById('expand-all-btn').addEventListener('click', function() {
      document.querySelectorAll('.crc32-block').forEach(block => {
        block.classList.remove('collapsed');
      });
    });
    
    document.getElementById('collapse-all-btn').addEventListener('click', function() {
      document.querySelectorAll('.crc32-block').forEach(block => {
        block.classList.add('collapsed');
      });
    });
    
    // Expand/collapse individual event rows
    document.querySelectorAll('.event-row').forEach(row => {
      row.addEventListener('click', function(e) {
        if (e.target.classList.contains('copy-btn')) return;
        
        // Find the next row (which is the details row)
        const detailsRow = this.nextElementSibling;
        if (detailsRow && detailsRow.querySelector('.event-details')) {
          // Toggle visibility
          if (detailsRow.style.display === 'none' || detailsRow.style.display === '') {
            detailsRow.style.display = 'table-row';
            this.classList.add('expanded');
          } else {
            detailsRow.style.display = 'none';
            this.classList.remove('expanded');
          }
        }
      });
    });
    
    // Copy to clipboard
    document.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        const eventData = this.dataset.event;
        const eventObj = JSON.parse(eventData.replace(/&apos;/g, "'"));
        navigator.clipboard.writeText(JSON.stringify(eventObj, null, 2)).then(() => {
          const originalText = this.textContent;
          this.textContent = 'Copied!';
          setTimeout(() => {
            this.textContent = originalText;
          }, 1500);
        });
      });
    });
    
    // Default: collapse all except the first (most recent)
    document.querySelectorAll('.crc32-block').forEach((block, index) => {
      if (index > 0) {
        block.classList.add('collapsed');
      }
    });
    
    // Filter functionality
    const filterCheckboxes = document.querySelectorAll('[data-filter]');
    const eventRows = document.querySelectorAll('.event-row');
    
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
      
      // First hide/show event rows
      eventRows.forEach(row => {
        const eventType = row.dataset.type;
        const rowIP = row.dataset.ip;
        
        // Check event type filter
        const typeMatch = activeFilters.includes(eventType);
        
        // Check IP filter (only applies to download events)
        let ipMatch = true;
        if (selectedIP !== 'all' && eventType === 'download') {
          ipMatch = (rowIP === selectedIP);
        }
        
        // Show/hide row
        if (typeMatch && ipMatch) {
          row.style.display = '';
        } else {
          row.style.display = 'none';
        }
      });
      
      // Hide CRC32 blocks that have no visible events
      document.querySelectorAll('.crc32-block').forEach(block => {
        const visibleRows = Array.from(block.querySelectorAll('.event-row'))
          .filter(row => row.style.display !== 'none');
        
        if (visibleRows.length === 0) {
          block.style.display = 'none';
        } else {
          block.style.display = '';
        }
      });
    }
    
    // Auto-refresh with localStorage persistence
    let refreshInterval = null;
    const autoRefreshCheckbox = document.getElementById('auto-refresh');
    const refreshIntervalSelect = document.getElementById('refresh-interval');
    const storageKey = \`timeline-autorefresh-${index}\`;
    
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
  </script>
</body>
</html>`;
}

/**
 * Generate HTML for a CRC32 block
 * @param {Object} group - CRC32 group object
 * @param {number} groupIndex - Group index
 * @param {number} configIndex - Configuration index (for event indexing)
 * @returns {string} HTML for the CRC32 block
 */
function generateCRC32BlockHTML(group, groupIndex, configIndex) {
  const counts = calculateEventCounts(group.events);
  
  // Format time range
  const startTime = new Date(group.startTime).toLocaleTimeString();
  const endTime = new Date(group.endTime).toLocaleTimeString();
  const startDate = new Date(group.startTime).toLocaleDateString();
  const endDate = new Date(group.endTime).toLocaleDateString();
  const timeRange = startDate === endDate 
    ? `${startTime} to ${endTime}`
    : `${startDate} ${startTime} to ${endDate} ${endTime}`;
  
  // Calculate duration in minutes
  const durationMs = new Date(group.startTime) - new Date(group.endTime);
  const durationMinutes = Math.round(durationMs / 60000);
  
  // Build summary
  const summaryParts = [];
  if (counts.generation > 0) summaryParts.push(`${counts.generation} generation${counts.generation > 1 ? 's' : ''}`);
  if (counts.imageDownload > 0) summaryParts.push(`${counts.imageDownload} image download${counts.imageDownload > 1 ? 's' : ''}`);
  if (counts.crc32Download > 0) summaryParts.push(`${counts.crc32Download} CRC32 download${counts.crc32Download > 1 ? 's' : ''}`);
  if (counts.ics > 0) summaryParts.push(`${counts.ics} ICS event${counts.ics > 1 ? 's' : ''}`);
  if (counts.error > 0) summaryParts.push(`${counts.error} error${counts.error > 1 ? 's' : ''}`);
  
  const summary = summaryParts.length > 0 ? summaryParts.join(', ') : 'No events';
  
  return `
    <div class="crc32-block">
      <div class="crc32-header">
        <div class="crc32-title">
          <strong>CRC32:</strong> <span style="font-family: 'Courier New', monospace;">0x${group.crc32}</span>
          <span style="color: #6c757d; font-weight: normal; margin-left: 10px;">(${group.events.length} events, ${durationMinutes} minutes)</span>
        </div>
        <div class="crc32-info">
          <span>${timeRange}</span>
          <span class="expand-icon">▼</span>
        </div>
      </div>
      <div class="crc32-content">
        <div style="padding: 10px 20px; background: rgba(255,255,255,0.5); border-bottom: 1px solid #dee2e6; font-size: 0.9em; color: #6c757d;">
          <strong>Summary:</strong> ${summary}
        </div>
        <table class="event-table">
          <tbody>
            ${group.events.map((event, eventIndex) => generateEventRowHTML(event, eventIndex, groupIndex)).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/**
 * Generate HTML for a single event row
 * @param {Object} event - Timeline event object
 * @param {number} eventIndex - Event index within the group
 * @param {number} groupIndex - Group index
 * @returns {string} HTML for the event row
 */
function generateEventRowHTML(event, eventIndex, groupIndex) {
  // Build metadata string with duration first (if present)
  const metadata = event.metadata || {};
  const metadataParts = [];
  
  // Add duration first if it exists (use correct unit based on event type)
  if (metadata.duration !== undefined) {
    // Generation events use seconds, download events use milliseconds
    const unit = event.eventType === 'generation' ? 's' : 'ms';
    metadataParts.push(`duration=${metadata.duration}${unit}`);
  }
  
  // Add all other metadata (except crc32, previousCrc32, and duration)
  Object.entries(metadata)
    .filter(([key]) => key !== 'crc32' && key !== 'previousCrc32' && key !== 'duration')
    .forEach(([key, value]) => {
      metadataParts.push(`${key}=${typeof value === 'object' ? JSON.stringify(value) : value}`);
    });
  
  const metadataStr = metadataParts.join(' | ');
  
  // Extract IP for download events
  const ipAttr = (event.eventType === 'download' && event.metadata && event.metadata.ip) 
    ? `data-ip="${event.metadata.ip}"` 
    : '';
  
  // Add visual indicator for generation events with CRC32 changes
  const crc32Indicator = (event.eventType === 'generation' && event.metadata && event.metadata.changed === true)
    ? ' 🆕'
    : '';
  
  // Add "slow" warning for downloads that took more than 500ms
  const slowWarning = (event.eventType === 'download' && metadata.duration && metadata.duration > 500)
    ? ' <span style="color: #ff6b6b; font-weight: bold;">⚠️ SLOW</span>'
    : '';
  
  // Determine badge class - use subtype for downloads to differentiate colors
  const badgeClass = event.eventType === 'download' 
    ? `badge-download-${event.eventSubtype}` 
    : `badge-${event.eventType}`;
  
  return `
    <tr class="event-row" data-type="${event.eventType}" ${ipAttr}>
      <td class="event-time">${new Date(event.timestamp).toLocaleString()}</td>
      <td>
        <span class="event-badge ${badgeClass}">${event.eventType}:${event.eventSubtype}${crc32Indicator}</span>${slowWarning}
      </td>
      <td class="event-metadata">${metadataStr}</td>
    </tr>
    <tr style="display: none;">
      <td colspan="3" class="event-details">
        <pre>${JSON.stringify(event, null, 2)}</pre>
        <button class="copy-btn" data-event='${JSON.stringify(event).replace(/'/g, "&apos;")}'>Copy JSON</button>
      </td>
    </tr>
  `;
}

module.exports = {
  handleTimelinePage
};
