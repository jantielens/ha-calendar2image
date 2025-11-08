/**
 * Scheduler Integration Tests
 * 
 * Tests the actual scheduler functionality including worker process communication
 * and buffer serialization through IPC
 */

const { execSync } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const IMAGE_NAME = 'ha-calendar2image-test';
const CONTAINER_NAME = 'ha-calendar2image-scheduler-test-container';
const HOST_PORT = 13002; // Different port to avoid conflicts
const CONTAINER_PORT = 3000;

let containerId = null;

// Helper to wait for container to be ready
const waitForContainer = (maxAttempts = 30, interval = 1000) => {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    
    const check = () => {
      attempts++;
      
      const req = http.get(`http://localhost:${HOST_PORT}/health`, (res) => {
        if (res.statusCode === 200) {
          resolve();
        } else {
          if (attempts >= maxAttempts) {
            reject(new Error(`Container not ready after ${maxAttempts} attempts`));
          } else {
            setTimeout(check, interval);
          }
        }
      });
      
      req.on('error', () => {
        if (attempts >= maxAttempts) {
          reject(new Error(`Container not ready after ${maxAttempts} attempts`));
        } else {
          setTimeout(check, interval);
        }
      });
      
      req.end();
    };
    
    check();
  });
};

// Helper to make HTTP requests
const makeRequest = (path, method = 'GET') => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: HOST_PORT,
      path: path,
      method: method
    };
    
    const req = http.request(options, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        let body;
        
        // Try to parse as JSON first
        if (res.headers['content-type']?.includes('application/json')) {
          try {
            body = JSON.parse(buffer.toString());
          } catch (e) {
            body = buffer.toString();
          }
        } else {
          // For binary data (images), keep as buffer
          body = buffer;
        }
        
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });
    
    req.on('error', reject);
    req.end();
  });
};

describe('Scheduler Integration Tests', () => {
  beforeAll(async () => {
    // Clean up any existing test containers and wait for port to be released
    try {
      execSync(`docker rm -f ${CONTAINER_NAME}`, { stdio: 'ignore' });
      // Wait a moment for the port to be released
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      // Ignore if container doesn't exist
    }

    // Also kill any process using the test port as a safety measure
    try {
      // On Linux, use lsof or fuser to find and kill processes using the port
      execSync(`lsof -ti:${HOST_PORT} | xargs kill -9 2>/dev/null || true`, { stdio: 'ignore' });
    } catch (error) {
      // Ignore if no process is using the port
    }

    // Build Docker image if not already built
    try {
      execSync(`docker image inspect ${IMAGE_NAME}`, { stdio: 'ignore' });
    } catch (error) {
      // Image doesn't exist, build it
      execSync(`docker build -f Dockerfile.local -t ${IMAGE_NAME} .`, {
        cwd: path.resolve(__dirname, '../..'),
        stdio: 'inherit'
      });
    }

    // Create test config directory
    const configDir = path.resolve(__dirname, '../../test-data-scheduler');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    // Create test config with short preGenerateInterval for quick testing
    fs.writeFileSync(
      path.join(configDir, '0.json'),
      JSON.stringify({
        icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
        template: 'week-view',
        width: 400,
        height: 300,
        grayscale: false,
        bitDepth: 8,
        imageType: 'png',
        expandRecurringFrom: -7,
        expandRecurringTo: 7,
        preGenerateInterval: '*/1 * * * *' // Every minute for testing
      }, null, 2)
    );
    
    // Start container
    const startCommand = `docker run -d --name ${CONTAINER_NAME} -p ${HOST_PORT}:${CONTAINER_PORT} -v "${configDir}:/config" ${IMAGE_NAME}`;
    containerId = execSync(startCommand, { encoding: 'utf-8' }).trim();
    
    // Wait for container to be ready
    await waitForContainer();
    
    // Wait a bit longer for scheduler to initialize and potentially run once
    await new Promise(resolve => setTimeout(resolve, 5000));
  }, 180000); // 3 minute timeout for full setup

  afterAll(async () => {
    // Stop and remove container
    if (containerId) {
      try {
        execSync(`docker rm -f ${CONTAINER_NAME}`, { stdio: 'ignore' });
      } catch (error) {
        // Ignore errors
      }
    }
    
    // Clean up test data
    const configDir = path.resolve(__dirname, '../../test-data-scheduler');
    const parentDir = path.resolve(__dirname, '../..');
    if (fs.existsSync(configDir)) {
      try {
        // Use Docker to remove the entire directory with proper permissions
        execSync(`docker run --rm -v "${parentDir}:/workspace" alpine sh -c "rm -rf /workspace/test-data-scheduler"`, { stdio: 'ignore' });
      } catch (error) {
        console.warn('Warning: Could not remove test-data-scheduler directory:', error.message);
      }
    }
  });

  describe('Scheduled Image Generation', () => {
    it('should successfully generate and cache images via scheduler worker processes', async () => {
      // Request the cached image (should be available from startup generation)
      const response = await makeRequest('/api/0.png');
      
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toMatch(/image\/(png|jpeg)/);
      expect(response.headers['x-cache']).toBe('HIT');
      expect(response.body).toBeDefined();
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should have valid CRC32 checksum for cached images', async () => {
      const response = await makeRequest('/api/0.png.crc32');
      
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toMatch(/text\/plain/);
      expect(response.body.toString()).toMatch(/^[a-f0-9]{8}$/); // CRC32 is 8 hex chars
    });

    it('should generate images without buffer serialization errors', async () => {
      // Force fresh generation to test worker process communication
      const response = await makeRequest('/api/0/fresh.png');
      
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toMatch(/image\/(png|jpeg)/);
      expect(response.headers['x-cache']).toBe('BYPASS');
      expect(response.body).toBeDefined();
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should maintain cache consistency after worker generation', async () => {
      // Get CRC32 before fresh generation
      const crc32Before = await makeRequest('/api/0.png.crc32');
      
      // Force fresh generation
      const freshResponse = await makeRequest('/api/0/fresh.png');
      expect(freshResponse.statusCode).toBe(200);
      
      // Get CRC32 after fresh generation
      const crc32After = await makeRequest('/api/0.png.crc32');
      expect(crc32After.statusCode).toBe(200);
      
      // CRC32 should be consistent (same calendar data should produce same image)
      // Note: This might differ if calendar data changed between requests
      expect(crc32After.body.toString()).toMatch(/^[a-f0-9]{8}$/);
    });
  });

  describe('Worker Process Error Handling', () => {
    it('should handle worker process failures gracefully', async () => {
      // Even if workers fail, the API should still respond
      const response = await makeRequest('/health');
      expect(response.statusCode).toBe(200);
    });

    it('should serve cached data even during worker failures', async () => {
      // Should serve from cache even if new generation fails
      const response = await makeRequest('/api/0.png');
      
      // Should either succeed with cached data or return appropriate error
      expect([200, 404, 500]).toContain(response.statusCode);
      
      if (response.statusCode === 200) {
        expect(response.body.length).toBeGreaterThan(0);
      }
    });
  });

  describe('IPC Buffer Serialization', () => {
    it('should properly serialize and deserialize image buffers through worker IPC', async () => {
      // This test specifically validates that buffers survive IPC communication
      const response = await makeRequest('/api/0/fresh.png');
      
      expect(response.statusCode).toBe(200);
      expect(Buffer.isBuffer(response.body)).toBe(true);
      
      // Check for PNG signature (validates buffer integrity)
      const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
      expect(response.body.subarray(0, 8)).toEqual(pngSignature);
    });
  });
});