const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['carpool', 'monthly_pass', 'pink_pool', 'family_vault'],
    required: true
  },
  passengerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver'
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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
    }
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
    }
  },
  timeWindow: {
    start: Date,
    end: Date
  },
  schedule: {
    days: [String],
    time: String,
    startDate: Date,
    endDate: Date
  },
  status: {
    type: String,
    enum: ['searching', 'pending', 'confirmed', 'active', 'completed', 'cancelled', 'available', 'full', 'in-progress'],
    default: 'searching'
  },
  carpool: {
    totalSeats: Number,
    seatsAvailable: Number,
    pricePerSeat: Number,
    departureTime: Date,
    passengers: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      pickup: {
        address: String,
        location: {
          type: { type: String, enum: ['Point'], default: 'Point' },
          coordinates: [Number]
        }
      },
      dropoff: {
        address: String,
        location: {
          type: { type: String, enum: ['Point'], default: 'Point' },
          coordinates: [Number]
        }
      },
      status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected', 'picked_up', 'dropped_off'],
        default: 'pending'
      }
    }]
  },
  monthlyPass: {
    startDate: Date,
    endDate: Date,
    days: [String],
    time: String,
    assignedDriver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver'
    },
    fare: Number
  },
  pinkPool: {
    verified: Boolean,
    emergencyContacts: [{
      name: String,
      phone: String,
      relationship: String
    }],
    safetyCheck: {
      verified: Boolean,
      verifiedAt: Date
    }
  },
  familyVault: {
    childName: String,
    childPhone: String,
    childId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    emergencyContacts: [{
      name: String,
      phone: String,
      relationship: String
    }],
    tracking: {
      enabled: Boolean,
      startTime: String,
      endTime: String
    },
    cameraAccess: {
      enabled: Boolean,
      allowed: Boolean
    },
    whatsappNotifications: {
      enabled: Boolean,
      phoneNumber: String
    }
  },
  // Add these fields if not already present
  isIntercity: {
    type: Boolean,
    default: false
  },
  estimatedArrival: {
    type: Date,
    default: null
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

bookingSchema.index({ 'pickup.location': '2dsphere' });
bookingSchema.index({ 'dropoff.location': '2dsphere' });
bookingSchema.index({ status: 1, type: 1 });
bookingSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Booking', bookingSchema);