require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const swaggerDocs = require('./utils/swagger');

// Connect to Database
// connectDB() is now handled in app.js middleware to ensure connection before handling requests
// connectDB();

const PORT = process.env.PORT || 3000;

// Initialize Swagger Docs (before starting server)
swaggerDocs(app);

// Only start the server if this file is run directly (local development)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

// Export the app for Vercel (Serverless)
module.exports = app;
