// Test Routes - API để test các services
const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const telegramService = require('../services/telegram');
const sepayService = require('../services/sepay');
const emailService = require('../services/email');

/**
 * POST /api/test/telegram - Test Telegram connection
 */
router.post('/telegram', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('🧪 Admin test Telegram connection');
    
    const result = await telegramService.sendMessage('🧪 Test từ Admin Panel\n\n✅ Telegram Bot hoạt động bình thường!');
    
    if (result) {
      res.json({ 
        success: true, 
        message: 'Đã gửi test message vào Telegram!' 
      });
    } else {
      res.json({ 
        success: false, 
        error: 'Telegram chưa được cấu hình hoặc có lỗi' 
      });
    }
  } catch (error) {
    console.error('Lỗi test Telegram:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * POST /api/test/sepay - Test Sepay connection
 */
router.post('/sepay', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('🧪 Admin test Sepay connection');
    
    const result = await sepayService.testConnection();
    
    if (result) {
      res.json({ 
        success: true, 
        message: 'Sepay API hoạt động bình thường!' 
      });
    } else {
      res.json({ 
        success: false, 
        error: 'Sepay API không phản hồi hoặc có lỗi' 
      });
    }
  } catch (error) {
    console.error('Lỗi test Sepay:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * POST /api/test/email - Test Email connection
 */
router.post('/email', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('🧪 Admin test Email connection');
    
    const result = await emailService.testConnection();
    
    if (result) {
      res.json({ 
        success: true, 
        message: 'Email service hoạt động bình thường!' 
      });
    } else {
      res.json({ 
        success: false, 
        error: 'Email service chưa được cấu hình hoặc có lỗi' 
      });
    }
  } catch (error) {
    console.error('Lỗi test Email:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/test/database - Test Database connection
 */
router.get('/database', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('🧪 Admin test Database connection');
    
    // Test MongoDB connection bằng cách ping database
    const mongoose = require('mongoose');
    
    if (mongoose.connection.readyState === 1) {
      // Database đã kết nối, test ping
      await mongoose.connection.db.admin().ping();
      
      res.json({ 
        success: true, 
        message: 'MongoDB Atlas kết nối thành công!',
        database: mongoose.connection.db.databaseName
      });
    } else {
      res.json({ 
        success: false, 
        error: 'MongoDB chưa được kết nối' 
      });
    }
  } catch (error) {
    console.error('Lỗi test Database:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/test/version - Get current git commit hash
 */
router.get('/version', (req, res) => {
  const { execSync } = require('child_process');
  try {
    // Lấy commit hash
    const commitHash = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
    const commitMessage = execSync('git log -1 --pretty=%B', { encoding: 'utf-8' }).trim();
    const commitDate = execSync('git log -1 --pretty=%ci', { encoding: 'utf-8' }).trim();
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
    
    res.json({
      success: true,
      version: {
        commitHash: commitHash.substring(0, 7),
        fullHash: commitHash,
        commitMessage,
        commitDate,
        branch
      }
    });
  } catch (error) {
    res.json({
      success: false,
      error: 'Không thể lấy thông tin git',
      message: error.message
    });
  }
});

/**
 * GET /api/test/telegram-chat-id - Hướng dẫn lấy Chat ID cho cộng tác viên
 */
router.get('/telegram-chat-id', (req, res) => {
  res.json({
    success: true,
    message: 'Hướng dẫn lấy Telegram Chat ID',
    instructions: [
      '1. Yêu cầu cộng tác viên tìm bot @userinfobot trên Telegram',
      '2. Gửi bất kỳ tin nhắn nào cho bot @userinfobot',
      '3. Bot sẽ trả về Chat ID của họ (dạng số, ví dụ: 123456789)',
      '4. Copy Chat ID đó và thêm vào file .env',
      '5. Format trong .env: TELEGRAM_CHAT_ID="123456789,987654321" (cách nhau bằng dấu phẩy)',
      '',
      'Hoặc dùng cách khác:',
      '- Tìm bot @getidsbot trên Telegram',
      '- Gửi /start cho bot',
      '- Bot sẽ trả về Chat ID của bạn',
      '',
      'Sau khi thêm Chat ID vào .env, restart server để áp dụng thay đổi.'
    ]
  });
});

module.exports = router;



