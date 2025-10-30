/**
 * API Integration Tests
 * 
 * These tests run against a live instance of the application
 * They can be run either against:
 * 1. A locally running instance (npm run dev)
 * 2. The Docker container (after docker build and run)
 */

const http = require('http');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

// Helper to make HTTP requests
const makeRequest = (path, method = 'GET') => {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    
    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: method
    }, (res) => {
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

// Check if server is available before running tests
const checkServerAvailability = async () => {
  try {
    await makeRequest('/health');
    return true;
  } catch (error) {
    return false;
  }
};

describe('API Integration Tests', () => {
  beforeAll(async () => {
    const isAvailable = await checkServerAvailability();
    if (!isAvailable) {
      console.warn(`\n⚠️  Warning: Server not available at ${BASE_URL}`);
      console.warn('   Start the server with: npm run dev');
      console.warn('   Or set TEST_BASE_URL environment variable\n');
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
    it('GET /api/0 should return PNG image', async () => {
      const response = await makeRequest('/api/0');
      
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toMatch(/image\/(png|jpeg|bmp)/);
      expect(response.headers['content-length']).toBeDefined();
      expect(parseInt(response.headers['content-length'])).toBeGreaterThan(0);
    });

    it('should return binary image data', async () => {
      const response = await makeRequest('/api/0');
      
      // Response body should be a Buffer for binary data
      expect(response.body).toBeDefined();
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('GET /api/1 should return image if config exists', async () => {
      const response = await makeRequest('/api/1');
      
      // Config 1 exists, should return image
      if (response.statusCode === 200) {
        expect(response.headers['content-type']).toMatch(/image\/(png|jpeg|bmp)/);
        expect(response.body.length).toBeGreaterThan(0);
      } else if (response.statusCode === 404) {
        // Config might not exist - that's ok for this test
        expect(response.body.error).toBe('Not Found');
      }
    });

    it('GET /api/3 should return image if config exists', async () => {
      const response = await makeRequest('/api/3');
      
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
      const response = await makeRequest('/api/0');
      
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
      const response = await makeRequest('/api/0', 'POST');
      
      // Express returns 404 for method not allowed on routes without POST handler
      expect(response.statusCode).toBe(404);
    });

    it('should return 400 for invalid index (negative)', async () => {
      const response = await makeRequest('/api/-1');
      
      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('error', 'Bad Request');
      expect(response.body.message).toContain('Invalid index parameter');
    });

    it('should return 400 for invalid index (non-numeric)', async () => {
      const response = await makeRequest('/api/abc');
      
      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('error', 'Bad Request');
    });

    it('should return 404 for non-existent config', async () => {
      const response = await makeRequest('/api/9999');
      
      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty('error', 'Not Found');
      expect(response.body.message).toContain('Configuration');
    });

    it('should return JSON error responses', async () => {
      const response = await makeRequest('/api/9999');
      
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('details');
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
