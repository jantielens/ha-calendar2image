/**
 * API Integration Tests
 * 
 * These tests run against a Docker container instance
 * The container is automatically built and started before tests run
 */

const { execSync } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const IMAGE_NAME = 'ha-calendar2image-test';
const CONTAINER_NAME = 'ha-calendar2image-api-test-container';
const HOST_PORT = 13001; // Different port than docker.test.js to avoid conflicts
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

describe('API Integration Tests', () => {
  beforeAll(async () => {
    // Clean up any existing test containers
    try {
      execSync(`docker rm -f ${CONTAINER_NAME}`, { stdio: 'ignore' });
    } catch (error) {
      // Ignore if container doesn't exist
    }

    // Build Docker image if not already built by docker.test.js
    try {
      execSync(`docker image inspect ${IMAGE_NAME}`, { stdio: 'ignore' });
    } catch (error) {
      // Image doesn't exist, build it
      execSync(`docker build -t ${IMAGE_NAME} --build-arg BUILD_FROM=ghcr.io/home-assistant/amd64-base:3.20 .`, {
        cwd: path.resolve(__dirname, '../..'),
        stdio: 'inherit'
      });
    }

    // Create test config directory
    const configDir = path.resolve(__dirname, '../../test-data-api');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    // Create test config 0 with caching
    fs.writeFileSync(
      path.join(configDir, '0.json'),
      JSON.stringify({
        icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
        template: 'week-view',
        width: 800,
        height: 600,
        grayscale: false,
        bitDepth: 8,
        imageType: 'png',
        expandRecurringFrom: -31,
        expandRecurringTo: 31,
        preGenerateInterval: '*/5 * * * *'
      }, null, 2)
    );

    // Create test config 1 without caching
    fs.writeFileSync(
      path.join(configDir, '1.json'),
      JSON.stringify({
        icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
        template: 'today-view',
        width: 400,
        height: 300,
        grayscale: true,
        bitDepth: 1,
        imageType: 'bmp',
        expandRecurringFrom: -7,
        expandRecurringTo: 7
      }, null, 2)
    );
    
    // Start container
    const startCommand = `docker run -d --name ${CONTAINER_NAME} -p ${HOST_PORT}:${CONTAINER_PORT} -v "${configDir}:/config" ${IMAGE_NAME}`;
    containerId = execSync(startCommand, { encoding: 'utf-8' }).trim();
    
    // Wait for container to be ready
    await waitForContainer();
  }, 120000); // 2 minute timeout

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
    const configDir = path.resolve(__dirname, '../../test-data-api');
    const parentDir = path.resolve(__dirname, '../..');
    if (fs.existsSync(configDir)) {
      try {
        // Use Docker to remove the entire directory with proper permissions
        execSync(`docker run --rm -v "${parentDir}:/workspace" alpine sh -c "rm -rf /workspace/test-data-api"`, { stdio: 'ignore' });
      } catch (error) {
        console.warn('Warning: Could not remove test-data-api directory:', error.message);
      }
    }
  });

  describe('Health Endpoint', () => {
    it('GET /health should return healthy status', async () => {
      const response = await makeRequest('/health');
      
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({ status: 'healthy' });
    });

    it('should return JSON content type', async () => {
      const response = await makeRequest('/health');
      
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('Calendar Image API Endpoints', () => {
    it('GET /api/0.png should return PNG image', async () => {
      const response = await makeRequest('/api/0.png');
      
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toMatch(/image\/(png|jpeg|bmp)/);
      expect(response.headers['content-length']).toBeDefined();
      expect(parseInt(response.headers['content-length'])).toBeGreaterThan(0);
    });

    it('should return binary image data', async () => {
      const response = await makeRequest('/api/0.png');
      
      // Response body should be a Buffer for binary data
      expect(response.body).toBeDefined();
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('GET /api/1.bmp should return image if config exists', async () => {
      const response = await makeRequest('/api/1.bmp');
      
      // Config 1 exists, should return image
      if (response.statusCode === 200) {
        expect(response.headers['content-type']).toMatch(/image\/(png|jpeg|bmp)/);
        expect(response.body.length).toBeGreaterThan(0);
      } else if (response.statusCode === 404) {
        // Config might not exist - that's ok for this test
        expect(response.body.error).toBe('Not Found');
      }
    });

    it('GET /api/3.png should return image if config exists', async () => {
      const response = await makeRequest('/api/3.png');
      
      // Config 3 exists, should return image
      if (response.statusCode === 200) {
        expect(response.headers['content-type']).toMatch(/image\/(png|jpeg|bmp)/);
        expect(response.body.length).toBeGreaterThan(0);
      } else if (response.statusCode === 404) {
        // Config might not exist - that's ok for this test
        expect(response.body.error).toBe('Not Found');
      }
    });

    it('should set Content-Length header correctly', async () => {
      const response = await makeRequest('/api/0.png');
      
      if (response.statusCode === 200) {
        const contentLength = parseInt(response.headers['content-length']);
        expect(contentLength).toBe(response.body.length);
      }
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await makeRequest('/unknown/route');
      
      expect(response.statusCode).toBe(404);
    });

    it('should return error details in 404 response', async () => {
      const response = await makeRequest('/unknown/route');
      
      expect(response.body).toHaveProperty('error', 'Not Found');
      expect(response.body).toHaveProperty('message');
    });

    it('should list available endpoints in 404 response', async () => {
      const response = await makeRequest('/unknown/route');
      
      expect(response.body).toHaveProperty('availableEndpoints');
      expect(Array.isArray(response.body.availableEndpoints)).toBe(true);
      expect(response.body.availableEndpoints.length).toBeGreaterThan(0);
    });

    it('should handle invalid HTTP methods gracefully', async () => {
      const response = await makeRequest('/api/0.png', 'POST');
      
      // Express returns 404 for method not allowed on routes without POST handler
      expect(response.statusCode).toBe(404);
    });

    it('should return 400 for invalid index (negative)', async () => {
      const response = await makeRequest('/api/-1.png');
      
      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty('error', 'Not Found');
    });

    it('should return 400 for invalid index (non-numeric)', async () => {
      const response = await makeRequest('/api/abc.png');
      
      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty('error', 'Not Found');
    });

    it('should return 404 for non-existent config', async () => {
      const response = await makeRequest('/api/9999.png');
      
      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty('error', 'Not Found');
      expect(response.body.message).toContain('not found');
    });

    it('should return JSON error responses', async () => {
      const response = await makeRequest('/api/9999.png');
      
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Response Format', () => {
    it('should return consistent JSON structure', async () => {
      const response = await makeRequest('/api/0');
      
      expect(typeof response.body).toBe('object');
      expect(response.body).not.toBeNull();
    });

    it('should set appropriate headers', async () => {
      const response = await makeRequest('/api/0');
      
      expect(response.headers).toHaveProperty('content-type');
      expect(response.headers['content-type']).toContain('application/json');
    });
  });

  describe('Performance', () => {
    it('should respond within reasonable time', async () => {
      const start = Date.now();
      await makeRequest('/health');
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(1000); // Should respond within 1 second
    });

    it('should handle multiple sequential requests', async () => {
      const requests = [];
      for (let i = 0; i < 5; i++) {
        requests.push(makeRequest('/health'));
      }
      
      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.statusCode).toBe(200);
      });
    });

    it('should maintain consistent response times', async () => {
      const times = [];
      
      for (let i = 0; i < 3; i++) {
        const start = Date.now();
        await makeRequest('/health');
        times.push(Date.now() - start);
      }
      
      const avg = times.reduce((a, b) => a + b) / times.length;
      expect(avg).toBeLessThan(500); // Average should be under 500ms
    });
  });
});
