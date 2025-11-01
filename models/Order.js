const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productName: String,
  variantName: String,
  price: Number,
  quantity: {
    type: Number,
    default: 1
  }
});

const orderSchema = new mongoose.Schema({
  orderCode: {
    type: String,
    required: true,
    unique: true
  },
  customerName: {
    type: String,
    required: true
  },
  customerEmail: {
    type: String,
    required: true
  },
  customerPhone: {
    type: String,
    default: ''
  },
  items: [orderItemSchema],
  totalAmount: {
    type: Number,
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded', 'cancelled'],
    default: 'pending'
  },
  deliveryStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'cancelled'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    default: 'bank_transfer'
  },
  bankTransactionId: String,
  qrCodeUrl: String,
  deliveredAccounts: [{
    productId: mongoose.Schema.Types.ObjectId,
    variantName: String,
    username: String,
    password: String,
    deliveredAt: Date
  }],
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  paidAt: Date,
  deliveredAt: Date,
  cancelledAt: Date,
  cancellationReason: String
});

module.exports = mongoose.model('Order', orderSchema);


