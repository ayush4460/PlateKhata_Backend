// src/config/cloudinary.js
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Test connection
cloudinary.api.ping()
  .then(() => console.log('✅ Cloudinary connected successfully'))
  .catch(err => console.error('❌ Cloudinary connection error:', err.message));

// Storage for Menu Items
const menuStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'restaurant/menu-items',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    transformation: [
      { width: 800, height: 600, crop: 'limit' },
      { quality: 'auto:good' },
      { fetch_format: 'auto' }
    ],
  },
});

// Storage for QR Codes
const qrCodeStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'restaurant/qr-codes',
    allowed_formats: ['png', 'jpg', 'jpeg'],
    public_id: (req, file) => `qr-${Date.now()}`,
  },
});

// Storage for General Uploads
const generalStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'restaurant/uploads',
    allowed_formats: ['jpg', 'jpeg', 'png', 'pdf', 'webp'],
  },
});

/**
 * Delete image from Cloudinary
 * @param {string} publicId - Public ID of the image
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
 * @param {string} url - Cloudinary URL
 * @returns {string|null} - Public ID or null
 */
const extractPublicId = (url) => {
  if (!url) return null;
  
  try {
    // Example URL: https://res.cloudinary.com/demo/image/upload/v1234567890/restaurant/menu-items/abc123.jpg
    const parts = url.split('/');
    const uploadIndex = parts.indexOf('upload');
    
    if (uploadIndex === -1) return null;
    
    // Get everything after 'upload/v123456789/'
    const pathParts = parts.slice(uploadIndex + 2); // Skip 'upload' and version
    const publicIdWithExt = pathParts.join('/');
    
    // Remove file extension
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