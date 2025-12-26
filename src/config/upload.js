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
        params: {
            folder: 'mega-ecommerce',
            allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
            transformation: [{ width: 500, height: 500, crop: 'limit' }],
            public_id: (req, file) => {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                return file.fieldname + '-' + uniqueSuffix;
            }
        }
    });
} else {
    // Fallback options
    // Fallback options
    // Check for Vercel environment explicitly or Production
    const isServerless = process.env.VERCEL || process.env.NODE_ENV === 'production';

    if (!isServerless) {
        // Use local storage ONLY for local development (not on Vercel)
        console.log('Using Local Storage for uploads (Cloudinary keys not set)');
        storage = multer.diskStorage({
            destination(req, file, cb) {
                cb(null, 'uploads/');
            },
            filename(req, file, cb) {
                cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
            },
        });
    } else {
        // Use memory storage for production/serverless if Cloudinary is missing
        // This prevents "ReadOnly" errors on Vercel
        console.log('Using Memory Storage (Cloudinary keys not set & Serverless env detected)');
        storage = multer.memoryStorage();
    }
}

const upload = multer({ storage: storage });

module.exports = upload;
