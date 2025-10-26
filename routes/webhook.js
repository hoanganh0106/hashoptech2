// Webhook Routes - MongoDB Version
const express = require('express');
const router = express.Router();
const config = require('../config');
const telegramService = require('../services/telegram');

// Import Models
const Order = require('../models/Order');
const Account = require('../models/Account');

/**
 * Handler function cho Sepay webhook
 */
async function handleSepayWebhook(req, res) {
  try {
    console.log('📥 Nhận webhook từ Sepay:', req.body);

    const { transaction_id, amount, content, bank_code, status } = req.body;

    // TODO: Lưu payment log vào MongoDB nếu cần

    // Chỉ xử lý giao dịch thành công
    if (status !== 'success' && status !== 'completed') {
      console.log('⚠️  Giao dịch chưa hoàn thành:', status);
      return res.json({ success: true, message: 'Đã nhận webhook' });
    }

    // Tìm đơn hàng khớp với nội dung chuyển khoản
    const orders = await Order.find({ paymentStatus: 'pending' });

    if (!orders || orders.length === 0) {
      console.log('⚠️  Không có đơn hàng pending');
      return res.json({ success: true, message: 'Không có đơn hàng phù hợp' });
    }

    // Tìm đơn hàng khớp với nội dung CK
    let matchedOrder = null;
    const contentLower = content.toLowerCase().trim();

    for (const order of orders) {
      const orderCodeLower = order.orderCode.toLowerCase();
      
      // Kiểm tra khớp mã đơn hàng và số tiền
      if (contentLower.includes(orderCodeLower) && Math.abs(amount - order.totalAmount) < 1000) {
        matchedOrder = order;
        break;
      }
    }

    if (!matchedOrder) {
      console.log('⚠️  Không tìm thấy đơn hàng khớp');
      
      // Gửi thông báo Telegram về giao dịch không xác định
      await telegramService.sendMessage(
        `⚠️ GIAO DỊCH KHÔNG XÁC ĐỊNH\n\n` +
        `💰 Số tiền: ${amount.toLocaleString()}đ\n` +
        `📝 Nội dung: ${content}\n` +
        `🏦 Ngân hàng: ${bank_code}\n` +
        `🆔 Mã GD: ${transaction_id}\n\n` +
        `Vui lòng kiểm tra thủ công!`
      );
      
      return res.json({ success: true, message: 'Không tìm thấy đơn hàng khớp' });
    }

    // Cập nhật trạng thái đơn hàng
    matchedOrder.paymentStatus = 'paid';
    matchedOrder.paidAt = new Date();
    matchedOrder.bankTransactionId = transaction_id;
    await matchedOrder.save();

    console.log('✅ Đã cập nhật đơn hàng:', matchedOrder.orderCode);

    // Tự động giao hàng nếu có tài khoản trong kho
    const deliveredAccounts = [];

    for (const item of matchedOrder.items) {
      for (let i = 0; i < item.quantity; i++) {
        const account = await Account.findOne({
          productId: item.productId,
          status: 'available',
          variantName: item.variantName
        });

        if (account) {
          deliveredAccounts.push({
            productId: item.productId,
            variantName: item.variantName,
            username: account.username,
            password: account.password,
            deliveredAt: new Date()
          });

          // Đánh dấu account đã bán
          account.status = 'sold';
          account.soldToOrderId = matchedOrder._id;
          account.soldAt = new Date();
          await account.save();
        }
      }
    }

    // Cập nhật delivery status
    if (deliveredAccounts.length > 0) {
      matchedOrder.deliveredAccounts = deliveredAccounts;
      matchedOrder.deliveryStatus = 'completed';
      matchedOrder.deliveredAt = new Date();
      await matchedOrder.save();
    }

    // Gửi thông báo Telegram
    let message = `🎉 ĐƠN HÀNG THANH TOÁN THÀNH CÔNG\n\n` +
      `📦 Mã đơn: ${matchedOrder.orderCode}\n` +
      `👤 Khách hàng: ${matchedOrder.customerName}\n` +
      `📧 Email: ${matchedOrder.customerEmail}\n` +
      `💰 Số tiền: ${matchedOrder.totalAmount.toLocaleString()}đ\n` +
      `🏦 Mã GD: ${transaction_id}\n\n`;

    if (deliveredAccounts.length > 0) {
      message += `✅ Đã giao ${deliveredAccounts.length} tài khoản\n\n`;
      message += `📋 Danh sách tài khoản:\n`;
      deliveredAccounts.forEach((acc, index) => {
        message += `${index + 1}. ${acc.variantName || 'N/A'}\n`;
        message += `   • User: ${acc.username}\n`;
        message += `   • Pass: ${acc.password}\n`;
      });
    } else {
      message += `⚠️ Chưa giao hàng (không đủ tài khoản trong kho)`;
    }

    await telegramService.sendMessage(message);

    // TODO: Gửi email cho khách hàng với thông tin tài khoản

    res.json({ 
      success: true, 
      message: 'Đã xử lý thanh toán',
      orderCode: matchedOrder.orderCode,
      delivered: deliveredAccounts.length > 0
    });

  } catch (error) {
    console.error('❌ Lỗi xử lý webhook:', error);
    res.status(500).json({ error: 'Lỗi xử lý webhook' });
  }
}

/**
 * POST /api/webhook/sepay - Endpoint webhook chính
 */
router.post('/sepay', handleSepayWebhook);

/**
 * POST /hooks/sepay-payment/ - Endpoint tương thích với cấu hình Sepay của user
 */
router.post('/sepay-payment/', handleSepayWebhook);

module.exports = router;
