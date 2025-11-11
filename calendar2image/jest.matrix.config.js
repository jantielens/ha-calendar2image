/**
 * Jest configuration for matrix generation tests
 * These tests are separate from CI tests because they:
 * - Generate large visual comparison matrices (not part of normal CI)
 * - Take longer to run (3-6 minutes)
 * - Produce documentation artifacts rather than test coverage
 */

module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/matrix/**/*.test.js'],
  testTimeout: 600000, // 10 minutes for matrix generation
  verbose: true,
  bail: true, // Stop on first failure
  collectCoverage: false, // No coverage needed for visual docs
  
  // Setup and teardown
  globalSetup: undefined,
  globalTeardown: undefined,
  
  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};
