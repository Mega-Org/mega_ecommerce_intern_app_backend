const admin = require('firebase-admin');

try {
    // Path to your service account key file
    // const serviceAccount = require('./serviceAccountKey.json');

    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        })
    });

    console.log('Firebase Admin Initialized successfully');
} catch (error) {
    console.error('Firebase Admin Initialization Error:', error.message);
    // Continue running even if firebase fails, just notifications won't work
}

module.exports = admin;
