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

    // Tính tổng tiền và lấy thông tin sản phẩm
    let totalAmount = 0;
    const orderItems = [];

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

      console.log('✅ Adding order item:', product.name, '-', variant.name, ':', variant.price);

      orderItems.push({
        productId: product._id,
        productName: product.name,
        variantName: variant.name,
        price: variant.price,
        quantity: item.quantity || 1
      });

      totalAmount += variant.price * (item.quantity || 1);
    }

    if (orderItems.length === 0) {
      return res.status(400).json({ error: 'Không có sản phẩm hợp lệ' });
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
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const formattedOrders = orders.map(order => ({
      id: order._id.toString(),
      order_code: order.orderCode,
      customer_name: order.customerName,
      customer_email: order.customerEmail,
      customer_phone: order.customerPhone,
      total_amount: order.totalAmount,
      payment_status: order.paymentStatus,
      delivery_status: order.deliveryStatus,
      created_at: order.createdAt,
      paid_at: order.paidAt,
      items: order.items
    }));

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
    const order = await Order.findById(req.params.id)
      .populate('items.productId')
      .lean();

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
