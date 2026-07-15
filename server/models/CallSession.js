const mongoose = require('mongoose');

const callSessionSchema = new mongoose.Schema({
  rideId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  rideType: {
    type: String,
    enum: ['standard', 'premium', 'carpool', 'parcel'],
    required: true
  },
  callerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  calleeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  callerRole: {
    type: String,
    enum: ['driver', 'passenger'],
    required: true
  },
  status: {
    type: String,
    enum: ['ringing', 'in_progress', 'completed', 'missed', 'declined', 'failed'],
    default: 'ringing'
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  connectedAt: {
    type: Date
  },
  endedAt: {
    type: Date
  },
  durationSeconds: {
    type: Number,
    default: 0
  },
  endReason: {
    type: String,
    enum: ['user_ended', 'timeout', 'network_error', 'ride_ended', 'declined', 'missed', null],
    default: null
  },
  telemetry: {
    setupTimeMs: Number,
    iceCandidateType: String,
    dropped: Boolean
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('CallSession', callSessionSchema);
