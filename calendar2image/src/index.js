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

// API endpoints with file extensions
// CRC32 checksum endpoint - get CRC32 of image without downloading
app.get('/api/:index(\\d+).:ext(png|jpg|bmp).crc32', handleCRC32Request);

// Fresh generation endpoint - bypass cache and generate fresh image
app.get('/api/:index(\\d+)/fresh.:ext(png|jpg|bmp)', handleFreshImageRequest);

// Main API endpoint - generate calendar image by config index
app.get('/api/:index(\\d+).:ext(png|jpg|bmp)', handleImageRequest);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'healthy' });
});

// Mock weather endpoint for testing
app.get('/api/mock-weather', (req, res) => {
    const today = new Date();
    const weather = {};
    
    // Generate 7 days of mock weather
    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dateKey = date.toISOString().split('T')[0];
        
        const emojis = ['☀', '⛅', '☁', '🌧', '⛈', '🌤'];
        const temps = [18, 20, 22, 24, 16, 19, 21];
        
        weather[dateKey] = {
            emoji: emojis[i % emojis.length],
            temp: temps[i % temps.length]
        };
    }
    
    res.json({ weather });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.url} not found`,
        availableEndpoints: [
            '/api/:index.:ext (e.g., /api/0.png, /api/1.jpg) - Returns cached/fresh image',
            '/api/:index.:ext.crc32 (e.g., /api/0.png.crc32) - Returns CRC32 checksum',
            '/api/:index/fresh.:ext (e.g., /api/0/fresh.png) - Forces fresh generation',
            '/health',
            '',
            'Note: Extension (png/jpg/bmp) must match the imageType in the config file'
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
    console.log(`  - GET /api/:index.:ext       : Get cached/fresh image (ext: png, jpg, bmp)`);
    console.log(`  - GET /api/:index.:ext.crc32 : Get CRC32 checksum (e.g., /api/0.png.crc32)`);
    console.log(`  - GET /api/:index/fresh.:ext : Force fresh generation`);
    console.log(`  - GET /api/mock-weather      : Mock weather data for testing`);
    console.log(`  - GET /health                : Health check`);
    console.log(`Note: Extension must match imageType in config file`);
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
