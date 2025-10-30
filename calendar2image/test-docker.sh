#!/bin/bash

# Quick Start: Docker Integration Tests

echo "============================================"
echo "  Calendar2Image - Docker Integration Test"
echo "============================================"
echo ""

# Check if Docker is running
echo "Checking Docker..."
if ! docker info > /dev/null 2>&1; then
    echo "ERROR: Docker is not running!"
    echo "Please start Docker and try again."
    exit 1
fi
echo "✓ Docker is running"

# Check if port 13000 is available
echo "Checking port availability..."
if lsof -Pi :13000 -sTCP:LISTEN -t >/dev/null 2>&1 || netstat -an 2>/dev/null | grep -q ":13000.*LISTEN" 2>/dev/null; then
    echo "WARNING: Port 13000 is in use"
    echo "The test may fail. Please free up the port or stop the conflicting service."
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo "✓ Port 13000 is available"
fi

echo ""
echo "Starting Docker integration tests..."
echo "This will:"
echo "  1. Build a Docker image"
echo "  2. Start a container"
echo "  3. Run tests against the container"
echo "  4. Clean up"
echo ""
echo "Expected duration: ~2 minutes"
echo ""

# Run the tests
npm run test:docker

if [ $? -eq 0 ]; then
    echo ""
    echo "============================================"
    echo "  All tests passed! ✓"
    echo "============================================"
else
    echo ""
    echo "============================================"
    echo "  Tests failed!"
    echo "============================================"
    echo ""
    echo "Check the output above for details."
    echo "Common issues:"
    echo "  - Docker not running"
    echo "  - Port 13000 in use"
    echo "  - Build failures (check Dockerfile)"
    exit 1
fi
