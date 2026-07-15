const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rideId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ride'
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'PKR'
  },
  type: {
    type: String,
    enum: ['ride', 'booking', 'wallet_add', 'wallet_withdraw', 'refund', 'commission', 'subscription', 'fuel_advance', 'withdrawal'],
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'stripe', 'easypaisa', 'jazzcash', 'raast', 'wallet', 'bank_transfer'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'],
    default: 'pending'
  },
  transactionId: {
    type: String,
    unique: true,
    sparse: true
  },
  providerReference: {
    type: String
  },
  bankAccount: {
    accountNumber: String,
    bankName: String,
    accountHolder: String,
    iban: String
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  error: {
    message: String,
    code: String
  },
  completedAt: {
    type: Date
  },
  refundedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes
paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ transactionId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ type: 1 });
paymentSchema.index({ 'metadata.planId': 1 });

module.exports = mongoose.model('Payment', paymentSchema);