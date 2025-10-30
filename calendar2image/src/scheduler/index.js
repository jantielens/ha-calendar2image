const cron = require('node-cron');
const { loadAllConfigs } = require('../config/loader');
const { preGenerateImage, setPreGenerateFunction, saveCachedImage } = require('../cache');

// Store active cron jobs
const activeJobs = new Map();

/**
 * Internal function to generate and cache an image
 * This is passed to the cache module to avoid circular dependencies
 * @param {number} index - Configuration index
 * @returns {Promise<boolean>} Success status
 */
async function generateAndCache(index) {
  console.log(`[Scheduler] Pre-generating image for config ${index}...`);
  const startTime = Date.now();
  
  try {
    // Import here to avoid circular dependency at module load time
    const { generateCalendarImage } = require('../api/handler');
    
    const result = await generateCalendarImage(index);
    await saveCachedImage(index, result.buffer, result.contentType, result.imageType || 'png');
    
    const duration = Date.now() - startTime;
    console.log(`[Scheduler] Successfully pre-generated image for config ${index} in ${duration}ms`);
    return true;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Scheduler] Failed to pre-generate image for config ${index} after ${duration}ms: ${error.message}`);
    // Don't throw - we want to keep old cache and continue scheduling
    return false;
  }
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
    await preGenerateImage(index);
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
      configsToGenerate.map(({ index }) => preGenerateImage(index))
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
 * Stop all scheduled jobs
 */
function stopAllSchedules() {
  console.log('[Scheduler] Stopping all scheduled jobs...');
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
  getScheduleStatus
};
