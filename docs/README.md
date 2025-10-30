# Developer Documentation

This directory contains technical documentation for developers working on the Calendar2Image add-on.

## Contents

- [**IMPLEMENTATION.md**](./IMPLEMENTATION.md) - Steps 2 & 3 implementation details, including:
  - ICS Calendar Data Fetching module
  - Configuration System module
  - Test coverage and examples
  - Integration guidelines

## Development Setup

### Prerequisites

- Node.js >= 22.0.0
- npm

### Installation

```bash
cd calendar2image
npm install
```

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test:coverage

# Run in watch mode
npm test:watch
```

### Integration Tests

**API Integration Tests:**
```bash
# Quick start with helper scripts
.\test-api.ps1      # Windows (PowerShell)
./test-api.sh       # Linux/Mac (Bash)

# Or manually:
# Terminal 1: npm run dev
# Terminal 2: npm run test:integration
```

**Docker Integration Tests:**
```bash
# Quick start with helper scripts
.\test-docker.ps1   # Windows (PowerShell)
./test-docker.sh    # Linux/Mac (Bash)

# Or manually:
npm run test:docker
```

See [Integration Tests README](../calendar2image/tests/integration/README.md) for details.

### Example Usage

```bash
# Run the integration example
node example.js
```

## Project Structure

```
calendar2image/
├── src/
│   ├── calendar/        # ICS fetching and parsing
│   ├── config/          # Configuration system
│   └── index.js
├── tests/
│   ├── calendar/        # Calendar module tests
│   └── config/          # Config module tests
├── docs/                # User documentation
├── example.js           # Integration example
└── package.json
```

## Testing Standards

- Minimum 80% code coverage required
- All error paths must be tested
- Use Jest for unit testing
- Use Nock for HTTP mocking

## Code Style

- KISS principle (Keep It Simple, Stupid)
- Clear error messages
- Comprehensive JSDoc comments
- Fail fast on invalid configurations

## Contributing

1. Write tests first
2. Ensure all tests pass
3. Maintain >80% coverage
4. Update documentation
5. Follow existing code patterns

## Next Steps

See [plan.md](../plan.md) for upcoming implementation steps.
