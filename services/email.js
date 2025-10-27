// Email Service - Gửi email cho khách hàng
const nodemailer = require('nodemailer');
const config = require('../config');

class EmailService {
  constructor() {
    this.transporter = null;
    this.setupTransporter();
  }

  setupTransporter() {
    // Sử dụng Gmail SMTP (có thể thay đổi provider khác)
    this.transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: config.email?.username || process.env.EMAIL_USERNAME,
        pass: config.email?.password || process.env.EMAIL_PASSWORD
      }
    });
  }

  /**
   * Gửi email thông tin tài khoản cho khách hàng
   */
  async sendAccountInfo(order, deliveredAccounts) {
    try {
      if (!this.transporter) {
        console.log('⚠️ Email service chưa được cấu hình');
        return false;
      }

      const mailOptions = {
        from: `"${config.siteName}" <${config.email?.username || process.env.EMAIL_USERNAME}>`,
        to: order.customerEmail,
        subject: `🎉 Đơn hàng ${order.orderCode} - Thông tin tài khoản`,
        html: this.generateAccountEmailHTML(order, deliveredAccounts)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Đã gửi email cho khách hàng:', order.customerEmail);
      return true;

    } catch (error) {
      console.error('❌ Lỗi gửi email:', error);
      return false;
    }
  }

  /**
   * Tạo HTML template cho email
   */
  generateAccountEmailHTML(order, deliveredAccounts) {
    let accountsHTML = '';
    
    deliveredAccounts.forEach((acc, index) => {
      accountsHTML += `
        <div style="background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #28a745;">
          <h4 style="margin: 0 0 10px 0; color: #28a745;">Tài khoản ${index + 1}</h4>
          <p style="margin: 5px 0;"><strong>Gói:</strong> ${acc.variantName || 'N/A'}</p>
          <p style="margin: 5px 0;"><strong>Tên đăng nhập:</strong> <code style="background: #e9ecef; padding: 2px 6px; border-radius: 4px;">${acc.username}</code></p>
          <p style="margin: 5px 0;"><strong>Mật khẩu:</strong> <code style="background: #e9ecef; padding: 2px 6px; border-radius: 4px;">${acc.password}</code></p>
        </div>
      `;
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Thông tin tài khoản - ${order.orderCode}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #28a745; margin: 0;">🎉 Thanh toán thành công!</h1>
          <p style="color: #666; margin: 10px 0;">Cảm ơn bạn đã mua hàng tại ${config.siteName}</p>
        </div>

        <div style="background: #fff; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h2 style="color: #495057; margin-top: 0;">📋 Thông tin đơn hàng</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6;"><strong>Mã đơn hàng:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6;">${order.orderCode}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6;"><strong>Khách hàng:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6;">${order.customerName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6;"><strong>Email:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6;">${order.customerEmail}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6;"><strong>Số tiền:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6;">${order.totalAmount.toLocaleString()}đ</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Thời gian:</strong></td>
              <td style="padding: 8px 0;">${new Date(order.paidAt).toLocaleString('vi-VN')}</td>
            </tr>
          </table>
        </div>

        <div style="background: #fff; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h2 style="color: #495057; margin-top: 0;">🔑 Thông tin tài khoản</h2>
          <p style="color: #666; margin-bottom: 20px;">Dưới đây là thông tin tài khoản bạn đã mua:</p>
          ${accountsHTML}
        </div>

        <div style="background: #e7f3ff; border: 1px solid #b8daff; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
          <h3 style="color: #004085; margin-top: 0;">⚠️ Lưu ý quan trọng</h3>
          <ul style="margin: 0; padding-left: 20px;">
            <li>Vui lòng đổi mật khẩu ngay sau khi đăng nhập</li>
            <li>Không chia sẻ thông tin tài khoản với người khác</li>
            <li>Liên hệ hỗ trợ nếu gặp vấn đề</li>
          </ul>
        </div>

        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
          <p style="color: #666; margin: 0;">Cảm ơn bạn đã tin tưởng ${config.siteName}!</p>
          <p style="color: #666; margin: 5px 0;">
            📞 Liên hệ: 
            <a href="https://t.me/hoanganh1162" style="color: #007bff;">Telegram</a> | 
            <a href="https://facebook.com/HoangAnh.Sw" style="color: #007bff;">Facebook</a>
          </p>
        </div>

      </body>
      </html>
    `;
  }

  /**
   * Test kết nối email
   */
  async testConnection() {
    try {
      if (!this.transporter) {
        return false;
      }

      await this.transporter.verify();
      console.log('✅ Email service hoạt động bình thường');
      return true;
    } catch (error) {
      console.error('❌ Email service không hoạt động:', error.message);
      return false;
    }
  }
}

module.exports = new EmailService();
