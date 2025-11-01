// Webhook Routes - MongoDB Version
const express = require('express');
const router = express.Router();
const config = require('../config');
const telegramService = require('../services/telegram');
const emailService = require('../services/email');

// Import Models
const Order = require('../models/Order');
const Account = require('../models/Account');

/**
 * Handler function cho Sepay webhook
 */
async function handleSepayWebhook(req, res) {
  try {
    console.log('📥 Nhận webhook từ Sepay:', req.body);

    // Sepay gửi data với format khác
    const {
      id,
      referenceCode,
      transferAmount,
      content,
      gateway,
      transferType,
      code
    } = req.body;

    const transaction_id = referenceCode || id;
    const amount = transferAmount;
    const bank_code = gateway;

    console.log('💰 Số tiền:', amount);
    console.log('📝 Nội dung:', content);
    console.log('🆔 Mã GD:', transaction_id);

    // TODO: Lưu payment log vào MongoDB nếu cần

    // Chỉ xử lý giao dịch chuyển vào
    if (transferType !== 'in') {
      console.log('⚠️  Không phải giao dịch chuyển vào:', transferType);
      return res.json({ success: true, message: 'Đã nhận webhook' });
    }

    // Tìm đơn hàng khớp với nội dung chuyển khoản
    let matchedOrder = null;

    // Ưu tiên tìm theo field 'code' nếu Sepay gửi (chỉ tìm pending, không tìm cancelled)
    if (code) {
      console.log('🔍 Tìm đơn hàng theo code:', code);
      matchedOrder = await Order.findOne({
        orderCode: code,
        paymentStatus: 'pending' // Chỉ tìm đơn hàng pending, không tìm cancelled
      });
      
      if (matchedOrder) {
        console.log('✅ Tìm thấy đơn hàng theo code:', matchedOrder.orderCode);
      }
    }

    // Nếu không tìm thấy, tìm theo nội dung chuyển khoản (chỉ tìm pending)
    if (!matchedOrder && content) {
      console.log('🔍 Tìm đơn hàng theo content');
      const orders = await Order.find({ paymentStatus: 'pending' }); // Chỉ tìm pending

      if (orders && orders.length > 0) {
        const contentLower = content.toLowerCase().trim();

        for (const order of orders) {
          const orderCodeLower = order.orderCode.toLowerCase();
          
          // Kiểm tra khớp mã đơn hàng và số tiền
          if (contentLower.includes(orderCodeLower) && Math.abs(amount - order.totalAmount) < 1000) {
            matchedOrder = order;
            console.log('✅ Tìm thấy đơn hàng theo content:', matchedOrder.orderCode);
            break;
          }
        }
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

    // Import Product để lấy stockType
    const Product = require('../models/Product');
    
    // Phân loại items: tự động lấy từ kho vs cần chuẩn bị hàng
    const deliveredAccounts = [];
    const itemsNeedPreparation = [];

    for (const item of matchedOrder.items) {
      // Lấy stockType từ item hoặc từ product
      let stockType = item.stockType;
      
      if (!stockType) {
        // Nếu không có trong item, lấy từ product variant
        const product = await Product.findById(item.productId);
        if (product && product.variants) {
          const variant = product.variants.find(v => v.name === item.variantName);
          if (variant) {
            stockType = variant.stockType || 'available';
          }
        }
      }

      stockType = stockType || 'available';
      console.log(`📦 Processing item: ${item.productName} - ${item.variantName} (stockType: ${stockType})`);

      // Chỉ tự động lấy từ kho khi stockType === 'available' và có đủ hàng
      if (stockType === 'available') {
        let hasEnoughStock = true;
        
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
          } else {
            hasEnoughStock = false;
          }
        }

        // Nếu không đủ hàng, thêm vào danh sách cần chuẩn bị
        if (!hasEnoughStock) {
          const availableCount = await Account.countDocuments({
            productId: item.productId,
            status: 'available',
            variantName: item.variantName
          });
          
          itemsNeedPreparation.push({
            productName: item.productName,
            variantName: item.variantName,
            requested: item.quantity,
            available: availableCount,
            stockType: stockType,
            reason: 'Hết hàng'
          });
        }
      } else {
        // stockType === 'contact' - luôn cần chuẩn bị hàng
        itemsNeedPreparation.push({
          productName: item.productName,
          variantName: item.variantName,
          requested: item.quantity,
          available: 0,
          stockType: stockType,
          reason: 'Cần liên hệ'
        });
      }
    }

    // Cập nhật delivery status
    if (deliveredAccounts.length > 0) {
      matchedOrder.deliveredAccounts = deliveredAccounts;
      // Chỉ đánh dấu completed nếu tất cả items đều đã giao
      const totalItemsCount = matchedOrder.items.reduce((sum, item) => sum + item.quantity, 0);
      if (deliveredAccounts.length === totalItemsCount) {
        matchedOrder.deliveryStatus = 'completed';
        matchedOrder.deliveredAt = new Date();
      } else {
        matchedOrder.deliveryStatus = 'processing';
      }
      await matchedOrder.save();
    }

    // Gửi thông báo Telegram
    if (itemsNeedPreparation.length > 0) {
      // Có sản phẩm cần chuẩn bị hàng - chỉ gửi 1 thông báo duy nhất
      console.log(`📢 Gửi thông báo Telegram: Có ${itemsNeedPreparation.length} sản phẩm cần chuẩn bị hàng`);
      await telegramService.notifyOrderNeedPreparation(matchedOrder, itemsNeedPreparation);
      console.log('✅ Đã gửi thông báo chuẩn bị hàng');
    } else {
      // Tất cả đều tự động giao hàng
      await telegramService.notifyPaymentSuccess(matchedOrder, transaction_id);
      
      // Gửi chi tiết tài khoản đã giao
      if (deliveredAccounts.length > 0) {
        let accountDetails = `📋 Danh sách tài khoản đã giao:\n`;
        deliveredAccounts.forEach((acc, index) => {
          accountDetails += `${index + 1}. ${acc.variantName || 'N/A'}\n`;
          accountDetails += `   • User: ${acc.username}\n`;
          accountDetails += `   • Pass: ${acc.password}\n`;
        });
        await telegramService.sendMessage(accountDetails);
      }
    }

    // Gửi email cho khách hàng
    if (deliveredAccounts.length > 0) {
      // Có tài khoản trong kho - gửi thông tin tài khoản
      console.log(`📧 Đang gửi email thông tin tài khoản cho khách hàng (${deliveredAccounts.length} tài khoản)...`);
      const emailSent = await emailService.sendAccountInfo(matchedOrder, deliveredAccounts);
      
      if (emailSent) {
        console.log('✅ Đã gửi email thông tin tài khoản thành công');
      } else {
        console.log('⚠️ Không thể gửi email (chưa cấu hình email service)');
      }
    } else if (itemsNeedPreparation.length > 0) {
      // Nếu có items cần chuẩn bị hàng, không gửi email ngay (sẽ gửi sau khi admin chuẩn bị xong)
      console.log(`📦 Có ${itemsNeedPreparation.length} sản phẩm cần chuẩn bị hàng - Không gửi email, Admin sẽ gửi thông tin sau khi chuẩn bị xong`);
    } else {
      console.log('ℹ️ Không có tài khoản nào để gửi email');
    }

    res.json({ 
      success: true, 
      message: 'Đã xử lý thanh toán',
      orderCode: matchedOrder.orderCode,
      delivered: deliveredAccounts.length > 0,
      customerEmail: matchedOrder.customerEmail,
      emailSent: deliveredAccounts.length > 0
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
