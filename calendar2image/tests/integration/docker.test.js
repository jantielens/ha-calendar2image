const { execSync, spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

describe('Docker Integration Tests', () => {
  const IMAGE_NAME = 'ha-calendar2image-test';
  const CONTAINER_NAME = 'ha-calendar2image-test-container';
  const HOST_PORT = 13000; // Use non-standard port to avoid conflicts
  const CONTAINER_PORT = 3000;
  
  let containerId = null;

  // Helper function to wait for container to be ready
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
  const makeRequest = (path) => {
    return new Promise((resolve, reject) => {
      http.get(`http://localhost:${HOST_PORT}${path}`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body: JSON.parse(data)
            });
          } catch (e) {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body: data
            });
          }
        });
      }).on('error', reject);
    });
  };

  beforeAll(async () => {
    console.log('\n🐳 Building Docker image...');
    
    // Clean up any existing test containers first
    try {
      execSync(`docker rm -f ${CONTAINER_NAME}`, { stdio: 'ignore' });
    } catch (error) {
      // Ignore if container doesn't exist
    }
    
    // Build Docker image (use HA base image for proper s6-overlay support)
    try {
      execSync(`docker build -t ${IMAGE_NAME} --build-arg BUILD_FROM=ghcr.io/home-assistant/amd64-base:3.20 .`, {
        cwd: path.resolve(__dirname, '../..'),
        stdio: 'inherit'
      });
      console.log('✅ Docker image built successfully');
    } catch (error) {
      throw new Error(`Failed to build Docker image: ${error.message}`);
    }

    console.log('\n🚀 Starting container...');
    
    // Create sample config directory
    const configDir = path.resolve(__dirname, '../../test-data');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    // Create test config
    fs.writeFileSync(
      path.join(configDir, '0.json'),
      JSON.stringify({
        icsUrl: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
        template: 'week-view'
      })
    );

    // Start container (mount config to /config as that's what the app expects)
    try {
      const output = execSync(
        `docker run -d --name ${CONTAINER_NAME} -p ${HOST_PORT}:${CONTAINER_PORT} -v "${configDir}:/config" ${IMAGE_NAME}`,
        { encoding: 'utf8' }
      );
      containerId = output.trim();
      console.log(`Container started: ${containerId.substring(0, 12)}`);
    } catch (error) {
      throw new Error(`Failed to start container: ${error.message}`);
    }

    console.log('\n⏳ Waiting for container to be ready...');
    await waitForContainer();
    console.log('✅ Container is ready\n');
  }, 120000); // 2 minute timeout for setup

  afterAll(async () => {
    if (containerId) {
      console.log('\n🛑 Stopping and removing container...');
      
      try {
        // Get logs before stopping
        console.log('\n📋 Container logs:');
        const logs = execSync(`docker logs ${CONTAINER_NAME}`, { encoding: 'utf8' });
        console.log(logs);
      } catch (error) {
        console.warn('Could not retrieve logs:', error.message);
      }

      try {
        execSync(`docker stop ${CONTAINER_NAME}`, { stdio: 'ignore' });
        execSync(`docker rm ${CONTAINER_NAME}`, { stdio: 'ignore' });
        console.log('✅ Container stopped and removed');
      } catch (error) {
        console.warn('Error cleaning up container:', error.message);
      }
    }

    // Clean up test data
    const configDir = path.resolve(__dirname, '../../test-data');
    if (fs.existsSync(configDir)) {
      fs.rmSync(configDir, { recursive: true, force: true });
    }
  }, 30000);

  describe('Container Health', () => {
    it('should respond to health check endpoint', async () => {
      const response = await makeRequest('/health');
      
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('status', 'healthy');
    });

    it('should have correct content-type for JSON responses', async () => {
      const response = await makeRequest('/health');
      
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('API Endpoints', () => {
    it('should respond to /api/0 endpoint', async () => {
      const response = await makeRequest('/api/0');
      
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should return 404 for unknown routes', async () => {
      const response = await makeRequest('/unknown');
      
      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty('error', 'Not Found');
    });

    it('should list available endpoints in 404 response', async () => {
      const response = await makeRequest('/unknown');
      
      expect(response.body).toHaveProperty('availableEndpoints');
      expect(Array.isArray(response.body.availableEndpoints)).toBe(true);
    });
  });

  describe('Container Behavior', () => {
    it('should handle multiple concurrent requests', async () => {
      const requests = Array(10).fill(null).map(() => makeRequest('/health'));
      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.statusCode).toBe(200);
        expect(response.body.status).toBe('healthy');
      });
    });

    it('should maintain uptime across requests', async () => {
      const response1 = await makeRequest('/api/0');
      const timestamp1 = new Date(response1.body.timestamp);
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const response2 = await makeRequest('/api/0');
      const timestamp2 = new Date(response2.body.timestamp);
      
      expect(timestamp2.getTime()).toBeGreaterThan(timestamp1.getTime());
    });
  });

  describe('Configuration Loading', () => {
    it('should have access to mounted configuration', async () => {
      // Verify the container can access the config file
      const configExists = execSync(
        `docker exec ${CONTAINER_NAME} test -f /config/0.json && echo exists || echo missing`,
        { encoding: 'utf8' }
      ).trim().replace(/['"]/g, ''); // Remove quotes from output
      
      expect(configExists).toBe('exists');
    });

    it('should have Node.js available in container', async () => {
      const nodeVersion = execSync(
        `docker exec ${CONTAINER_NAME} node --version`,
        { encoding: 'utf8' }
      ).trim();
      
      expect(nodeVersion).toMatch(/^v\d+\./);
    });

    it('should have npm packages installed', async () => {
      const packageCheck = execSync(
        `docker exec ${CONTAINER_NAME} test -d /app/node_modules && echo exists || echo missing`,
        { encoding: 'utf8' }
      ).trim().replace(/['"]/g, ''); // Remove quotes from output
      
      expect(packageCheck).toBe('exists');
    });
  });
});
