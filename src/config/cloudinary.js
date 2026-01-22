// src/config/cloudinary.js
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

console.log('🔧 Initializing Cloudinary configuration...');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Log configuration status (without exposing secrets)
console.log('📋 Cloudinary Config:', {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? '✅ Set' : '❌ Missing',
  api_key: process.env.CLOUDINARY_API_KEY ? '✅ Set' : '❌ Missing',
  api_secret: process.env.CLOUDINARY_API_SECRET ? '✅ Set' : '❌ Missing',
});

// Test connection (Skip in test environment or if credentials missing)
if (process.env.NODE_ENV !== 'test' && process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.api.ping()
    .then(() => console.log('✅ Cloudinary connected successfully'))
    .catch(err => console.error('❌ Cloudinary connection error:', err.message));
} else {
    console.log('ℹ️ Cloudinary ping skipped (test env or missing credentials)');
}

// Storage for Menu Items
let menuStorage, qrCodeStorage, generalStorage;

if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  menuStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'restaurant/menu-items',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
      transformation: [
        { width: 800, height: 600, crop: 'limit' },
        { quality: 'auto:good' },
      ],
    },
  });

  // Storage for QR Codes
  qrCodeStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'restaurant/qr-codes',
      allowed_formats: ['png', 'jpg', 'jpeg'],
      public_id: (req, file) => `qr-${Date.now()}`,
    },
  });

  // Storage for General Uploads
  generalStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'restaurant/uploads',
      allowed_formats: ['jpg', 'jpeg', 'png', 'pdf', 'webp'],
    },
  });
} else {
  console.warn('⚠️ Cloudinary credentials missing. Cloudinary storage disabled.');
  // dummy storage to prevent export errors, though they shouldn't be used in PROD if configured correctly
  const multer = require('multer');
  menuStorage = multer.memoryStorage();
  qrCodeStorage = multer.memoryStorage();
  generalStorage = multer.memoryStorage();
}

/**
 * Delete image from Cloudinary
 */
const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    console.log(`🗑️ Deleted image: ${publicId}`, result);
    return result;
  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error);
    throw error;
  }
};

/**
 * Extract public ID from Cloudinary URL
 */
const extractPublicId = (url) => {
  if (!url) return null;

  try {
    const parts = url.split('/');
    const uploadIndex = parts.indexOf('upload');

    if (uploadIndex === -1) return null;

    const pathParts = parts.slice(uploadIndex + 1);
        if (pathParts.length > 0 && pathParts[0].match(/^v\d+$/)) {
            pathParts.shift();
        }
    const publicIdWithExt = pathParts.join('/');

    return publicIdWithExt.replace(/\.[^/.]+$/, '');
  } catch (error) {
    console.error('Error extracting public ID:', error);
    return null;
  }
};



module.exports = {
  cloudinary,
  menuStorage,
  qrCodeStorage,
  generalStorage,
  deleteImage,
  extractPublicId,
};