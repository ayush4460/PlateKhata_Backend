const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs').promises;
const config = require('../config/env');

class QRCodeService {
  /**
   * Generate QR code for table
   */
  static async generateTableQRCode(tableId, tableNumber) {
    try {
      // Generate URL that customers will scan
      const menuUrl = `${config.frontendUrl}/menu?table=${tableId}`;

      // QR code file path
      const fileName = `table-${tableNumber}-qr.png`;
      const filePath = path.join('public', 'qrcodes', fileName);

      // Ensure directory exists
      await fs.mkdir(path.dirname(filePath), { recursive: true });

      // Generate QR code
      await QRCode.toFile(filePath, menuUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      // Return URL to access QR code
      return `/qrcodes/${fileName}`;
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
        const filePath = path.join('public', qrCodeUrl);
        await fs.unlink(filePath);
      }
    } catch (error) {
      console.error('Error deleting QR code:', error);
    }
  }
}

module.exports = QRCodeService;