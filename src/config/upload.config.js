// src/config/upload.config.js
require('dotenv').config();
const multer = require('multer');

// Import Cloudinary Storage
const cloudinaryConfig = require('./cloudinary');

// Import S3 Storage
const s3Config = require('./s3');

// Cloudinary is now used for BOTH Production and Development
// The folder structure is handled dynamically in cloudinary.js
menuStorage = cloudinaryConfig.menuStorage;
qrCodeStorage = cloudinaryConfig.qrCodeStorage;
generalStorage = cloudinaryConfig.generalStorage;

console.log('☁️ Storage Config: Using Cloudinary for all environments');

module.exports = {
    menuStorage,
    qrCodeStorage,
    generalStorage
};
