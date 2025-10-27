// File cấu hình - Đọc từ biến môi trường .env
require('dotenv').config();

module.exports = {
  // Server Configuration
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',

  // JWT Secret
  jwtSecret: process.env.JWT_SECRET,

  // Admin Account
  admin: {
    username: process.env.ADMIN_USERNAME,
    password: process.env.ADMIN_PASSWORD,
    email: process.env.ADMIN_EMAIL
  },

  // Sepay Configuration
  sepay: {
    apiKey: process.env.SEPAY_API_KEY,
    accountNumber: process.env.SEPAY_ACCOUNT_NUMBER,
    bankCode: process.env.SEPAY_BANK_CODE,
    webhookSecret: process.env.SEPAY_WEBHOOK_SECRET,
    apiUrl: process.env.SEPAY_API_URL
  },

  // Telegram Bot Configuration
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_CHAT_ID
  },

  // Database - MongoDB
  mongodb: {
    uri: process.env.MONGODB_URI,
    dbName: process.env.MONGODB_DB_NAME,
    options: {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 2,
      retryWrites: true,
      retryReads: true
    }
  },

  // Frontend URL (để CORS)
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3001',

  // Site Information
  siteName: 'HaShopTech',

  // Email Configuration
  email: {
    username: process.env.EMAIL_USERNAME,
    password: process.env.EMAIL_PASSWORD
  }
};

