#!/bin/bash

# Quick Start: API Integration Tests

echo "============================================"
echo "  Calendar2Image - API Integration Test"
echo "============================================"
echo ""

# Check if server is running
echo "Checking if server is running on port 3000..."
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "✓ Server is running"
    SERVER_RUNNING=true
else
    echo "✗ Server is not running"
    SERVER_RUNNING=false
fi

echo ""

if [ "$SERVER_RUNNING" = false ]; then
    echo "The server needs to be running for API integration tests."
    echo ""
    echo "Options:"
    echo "  1. Start server in another terminal: npm run dev"
    echo "  2. Run Docker tests instead: npm run test:docker"
    echo ""
    
    read -p "Start server now in background? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Starting server in background..."
        npm run dev > /tmp/calendar2image-server.log 2>&1 &
        SERVER_PID=$!
        
        # Wait for server to be ready
        echo "Waiting for server to be ready..."
        for i in {1..10}; do
            sleep 1
            if curl -s http://localhost:3000/health > /dev/null 2>&1; then
                echo "✓ Server is ready"
                break
            fi
            echo -n "."
        done
        
        if ! curl -s http://localhost:3000/health > /dev/null 2>&1; then
            echo ""
            echo "Server failed to start!"
            kill $SERVER_PID 2>/dev/null
            exit 1
        fi
        
        echo ""
        echo "Running tests..."
        npm run test:integration
        TEST_RESULT=$?
        
        echo ""
        echo "Stopping server..."
        kill $SERVER_PID 2>/dev/null
        
        exit $TEST_RESULT
    else
        exit 1
    fi
else
    echo "Running tests..."
    npm run test:integration
fi

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
    exit 1
fi
