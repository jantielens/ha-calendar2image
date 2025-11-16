---
title: Testing Instructions
description: Instructions for writing and running tests in ha-calendar2image
applyTo: "calendar2image/tests/**/*"
---

# Testing Instructions for ha-calendar2image

## Test Framework
This project uses **Jest** as the primary testing framework.

## Test Types

### Unit Tests
- Located in `calendar2image/tests/`
- Test individual functions and modules in isolation
- Mock external dependencies (HTTP requests, file system, Puppeteer)
- Run with: `npm run test:local`

### Integration Tests
- Test the full container environment with Docker
- Validate end-to-end functionality
- Run with: `npm run test:ci`

### Coverage Tests
- Generate code coverage reports
- Run with: `npm run test:coverage`

## Writing Tests

### Naming Conventions
- Test files should match: `*.test.js`
- Describe blocks should clearly state what is being tested
- Test names should be descriptive and follow "should..." pattern

### Example Structure
```javascript
describe('ModuleName', () => {
  describe('functionName', () => {
    it('should handle normal case correctly', () => {
      // Arrange
      // Act
      // Assert
    });

    it('should throw error when invalid input', () => {
      // Test error cases
    });
  });
});
```

### Mocking Best Practices
- Use `jest.mock()` for module mocking
- Use `nock` for HTTP request mocking
- Mock Puppeteer operations to avoid launching browsers in unit tests
- Clean up mocks in `afterEach()` blocks

### Assertions
- Use Jest's built-in matchers (`expect().toBe()`, `expect().toEqual()`, etc.)
- Test both success and failure paths
- Verify error messages and types
- Check edge cases (empty arrays, null, undefined)

## Running Tests

### Before Committing
Always run all tests before committing:
```bash
npm run test:all
```

### Continuous Integration
Tests run automatically on pull requests. All tests must pass before merging.

### Debugging Tests
```bash
# Run specific test file
npx jest path/to/test.test.js

# Run with verbose output
npx jest --verbose

# Run in watch mode for development
npx jest --watch
```

## Common Testing Patterns

### Testing Async Functions
```javascript
it('should handle async operations', async () => {
  const result = await asyncFunction();
  expect(result).toBe(expected);
});
```

### Testing Error Handling
```javascript
it('should throw specific error', () => {
  expect(() => functionThatThrows()).toThrow(ErrorType);
  expect(() => functionThatThrows()).toThrow('specific message');
});
```

### Testing with Timeouts
```javascript
it('should complete within timeout', async () => {
  // Test code
}, 10000); // 10 second timeout
```

## Test Coverage Goals
- Aim for >80% code coverage on new features
- Critical paths (API handlers, cache, image generation) should have >90% coverage
- Don't sacrifice test quality for coverage percentage

## Integration Test Requirements
- Must test within Docker container environment
- Should validate Home Assistant Add-On specific features
- Verify API endpoints work correctly
- Test configuration file loading and validation

## Performance Testing
- Template generation tests should complete in reasonable time
- Cache tests should verify performance improvements
- Use `jest.setTimeout()` for long-running operations
