const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const path = require('path');

let storage;

const isCloudinaryConfigured = process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name' &&
    process.env.CLOUDINARY_API_KEY !== 'your_api_key';

if (isCloudinaryConfigured) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });

    storage = new CloudinaryStorage({
        cloudinary: cloudinary,
        params: async (req, file) => {
            // Determine folder based on context
            let folder = 'mega-ecommerce/others';

            // Check based on fieldname or route path if possible
            if (req.baseUrl && req.baseUrl.includes('users')) {
                folder = 'mega-ecommerce/users';
            } else if (req.baseUrl && req.baseUrl.includes('products')) {
                // If ID exists (update), we could use products/:id, but for consistency lets keep it simple
                // New products don't have ID yet.
                // For updates (PUT /:id), we could extract it, but let's stick to a unified folder as agreed.
                folder = 'mega-ecommerce/products';
            }

            // Handle Videos
            if (file.mimetype.startsWith('video/')) {
                return {
                    folder: folder,
                    resource_type: 'video',
                    allowed_formats: ['mp4', 'mov', 'avi'],
                    public_id: `${file.fieldname}-${Date.now()}`
                };
            }

            // Handle Images (Force JPG + Optimize)
            return {
                folder: folder,
                format: 'jpg', // Force JPG conversion for Flutter
                public_id: `${file.fieldname}-${Date.now()}`,
                transformation: [
                    { width: 1080, crop: 'limit' }, // Resize if too big
                    { quality: 'auto' }, // Intelligent compression
                    { fetch_format: 'jpg' } // Ensure delivery as JPG
                ]
            };
        }
    });
} else {
    // Fallback options
    // Check for Vercel environment explicitly or Production
    const isServerless = process.env.VERCEL || process.env.NODE_ENV === 'production';

    if (!isServerless) {
        // Use local storage ONLY for local development (not on Vercel)
        console.log('Using Local Storage for uploads (Cloudinary keys missing)');
        storage = multer.diskStorage({
            destination(req, file, cb) {
                cb(null, 'uploads/');
            },
            filename(req, file, cb) {
                cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
            },
        });
    } else {
        // ERROR: We should NOT use MemoryStorage fallback on Vercel anymore as it breaks the app (long strings).
        // but we must provide SOMETHING to multer or it crashes.
        console.error('FATAL: Cloudinary credentials missing in Production/Serverless environment.');
        // We use memory storage purely to avoid startup crash, but controllers should likely block these requests.
        storage = multer.memoryStorage();
    }
}

// Limits: 50MB for video support
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024
    }
});

module.exports = upload;
