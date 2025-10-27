// Orders Routes - MongoDB Version
const express = require('express');
const router = express.Router();
const config = require('../config');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { generateQRCode } = require('../services/qrcode');

// Import Models
const Order = require('../models/Order');
const Product = require('../models/Product');
const Account = require('../models/Account');

/**
 * POST /api/orders - Tạo đơn hàng mới
 */
router.post('/', async (req, res) => {
  try {
    const { customerName, customerEmail, customerPhone, items } = req.body;

    if (!customerName || !customerEmail || !items || items.length === 0) {
      return res.status(400).json({ error: 'Thiếu thông tin đơn hàng' });
    }

    // Tính tổng tiền và kiểm tra kho
    let totalAmount = 0;
    const orderItems = [];
    const outOfStockItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        console.log('⚠️ Product not found:', item.productId);
        continue;
      }

      // Tìm variant - có thể là id, index, hoặc name
      let variant;
      if (item.variantId) {
        variant = product.variants.id(item.variantId) || 
                  product.variants.find(v => v.name === item.variantId);
      }
      
      // Nếu không tìm thấy, dùng variant đầu tiên
      if (!variant && product.variants && product.variants.length > 0) {
        variant = product.variants[0];
      }

      if (!variant) {
        console.log('⚠️ No variant found for product:', product.name);
        continue;
      }

      // Kiểm tra kho tài khoản
      const requestedQuantity = item.quantity || 1;
      const availableAccounts = await Account.countDocuments({
        productId: product._id,
        variantName: variant.name,
        status: 'available'
      });

      console.log(`📦 Stock check: ${product.name} - ${variant.name}: ${availableAccounts} available, need ${requestedQuantity}`);

      if (availableAccounts < requestedQuantity) {
        outOfStockItems.push({
          productName: product.name,
          variantName: variant.name,
          requested: requestedQuantity,
          available: availableAccounts
        });
        continue; // Bỏ qua item này
      }

      const itemTotal = variant.price * requestedQuantity;
      totalAmount += itemTotal;

      orderItems.push({
        productId: product._id,
        productName: product.name,
        variantName: variant.name,
        price: variant.price,
        quantity: requestedQuantity,
        total: itemTotal
      });

      console.log('✅ Adding order item:', product.name, '-', variant.name, ':', itemTotal);
    }

    // Kiểm tra nếu có sản phẩm hết hàng
    if (outOfStockItems.length > 0) {
      console.log('⚠️ Out of stock items:', outOfStockItems);
      
      let outOfStockMessage = 'Một số sản phẩm hiện tại hết hàng:\n\n';
      outOfStockItems.forEach(item => {
        outOfStockMessage += `• ${item.productName} - ${item.variantName}: Cần ${item.requested}, có ${item.available}\n`;
      });
      outOfStockMessage += '\nVui lòng liên hệ trực tiếp để được hỗ trợ:\n';
      outOfStockMessage += '📞 Telegram: @hoanganh1162\n';
      outOfStockMessage += '📘 Facebook: facebook.com/HoangAnh.Sw';

      return res.status(400).json({ 
        error: 'Sản phẩm hết hàng',
        message: outOfStockMessage,
        outOfStockItems: outOfStockItems
      });
    }

    // Kiểm tra nếu không có sản phẩm nào hợp lệ
    if (orderItems.length === 0) {
      return res.status(400).json({ error: 'Không có sản phẩm hợp lệ trong đơn hàng' });
    }

    // Tạo mã đơn hàng
    const orderCode = 'DH' + Date.now().toString().slice(-8);

    // Tạo QR code thanh toán
    const qrContent = `${config.sepay.accountNumber} ${totalAmount} ${orderCode}`;
    const qrCodeUrl = await generateQRCode(qrContent);

    // Tạo đơn hàng
    const order = new Order({
      orderCode,
      customerName,
      customerEmail,
      customerPhone: customerPhone || '',
      items: orderItems,
      totalAmount,
      qrCodeUrl,
      paymentStatus: 'pending',
      deliveryStatus: 'pending'
    });

    await order.save();

    console.log('✅ Order created:', order.orderCode);

    res.json({
      success: true,
      message: 'Đã tạo đơn hàng',
      order: {
        id: order._id.toString(),
        order_code: order.orderCode,
        totalAmount: order.totalAmount,
        qrCodeUrl: order.qrCodeUrl
      },
      payment: {
        qrCodeUrl: order.qrCodeUrl,
        accountNumber: config.sepay.accountNumber,
        bankCode: config.sepay.bankCode,
        amount: order.totalAmount,
        content: orderCode
      }
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Lỗi tạo đơn hàng' });
  }
});

/**
 * GET /api/orders - Lấy danh sách đơn hàng (admin only)
 */
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    
    if (status) {
      filter.paymentStatus = status;
    }

    const orders = await Order.find(filter)
      .populate('items.productId', 'name')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const formattedOrders = orders.map(order => {
      // Lấy tên sản phẩm từ items
      const productNames = order.items.map(item => {
        if (item.productId && item.productId.name) {
          return item.productId.name;
        }
        return 'Sản phẩm không xác định';
      }).join(', ');

      return {
        id: order._id.toString(),
        order_code: order.orderCode,
        customer_name: order.customerEmail, // Hiển thị email thay vì tên
        customer_email: order.customerEmail,
        customer_phone: order.customerPhone,
        product_name: productNames, // Thêm tên sản phẩm
        total_amount: order.totalAmount,
        payment_status: order.paymentStatus === 'pending' ? 'cancelled' : order.paymentStatus, // Chuyển pending thành cancelled
        delivery_status: order.deliveryStatus,
        created_at: order.createdAt,
        paid_at: order.paidAt,
        items: order.items
      };
    });

    res.json({
      success: true,
      orders: formattedOrders
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Lỗi lấy danh sách đơn hàng' });
  }
});

/**
 * GET /api/orders/:id - Lấy chi tiết đơn hàng
 */
router.get('/:id', async (req, res) => {
  try {
    // Support both ObjectId and orderCode
    let order;
    if (req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      // It's an ObjectId
      order = await Order.findById(req.params.id)
        .populate('items.productId')
        .lean();
    } else {
      // It's an orderCode
      order = await Order.findOne({ orderCode: req.params.id })
        .populate('items.productId')
        .lean();
    }

    if (!order) {
      return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
    }

    res.json({
      success: true,
      order: {
        id: order._id.toString(),
        order_code: order.orderCode,
        customer_name: order.customerName,
        customer_email: order.customerEmail,
        customer_phone: order.customerPhone,
        items: order.items,
        total_amount: order.totalAmount,
        payment_status: order.paymentStatus,
        delivery_status: order.deliveryStatus,
        qr_code_url: order.qrCodeUrl,
        delivered_accounts: order.deliveredAccounts,
        created_at: order.createdAt,
        paid_at: order.paidAt,
        delivered_at: order.deliveredAt
      }
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Lỗi lấy thông tin đơn hàng' });
  }
});

/**
 * POST /api/orders/:id/deliver - Giao hàng (admin only)
 */
router.post('/:id/deliver', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
    }

    if (order.paymentStatus !== 'paid') {
      return res.status(400).json({ error: 'Đơn hàng chưa thanh toán' });
    }

    if (order.deliveryStatus === 'completed') {
      return res.status(400).json({ error: 'Đơn hàng đã giao' });
    }

    const deliveredAccounts = [];

    // Lấy tài khoản từ kho cho từng item
    for (const item of order.items) {
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
          account.soldToOrderId = order._id;
          account.soldAt = new Date();
          await account.save();
        }
      }
    }

    // Cập nhật đơn hàng
    order.deliveredAccounts = deliveredAccounts;
    order.deliveryStatus = 'completed';
    order.deliveredAt = new Date();
    await order.save();

    // TODO: Gửi email cho khách hàng với thông tin tài khoản

    res.json({
      success: true,
      message: 'Đã giao hàng thành công',
      deliveredCount: deliveredAccounts.length
    });
  } catch (error) {
    console.error('Deliver order error:', error);
    res.status(500).json({ error: 'Lỗi giao hàng' });
  }
});

/**
 * PUT /api/orders/:id/status - Cập nhật trạng thái đơn hàng (admin only)
 */
router.put('/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { paymentStatus, deliveryStatus } = req.body;
    
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
    }

    if (paymentStatus) {
      order.paymentStatus = paymentStatus;
      if (paymentStatus === 'paid' && !order.paidAt) {
        order.paidAt = new Date();
      }
    }

    if (deliveryStatus) {
      order.deliveryStatus = deliveryStatus;
      if (deliveryStatus === 'completed' && !order.deliveredAt) {
        order.deliveredAt = new Date();
      }
    }

    await order.save();

    res.json({
      success: true,
      message: 'Đã cập nhật trạng thái'
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Lỗi cập nhật trạng thái' });
  }
});

/**
 * GET /api/orders/:orderCode/status - Kiểm tra trạng thái đơn hàng
 */
router.get('/:orderCode/status', async (req, res) => {
  try {
    const { orderCode } = req.params;

    const order = await Order.findOne({ orderCode });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy đơn hàng'
      });
    }

    res.json({
      success: true,
      order: {
        orderCode: order.orderCode,
        paymentStatus: order.paymentStatus,
        deliveryStatus: order.deliveryStatus,
        totalAmount: order.totalAmount,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        createdAt: order.createdAt,
        paidAt: order.paidAt,
        deliveredAt: order.deliveredAt
      }
    });

  } catch (error) {
    console.error('Lỗi kiểm tra trạng thái đơn hàng:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi server'
    });
  }
});

module.exports = router;
