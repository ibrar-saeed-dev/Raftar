const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  documents: {
    cnicFront: String,
    cnicBack: String,
    drivingLicense: String,
    vehicleRegistration: String,
    selfie: String
  },
 vehicleDetails: {
    type: {
      type: String,
      enum: ['bike', 'rickshaw', 'car'],
      default: 'car'
    },
    model: String,
    year: Number,
    color: String,
    plateNumber: String,
    photos: [String],
    capacity: Number,
    cargoCapacity: {
      weight: Number,
      dimensions: {
        length: Number,
        width: Number,
        height: Number
      }
    }
  },
  // Add this field if not already present
  currentParcel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Parcel',
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'suspended', 'active'],
    default: 'pending'
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    }
  },
  currentRide: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ride'
  },
  stats: {
    totalRides: {
      type: Number,
      default: 0
    },
    totalEarnings: {
      type: Number,
      default: 0
    },
    rating: {
      type: Number,
      default: 0
    },
    totalRatings: {
      type: Number,
      default: 0
    }
  },
  availability: {
    status: {
      type: String,
      enum: ['available', 'busy', 'offline'],
      default: 'offline'
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  preferences: {
    destinationLock: {
      enabled: Boolean,
      homeLocation: {
        type: {
          type: String,
          enum: ['Point']
        },
        coordinates: [Number]
      }
    },
    maxDistance: Number,
    vehicleTypes: [String]
  },
  approval: {
    isApproved: {
      type: Boolean,
      default: false
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: Date,
    rejectionReason: String
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

driverSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Driver', driverSchema);