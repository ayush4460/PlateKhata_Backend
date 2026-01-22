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

      if (process.env.NODE_ENV === 'production') {
          // PROD: S3 Upload
          const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, "");
          const buffer = Buffer.from(base64Data, 'base64');
          const key = `restaurants/${restaurantId}/qr-codes/table-${tableNumber}.png`;

          await s3Client.send(new PutObjectCommand({
              Bucket: process.env.AWS_BUCKET_NAME,
              Key: key,
              Body: buffer,
              ContentType: 'image/png',
              // ACL: 'public-read' // Removed: Bucket has ACLs disabled
          }));

          const cdnDomain = process.env.AWS_CDN_DOMAIN || 'your-cdn-domain.cloudfront.net';
          return `https://${cdnDomain}/${key}`;

      } else {
          // DEV: Cloudinary Upload
          const uploadResponse = await cloudinary.uploader.upload(dataUrl, {
            folder: 'restaurant/qr-codes',
            public_id: `table-${tableNumber}-qr`,
            overwrite: true,
            resource_type: 'image'
          });
          return uploadResponse.secure_url;
      }

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