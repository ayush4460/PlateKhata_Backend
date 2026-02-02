const QRCode = require('qrcode');
const jwt = require('jsonwebtoken');
const { cloudinary, extractPublicId } = require('../config/cloudinary');
const config = require('../config/env');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { deleteFile } = require('../utils/storage');

// Initialize S3 Client
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

class QRCodeService {
  /**
   * Generate QR code for table
   */
 
  /**
   * Generate QR code for table
   */
  static async generateTableQRCode(tableId, tableNumber, restaurantSlug, restaurantId) {
    try {

      // Generate Secure Token
      // Payload: { t: tableId, r: restaurantId }
      const token = jwt.sign(
        { t: tableId, r: restaurantId }, 
        process.env.JWT_SECRET,
        { expiresIn: '1825d' } // 5 years
      );

      // New Format: /{slug}?token={secureToken}
      const menuUrl = `${config.frontendUrl}/${restaurantSlug}?token=${token}`;

      const dataUrl = await QRCode.toDataURL(menuUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      // Cloudinary Upload for ALL environments (Dev & Prod)
      // Folder structure: restaurants/{restaurantId}/qr-codes
      const folderPath = `restaurants/${restaurantId}/qr-codes`;
      
      const uploadResponse = await cloudinary.uploader.upload(dataUrl, {
        folder: folderPath,
        public_id: `table-${tableNumber}-qr`,
        overwrite: true,
        resource_type: 'image'
      });
      
      console.log(`✅ QR Code uploaded to Cloudinary: ${uploadResponse.secure_url}`);
      return uploadResponse.secure_url;

    } catch (error) {
      console.error('QR Code generation error:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Generate QR code data URL (base64)
   */
  static async generateQRCodeDataURL(tableId) {
    try {
      const menuUrl = `${config.frontendUrl}/menu?table=${tableId}`;

      const dataURL = await QRCode.toDataURL(menuUrl, {
        width: 300,
        margin: 2,
      });

      return dataURL;
    } catch (error) {
      console.error('QR Code generation error:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Delete QR code file
   */
  static async deleteQRCode(qrCodeUrl) {
    try {
      if (qrCodeUrl) {
         await deleteFile(qrCodeUrl);
      }
    } catch (error) {
      console.error('Error deleting QR code:', error);
    }
  }
}

module.exports = QRCodeService;