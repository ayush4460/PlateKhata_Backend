// src/config/s3.js
const { S3Client } = require('@aws-sdk/client-s3');
const multerS3 = require('multer-s3');
const path = require('path');

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const getDestinationPath = (req, file, folder) => {
    // Industrial Standard Path: restaurants/{restaurant_id}/{folder}/{timestamp}-{filename}
    // Requres req.user to be populated by auth middleware
    const restaurantId = req.user ? req.user.restaurantId : 'general'; 
    // Sanitize filename
    const cleanFileName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
    return `restaurants/${restaurantId}/${folder}/${Date.now()}-${cleanFileName}`;
};

const createS3Storage = (folder) => multerS3({
  s3: s3Client,
  bucket: process.env.AWS_BUCKET_NAME || 'platekhata-ap-south-1',
  contentType: multerS3.AUTO_CONTENT_TYPE,
  key: function (req, file, cb) {
    const fullPath = getDestinationPath(req, file, folder);
    cb(null, fullPath);
  },
  metadata: function (req, file, cb) {
    cb(null, { fieldName: file.fieldname });
  }
});

module.exports = {
    s3Client,
    createS3Storage
};
