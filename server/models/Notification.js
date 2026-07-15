const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: [
      'ride_request',
      'ride_accepted',
      'ride_started',
      'ride_completed',
      'ride_cancelled',
      'payment_received',
      'driver_approved',
      'driver_rejected',
      'promotional',
      'sos_alert',
      'system'
    ],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  body: {
    type: String,
    required: true
  },
  data: {
    type: Map,
    of: String
  },
  read: {
    type: Boolean,
    default: false
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  sentAt: {
    type: Date,
    default: Date.now
  },
  deliveredAt: Date,
  readAt: Date
});

notificationSchema.index({ userId: 1, sentAt: -1 });
notificationSchema.index({ userId: 1, read: 1 });

module.exports = mongoose.model('Notification', notificationSchema);