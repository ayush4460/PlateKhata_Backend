const QRCode = require('qrcode');
const { cloudinary, extractPublicId } = require('../config/cloudinary');
const config = require('../config/env');

class QRCodeService {
  /**
   * Generate QR code for table
   */
  static async generateTableQRCode(tableId, tableNumber) {
    try {

      const menuUrl = `${config.frontendUrl}/menu?table=${tableId}`;

      const dataUrl = await QRCode.toDataURL(menuUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      const uploadResponse = await cloudinary.uploader.upload(dataUrl, {
        folder: 'restaurant/qr-codes',
        public_id: `table-${tableNumber}-qr`,
        overwrite: true,
        resource_type: 'image'
      });

      // Return URL to access QR code
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
        const publicId = extractPublicId(qrCodeUrl);
        if(publicId) await cloudinary.uploader.destroy(publicId);
      }
    } catch (error) {
      console.error('Error deleting QR code:', error);
    }
  }
}

module.exports = QRCodeService;