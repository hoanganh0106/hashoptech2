// Authentication Middleware
const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Middleware xác thực JWT token
 */
function authenticateToken(req, res, next) {
  // Lấy token từ header hoặc cookie
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1] || req.cookies.token;

  if (!token) {
    return res.status(401).json({ error: 'Không có token xác thực' });
  }

  jwt.verify(token, config.jwtSecret, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token không hợp lệ hoặc đã hết hạn' });
    }

    req.user = user;
    next();
  });
}

/**
 * Middleware kiểm tra quyền admin
 */
function requireAdmin(req, res, next) {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ error: 'Không có quyền truy cập' });
  }
  next();
}

module.exports = {
  authenticateToken,
  requireAdmin
};



