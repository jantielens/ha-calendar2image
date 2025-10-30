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

  describe('API v0 Endpoint', () => {
    it('GET /api/0 should return valid response', async () => {
      const response = await makeRequest('/api/0');
      
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should return status: ok', async () => {
      const response = await makeRequest('/api/0');
      
      expect(response.body.status).toBe('ok');
    });

    it('should return valid version', async () => {
      const response = await makeRequest('/api/0');
      
      expect(response.body.version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('should return valid ISO timestamp', async () => {
      const response = await makeRequest('/api/0');
      
      const timestamp = new Date(response.body.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(isNaN(timestamp.getTime())).toBe(false);
    });

    it('should return JSON content type', async () => {
      const response = await makeRequest('/api/0');
      
      expect(response.headers['content-type']).toMatch(/application\/json/);
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
