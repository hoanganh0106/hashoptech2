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

// Serve static files
app.use(express.static('.'));

// Serve uploads folder
app.use('/uploads', express.static('uploads'));

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

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  console.log('=================================');
  console.log('🚀 Server đang chạy!');
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`🔧 Môi trường: ${config.nodeEnv}`);
  console.log(`👤 Admin: http://localhost:${PORT}/admin`);
  console.log('=================================');
});

module.exports = app;

