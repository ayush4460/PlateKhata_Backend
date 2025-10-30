// src/routes/upload.routes.js
const express = require('express');
const router = express.Router();
const { uploadMenuImage, uploadQRCode, uploadGeneral, handleMulterError } = require('../middlewares/upload.middleware');
const { deleteImage, extractPublicId } = require('../config/cloudinary');
const { authenticate } = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/rbac.middleware');
const ApiResponse = require('../utils/apiResponse');
const catchAsync = require('../utils/catchAsync');
const { ROLES } = require('../config/constants');

/**
 * Upload menu image
 * POST /api/v1/uploads/menu-image
 */
router.post(
  '/menu-image',
  authenticate,
  authorize(ROLES.ADMIN),
  uploadMenuImage.single('image'),
  handleMulterError,
  catchAsync(async (req, res) => {
    if (!req.file) {
      return ApiResponse.badRequest(res, 'No file uploaded');
    }

    return ApiResponse.success(
      res,
      {
        url: req.file.path,
        publicId: req.file.filename,
        originalName: req.file.originalname,
      },
      'Image uploaded successfully'
    );
  })
);

/**
 * Upload QR code
 * POST /api/v1/uploads/qr-code
 */
router.post(
  '/qr-code',
  authenticate,
  authorize(ROLES.ADMIN),
  uploadQRCode.single('qrcode'),
  handleMulterError,
  catchAsync(async (req, res) => {
    if (!req.file) {
      return ApiResponse.badRequest(res, 'No file uploaded');
    }

    return ApiResponse.success(
      res,
      {
        url: req.file.path,
        publicId: req.file.filename,
      },
      'QR code uploaded successfully'
    );
  })
);

/**
 * General file upload
 * POST /api/v1/uploads/general
 */
router.post(
  '/general',
  authenticate,
  authorize(ROLES.ADMIN),
  uploadGeneral.single('file'),
  handleMulterError,
  catchAsync(async (req, res) => {
    if (!req.file) {
      return ApiResponse.badRequest(res, 'No file uploaded');
    }

    return ApiResponse.success(
      res,
      {
        url: req.file.path,
        publicId: req.file.filename,
        originalName: req.file.originalname,
      },
      'File uploaded successfully'
    );
  })
);

/**
 * Delete image from Cloudinary
 * DELETE /api/v1/uploads/image
 * Body: { "url": "cloudinary_url_here" }
 */
router.delete(
  '/image',
  authenticate,
  authorize(ROLES.ADMIN),
  catchAsync(async (req, res) => {
    const { url } = req.body;

    if (!url) {
      return ApiResponse.badRequest(res, 'Image URL is required');
    }

    const publicId = extractPublicId(url);

    if (!publicId) {
      return ApiResponse.badRequest(res, 'Invalid Cloudinary URL');
    }

    const result = await deleteImage(publicId);

    return ApiResponse.success(res, result, 'Image deleted successfully');
  })
);

module.exports = router;