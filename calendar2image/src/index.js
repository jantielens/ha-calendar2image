const express = require('express');
const { handleImageRequest, handleFreshImageRequest, handleCRC32Request } = require('./api/handler');
const { ensureCacheDir } = require('./cache');
const { initializeScheduler, generateAllImagesNow, stopAllSchedules } = require('./scheduler');

const app = express();
const PORT = 3000; // Fixed internal port (HA handles external port mapping)

// Middleware to log requests
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// CRC32 checksum endpoint - get CRC32 of image without downloading (must be before /api/:index)
app.get('/api/:index(\\d+).crc32', handleCRC32Request);

// Main API endpoint - generate calendar image by config index
app.get('/api/:index', handleImageRequest);

// Fresh generation endpoint - bypass cache and generate fresh image
app.get('/api/:index/fresh', handleFreshImageRequest);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'healthy' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.url} not found`,
        availableEndpoints: [
            '/api/:index (e.g., /api/0, /api/1) - Returns cached image if available',
            '/api/:index.crc32 - Returns CRC32 checksum of image',
            '/api/:index/fresh - Forces fresh generation',
            '/health'
        ]
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
const server = app.listen(PORT, '0.0.0.0', async () => {
    console.log('='.repeat(50));
    console.log('Calendar2Image Add-on');
    console.log('='.repeat(50));
    console.log(`Server running on port ${PORT}`);
    console.log(`Available endpoints:`);
    console.log(`  - GET /api/:index        : Get cached image or generate if not cached`);
    console.log(`  - GET /api/:index.crc32  : Get CRC32 checksum of image`);
    console.log(`  - GET /api/:index/fresh  : Force fresh generation (bypass cache)`);
    console.log(`  - GET /health            : Health check`);
    console.log('='.repeat(50));
    
    try {
        // Initialize cache directory
        console.log('Initializing cache system...');
        await ensureCacheDir();
        
        // Initialize scheduler and start pre-generation
        console.log('Starting scheduler initialization...');
        await initializeScheduler();
        
        // Generate all images on startup
        console.log('Generating initial cache...');
        await generateAllImagesNow();
        
        console.log('='.repeat(50));
        console.log('Startup complete - ready to serve requests');
        console.log('='.repeat(50));
    } catch (error) {
        console.error('Failed to initialize cache/scheduler:', error.message);
        console.error('Server will continue but pre-generation may not work');
    }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM signal received: closing HTTP server');
    stopAllSchedules();
    server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
});

process.on('SIGINT', async () => {
    console.log('SIGINT signal received: closing HTTP server');
    stopAllSchedules();
    server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
});
