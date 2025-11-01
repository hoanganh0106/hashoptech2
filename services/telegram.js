// Telegram Service - Gửi thông báo qua Telegram Bot
const axios = require('axios');
const config = require('../config');

class TelegramService {
  constructor() {
    this.botToken = config.telegram.botToken;
    this.chatId = config.telegram.chatId;
    this.apiUrl = `https://api.telegram.org/bot${this.botToken}`;
  }

  /**
   * Gửi tin nhắn text đơn giản
   */
  async sendMessage(message) {
    try {
      if (!this.botToken || !this.chatId || this.botToken === 'your-telegram-bot-token') {
        console.log('⚠️  Telegram chưa được cấu hình');
        return null;
      }

      const response = await axios.post(`${this.apiUrl}/sendMessage`, {
        chat_id: this.chatId,
        text: message,
        parse_mode: 'HTML'
      });

      console.log('✅ Đã gửi thông báo Telegram');
      return response.data;
    } catch (error) {
      console.error('❌ Lỗi gửi Telegram:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Gửi thông báo đơn hàng mới
   */
  async notifyNewOrder(order) {
    const items = JSON.parse(order.items);
    const itemsList = items.map(item => `  • ${item.name}: ${this.formatPrice(item.price)}`).join('\n');

    const message = `
🎉 <b>ĐỚN HÀNG MỚI!</b>

📋 <b>Mã đơn:</b> ${order.order_code}
💰 <b>Tổng tiền:</b> ${this.formatPrice(order.total_amount)}

👤 <b>Khách hàng:</b>
  • Tên: ${order.customer_name}
  • Email: ${order.customer_email}
  • SĐT: ${order.customer_phone}

🛍️ <b>Sản phẩm:</b>
${itemsList}

💳 <b>Thanh toán:</b> ${this.getPaymentMethodText(order.payment_method)}
📝 <b>Ghi chú:</b> ${order.order_note || 'Không có'}

🕐 <b>Thời gian:</b> ${new Date(order.created_at).toLocaleString('vi-VN')}
    `.trim();

    return await this.sendMessage(message);
  }

  /**
   * Gửi thông báo thanh toán thành công
   */
  async notifyPaymentSuccess(order, transactionId) {
    const message = `
✅ <b>THANH TOÁN THÀNH CÔNG!</b>

📋 <b>Mã đơn:</b> ${order.order_code}
💰 <b>Số tiền:</b> ${this.formatPrice(order.total_amount)}
🔖 <b>Mã giao dịch:</b> ${transactionId}

👤 <b>Khách hàng:</b> ${order.customer_name}
📧 <b>Email:</b> ${order.customer_email}
📱 <b>SĐT:</b> ${order.customer_phone}

⏰ <b>Thời gian:</b> ${new Date().toLocaleString('vi-VN')}

🎯 <b>Trạng thái:</b> Đã thanh toán - Chờ giao hàng
    `.trim();

    return await this.sendMessage(message);
  }

  /**
   * Gửi thông báo giao hàng
   */
  async notifyDelivery(order, accountInfo) {
    const message = `
📦 <b>ĐÃ GIAO HÀNG!</b>

📋 <b>Mã đơn:</b> ${order.order_code}
👤 <b>Khách hàng:</b> ${order.customer_name}

🔐 <b>Thông tin tài khoản đã gửi qua email:</b>
${accountInfo}

✅ <b>Trạng thái:</b> Hoàn thành
⏰ <b>Thời gian:</b> ${new Date().toLocaleString('vi-VN')}
    `.trim();

    return await this.sendMessage(message);
  }

  /**
   * Gửi thông báo hủy đơn
   */
  async notifyCancelOrder(order, reason) {
    const message = `
❌ <b>ĐƠN HÀNG BỊ HỦY</b>

📋 <b>Mã đơn:</b> ${order.order_code}
💰 <b>Số tiền:</b> ${this.formatPrice(order.total_amount)}
👤 <b>Khách hàng:</b> ${order.customer_name}

📝 <b>Lý do:</b> ${reason || 'Không có'}

⏰ <b>Thời gian:</b> ${new Date().toLocaleString('vi-VN')}
    `.trim();

    return await this.sendMessage(message);
  }

  /**
   * Gửi cảnh báo hết hàng
   */
  async notifyLowStock(product, remainingStock) {
    const message = `
⚠️ <b>CẢNH BÁO HẾT HÀNG!</b>

📦 <b>Sản phẩm:</b> ${product.name}
📊 <b>Số lượng còn:</b> ${remainingStock}
💰 <b>Giá:</b> ${this.formatPrice(product.price)}

🔔 Cần nhập thêm hàng!
    `.trim();

    return await this.sendMessage(message);
  }

  /**
   * Gửi thông báo đơn hàng cần chuẩn bị hàng
   */
  async notifyOrderNeedPreparation(order, itemsNeedPrep) {
    const itemsList = itemsNeedPrep.map(item => 
      `  • ${item.productName} - ${item.variantName} (Cần: ${item.requested}, Có: ${item.available || 0})`
    ).join('\n');

    const message = `
🔔 <b>ĐƠN HÀNG CẦN CHUẨN BỊ HÀNG!</b>

📋 <b>Mã đơn:</b> ${order.orderCode}
💰 <b>Tổng tiền:</b> ${this.formatPrice(order.totalAmount)}

👤 <b>Khách hàng:</b>
  • Tên: ${order.customerName}
  • Email: ${order.customerEmail}
  • SĐT: ${order.customerPhone || 'N/A'}

📦 <b>Sản phẩm cần chuẩn bị:</b>
${itemsList}

⏰ <b>Thời gian:</b> ${new Date(order.createdAt).toLocaleString('vi-VN')}
⏱️ <b>Thời hạn giao hàng:</b> 30 phút (giờ làm việc 7h-00h)

🚨 <b>Lưu ý:</b> Khách hàng đã thanh toán, cần chuẩn bị và gửi thông tin tài khoản ngay!
    `.trim();

    return await this.sendMessage(message);
  }

  /**
   * Helper: Format giá tiền
   */
  formatPrice(price) {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  }

  /**
   * Helper: Lấy text phương thức thanh toán
   */
  getPaymentMethodText(method) {
    const methods = {
      'bank': 'Chuyển khoản ngân hàng',
      'momo': 'Ví MoMo',
      'zalopay': 'ZaloPay',
      'card': 'Thẻ tín dụng'
    };
    return methods[method] || method;
  }

  /**
   * Test kết nối Telegram
   */
  async testConnection() {
    try {
      const response = await axios.get(`${this.apiUrl}/getMe`);
      console.log('✅ Kết nối Telegram thành công!');
      console.log('Bot:', response.data.result);
      return response.data;
    } catch (error) {
      console.error('❌ Không thể kết nối Telegram:', error.message);
      return null;
    }
  }
}

module.exports = new TelegramService();



