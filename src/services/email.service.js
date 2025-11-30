// backend/src/services/email.service.js
const nodemailer = require('nodemailer');
// No need for config file, we'll read directly from process.env

class EmailService {
  /*constructor() {
    // Create transporter object using your .env variables
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST, // Reads SMTP_HOST
      port: process.env.SMTP_PORT, // Reads SMTP_PORT
      secure: process.env.SMTP_PORT == 465, // true for 465, false for 587
      auth: {
        user: process.env.SMTP_USER, // Reads SMTP_USER
        pass: process.env.SMTP_PASS, // Reads SMTP_PASS (your App Password)
      },
      tls: {
        // Do not fail on invalid certs (useful for local development)
        rejectUnauthorized: false 
      }
    });

    console.log('[EmailService] Transporter configured for', process.env.SMTP_HOST);
  }

  /**
   * Helper function to generate a simple HTML receipt
   */
  /*generateReceiptHtml(order) {
    // Ensure items is an array before mapping
    const itemsHtml = (order.items || [])
      .map(item => `
        <tr>
          <td style="padding: 5px; border-bottom: 1px solid #ddd;">${item.item_name} (x${item.quantity})</td>
          <td style="padding: 5px; border-bottom: 1px solid #ddd; text-align: right;">₹${(parseFloat(item.unit_price) * item.quantity).toFixed(2)}</td>
        </tr>
      `)
      .join('');

    return `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px;">
        <h2 style="color: #333; text-align: center;">Thank you for your order at MunchMate!</h2>
        <p>Hi ${order.customer_name || 'Valued Customer'},</p>
        <p>Here is your receipt for <strong>Order #${order.order_number}</strong> placed from <strong>Table ${order.table_id}</strong>.</p>
        
        <h3 style="border-bottom: 2px solid #eee; padding-bottom: 5px;">Order Summary</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr>
              <th style="padding: 8px; border-bottom: 2px solid #333; text-align: left;">Item</th>
              <th style="padding: 8px; border-bottom: 2px solid #333; text-align: right;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
          <tfoot style="font-weight: bold;">
            <tr>
              <td style="padding: 5px; padding-top: 15px; text-align: right;">Subtotal:</td>
              <td style="padding: 5px; padding-top: 15px; text-align: right;">₹${parseFloat(order.subtotal).toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding: 5px; text-align: right;">Tax (${(order.applied_tax_rate * 100).toFixed(0)}%):</td>
              <td style="padding: 5px; text-align: right;">₹${parseFloat(order.tax_amount).toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding: 5px; border-top: 2px solid #333; padding-top: 10px; text-align: right;">Total:</td>
              <td style="padding: 5px; border-top: 2px solid #333; padding-top: 10px; text-align: right;">₹${parseFloat(order.total_amount).toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
        
        <p style="margin-top: 30px; text-align: center; font-size: 12px; color: #888;">
          Thank you for dining with us!
        </p>
      </div>
    `;
  }

  /**
   * Send the receipt email
   */
  /*async sendReceipt(order) {
    if (!order.customer_email) {
      console.log(`[EmailService] Order ${order.order_id} has no email, skipping receipt.`);
      return;
    }

    const htmlBody = this.generateReceiptHtml(order);

    const mailOptions = {
      from: process.env.SMTP_FROM, // Reads SMTP_FROM from .env
      to: order.customer_email,
      subject: `Your Receipt from MunchMate (Order #${order.order_number})`,
      html: htmlBody,
    };

    try {
      console.log(`[EmailService] Sending receipt to ${order.customer_email} for order ${order.order_id}...`);
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`[EmailService] Receipt sent successfully: ${info.messageId}`);
    } catch (error) {
      console.error(`[EmailService] Error sending receipt for order ${order.order_id}:`, error);
    }
  }*/
}

// Export a single instance
module.exports = new EmailService();