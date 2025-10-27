// Products Routes - MongoDB Version
const express = require('express');
const router = express.Router();
const config = require('../config');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');
const fs = require('fs');
const path = require('path');

// Import Models
const Product = require('../models/Product');
const Account = require('../models/Account');

/**
 * GET /api/products - Lấy danh sách sản phẩm với variants (public)
 */
router.get('/', async (req, res) => {
  try {
    const products = await Product.find({ isActive: true })
      .sort({ createdAt: -1 })
      .lean();

    // Get stock count for each product
    const productsWithStock = await Promise.all(products.map(async (product) => {
      const stockCount = await Account.countDocuments({
        productId: product._id.toString(),
        status: 'available'
      });

      return {
        id: product._id.toString(),
        name: product.name,
        description: product.description,
        image_url: product.imageUrl,
        category: product.category,
        icon: product.icon,
        stock: stockCount,
        variants: product.variants.map(v => ({
          id: v._id.toString(),
          name: v.name,
          description: v.description || '',
          price: v.price,
          duration_value: v.duration_value,
          duration_unit: v.duration_unit
        })),
        created_at: product.createdAt
      };
    }));

    res.json({
      success: true,
      products: productsWithStock
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Lỗi lấy danh sách sản phẩm' });
  }
});

/**
 * GET /api/products/:id - Lấy chi tiết 1 sản phẩm
 */
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
    }

    res.json({
      success: true,
      product: {
        id: product._id.toString(),
        name: product.name,
        description: product.description,
        image_url: product.imageUrl,
        category: product.category,
        variants: product.variants,
        isActive: product.isActive,
        created_at: product.createdAt
      }
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Lỗi lấy thông tin sản phẩm' });
  }
});

/**
 * POST /api/products - Tạo sản phẩm mới (admin only)
 */
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, description, imageUrl, category, variants } = req.body;

    if (!name || !description) {
      return res.status(400).json({ error: 'Thiếu thông tin sản phẩm' });
    }

    if (!variants || variants.length === 0) {
      return res.status(400).json({ error: 'Sản phẩm phải có ít nhất 1 gói' });
    }

    const product = new Product({
      name,
      description,
      imageUrl: imageUrl || '',
      category: category || 'other',
      variants: variants.map(v => ({
        name: v.name,
        description: v.description || '',
        price: parseFloat(v.price) || 0,
        duration_value: parseInt(v.duration_value) || 1,
        duration_unit: v.duration_unit || 'month'
      }))
    });

    await product.save();

    res.json({
      success: true,
      message: 'Đã tạo sản phẩm thành công',
      product: {
        id: product._id.toString(),
        name: product.name,
        variants: product.variants
      }
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Lỗi tạo sản phẩm' });
  }
});

/**
 * PUT /api/products/:id - Cập nhật sản phẩm (admin only)
 */
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, description, imageUrl, category, variants, isActive } = req.body;

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
    }

    // Update fields
    if (name) product.name = name;
    if (description) product.description = description;
    if (imageUrl !== undefined) product.imageUrl = imageUrl;
    if (category) product.category = category;
    if (isActive !== undefined) product.isActive = isActive;
    
    if (variants) {
      product.variants = variants.map(v => ({
        name: v.name,
        description: v.description || '',
        price: parseFloat(v.price) || 0,
        duration_value: parseInt(v.duration_value) || 1,
        duration_unit: v.duration_unit || 'month'
      }));
    }

    await product.save();

    res.json({
      success: true,
      message: 'Đã cập nhật sản phẩm',
      product: {
        id: product._id.toString(),
        name: product.name
      }
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Lỗi cập nhật sản phẩm' });
  }
});

/**
 * DELETE /api/products/:id - Xóa sản phẩm (admin only)
 */
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
    }

    // Soft delete: chỉ đánh dấu là không active
    product.isActive = false;
    await product.save();

    res.json({
      success: true,
      message: 'Đã xóa sản phẩm'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Lỗi xóa sản phẩm' });
  }
});

/**
 * POST /api/products/upload - Upload ảnh sản phẩm (admin only)
 */
router.post('/upload', authenticateToken, requireAdmin, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Không có file được upload' });
    }

    const imageUrl = `/uploads/products/${req.file.filename}`;
    
    res.json({
      success: true,
      imageUrl
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Lỗi upload ảnh' });
  }
});

/**
 * GET /api/products/:productId/stock - Lấy số lượng tài khoản còn trong kho (admin only)
 */
router.get('/:productId/stock', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { productId } = req.params;
    
    const mongoose = require('mongoose');
    const accounts = await Account.aggregate([
      {
        $match: {
          productId: new mongoose.Types.ObjectId(productId),
          status: 'available'
        }
      },
      {
        $group: {
          _id: '$variantName',
          count: { $sum: 1 }
        }
      }
    ]);

    const stockByVariant = {};
    accounts.forEach(item => {
      stockByVariant[item._id || 'default'] = item.count;
    });

    res.json({
      success: true,
      stock: stockByVariant
    });
  } catch (error) {
    console.error('Get stock error:', error);
    res.status(500).json({ error: 'Lỗi lấy thông tin kho' });
  }
});

/**
 * POST /api/products/:productId/stock - Thêm tài khoản vào kho (admin only)
 */
router.post('/:productId/stock', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { productId } = req.params;
    const { variantName, accounts } = req.body;

    // Validate
    if (!variantName || !accounts || !Array.isArray(accounts) || accounts.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Thiếu thông tin: variantName và accounts (array) là bắt buộc' 
      });
    }

    // Kiểm tra product tồn tại
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ 
        success: false,
        error: 'Không tìm thấy sản phẩm' 
      });
    }

    // Kiểm tra variant tồn tại
    const variant = product.variants.find(v => v.name === variantName);
    if (!variant) {
      return res.status(400).json({ 
        success: false,
        error: 'Không tìm thấy gói/variant này trong sản phẩm' 
      });
    }

    // Tạo các account
    const accountDocs = accounts.map(acc => ({
      productId,
      productName: product.name,
      variantName: variantName,
      price: variant.price,
      username: acc.username || acc.account || '',
      password: acc.password || '',
      additionalInfo: acc.additionalInfo || acc.note || '',
      status: 'available'
    }));

    const createdAccounts = await Account.insertMany(accountDocs);

    res.json({
      success: true,
      message: `Đã thêm ${createdAccounts.length} tài khoản vào kho`,
      count: createdAccounts.length
    });
  } catch (error) {
    console.error('Add stock error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Lỗi thêm tài khoản vào kho: ' + error.message 
    });
  }
});

/**
 * GET /api/products/:productId/accounts - Lấy danh sách tài khoản trong kho (admin only)
 */
router.get('/:productId/accounts', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { productId } = req.params;
    const { variantName, status } = req.query;

    const query = { productId };
    if (variantName) query.variantName = variantName;
    if (status) query.status = status;

    const accounts = await Account.find(query)
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      accounts: accounts.map(acc => ({
        id: acc._id.toString(),
        _id: acc._id.toString(),
        productId: acc.productId.toString(),
        username: acc.username,
        password: acc.password,
        variantName: acc.variantName,
        status: acc.status,
        additionalInfo: acc.additionalInfo,
        createdAt: acc.createdAt
      }))
    });
  } catch (error) {
    console.error('Get accounts error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Lỗi lấy danh sách tài khoản' 
    });
  }
});

/**
 * DELETE /api/products/:productId/accounts/:accountId - Xóa tài khoản khỏi kho (admin only)
 */
router.delete('/:productId/accounts/:accountId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { accountId } = req.params;

    const account = await Account.findById(accountId);
    if (!account) {
      return res.status(404).json({ 
        success: false,
        error: 'Không tìm thấy tài khoản' 
      });
    }

    if (account.status === 'sold') {
      return res.status(400).json({ 
        success: false,
        error: 'Không thể xóa tài khoản đã bán' 
      });
    }

    await Account.findByIdAndDelete(accountId);

    res.json({
      success: true,
      message: 'Đã xóa tài khoản khỏi kho'
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Lỗi xóa tài khoản' 
    });
  }
});

module.exports = router;
