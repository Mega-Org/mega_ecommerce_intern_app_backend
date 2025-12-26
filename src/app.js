const express = require('express');
const cors = require('cors');
const path = require('path');

// Import Config
const connectDB = require('./config/db');

// Initialize App
const app = express();

// Connect Database
// Note: We'll call this in server.js or directly here. 
// Use middleware to ensure DB connection is established before processing requests
// This prevents "buffering timed out" issues in serverless environments
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (err) {
        console.error('Database connection failed in middleware:', err);
        next(err);
    }
});

// Middleware
app.use(express.json({ extended: false })); // Parse JSON bodies
app.use(cors()); // Enable CORS

// Serve static files (uploads)
// This will be useful for serving profile images and product images
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/info', require('./routes/infoRoutes'));

// Base Route
app.get('/', (req, res) => {
    res.send('API is running...');
});

// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Server Error',
        error: process.env.NODE_ENV === 'production' ? {} : err.message
    });
});

module.exports = app;
