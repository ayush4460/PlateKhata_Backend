// src/middlewares/upload.middleware.js
const multer = require('multer');

// Import Cloudinary storage
let menuStorage, qrCodeStorage, generalStorage;

try {
  const cloudinaryConfig = require('../config/cloudinary');
  menuStorage = cloudinaryConfig.menuStorage;
  qrCodeStorage = cloudinaryConfig.qrCodeStorage;
  generalStorage = cloudinaryConfig.generalStorage;
  console.log('✅ Upload middleware using Cloudinary storage');
} catch (error) {
  console.error('❌ Failed to load Cloudinary config:', error.message);
  console.error('⚠️ Falling back to memory storage (images will not persist!)');
  
  // Fallback to memory storage if Cloudinary fails
  menuStorage = multer.memoryStorage();
  qrCodeStorage = multer.memoryStorage();
  generalStorage = multer.memoryStorage();
}

const ApiError = require('../utils/apiError');

// Configure multer with Cloudinary storage
const upload = multer({
  storage: menuStorage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype) {
      return cb(null, true);
    } else {
      cb(ApiError.badRequest('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
    }
  },
});

// Export default upload instance
module.exports = upload;

// Also export named exports
module.exports.uploadMenuImage = upload;
module.exports.uploadQRCode = multer({
  storage: qrCodeStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  },
});
module.exports.uploadGeneral = multer({
  storage: generalStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

module.exports.uploadReport = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit for reports
});

// Error handler for multer
module.exports.handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 5MB.',
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  } else if (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
  next();
};