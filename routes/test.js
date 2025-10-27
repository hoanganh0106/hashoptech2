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

module.exports = router;



