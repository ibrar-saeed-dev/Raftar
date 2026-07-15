const crypto = require('crypto');
const CallSession = require('../models/CallSession');
const Ride = require('../models/Ride');
const Driver = require('../models/Driver');

/**
 * Generate short-lived TURN credentials scoped to the user
 */
exports.getTurnCredentials = async (req, res) => {
  try {
    const userId = req.user.id;
    const { rideId } = req.body;

    if (!rideId) {
      return res.status(400).json({ error: 'rideId is required' });
    }

    // Verify user is part of the active ride
    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    let isAuthorized = false;
    if (ride.passengerId.toString() === userId) {
      isAuthorized = true;
    } else if (ride.driverId) {
      const driver = await Driver.findOne({ userId });
      if (driver && ride.driverId.toString() === driver._id.toString()) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ error: 'Unauthorized to request TURN credentials for this ride' });
    }

    // Generate TURN credentials
    const TURN_SECRET = process.env.TURN_SECRET || 'raftar_turn_secret_default';
    const unixTimeStamp = parseInt(Date.now() / 1000) + 24 * 3600; // 24 hours validity
    const username = [unixTimeStamp, userId].join(':');

    const hmac = crypto.createHmac('sha1', TURN_SECRET);
    hmac.setEncoding('base64');
    hmac.write(username);
    hmac.end();
    const credential = hmac.read();

    const turnServer = process.env.TURN_SERVER_URL || 'turn:localhost:3478';

    res.json({
      success: true,
      iceServers: [
        {
          urls: 'stun:stun.l.google.com:19302'
        },
        {
          urls: turnServer,
          username: username,
          credential: credential
        }
      ]
    });
  } catch (error) {
    console.error('Error generating TURN credentials:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Log call status transitions
 */
exports.logCallTransition = async (req, res) => {
  try {
    const { callId, status, endReason, telemetry } = req.body;
    
    if (!callId) {
      return res.status(400).json({ error: 'callId is required' });
    }

    const callSession = await CallSession.findById(callId);
    if (!callSession) {
      return res.status(404).json({ error: 'Call session not found' });
    }

    // Verify user is participant
    const userId = req.user.id;
    if (callSession.callerId.toString() !== userId && callSession.calleeId.toString() !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (status) {
      callSession.status = status;
      if (status === 'in_progress' && !callSession.connectedAt) {
        callSession.connectedAt = new Date();
      } else if (['completed', 'missed', 'declined', 'failed'].includes(status) && !callSession.endedAt) {
        callSession.endedAt = new Date();
        if (callSession.connectedAt) {
          callSession.durationSeconds = Math.round((callSession.endedAt - callSession.connectedAt) / 1000);
        }
      }
    }

    if (endReason) {
      callSession.endReason = endReason;
    }

    if (telemetry) {
      callSession.telemetry = {
        ...callSession.telemetry,
        ...telemetry
      };
    }

    await callSession.save();

    res.json({ success: true, callSession });
  } catch (error) {
    console.error('Error logging call transition:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get call history for a ride
 */
exports.getRideCallHistory = async (req, res) => {
  try {
    const { rideId } = req.params;
    
    // In a real app, verify admin role or ride participant
    const calls = await CallSession.find({ rideId }).sort({ createdAt: -1 });
    
    res.json({ success: true, calls });
  } catch (error) {
    console.error('Error fetching call history:', error);
    res.status(500).json({ error: error.message });
  }
};
