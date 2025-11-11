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
    'tests/integration',
    'tests/matrix',                  // Matrix generation tests (requires Docker, run separately)
    'tests/image/browser.test.js',  // Requires Puppeteer/Chrome
    'tests/image/index.test.js',     // Requires Puppeteer/Chrome
    'tests/api/handler.test.js'      // Mocks are affected by missing browser
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  testTimeout: 10000 // 10 seconds for integration tests
};
