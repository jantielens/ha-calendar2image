/**
 * Jest configuration for container/CI environment
 * Includes all tests including those requiring Puppeteer/Chrome
 */
module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testMatch: ['**/tests/**/*.test.js'],
  testPathIgnorePatterns: [
    'tests/integration'  // Only ignore integration tests, run all unit tests
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  testTimeout: 30000 // 30 seconds for Puppeteer tests
};
