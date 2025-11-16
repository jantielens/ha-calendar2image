# Integration Tests

This directory contains integration tests that validate the Calendar2Image add-on in real-world scenarios.

## Test Types

### 1. API Integration Tests (`api.test.js`)

Tests the API endpoints against a running instance of the application.

**What it tests:**
- Health check endpoint returns JSON
- Calendar image endpoints return binary data
- Correct Content-Type headers (image/png, image/jpeg, image/bmp)
- Content-Length headers match actual image size
- Error handling (400 for invalid index, 404 for missing config)
- JSON error response format
- Response performance
- Multiple concurrent requests

**Run against local dev server:**
```bash
# Option 1: Use helper scripts
.\test-api.ps1      # Windows (PowerShell)
./test-api.sh       # Linux/Mac (Bash)

# Option 2: Manual
# Terminal 1: Start the dev server
npm run dev

# Terminal 2: Run the tests
npm run test:integration
```

**Run against custom URL:**
```bash
TEST_BASE_URL=http://localhost:8080 npm run test:integration
```

### 2. Docker Integration Tests (`docker.test.js`)

Builds a Docker container, runs it, and tests the actual containerized application.

**What it tests:**
- Docker image builds successfully
- Container starts and runs properly
- API endpoints work in containerized environment
- Configuration file mounting works
- Multiple concurrent requests
- Container health and stability

**Prerequisites:**
- Docker must be installed and running
- Port 13000 must be available

**Run:**
```bash
# Option 1: Use helper scripts
.\test-docker.ps1   # Windows (PowerShell)
./test-docker.sh    # Linux/Mac (Bash)

# Option 2: Direct npm command
npm run test:docker
```

**Warning:** This test takes ~2 minutes as it builds and runs a full Docker container.

**Helper Scripts Features:**
- Check prerequisites (Docker running, port available)
- Provide clear progress indicators
- Show helpful error messages
- Color-coded output (PowerShell only)

## Test Scripts

```bash
# Run only unit tests (excludes integration tests)
npm test

# Run API integration tests (requires running server)
npm run test:integration

# Run Docker integration tests (builds container)
npm run test:docker

# Run all tests (unit + integration)
npm run test:all
```

**Note:** Integration tests use a separate Jest configuration (`jest.integration.config.js`) to avoid conflicts with unit test settings.

## How Docker Tests Work

1. **Build Phase**: Builds a Docker image from the Dockerfile
2. **Setup Phase**: 
   - Creates a test configuration directory
   - Writes a sample `sample.json` config
   - Starts the container with volume mount
   - Waits for the container to be ready (health check)
3. **Test Phase**: Runs all tests against the running container
4. **Cleanup Phase**: 
   - Retrieves and displays container logs
   - Stops and removes the container
   - Cleans up test data

## Test Coverage

### API Tests
- ✅ Health endpoint responds correctly
- ✅ API endpoints return valid JSON
- ✅ Error handling for 404s
- ✅ Response format validation
- ✅ Performance benchmarks (< 1 second response time)
- ✅ Concurrent request handling

### Docker Tests
- ✅ Image builds successfully
- ✅ Container starts and becomes healthy
- ✅ All API endpoints work in container
- ✅ Configuration file mounting works
- ✅ Node.js and dependencies are installed
- ✅ Multiple concurrent requests work
- ✅ Container maintains uptime

## Troubleshooting

### API Tests Failing

**Server not available:**
```
⚠️  Warning: Server not available at http://localhost:3000
```
**Solution:** Start the dev server with `npm run dev`

**Port conflict:**
```
Error: connect ECONNREFUSED
```
**Solution:** Ensure the server is running on the expected port

### Docker Tests Failing

**Docker not running:**
```
Error: Failed to build Docker image
```
**Solution:** Start Docker Desktop or Docker daemon

**Port 13000 in use:**
```
Error: port is already allocated
```
**Solution:** Stop any service using port 13000 or change `HOST_PORT` in the test file

**Container not ready:**
```
Error: Container not ready after 30 attempts
```
**Solution:** Check Docker logs with `docker logs ha-calendar2image-test-container`

## CI/CD Integration

These tests are designed to run in CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run unit tests
  run: npm test

- name: Run API integration tests
  run: |
    npm run dev &
    sleep 5
    npm run test:integration

- name: Run Docker tests
  run: npm run test:docker
```

## Development

When adding new integration tests:

1. Add tests to the appropriate file (`api.test.js` or `docker.test.js`)
2. Use the provided helper functions (`makeRequest`, `waitForContainer`)
3. Ensure tests clean up after themselves
4. Keep tests fast and focused
5. Document any special requirements

## Performance Expectations

- **Unit tests**: < 10 seconds
- **API integration tests**: < 5 seconds (with running server)
- **Docker tests**: ~2 minutes (includes build time)
