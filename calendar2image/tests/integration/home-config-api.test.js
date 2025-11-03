/**
 * Home Page and Config API Integration Tests
 * 
 * Tests the web interface and configuration API endpoints
 * Runs against a Docker container instance
 */

const { execSync } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const IMAGE_NAME = 'ha-calendar2image-test';
const CONTAINER_NAME = 'ha-calendar2image-home-test-container';
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
        } else if (res.headers['content-type']?.includes('text/html')) {
          body = buffer.toString();
        } else {
          // For binary data, keep as buffer
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

describe('Home Page and Config API Integration Tests', () => {
  beforeAll(async () => {
    // Clean up any existing test containers
    try {
      execSync(`docker rm -f ${CONTAINER_NAME}`, { stdio: 'ignore' });
    } catch (error) {
      // Ignore if container doesn't exist
    }

    // Build Docker image if not already built
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
    const configDir = path.resolve(__dirname, '../../test-data-home');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    // Create test configs
    fs.writeFileSync(
      path.join(configDir, '0.json'),
      JSON.stringify({
        icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
        template: 'week-view',
        width: 800,
        height: 600,
        imageType: 'png',
        preGenerateInterval: '*/5 * * * *'
      }, null, 2)
    );

    fs.writeFileSync(
      path.join(configDir, '1.json'),
      JSON.stringify({
        icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
        template: 'today-view',
        width: 400,
        height: 300,
        imageType: 'bmp'
      }, null, 2)
    );

    fs.writeFileSync(
      path.join(configDir, '5.json'),
      JSON.stringify({
        icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
        template: 'week-view',
        width: 720,
        height: 1280,
        imageType: 'jpg',
        grayscale: true
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
    const configDir = path.resolve(__dirname, '../../test-data-home');
    const parentDir = path.resolve(__dirname, '../..');
    if (fs.existsSync(configDir)) {
      try {
        // Use Docker to remove the entire directory with proper permissions
        execSync(`docker run --rm -v "${parentDir}:/workspace" alpine sh -c "rm -rf /workspace/test-data-home"`, { stdio: 'ignore' });
      } catch (error) {
        console.warn('Warning: Could not remove test-data-home directory:', error.message);
      }
    }
  });

  describe('Home Page (GET /)', () => {
    it('should return HTML page', async () => {
      const response = await makeRequest('/');
      
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toMatch(/text\/html/);
    });

    it('should contain page title', async () => {
      const response = await makeRequest('/');
      
      expect(response.body).toContain('Calendar2Image');
      expect(response.body).toContain('Configuration Dashboard');
    });

    it('should display all configurations', async () => {
      const response = await makeRequest('/');
      
      // Should show config 0, 1, and 5
      expect(response.body).toContain('week-view');
      expect(response.body).toContain('today-view');
      expect(response.body).toContain('800x600');
      expect(response.body).toContain('400x300');
    });

    it('should contain API endpoint links', async () => {
      const response = await makeRequest('/');
      
      expect(response.body).toContain('/api/0.png');
      expect(response.body).toContain('/api/1.bmp');
      expect(response.body).toContain('/api/5.jpg');
    });

    it('should contain links to config API', async () => {
      const response = await makeRequest('/');
      
      // Check for API documentation (generic placeholder)
      expect(response.body).toContain('/api/config/{index}');
      
      // Check for actual config page links (HTML visualization)
      expect(response.body).toContain('/config/0');
      expect(response.body).toContain('/config/1');
      expect(response.body).toContain('/config/5');
    });

    it('should show configuration count', async () => {
      const response = await makeRequest('/');
      
      // Should show 3 configurations
      expect(response.body).toMatch(/3/);
    });

    it('should contain API documentation', async () => {
      const response = await makeRequest('/');
      
      expect(response.body).toContain('API Documentation');
      expect(response.body).toContain('GET /api/{index}.{ext}');
      expect(response.body).toContain('GET /api/config/{index}');
    });

    it('should be styled with CSS', async () => {
      const response = await makeRequest('/');
      
      expect(response.body).toContain('<style>');
      expect(response.body).toContain('</style>');
    });

    it('should have proper HTML structure', async () => {
      const response = await makeRequest('/');
      
      expect(response.body).toContain('<!DOCTYPE html>');
      expect(response.body).toContain('<html');
      expect(response.body).toContain('</html>');
      expect(response.body).toContain('<head>');
      expect(response.body).toContain('<body>');
    });

    it('should be responsive (have viewport meta tag)', async () => {
      const response = await makeRequest('/');
      
      expect(response.body).toContain('viewport');
      expect(response.body).toContain('width=device-width');
    });
  });

  describe('Config List API (GET /api/configs)', () => {
    it('should return JSON with all configurations', async () => {
      const response = await makeRequest('/api/configs');
      
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should return correct number of configurations', async () => {
      const response = await makeRequest('/api/configs');
      
      expect(response.body).toHaveProperty('count', 3);
      expect(response.body).toHaveProperty('configurations');
      expect(Array.isArray(response.body.configurations)).toBe(true);
      expect(response.body.configurations.length).toBe(3);
    });

    it('should include configuration details', async () => {
      const response = await makeRequest('/api/configs');
      
      const configs = response.body.configurations;
      
      // Check first config
      const config0 = configs.find(c => c.index === 0);
      expect(config0).toBeDefined();
      expect(config0.config).toHaveProperty('template', 'week-view');
      expect(config0.config).toHaveProperty('width', 800);
      expect(config0.config).toHaveProperty('height', 600);
      expect(config0.config).toHaveProperty('imageType', 'png');
    });

    it('should include all expected config properties', async () => {
      const response = await makeRequest('/api/configs');
      
      const config = response.body.configurations[0].config;
      
      expect(config).toHaveProperty('icsUrl');
      expect(config).toHaveProperty('template');
      expect(config).toHaveProperty('width');
      expect(config).toHaveProperty('height');
      expect(config).toHaveProperty('imageType');
    });

    it('should sort configurations by index', async () => {
      const response = await makeRequest('/api/configs');
      
      const indices = response.body.configurations.map(c => c.index);
      
      // Should be sorted: [0, 1, 5]
      expect(indices[0]).toBe(0);
      expect(indices[1]).toBe(1);
      expect(indices[2]).toBe(5);
    });

    it('should apply default values to configs', async () => {
      const response = await makeRequest('/api/configs');
      
      const config = response.body.configurations[0].config;
      
      // Check that defaults are applied
      expect(config).toHaveProperty('grayscale');
      expect(config).toHaveProperty('bitDepth');
      expect(config).toHaveProperty('rotate');
      expect(config).toHaveProperty('locale');
    });
  });

  describe('Single Config API (GET /api/config/:index)', () => {
    it('should return JSON for existing configuration', async () => {
      const response = await makeRequest('/api/config/0');
      
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should include index and config properties', async () => {
      const response = await makeRequest('/api/config/0');
      
      expect(response.body).toHaveProperty('index', 0);
      expect(response.body).toHaveProperty('config');
      expect(typeof response.body.config).toBe('object');
    });

    it('should return correct configuration details', async () => {
      const response = await makeRequest('/api/config/1');
      
      expect(response.body.index).toBe(1);
      expect(response.body.config).toHaveProperty('template', 'today-view');
      expect(response.body.config).toHaveProperty('width', 400);
      expect(response.body.config).toHaveProperty('height', 300);
      expect(response.body.config).toHaveProperty('imageType', 'bmp');
    });

    it('should return 404 for non-existent configuration', async () => {
      const response = await makeRequest('/api/config/999');
      
      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty('error', 'Not Found');
    });

    it('should return error details for non-existent config', async () => {
      const response = await makeRequest('/api/config/999');
      
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('details');
      expect(response.body.message).toContain('999');
    });

    it('should return 404 for invalid index (negative)', async () => {
      const response = await makeRequest('/api/config/-1');
      
      // Route pattern doesn't match negative numbers, falls through to 404
      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty('error', 'Not Found');
    });

    it('should return 404 for invalid index (non-numeric)', async () => {
      const response = await makeRequest('/api/config/abc');
      
      // Route pattern doesn't match non-numeric values, falls through to 404
      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty('error', 'Not Found');
    });

    it('should return 404 for invalid index parameter (decimal)', async () => {
      const response = await makeRequest('/api/config/1.5');
      
      // Route pattern doesn't match decimal values, falls through to 404
      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty('error', 'Not Found');
    });

    it('should work for all test configs', async () => {
      const indices = [0, 1, 5];
      
      for (const index of indices) {
        const response = await makeRequest(`/api/config/${index}`);
        
        expect(response.statusCode).toBe(200);
        expect(response.body.index).toBe(index);
        expect(response.body.config).toBeDefined();
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed requests gracefully', async () => {
      const response = await makeRequest('/api/config/');
      
      expect(response.statusCode).toBe(404);
    });

    it('should return JSON errors with proper structure', async () => {
      const response = await makeRequest('/api/config/999');
      
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('details');
    });

    it('should set correct content-type for errors', async () => {
      const response = await makeRequest('/api/config/999');
      
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('Integration with Image API', () => {
    it('should have consistent configuration between endpoints', async () => {
      // Get config from config API
      const configResponse = await makeRequest('/api/config/0');
      const config = configResponse.body.config;
      
      // Try to get image with correct extension
      const imageResponse = await makeRequest(`/api/0.${config.imageType}`);
      
      expect(imageResponse.statusCode).toBe(200);
      expect(imageResponse.headers['content-type']).toContain('image');
    });

    it('should list correct image types in config', async () => {
      const response = await makeRequest('/api/configs');
      
      const configs = response.body.configurations;
      
      // Verify each config has valid imageType
      configs.forEach(({ config }) => {
        expect(['png', 'jpg', 'bmp']).toContain(config.imageType);
      });
    });
  });

  describe('Performance', () => {
    it('should respond to home page within reasonable time', async () => {
      const start = Date.now();
      await makeRequest('/');
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(2000); // Should respond within 2 seconds
    });

    it('should respond to config API within reasonable time', async () => {
      const start = Date.now();
      await makeRequest('/api/configs');
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(1000); // Should respond within 1 second
    });

    it('should handle concurrent config requests', async () => {
      const requests = [];
      for (let i = 0; i < 5; i++) {
        requests.push(makeRequest('/api/configs'));
      }
      
      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.statusCode).toBe(200);
        expect(response.body.count).toBe(3);
      });
    });
  });
});
