const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();

// Read configuration from Home Assistant options
function getConfig() {
    const optionsPath = '/data/options.json';
    let port = 3000; // Default port

    try {
        if (fs.existsSync(optionsPath)) {
            const options = JSON.parse(fs.readFileSync(optionsPath, 'utf8'));
            port = options.port || port;
            console.log('Loaded configuration from options.json');
        } else {
            console.log('No options.json found, using defaults');
        }
    } catch (error) {
        console.error('Error reading options.json:', error.message);
        console.log('Using default configuration');
    }

    return { port };
}

const config = getConfig();

// Middleware to log requests
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Hello World endpoint following the final API pattern
app.get('/api/0', (req, res) => {
    res.json({
        message: 'Hello World from Calendar2Image Add-on',
        status: 'ok',
        version: '0.1.0',
        timestamp: new Date().toISOString()
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'healthy' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.url} not found`,
        availableEndpoints: ['/api/0', '/health']
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message
    });
});

// Start server
const server = app.listen(config.port, '0.0.0.0', () => {
    console.log('='.repeat(50));
    console.log('Calendar2Image Add-on');
    console.log('='.repeat(50));
    console.log(`Server running on port ${config.port}`);
    console.log(`Available endpoints:`);
    console.log(`  - GET /api/0    : Test endpoint`);
    console.log(`  - GET /health   : Health check`);
    console.log('='.repeat(50));
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
});
