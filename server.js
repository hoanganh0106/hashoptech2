// Main Server File
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');
const config = require('./config');

// Connect to MongoDB
const connectDB = require('./database');
connectDB();

// Import Order model và Telegram service cho auto-cancel
const Order = require('./models/Order');
const telegramService = require('./services/telegram');

// Import routes
const adminRoutes = require('./routes/admin');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const webhookRoutes = require('./routes/webhook');
const testRoutes = require('./routes/test');

const app = express();

// Trust proxy - Để Express nhận diện requests từ Nginx
app.set('trust proxy', 1);

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 100, // Giới hạn 100 requests
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limit nếu từ localhost
  skip: (req) => req.ip === '127.0.0.1' || req.ip === '::1'
});

// Middleware
app.use(cors({
  origin: config.frontendUrl,
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(limiter);

// Serve static files với cache headers cho Cloudflare
app.use(express.static('.', {
  // Set cache headers để tránh Cloudflare cache quá lâu
  setHeaders: (res, path) => {
    // CSS và JS files - cache ngắn với versioning
    if (path.endsWith('.css') || path.endsWith('.js')) {
      res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate'); // 1 giờ
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }
    // HTML files - no cache để luôn load mới nhất
    else if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    // Images - cache lâu hơn
    else if (path.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i)) {
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 ngày
    }
  }
}));

// Serve uploads folder
app.use('/uploads', express.static('uploads', {
  maxAge: '1d' // Cache uploads 1 ngày
}));


// API Routes
app.use('/api/admin', adminRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/test', testRoutes);

// Sepay Webhook Route (match với URL đã cấu hình trên Sepay)
app.use('/hooks', webhookRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server đang hoạt động' });
});

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/thank-you', (req, res) => {
  res.sendFile(path.join(__dirname, 'thank-you.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Đã xảy ra lỗi server', 
    message: config.nodeEnv === 'development' ? err.message : undefined 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Không tìm thấy endpoint' });
});

// Hàm tự động hủy đơn hàng quá hạn thanh toán
async function cancelExpiredOrders() {
  try {
    // Thời gian hết hạn: 1 giờ (có thể config qua ORDER_EXPIRATION_HOURS)
    const expirationHours = process.env.ORDER_EXPIRATION_HOURS || 1;
    const expirationTime = new Date(Date.now() - expirationHours * 60 * 60 * 1000);
    
    // Tìm các đơn hàng pending quá hạn
    const expiredOrders = await Order.find({
      paymentStatus: 'pending',
      createdAt: { $lt: expirationTime }
    });
    
    if (expiredOrders.length === 0) {
      return;
    }
    
    console.log(`⏰ Tìm thấy ${expiredOrders.length} đơn hàng quá hạn thanh toán`);
    
    for (const order of expiredOrders) {
      // Cập nhật trạng thái đơn hàng
      order.paymentStatus = 'cancelled';
      order.deliveryStatus = 'cancelled';
      order.cancelledAt = new Date();
      order.cancellationReason = `Tự động hủy do quá hạn thanh toán (${expirationHours} giờ)`;
      await order.save();
      
      console.log(`❌ Đã hủy đơn hàng: ${order.orderCode}`);
    }
    
    console.log(`✅ Đã xử lý ${expiredOrders.length} đơn hàng quá hạn`);
  } catch (error) {
    console.error('❌ Lỗi khi hủy đơn hàng quá hạn:', error);
  }
}

// Chạy scheduled job: kiểm tra mỗi 1 giờ
setInterval(cancelExpiredOrders, 60 * 60 * 1000); // 1 giờ
// Chạy ngay khi khởi động server (sau 30 giây để đảm bảo DB đã kết nối)
setTimeout(cancelExpiredOrders, 30 * 1000);

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  console.log('=================================');
  console.log('🚀 Server đang chạy!');
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`🔧 Môi trường: ${config.nodeEnv}`);
  console.log(`👤 Admin: http://localhost:${PORT}/admin`);
  console.log(`⏰ Tự động hủy đơn hàng quá hạn: ${process.env.ORDER_EXPIRATION_HOURS || 1} giờ`);
  console.log('=================================');
});

module.exports = app;

