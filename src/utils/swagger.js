const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const path = require('path');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Mega Ecommerce API',
            version: '1.0.0',
            description: 'API for a Flutter Ecommerce App For Internship Project',
            contact: {
                name: 'Eng. Magdy Ebrahim Ali',
                email: 'magdyebrahim155@gmail.com',
                url: 'https://github.com/magdyebrahim24'
            },
        },
        servers: [
            {
                url: 'https://mega155-ecommerce-app-backend.vercel.app',
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
        tags: [
            { name: 'Auth - Registration', description: 'User registration & verification' },
            { name: 'Auth - Session', description: 'Login & session management' },
            { name: 'Auth - Password Reset', description: 'Password recovery flow' },
            { name: 'Users', description: 'User profile management' },
            { name: 'Products', description: 'Product management' },
            { name: 'Favorites', description: 'User favorites' },
            { name: 'Reviews', description: 'Product reviews' },
            { name: 'Cart', description: 'Shopping cart' },
            { name: 'Orders', description: 'Order processing' },
            { name: 'Info', description: 'Static pages and app info' },
            { name: 'Notifications', description: 'User notifications' }
        ]
    },
    // Use process.cwd() which is safer in Vercel/Serverless environments
    apis: [path.join(process.cwd(), 'src/routes/*.js')],
};

const specs = swaggerJsdoc(options);

const swaggerDocs = (app) => {
    // CDN for Swagger UI assets (Critical for Vercel/Serverless to avoid "white screen")
    const CSS_URL = "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.0.0/swagger-ui.min.css";
    const JS_URL = "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.0.0/swagger-ui-bundle.js";
    const JS_PRESET_URL = "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.0.0/swagger-ui-standalone-preset.js";

    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
        customCssUrl: CSS_URL,
        customJs: [JS_URL, JS_PRESET_URL],
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
