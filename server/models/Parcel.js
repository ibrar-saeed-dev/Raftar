const mongoose = require('mongoose');

const parcelSchema = new mongoose.Schema({
  passengerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver'
  },
  pickup: {
    address: String,
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: [Number]
    },
    instructions: String,
    contactPerson: String,
    contactPhone: String
  },
  dropoff: {
    address: String,
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: [Number]
    },
    instructions: String,
    receiverName: String,
    receiverPhone: String,
    deliveryOTP: String
  },
  parcelDetails: {
    size: {
      type: String,
      enum: ['small', 'medium', 'large']
    },
    weight: Number,
    description: String,
    category: {
      type: String,
      enum: ['document', 'package', 'food', 'other']
    },
    fragile: {
      type: Boolean,
      default: false
    },
    specialInstructions: String
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'picked_up', 'in_transit', 'delivered', 'cancelled'],
    default: 'pending'
  },
  pricing: {
    basePrice: Number,
    distancePrice: Number,
    weightPrice: Number,
    total: Number,
    codAmount: Number,
    codCollected: {
      type: Boolean,
      default: false
    }
  },
  tracking: {
    pickupTime: Date,
    deliveryTime: Date,
    distance: Number,
    duration: Number,
    route: {
      type: {
        type: String,
        enum: ['LineString']
      },
      coordinates: [[Number]]
    }
  },
  ratings: {
    passengerRating: {
      rating: Number,
      comment: String,
      createdAt: Date
    },
    driverRating: {
      rating: Number,
      comment: String,
      createdAt: Date
    }
  },
  chat: [{
    senderId: mongoose.Schema.Types.ObjectId,
    message: String,
    type: {
      type: String,
      enum: ['text', 'voice']
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

parcelSchema.index({ 'pickup.location': '2dsphere' });
parcelSchema.index({ 'dropoff.location': '2dsphere' });
parcelSchema.index({ status: 1 });
parcelSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Parcel', parcelSchema);