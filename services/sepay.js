// Sepay Service - Tích hợp API Sepay để nhận thanh toán
const axios = require('axios');
const config = require('../config');

class SepayService {
  constructor() {
    this.apiKey = config.sepay.apiKey;
    this.accountNumber = config.sepay.accountNumber;
    this.bankCode = config.sepay.bankCode;
    this.apiUrl = config.sepay.apiUrl;
  }

  /**
   * Lấy danh sách giao dịch từ Sepay
   */
  async getTransactions(limit = 20) {
    try {
      if (!this.apiKey || this.apiKey === 'your-sepay-api-key') {
        console.log('⚠️  Sepay chưa được cấu hình');
        return [];
      }

      const response = await axios.get(`${this.apiUrl}/transactions`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        params: {
          account_number: this.accountNumber,
          limit: limit
        }
      });

      return response.data.transactions || [];
    } catch (error) {
      console.error('❌ Lỗi lấy giao dịch Sepay:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Kiểm tra giao dịch cụ thể
   */
  async checkTransaction(transactionId) {
    try {
      const transactions = await this.getTransactions(100);
      return transactions.find(t => t.transaction_id === transactionId);
    } catch (error) {
      console.error('❌ Lỗi kiểm tra giao dịch:', error.message);
      return null;
    }
  }

  /**
   * Tạo nội dung chuyển khoản cho đơn hàng
   */
  generateTransferContent(orderCode) {
    // Format: THANHTOAN ORDERCODE
    return `THANHTOAN ${orderCode}`;
  }

  /**
   * Kiểm tra nội dung chuyển khoản có khớp với đơn hàng không
   */
  matchTransferContent(content, orderCode) {
    if (!content) return false;
    
    // Loại bỏ dấu, khoảng trắng và chuyển chữ hoa
    const normalizedContent = content
      .toUpperCase()
      .replace(/\s+/g, '')
      .replace(/[^A-Z0-9]/g, '');
    
    const normalizedOrderCode = orderCode
      .toUpperCase()
      .replace(/\s+/g, '')
      .replace(/[^A-Z0-9]/g, '');

    return normalizedContent.includes(normalizedOrderCode);
  }

  /**
   * Kiểm tra số tiền có khớp không
   */
  matchAmount(transactionAmount, orderAmount, tolerance = 1000) {
    // Cho phép sai số nhỏ (VD: 50000 vs 50001)
    return Math.abs(transactionAmount - orderAmount) <= tolerance;
  }

  /**
   * Xác minh webhook từ Sepay
   */
  verifyWebhook(signature, payload) {
    // Implement webhook verification nếu Sepay cung cấp
    // Hiện tại return true để test
    return true;
  }

  /**
   * Lấy thông tin tài khoản ngân hàng
   */
  getBankInfo() {
    return {
      bankCode: this.bankCode,
      accountNumber: this.accountNumber,
      accountName: 'SHOP TAI KHOAN', // Cập nhật tên thật
      bankName: this.getBankName(this.bankCode)
    };
  }

  /**
   * Helper: Lấy tên ngân hàng từ mã
   */
  getBankName(code) {
    const banks = {
      'MB': 'MB Bank (Quân đội)',
      'VCB': 'Vietcombank',
      'TCB': 'Techcombank',
      'ACB': 'ACB',
      'VIB': 'VIB',
      'VPB': 'VPBank',
      'TPB': 'TPBank',
      'BIDV': 'BIDV',
      'AGR': 'Agribank',
      'SCB': 'Sacombank',
      'MSB': 'MSB',
      'SHB': 'SHB'
    };
    return banks[code] || code;
  }

  /**
   * Tạo QR code thanh toán (nếu cần)
   */
  generateQRCode(orderCode, amount) {
    const content = this.generateTransferContent(orderCode);
    
    // URL tạo QR code cho chuyển khoản
    const qrUrl = `https://img.vietqr.io/image/${this.bankCode}-${this.accountNumber}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(content)}`;
    
    return {
      qrUrl,
      bankCode: this.bankCode,
      accountNumber: this.accountNumber,
      amount: amount,
      content: content
    };
  }

  /**
   * Test kết nối Sepay
   */
  async testConnection() {
    try {
      if (!this.apiKey || this.apiKey === 'your-sepay-api-key') {
        console.log('⚠️  Sepay chưa được cấu hình');
        return false;
      }

      const response = await axios.get(`${this.apiUrl}/account`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Kết nối Sepay thành công!');
      console.log('Account:', response.data);
      return true;
    } catch (error) {
      console.error('❌ Không thể kết nối Sepay:', error.response?.data || error.message);
      return false;
    }
  }
}

module.exports = new SepayService();



