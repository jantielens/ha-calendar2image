const express = require('express');
const { handleImageRequest } = require('./api/handler');

const app = express();
const PORT = 3000; // Fixed internal port (HA handles external port mapping)

// Middleware to log requests
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Main API endpoint - generate calendar image by config index
app.get('/api/:index', handleImageRequest);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'healthy' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.url} not found`,
        availableEndpoints: ['/api/:index (e.g., /api/0, /api/1)', '/health']
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
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('='.repeat(50));
    console.log('Calendar2Image Add-on');
    console.log('='.repeat(50));
    console.log(`Server running on port ${PORT}`);
    console.log(`Available endpoints:`);
    console.log(`  - GET /api/:index : Generate calendar image (e.g., /api/0, /api/1)`);
    console.log(`  - GET /health     : Health check`);
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
