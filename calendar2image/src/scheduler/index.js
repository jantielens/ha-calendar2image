const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { fork } = require('child_process');
const chokidar = require('chokidar');
const { loadAllConfigs, loadConfig, CONFIG_DIR } = require('../config/loader');
const { preGenerateImage, setPreGenerateFunction, saveCachedImage } = require('../cache');

// Store active cron jobs
const activeJobs = new Map();

// Store file system watcher
let configWatcher = null;

// Store file modification times for manual polling
const fileStats = new Map();

/**
 * Internal function to generate and cache an image using child process
 * This is passed to the cache module to avoid circular dependencies
 * @param {number} index - Configuration index
 * @param {string} trigger - Trigger type for history tracking
 * @returns {Promise<boolean>} Success status
 */
async function generateAndCache(index, trigger = 'scheduled') {
  console.log(`[Scheduler] Starting generation for config ${index} in child process (trigger: ${trigger})...`);
  const startTime = Date.now();
  
  return new Promise((resolve) => {
    // Fork worker process
    const workerPath = path.join(__dirname, '../image/worker.js');
    const worker = fork(workerPath, [], {
      stdio: ['pipe', 'pipe', 'pipe', 'ipc']
    });
    
    // Handle worker output
    worker.stdout.on('data', (data) => {
      process.stdout.write(data);
    });
    
    worker.stderr.on('data', (data) => {
      process.stderr.write(data);
    });
    
    // Handle message from worker
    worker.on('message', async (msg) => {
      if (msg.success) {
        try {
          const generationDuration = Date.now() - startTime;
          
          // Save to cache
          await saveCachedImage(index, msg.buffer, msg.contentType, msg.imageType, {
            trigger,
            generationDuration
          });
          
          console.log(`[Scheduler] Successfully pre-generated image for config ${index} in ${generationDuration}ms`);
          resolve(true);
        } catch (error) {
          console.error(`[Scheduler] Failed to save cached image for config ${index}: ${error.message}`);
          resolve(false);
        }
      } else {
        const duration = Date.now() - startTime;
        console.error(`[Scheduler] Worker failed for config ${index} after ${duration}ms: ${msg.error}`);
        resolve(false);
      }
    });
    
    // Handle worker errors
    worker.on('error', (error) => {
      const duration = Date.now() - startTime;
      console.error(`[Scheduler] Worker error for config ${index} after ${duration}ms: ${error.message}`);
      resolve(false);
    });
    
    // Handle worker exit
    worker.on('exit', (code, signal) => {
      if (code !== 0 && code !== null) {
        console.error(`[Scheduler] Worker exited with code ${code} for config ${index}`);
      }
      if (signal) {
        console.error(`[Scheduler] Worker killed with signal ${signal} for config ${index}`);
      }
    });
    
    // Timeout protection (30 seconds)
    const timeout = setTimeout(() => {
      console.error(`[Scheduler] Generation timeout for config ${index}, killing worker`);
      worker.kill('SIGTERM');
      resolve(false);
    }, 30000);
    
    // Clear timeout when worker exits
    worker.on('exit', () => {
      clearTimeout(timeout);
    });
    
    // Send generation request to worker
    worker.send({ action: 'generate', index });
  });
}

// Set the pre-generate function in cache module
setPreGenerateFunction(generateAndCache);

/**
 * Validate cron expression
 * @param {string} cronExpression - Cron expression to validate
 * @returns {boolean} True if valid
 */
function isValidCron(cronExpression) {
  return cron.validate(cronExpression);
}

/**
 * Schedule pre-generation for a single configuration
 * @param {number} index - Configuration index
 * @param {string} cronExpression - Cron expression (e.g., every 5 minutes)
 */
function schedulePreGeneration(index, cronExpression) {
  // Stop existing job if any
  stopPreGeneration(index);

  if (!isValidCron(cronExpression)) {
    console.error(`[Scheduler] Invalid cron expression for config ${index}: "${cronExpression}"`);
    return false;
  }

  console.log(`[Scheduler] Scheduling pre-generation for config ${index} with cron: ${cronExpression}`);

  const task = cron.schedule(cronExpression, async () => {
    console.log(`[Scheduler] Triggered scheduled generation for config ${index}`);
    await generateAndCache(index, 'scheduled');
  }, {
    scheduled: true,
    timezone: "UTC" // Use UTC for consistency
  });

  activeJobs.set(index, {
    task,
    cronExpression,
    scheduledAt: new Date().toISOString()
  });

  console.log(`[Scheduler] Successfully scheduled config ${index}`);
  return true;
}

/**
 * Stop pre-generation scheduling for a configuration
 * @param {number} index - Configuration index
 */
function stopPreGeneration(index) {
  const job = activeJobs.get(index);
  if (job) {
    job.task.stop();
    activeJobs.delete(index);
    console.log(`[Scheduler] Stopped scheduling for config ${index}`);
  }
}

/**
 * Schedule or update a configuration based on its settings
 * @param {number} index - Configuration index
 * @param {boolean} preGenerateNow - Whether to pre-generate image immediately (default: true)
 * @returns {Promise<boolean>} True if scheduled, false otherwise
 */
async function scheduleConfigIfNeeded(index, preGenerateNow = true) {
  try {
    const config = await loadConfig(index);
    
    if (config.preGenerateInterval) {
      const success = schedulePreGeneration(index, config.preGenerateInterval);
      if (success) {
        console.log(`[Scheduler] Config ${index} scheduled successfully`);
        
        // Pre-generate immediately if requested
        if (preGenerateNow) {
          console.log(`[Scheduler] Pre-generating image for config ${index}...`);
          await generateAndCache(index, 'scheduled');
        }
      }
      return success;
    } else {
      // Config exists but has no preGenerateInterval - stop any existing schedule
      const wasScheduled = activeJobs.has(index);
      stopPreGeneration(index);
      if (wasScheduled) {
        console.log(`[Scheduler] Config ${index} has no preGenerateInterval, scheduling stopped`);
      }
      return false;
    }
  } catch (error) {
    console.error(`[Scheduler] Failed to schedule config ${index}: ${error.message}`);
    return false;
  }
}

/**
 * Initialize scheduler for all configurations
 * Load all configs and schedule pre-generation for those with preGenerateInterval
 */
async function initializeScheduler() {
  console.log('[Scheduler] Initializing scheduler...');
  
  try {
    const configs = await loadAllConfigs();
    console.log(`[Scheduler] Found ${configs.length} configuration(s)`);

    let scheduledCount = 0;
    
    for (const { index, config } of configs) {
      if (config.preGenerateInterval) {
        const success = schedulePreGeneration(index, config.preGenerateInterval);
        if (success) {
          scheduledCount++;
        }
      } else {
        console.log(`[Scheduler] Config ${index} has no preGenerateInterval, skipping scheduling`);
      }
    }

    console.log(`[Scheduler] Initialization complete: ${scheduledCount}/${configs.length} config(s) scheduled`);
    
    // Start watching for config file changes
    startConfigWatcher();
    
    return scheduledCount;
  } catch (error) {
    console.error(`[Scheduler] Failed to initialize scheduler: ${error.message}`);
    throw error;
  }
}

/**
 * Generate all configured images immediately
 * Used on startup to populate cache (only for configs with preGenerateInterval)
 */
async function generateAllImagesNow() {
  console.log('[Scheduler] Generating cached images on startup...');
  
  try {
    const configs = await loadAllConfigs();
    
    // Only pre-generate for configs with preGenerateInterval
    const configsToGenerate = configs.filter(({ config }) => config.preGenerateInterval);
    
    console.log(`[Scheduler] Generating images for ${configsToGenerate.length}/${configs.length} configuration(s) with preGenerateInterval`);

    if (configsToGenerate.length === 0) {
      console.log('[Scheduler] No configs with preGenerateInterval - skipping initial generation');
      return { successful: 0, failed: 0, total: 0 };
    }

    const results = await Promise.allSettled(
      configsToGenerate.map(({ index }) => generateAndCache(index, 'boot'))
    );

    const successful = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
    const failed = results.length - successful;

    console.log(`[Scheduler] Generation complete: ${successful} succeeded, ${failed} failed`);
    return { successful, failed, total: results.length };
  } catch (error) {
    console.error(`[Scheduler] Failed to generate all images: ${error.message}`);
    throw error;
  }
}

/**
 * Start watching the config directory for changes
 */
function startConfigWatcher() {
  if (configWatcher) {
    console.log('[Scheduler] Config watcher already running');
    return;
  }

  console.log(`[Scheduler] Starting config file watcher on ${CONFIG_DIR}...`);
  
  try {
    // Use chokidar for better cross-platform and Docker volume support
    // fs.watch() doesn't work reliably with Docker bind mounts on Windows/Mac
    configWatcher = chokidar.watch(path.join(CONFIG_DIR, '*.json'), {
      persistent: true,
      ignoreInitial: true,  // Don't trigger on initial scan
      awaitWriteFinish: {   // Wait for file writes to complete
        stabilityThreshold: 200,
        pollInterval: 100
      },
      usePolling: true,     // Use polling for Docker volumes (more reliable)
      interval: 500,        // Poll every 500ms for faster detection
      binaryInterval: 500,
      alwaysStat: true,     // Always stat files to detect changes
      depth: 0              // Only watch the config directory, not subdirectories
    });

    // Handle file additions and changes
    configWatcher.on('add', async (filePath) => {
      const filename = path.basename(filePath);
      if (!filename.match(/^\d+\.json$/)) {
        return;
      }
      
      const index = parseInt(path.basename(filename, '.json'), 10);
      console.log(`[Scheduler] Config file added: ${filename}`);
      
      try {
        console.log(`[Scheduler] Config ${index} added, updating schedule and generating image...`);
        await scheduleConfigIfNeeded(index, true); // true = pre-generate immediately (uses 'config_change' trigger)
      } catch (error) {
        console.error(`[Scheduler] Error handling config addition for ${filename}: ${error.message}`);
      }
    });

    configWatcher.on('change', async (filePath) => {
      const filename = path.basename(filePath);
      if (!filename.match(/^\d+\.json$/)) {
        return;
      }
      
      const index = parseInt(path.basename(filename, '.json'), 10);
      console.log(`[Scheduler] Config file changed: ${filename}`);
      
      try {
        console.log(`[Scheduler] Config ${index} modified, updating schedule and generating image...`);
        await scheduleConfigIfNeeded(index, true); // true = pre-generate immediately (uses 'config_change' trigger)
      } catch (error) {
        console.error(`[Scheduler] Error handling config change for ${filename}: ${error.message}`);
      }
    });

    // Handle file deletions
    configWatcher.on('unlink', async (filePath) => {
      const filename = path.basename(filePath);
      if (!filename.match(/^\d+\.json$/)) {
        return;
      }
      
      const index = parseInt(path.basename(filename, '.json'), 10);
      console.log(`[Scheduler] Config file deleted: ${filename}`);
      
      try {
        console.log(`[Scheduler] Config ${index} deleted, removing from schedule...`);
        stopPreGeneration(index);
      } catch (error) {
        console.error(`[Scheduler] Error handling config deletion for ${filename}: ${error.message}`);
      }
    });

    configWatcher.on('error', (error) => {
      console.error(`[Scheduler] Config watcher error: ${error.message}`);
    });

    configWatcher.on('ready', () => {
      console.log('[Scheduler] Config file watcher started and ready');
      // Initialize file stats for manual polling fallback
      initializeFileStats();
      // Start manual polling as fallback (useful for Docker volumes on Windows/Mac)
      startManualPolling();
    });

  } catch (error) {
    console.error(`[Scheduler] Failed to start config watcher: ${error.message}`);
  }
}

/**
 * Initialize file stats for manual polling
 */
async function initializeFileStats() {
  try {
    const files = await fs.promises.readdir(CONFIG_DIR);
    for (const filename of files) {
      if (filename.match(/^\d+\.json$/)) {
        const filePath = path.join(CONFIG_DIR, filename);
        try {
          const stats = await fs.promises.stat(filePath);
          fileStats.set(filename, {
            mtime: stats.mtimeMs,
            size: stats.size
          });
        } catch (error) {
          // File might have been deleted
        }
      }
    }
    console.log(`[Scheduler] Initialized file stats for ${fileStats.size} config files`);
  } catch (error) {
    console.error(`[Scheduler] Error initializing file stats: ${error.message}`);
  }
}

/**
 * Manual polling as fallback for Docker volume watching
 */
let pollingInterval = null;

function startManualPolling() {
  if (pollingInterval) {
    return;
  }

  console.log('[Scheduler] Starting manual polling (every 2 seconds) as fallback for Docker volumes...');
  
  pollingInterval = setInterval(async () => {
    try {
      const files = await fs.promises.readdir(CONFIG_DIR);
      const currentFiles = new Set();

      // Check for new and modified files
      for (const filename of files) {
        if (!filename.match(/^\d+\.json$/)) {
          continue;
        }

        currentFiles.add(filename);
        const filePath = path.join(CONFIG_DIR, filename);
        
        try {
          const stats = await fs.promises.stat(filePath);
          const oldStats = fileStats.get(filename);

          if (!oldStats) {
            // New file
            console.log(`[Scheduler] Manual poll detected new file: ${filename}`);
            const index = parseInt(path.basename(filename, '.json'), 10);
            fileStats.set(filename, {
              mtime: stats.mtimeMs,
              size: stats.size
            });
            
            console.log(`[Scheduler] Config ${index} added, updating schedule and generating image...`);
            await scheduleConfigIfNeeded(index, true); // uses 'config_change' trigger
          } else if (stats.mtimeMs !== oldStats.mtime || stats.size !== oldStats.size) {
            // Modified file
            console.log(`[Scheduler] Manual poll detected change in ${filename} (mtime: ${oldStats.mtime} -> ${stats.mtimeMs})`);
            const index = parseInt(path.basename(filename, '.json'), 10);
            fileStats.set(filename, {
              mtime: stats.mtimeMs,
              size: stats.size
            });
            
            console.log(`[Scheduler] Config ${index} modified, updating schedule and generating image...`);
            await scheduleConfigIfNeeded(index, true); // uses 'config_change' trigger
          }
        } catch (error) {
          // File might have been deleted during stat
        }
      }

      // Check for deleted files
      for (const [filename] of fileStats) {
        if (!currentFiles.has(filename)) {
          console.log(`[Scheduler] Manual poll detected deleted file: ${filename}`);
          const index = parseInt(path.basename(filename, '.json'), 10);
          fileStats.delete(filename);
          
          console.log(`[Scheduler] Config ${index} deleted, removing from schedule...`);
          stopPreGeneration(index);
        }
      }
    } catch (error) {
      console.error(`[Scheduler] Error in manual polling: ${error.message}`);
    }
  }, 2000); // Poll every 2 seconds
}

function stopManualPolling() {
  if (pollingInterval) {
    console.log('[Scheduler] Stopping manual polling...');
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
}

/**
 * Stop watching the config directory
 */
async function stopConfigWatcher() {
  stopManualPolling();
  
  if (configWatcher) {
    console.log('[Scheduler] Stopping config file watcher...');
    await configWatcher.close();
    configWatcher = null;
    console.log('[Scheduler] Config file watcher stopped');
  }
}

/**
 * Stop all scheduled jobs
 */
async function stopAllSchedules() {
  console.log('[Scheduler] Stopping all scheduled jobs...');
  
  // Stop config watcher
  await stopConfigWatcher();
  
  // Stop all cron jobs
  for (const [index, job] of activeJobs.entries()) {
    job.task.stop();
    console.log(`[Scheduler] Stopped job for config ${index}`);
  }
  activeJobs.clear();
  console.log('[Scheduler] All jobs stopped');
}

/**
 * Get status of all scheduled jobs
 * @returns {Array} Array of job status objects
 */
function getScheduleStatus() {
  const status = [];
  for (const [index, job] of activeJobs.entries()) {
    status.push({
      index,
      cronExpression: job.cronExpression,
      scheduledAt: job.scheduledAt,
      isRunning: true
    });
  }
  return status;
}

module.exports = {
  isValidCron,
  schedulePreGeneration,
  stopPreGeneration,
  initializeScheduler,
  generateAllImagesNow,
  stopAllSchedules,
  getScheduleStatus,
  startConfigWatcher,
  stopConfigWatcher,
  scheduleConfigIfNeeded
};
