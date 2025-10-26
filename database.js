const mongoose = require('mongoose');
const config = require('./config');

// Kết nối MongoDB
async function connectDB() {
  try {
    const connectionString = `${config.mongodb.uri.split('?')[0]}${config.mongodb.dbName}?${config.mongodb.uri.split('?')[1]}`;
    
    await mongoose.connect(connectionString, config.mongodb.options);
    
    console.log('✅ Đã kết nối MongoDB Atlas thành công!');
    console.log(`📦 Database: ${config.mongodb.dbName}`);
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
});

// Đóng kết nối khi app tắt
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed');
  process.exit(0);
});

module.exports = connectDB;


