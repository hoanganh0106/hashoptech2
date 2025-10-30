const mongoose = require('mongoose');
const config = require('./config');

// Debug: đọc biến env thực tế!
console.log('DEBUG process.env.MONGODB_URI =', process.env.MONGODB_URI);
console.log('DEBUG process.env.MONGODB_DB_NAME =', process.env.MONGODB_DB_NAME);
console.log('DEBUG config.mongodb.uri =', config.mongodb.uri);
console.log('DEBUG config.mongodb.dbName =', config.mongodb.dbName);

// Kết nối MongoDB
async function connectDB() {
  try {
    const uri = config.mongodb.uri;
    const dbName = config.mongodb.dbName;
    if (!uri || !dbName) throw new Error('Thiếu MONGODB_URI hoặc MONGODB_DB_NAME trong .env');
    await mongoose.connect(uri, { ...config.mongodb.options, dbName });
    console.log('✅ Đã kết nối MongoDB Atlas thành công!');
    console.log(`📦 Database: ${dbName}`);
  } catch (error) {
    console.error('❌ Lỗi kết nối MongoDB:', error.message);
    process.exit(1);
  }
}

// Xử lý lỗi kết nối
mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected');
  console.log('🔄 Đang thử kết nối lại sau 5 giây...');
  setTimeout(connectDB, 5000);
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected!');
});

// Đóng kết nối khi app tắt
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed');
  process.exit(0);
});

module.exports = connectDB;


