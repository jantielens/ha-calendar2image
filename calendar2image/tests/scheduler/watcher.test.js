const fs = require('fs').promises;
const path = require('path');

// Set CONFIG_DIR before requiring modules
const testConfigDir = path.join(__dirname, '../fixtures/scheduler-watcher');
process.env.CONFIG_DIR = testConfigDir;

const {
  initializeScheduler,
  stopAllSchedules,
  getScheduleStatus,
  scheduleConfigIfNeeded
} = require('../../src/scheduler');

// Mock dependencies
jest.mock('../../src/cache', () => ({
  preGenerateImage: jest.fn().mockResolvedValue(true),
  setPreGenerateFunction: jest.fn(),
  saveCachedImage: jest.fn().mockResolvedValue(true)
}));

jest.mock('../../src/api/handler', () => ({
  generateCalendarImage: jest.fn().mockResolvedValue({
    buffer: Buffer.from('mock-image'),
    contentType: 'image/png',
    imageType: 'png'
  })
}));

const { preGenerateImage } = require('../../src/cache');
const { generateCalendarImage } = require('../../src/api/handler');

describe('Scheduler Config Watcher', () => {
  beforeAll(async () => {
    // Create test config directory
    await fs.mkdir(testConfigDir, { recursive: true });
  });

  afterAll(async () => {
    // Clean up
    stopAllSchedules();
    try {
      await fs.rm(testConfigDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
    delete process.env.CONFIG_DIR;
  });

  beforeEach(async () => {
    // Clear any existing test configs
    try {
      const files = await fs.readdir(testConfigDir);
      for (const file of files) {
        if (file.match(/^\d+\.json$/)) {
          await fs.unlink(path.join(testConfigDir, file));
        }
      }
    } catch (error) {
      // Ignore if directory doesn't exist
    }
    
    // Stop all schedules
    stopAllSchedules();
    jest.clearAllMocks();
  });

  test('should detect and schedule newly added config file', async () => {
    // Create initial config
    const config0 = {
      icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
      template: 'week',
      width: 800,
      height: 480,
      imageType: 'png',
      preGenerateInterval: '*/5 * * * *' // Every 5 minutes
    };
    
    await fs.writeFile(
      path.join(testConfigDir, '0.json'),
      JSON.stringify(config0, null, 2)
    );

    // Initialize scheduler
    await initializeScheduler();
    
    // Verify config 0 is scheduled
    let status = getScheduleStatus();
    expect(status).toHaveLength(1);
    expect(status[0].index).toBe(0);

    // Wait a bit for watcher to start
    await new Promise(resolve => setTimeout(resolve, 500));

    // Create new config file (simulating adding 1.json while container is running)
    const config1 = {
      icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
      template: 'month',
      width: 800,
      height: 480,
      imageType: 'png',
      preGenerateInterval: '*/10 * * * *' // Every 10 minutes
    };
    
    await fs.writeFile(
      path.join(testConfigDir, '1.json'),
      JSON.stringify(config1, null, 2)
    );

    // Wait for file watcher to detect and process the change
    // Manual polling runs every 2 seconds, so wait at least 3.5 seconds to be safe
    await new Promise(resolve => setTimeout(resolve, 3500));

    // Verify config 1 is now scheduled
    status = getScheduleStatus();
    expect(status).toHaveLength(2);
    expect(status.map(s => s.index).sort()).toEqual([0, 1]);
    
    // Verify pre-generation was triggered by checking generateCalendarImage was called
    expect(generateCalendarImage).toHaveBeenCalled();
  }, 15000);

  test('should remove schedule when config file is deleted', async () => {
    // Create two configs
    const config0 = {
      icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
      template: 'week',
      width: 800,
      height: 480,
      imageType: 'png',
      preGenerateInterval: '*/5 * * * *'
    };
    
    const config1 = {
      icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
      template: 'month',
      width: 800,
      height: 480,
      imageType: 'png',
      preGenerateInterval: '*/10 * * * *'
    };
    
    await fs.writeFile(
      path.join(testConfigDir, '0.json'),
      JSON.stringify(config0, null, 2)
    );
    
    await fs.writeFile(
      path.join(testConfigDir, '1.json'),
      JSON.stringify(config1, null, 2)
    );

    // Initialize scheduler
    await initializeScheduler();
    
    // Wait for watcher to start
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify both configs are scheduled
    let status = getScheduleStatus();
    expect(status).toHaveLength(2);

    // Delete config 1
    await fs.unlink(path.join(testConfigDir, '1.json'));

    // Wait for file watcher to detect the deletion
    // Manual polling runs every 2 seconds, so wait at least 2.5 seconds
    await new Promise(resolve => setTimeout(resolve, 2500));

    // Verify config 1 is removed from schedule
    status = getScheduleStatus();
    expect(status).toHaveLength(1);
    expect(status[0].index).toBe(0);
  }, 10000);

  test('should update schedule when config file is modified', async () => {
    // Create config with preGenerateInterval
    const config0 = {
      icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
      template: 'week',
      width: 800,
      height: 480,
      imageType: 'png',
      preGenerateInterval: '*/5 * * * *'
    };
    
    await fs.writeFile(
      path.join(testConfigDir, '0.json'),
      JSON.stringify(config0, null, 2)
    );

    // Initialize scheduler
    await initializeScheduler();
    
    // Wait for watcher to start
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify config is scheduled
    let status = getScheduleStatus();
    expect(status).toHaveLength(1);
    expect(status[0].cronExpression).toBe('*/5 * * * *');

    // Modify config to change interval
    const modifiedConfig = {
      ...config0,
      preGenerateInterval: '*/15 * * * *'
    };
    
    await fs.writeFile(
      path.join(testConfigDir, '0.json'),
      JSON.stringify(modifiedConfig, null, 2)
    );

    // Wait for file watcher to detect the change
    // Manual polling runs every 2 seconds, so wait at least 2.5 seconds
    await new Promise(resolve => setTimeout(resolve, 2500));

    // Verify schedule was updated
    status = getScheduleStatus();
    expect(status).toHaveLength(1);
    expect(status[0].cronExpression).toBe('*/15 * * * *');
  }, 10000);

  test('should remove schedule when preGenerateInterval is removed from config', async () => {
    // Create config with preGenerateInterval
    const config0 = {
      icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
      template: 'week',
      width: 800,
      height: 480,
      imageType: 'png',
      preGenerateInterval: '*/5 * * * *'
    };
    
    await fs.writeFile(
      path.join(testConfigDir, '0.json'),
      JSON.stringify(config0, null, 2)
    );

    // Initialize scheduler
    await initializeScheduler();
    
    // Wait for watcher to start
    await new Promise(resolve => setTimeout(resolve, 200));

    // Verify config is scheduled
    let status = getScheduleStatus();
    expect(status).toHaveLength(1);

    // Modify config to remove preGenerateInterval
    const modifiedConfig = {
      icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
      template: 'week',
      width: 800,
      height: 480,
      imageType: 'png'
      // preGenerateInterval removed
    };
    
    await fs.writeFile(
      path.join(testConfigDir, '0.json'),
      JSON.stringify(modifiedConfig, null, 2)
    );

    // Wait for file watcher to detect the change
    // Manual polling runs every 2 seconds, so wait at least 2.5 seconds
    await new Promise(resolve => setTimeout(resolve, 2500));

    // Verify schedule was removed
    status = getScheduleStatus();
    expect(status).toHaveLength(0);
  }, 10000);
});
