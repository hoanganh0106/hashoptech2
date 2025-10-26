// QR Code Service
const config = require('../config');

/**
 * Tạo QR code thanh toán VietQR
 * @param {string} content - Nội dung chuyển khoản
 * @returns {string} URL của QR code
 */
async function generateQRCode(content) {
  try {
    // Sử dụng VietQR API
    const accountNo = config.sepay.accountNumber;
    const bankCode = config.sepay.bankCode;
    const amount = content.split(' ')[1] || 0; // Lấy số tiền từ content
    const description = encodeURIComponent(content);
    
    // VietQR format: https://img.vietqr.io/image/[bankCode]-[accountNo]-[template].png?amount=[amount]&addInfo=[description]
    const qrUrl = `https://img.vietqr.io/image/${bankCode}-${accountNo}-compact.png?amount=${amount}&addInfo=${description}`;
    
    return qrUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    return '';
  }
}

module.exports = {
  generateQRCode
};


