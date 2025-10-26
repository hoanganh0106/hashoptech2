const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  variantName: {
    type: String,
    default: ''
  },
  username: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['available', 'sold', 'reserved'],
    default: 'available'
  },
  soldToOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  soldAt: Date
});

module.exports = mongoose.model('Account', accountSchema);


