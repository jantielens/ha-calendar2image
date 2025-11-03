const https = require('https');
const http = require('http');

/**
 * Fetches ICS data from a given URL
 * @param {string} url - The ICS URL to fetch
 * @param {Object} options - Fetch options
 * @param {boolean} options.rejectUnauthorized - Whether to verify SSL certificates (default: true)
 * @returns {Promise<string>} The raw ICS data
 * @throws {Error} If the URL is invalid or the request fails
 */
async function fetchICS(url, options = {}) {
  const { rejectUnauthorized = true } = options;
  
  if (!url || typeof url !== 'string') {
    throw new Error('Invalid URL: URL must be a non-empty string');
  }

  // Validate URL format
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch (error) {
    throw new Error(`Invalid URL format: ${error.message}`);
  }

  // Only support HTTP and HTTPS
  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new Error(`Unsupported protocol: ${parsedUrl.protocol}. Only http: and https: are supported`);
  }

  return new Promise((resolve, reject) => {
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    // Build request options
    const requestOptions = parsedUrl.protocol === 'https:' 
      ? { rejectUnauthorized }
      : {};
    
    const request = client.get(url, requestOptions, (response) => {
      // Handle redirects
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        fetchICS(response.headers.location, options)
          .then(resolve)
          .catch(reject);
        return;
      }

      // Handle non-200 status codes
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP Error: ${response.statusCode} ${response.statusMessage}`));
        return;
      }

      let data = '';
      response.setEncoding('utf8');
      
      response.on('data', (chunk) => {
        data += chunk;
      });

      response.on('end', () => {
        if (!data) {
          reject(new Error('Empty response received from server'));
          return;
        }
        resolve(data);
      });
    });

    request.on('error', (error) => {
      reject(new Error(`Network error: ${error.message}`));
    });

    // Set timeout (30 seconds)
    request.setTimeout(30000, () => {
      request.destroy();
      reject(new Error('Request timeout: Server took too long to respond'));
    });
  });
}

module.exports = {
  fetchICS
};
