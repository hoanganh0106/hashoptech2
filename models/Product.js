const mongoose = require('mongoose');

const productVariantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  duration_value: {
    type: Number,
    required: true,
    default: 1
  },
  duration_unit: {
    type: String,
    enum: ['day', 'month', 'year'],
    default: 'month'
  },
  stockType: {
    type: String,
    enum: ['available', 'contact'],
    default: 'available'
  }
});

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  imageUrl: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    default: 'other'
  },
  variants: [productVariantSchema],
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update updatedAt trước khi lưu
productSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Product', productSchema);


