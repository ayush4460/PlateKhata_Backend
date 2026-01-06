const express = require('express');
const router = express.Router();
const EmailController = require('../controllers/email.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { uploadReport, handleMulterError } = require('../middlewares/upload.middleware');

// POST /api/v1/email/send-report
router.post(
    '/send-report',
    authenticate,
    uploadReport.single('file'), // Expect field name 'file'
    handleMulterError,
    EmailController.sendReport
);

module.exports = router;
