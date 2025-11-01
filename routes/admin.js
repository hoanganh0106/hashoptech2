// Admin Routes - MongoDB Version
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const config = require('../config');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Import Models
const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Account = require('../models/Account');

/**
 * POST /api/admin/login - Đăng nhập admin
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Thiếu thông tin đăng nhập' });
    }

    // Tìm user
    let user = await User.findOne({ username });
    
    // Nếu chưa có user nào, tạo admin mặc định
    if (!user) {
      const adminConfig = config.admin;
      user = new User({
        username: adminConfig.username,
        password: adminConfig.password,
        email: adminConfig.email,
        role: 'admin'
      });
      await user.save();
      console.log('✅ Đã tạo admin mặc định');
    }

    // Kiểm tra password
    const validPassword = await user.comparePassword(password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Mật khẩu không đúng' });
    }

    // Tạo JWT token
    const token = jwt.sign(
      { id: user._id, username: user.username, isAdmin: true },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      admin: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Lỗi đăng nhập' });
  }
});

/**
 * GET /api/admin/verify - Xác thực token
 */
router.get('/verify', authenticateToken, requireAdmin, (req, res) => {
  res.json({ 
    success: true, 
    user: req.user 
  });
});

/**
 * GET /api/admin/dashboard - Lấy thống kê dashboard
 */
router.get('/dashboard', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [
      totalOrders,
      pendingOrders,
      paidOrders,
      totalProducts,
      availableAccounts
    ] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ paymentStatus: 'pending' }),
      Order.countDocuments({ paymentStatus: 'paid' }),
      Product.countDocuments({ isActive: true }),
      Account.countDocuments({ status: 'available' })
    ]);

    // Tính tổng doanh thu
    const revenueResult = await Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

    res.json({
      success: true,
      stats: {
        totalOrders,
        pendingOrders,
        paidOrders,
        totalRevenue,
        totalProducts,
        availableAccounts
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Lỗi lấy thống kê' });
  }
});

/**
 * POST /api/admin/change-password - Đổi mật khẩu
 */
router.post('/change-password', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Thiếu thông tin' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy user' });
    }

    const validPassword = await user.comparePassword(oldPassword);
    if (!validPassword) {
      return res.status(401).json({ error: 'Mật khẩu cũ không đúng' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Đã đổi mật khẩu thành công' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Lỗi cập nhật mật khẩu' });
  }
});


module.exports = router;
