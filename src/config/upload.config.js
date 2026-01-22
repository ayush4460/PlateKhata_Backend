// src/config/upload.config.js
require('dotenv').config();
const multer = require('multer');

// Import Cloudinary Storage
const cloudinaryConfig = require('./cloudinary');

// Import S3 Storage
const s3Config = require('./s3');

const isProduction = process.env.NODE_ENV === 'production';

let menuStorage, qrCodeStorage, generalStorage;

if (isProduction) {
    console.log('✅ PROD: Using AWS S3 Storage');
    // Using multer-s3 for production
    menuStorage = s3Config.createS3Storage('menu-items');
    qrCodeStorage = s3Config.createS3Storage('qr-codes');
    generalStorage = s3Config.createS3Storage('uploads');
} else {
    console.log('🚧 DEV: Using Cloudinary Storage');
    // Using Cloudinary for development
    menuStorage = cloudinaryConfig.menuStorage;
    qrCodeStorage = cloudinaryConfig.qrCodeStorage;
    generalStorage = cloudinaryConfig.generalStorage;
}

module.exports = {
    menuStorage,
    qrCodeStorage,
    generalStorage
};
