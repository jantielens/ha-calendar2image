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
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          let body = buffer;
          
          // Try to parse as JSON if content-type indicates JSON
          if (res.headers['content-type']?.includes('application/json')) {
            try {
              body = JSON.parse(buffer.toString());
            } catch (e) {
              // Keep as buffer if JSON parsing fails
            }
          } else if (res.headers['content-type']?.includes('text/plain')) {
            body = buffer.toString();
          }
          
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body,
            buffer: buffer
          });
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
    
    // Build Docker image (use local Dockerfile for testing without HA dependencies)
    try {
      execSync(`docker build -f Dockerfile.local -t ${IMAGE_NAME} .`, {
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

    // Create test config without caching
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
    const parentDir = path.resolve(__dirname, '../..');
    if (fs.existsSync(configDir)) {
      try {
        // Use Docker to remove the entire directory with proper permissions
        execSync(`docker run --rm -v "${parentDir}:/workspace" alpine sh -c "rm -rf /workspace/test-data"`, { stdio: 'ignore' });
      } catch (error) {
        console.warn('Warning: Could not remove test-data directory:', error.message);
      }
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
    describe('Image Generation with File Extensions', () => {
      it('should generate PNG image for config 0', async () => {
        const response = await makeRequest('/api/0.png');
        
        expect(response.statusCode).toBe(200);
        expect(response.headers['content-type']).toBe('image/png');
        expect(response.headers['x-cache']).toMatch(/HIT|MISS/);
        expect(response.buffer).toBeInstanceOf(Buffer);
        expect(response.buffer.length).toBeGreaterThan(0);
      });

      it('should return 404 for wrong file extension', async () => {
        const response = await makeRequest('/api/0.jpg');
        
        expect(response.statusCode).toBe(404);
        expect(response.body).toHaveProperty('error', 'Not Found');
        expect(response.body.message).toContain('serves png images');
      });

      it('should generate BMP image for config 1', async () => {
        const response = await makeRequest('/api/1.bmp');
        
        expect(response.statusCode).toBe(200);
        expect(response.headers['content-type']).toBe('image/bmp');
        expect(response.headers['x-cache']).toBe('DISABLED');
        expect(response.buffer).toBeInstanceOf(Buffer);
        expect(response.buffer.length).toBeGreaterThan(0);
      });
    });

    describe('Cache Behavior', () => {
      it('should return HIT or MISS for cached config', async () => {
        const response1 = await makeRequest('/api/0.png');
        const response2 = await makeRequest('/api/0.png');
        
        // First request could be HIT (pre-generated) or MISS
        expect(['HIT', 'MISS']).toContain(response1.headers['x-cache']);
        
        // Second request should always be HIT (from cache)
        expect(response2.headers['x-cache']).toBe('HIT');
        
        // Both should return same CRC32
        expect(response1.headers['x-crc32']).toBe(response2.headers['x-crc32']);
      });

      it('should return DISABLED for non-cached config', async () => {
        const response = await makeRequest('/api/1.bmp');
        
        expect(response.headers['x-cache']).toBe('DISABLED');
        expect(response.headers['x-crc32']).toBeTruthy();
      });

      it('should include X-Generated-At header for cached images', async () => {
        const response = await makeRequest('/api/0.png');
        
        if (response.headers['x-cache'] === 'HIT') {
          expect(response.headers['x-generated-at']).toBeTruthy();
          // Validate it's a valid ISO date
          expect(new Date(response.headers['x-generated-at']).toISOString()).toBeTruthy();
        }
      });
    });

    describe('Fresh Generation Endpoint', () => {
      it('should force fresh generation and return BYPASS', async () => {
        const response = await makeRequest('/api/0/fresh.png');
        
        expect(response.statusCode).toBe(200);
        expect(response.headers['x-cache']).toBe('BYPASS');
        expect(response.headers['content-type']).toBe('image/png');
        expect(response.buffer).toBeInstanceOf(Buffer);
      });

      it('should validate file extension on fresh endpoint', async () => {
        const response = await makeRequest('/api/0/fresh.jpg');
        
        expect(response.statusCode).toBe(404);
        expect(response.body.message).toContain('serves png images');
      });

      it('should generate fresh image even for non-cached config', async () => {
        const response = await makeRequest('/api/1/fresh.bmp');
        
        expect(response.statusCode).toBe(200);
        expect(response.headers['x-cache']).toBe('BYPASS');
        expect(response.headers['content-type']).toBe('image/bmp');
      });
    });

    describe('CRC32 Checksum Endpoint', () => {
      it('should return CRC32 checksum for PNG image', async () => {
        const response = await makeRequest('/api/0.png.crc32');
        
        expect(response.statusCode).toBe(200);
        expect(response.headers['content-type']).toBe('text/plain; charset=utf-8');
        expect(response.body).toMatch(/^[a-f0-9]{8}$/);
      });

      it('should return CRC32 checksum for BMP image', async () => {
        const response = await makeRequest('/api/1.bmp.crc32');
        
        expect(response.statusCode).toBe(200);
        expect(response.body).toMatch(/^[a-f0-9]{8}$/);
      });

      it('should match CRC32 between image and checksum endpoint', async () => {
        const imageResponse = await makeRequest('/api/0.png');
        const crc32Response = await makeRequest('/api/0.png.crc32');
        
        expect(imageResponse.headers['x-crc32']).toBe(crc32Response.body);
      });

      it('should validate file extension on CRC32 endpoint', async () => {
        const response = await makeRequest('/api/0.jpg.crc32');
        
        expect(response.statusCode).toBe(404);
        // Response body is a Buffer when content-type is text/plain
        const bodyText = response.body.toString ? response.body.toString() : response.body;
        expect(bodyText).toContain('serves png images');
      });

      it('should return same CRC32 for identical images', async () => {
        const crc1 = await makeRequest('/api/0.png.crc32');
        const crc2 = await makeRequest('/api/0.png.crc32');
        
        expect(crc1.body).toBe(crc2.body);
      });
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
      expect(response.body.availableEndpoints.some(e => e.includes('.png'))).toBe(true);
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
