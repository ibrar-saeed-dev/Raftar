const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  tripType: {
    type: String,
    enum: ['ride', 'solo', 'parcel', 'carpool'],
    required: true
  },
  ratedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Both passenger and driver are users
    required: true
  },
  ratedByRole: {
    type: String,
    enum: ['passenger', 'driver'],
    required: true
  },
  ratedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ratedUserRole: {
    type: String,
    enum: ['passenger', 'driver'],
    required: true
  },
  stars: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  complaint: {
    type: String,
    default: ''
  }
}, { timestamps: true });

module.exports = mongoose.model('Rating', ratingSchema);
