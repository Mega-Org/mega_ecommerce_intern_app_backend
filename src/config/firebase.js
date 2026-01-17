const admin = require('firebase-admin');

try {
    // Path to your service account key file
    const serviceAccount = require('./serviceAccountKey.json');

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });

    console.log('Firebase Admin Initialized successfully');
} catch (error) {
    console.error('Firebase Admin Initialization Error:', error.message);
    // Continue running even if firebase fails, just notifications won't work
}

module.exports = admin;
