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

    console.log('📥 Received order request:', {
      customerName,
      customerEmail,
      customerPhone,
      itemsCount: items.length,
      items: items
    });

    // Tính tổng tiền và kiểm tra kho
    let totalAmount = 0;
    const orderItems = [];
    const outOfStockItems = [];

    for (const item of items) {
      console.log('🔍 Processing item:', item);
      const product = await Product.findById(item.productId);
      if (!product) {
        console.log('⚠️ Product not found:', item.productId);
        continue;
      }

      // Tìm variant - có thể là id, index (number hoặc string), hoặc name
      let variant;
      if (item.variantId !== undefined && item.variantId !== null) {
        // Thử tìm theo ObjectId trước
        variant = product.variants.id(item.variantId);
        
        // Nếu không tìm thấy, thử tìm theo index (nếu là number hoặc string number)
        if (!variant) {
          const variantIndex = parseInt(item.variantId);
          if (!isNaN(variantIndex) && variantIndex >= 0 && variantIndex < product.variants.length) {
            variant = product.variants[variantIndex];
          }
        }
        
        // Nếu vẫn không tìm thấy, thử tìm theo name
        if (!variant) {
          variant = product.variants.find(v => v.name === item.variantId || v.name === String(item.variantId));
        }
      }
      
      // Nếu không tìm thấy, dùng variant đầu tiên
      if (!variant && product.variants && product.variants.length > 0) {
        variant = product.variants[0];
        console.log('⚠️ Using first variant as fallback for product:', product.name);
      }

      if (!variant) {
        console.log('⚠️ No variant found for product:', product.name, 'variants:', product.variants);
        continue;
      }
      
      console.log('✅ Found variant:', variant.name, 'for product:', product.name);

      // Lấy stockType từ variant
      const stockType = variant.stockType || 'available';

      // Kiểm tra kho tài khoản (chỉ khi stockType === 'available')
      const requestedQuantity = item.quantity || 1;
      let availableAccounts = 0;
      
      if (stockType === 'available') {
        availableAccounts = await Account.countDocuments({
          productId: product._id,
          variantName: variant.name,
          status: 'available'
        });
      }

      console.log(`📦 Stock check: ${product.name} - ${variant.name} (${stockType}): ${availableAccounts} available, need ${requestedQuantity}`);

      const itemTotal = variant.price * requestedQuantity;
      totalAmount += itemTotal;

      // Kiểm tra xem có cần chuẩn bị hàng không
      const needsPreparation = stockType === 'contact' || (stockType === 'available' && availableAccounts < requestedQuantity);
      
      if (needsPreparation) {
        outOfStockItems.push({
          productName: product.name,
          variantName: variant.name,
          requested: requestedQuantity,
          available: availableAccounts,
          stockType: stockType,
          reason: stockType === 'contact' ? 'Cần liên hệ' : 'Hết hàng'
        });
        console.log('⚠️ Item cần chuẩn bị hàng:', product.name, '-', variant.name, `(${stockType === 'contact' ? 'Cần liên hệ' : 'Hết hàng'})`);
      }

      // Vẫn thêm vào order ngay cả khi cần chuẩn bị hàng
      orderItems.push({
        productId: product._id,
        productName: product.name,
        variantName: variant.name,
        price: variant.price,
        quantity: requestedQuantity,
        total: itemTotal,
        stockType: stockType,
        isOutOfStock: needsPreparation,
        availableStock: availableAccounts
      });

      if (!needsPreparation) {
        console.log('✅ Adding order item:', product.name, '-', variant.name, ':', itemTotal);
      }
    }

    // Function tính thời gian giao hàng dự kiến (7h - 00h)
    function calculateDeliveryTime() {
      const now = new Date();
      const currentHour = now.getHours();
      const workStartHour = 7;
      const workEndHour = 24; // 0h = 24h
      
      if (currentHour >= workStartHour && currentHour < workEndHour) {
        // Trong giờ làm việc (7h-00h): giao sau 30 phút
        return new Date(now.getTime() + 30 * 60 * 1000);
      } else {
        // Ngoài giờ làm việc: giao vào 7h30 sáng hôm sau
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(7, 30, 0, 0);
        return tomorrow;
      }
    }

    // Kiểm tra nếu không có sản phẩm nào hợp lệ
    console.log('📊 Order items processed:', orderItems.length, 'items');
    console.log('📊 Out of stock items:', outOfStockItems.length, 'items');
    
    if (orderItems.length === 0) {
      console.error('❌ No valid items in order - all items were skipped!');
      console.error('📋 Original items:', items);
      return res.status(400).json({ error: 'Không có sản phẩm hợp lệ trong đơn hàng' });
    }

    // Tạo notes nếu có sản phẩm hết hàng
    let orderNotes = req.body.orderNote || '';
    if (outOfStockItems.length > 0) {
      const estimatedDeliveryTime = calculateDeliveryTime();
      const deliveryTimeStr = estimatedDeliveryTime.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      orderNotes += (orderNotes ? '\n\n' : '') + 
        `⚠️ LƯU Ý: Một số sản phẩm hiện tại hết hàng:\n` +
        outOfStockItems.map(item => 
          `• ${item.productName} - ${item.variantName}: Cần ${item.requested}, có ${item.available}`
        ).join('\n') +
        `\n\n📦 Thời gian giao hàng dự kiến: ${deliveryTimeStr}` +
        `\n📞 Hoặc liên hệ trực tiếp để được hỗ trợ nhanh hơn:\n` +
        `• Telegram: @hoanganh1162\n` +
        `• Facebook: facebook.com/HoangAnh.Sw`;
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
      deliveryStatus: 'pending',
      notes: orderNotes || undefined
    });

    await order.save();

    console.log('✅ Order created:', order.orderCode);
    console.log('📊 Out of stock items count:', outOfStockItems.length);

    // Tính thời gian giao hàng nếu có sản phẩm hết hàng
    let deliveryInfo = null;
    if (outOfStockItems.length > 0) {
      const estimatedDeliveryTime = calculateDeliveryTime();
      deliveryInfo = {
        estimatedDeliveryTime: estimatedDeliveryTime.toISOString(),
        estimatedDeliveryTimeStr: estimatedDeliveryTime.toLocaleString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        workingHours: '7h - 00h',
        outOfStockItems: outOfStockItems
      };
      console.log('📦 Delivery info generated:', deliveryInfo);
    }

    const responseData = {
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
      },
      deliveryInfo: deliveryInfo // Thông tin giao hàng nếu có sản phẩm hết hàng
    };

    console.log('📤 Sending response:', JSON.stringify(responseData, null, 2));
    res.json(responseData);
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
