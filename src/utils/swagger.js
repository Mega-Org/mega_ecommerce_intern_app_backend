const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const path = require('path');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Mega Ecommerce API',
            version: '1.0.0',
            description: 'API for a Flutter Ecommerce App',
            contact: {
                name: 'Developer',
            },
        },
        servers: [
            {
                url: 'https://mega-ecommerce-intern-app-backend.vercel.app',
                description: 'Production server',
            },
            {
                url: 'http://localhost:3000',
                description: 'Development server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
        security: [{ bearerAuth: [] }],
    },
    apis: [path.join(__dirname, '../routes/*.js')], // Absolute path for Vercel
};

const specs = swaggerJsdoc(options);

const swaggerDocs = (app) => {
    // CDN for Swagger UI assets (Critical for Vercel/Serverless to avoid "white screen")
    const CSS_URL = "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.0.0/swagger-ui.min.css";

    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
        customCssUrl: CSS_URL,
        customSiteTitle: "Mega Ecommerce API Docs"
    }));

    // Expose raw JSON docs (helpful for debugging)
    app.get('/api-docs.json', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(specs);
    });

    console.log('Swagger docs available at http://localhost:3000/api-docs');
};

module.exports = swaggerDocs;
