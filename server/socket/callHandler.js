const Ride = require('../models/Ride');
const Driver = require('../models/Driver');
const CallSession = require('../models/CallSession');

/**
 * Validates if the sender and receiver are participants in the active ride
 */
const validateRideParticipants = async (rideId, senderId, receiverId) => {
  try {
    const ride = await Ride.findById(rideId);
    if (!ride || !['accepted', 'arriving', 'arrived', 'in_progress'].includes(ride.status)) {
      return { valid: false, error: 'Ride is not active' };
    }

    const passengerId = ride.passengerId.toString();
    
    // We need to resolve the driverId to the user's ID
    let driverUserId = null;
    if (ride.driverId) {
      const driver = await Driver.findById(ride.driverId);
      if (driver) {
        driverUserId = driver.userId.toString();
      }
    }

    if (!driverUserId) {
      return { valid: false, error: 'Driver not found for this ride' };
    }

    const participants = [passengerId, driverUserId];
    
    if (!participants.includes(senderId)) {
      return { valid: false, error: 'Sender is not a participant' };
    }
    
    if (receiverId && !participants.includes(receiverId)) {
      return { valid: false, error: 'Receiver is not a participant' };
    }

    return { 
      valid: true, 
      ride, 
      passengerId, 
      driverUserId,
      senderRole: senderId === passengerId ? 'passenger' : 'driver'
    };
  } catch (error) {
    console.error('Validation error:', error);
    return { valid: false, error: 'Server error' };
  }
};

module.exports = (io, socket) => {
  socket.on('call:initiate', async (data) => {
    const { rideId, callerId, calleeId } = data;
    const validation = await validateRideParticipants(rideId, callerId, calleeId);
    
    if (!validation.valid) {
      return socket.emit('call:failed', { error: validation.error });
    }

    try {
      // Create CallSession
      const callSession = new CallSession({
        rideId,
        rideType: validation.ride.type || 'standard',
        callerId,
        calleeId,
        callerRole: validation.senderRole,
        status: 'ringing'
      });
      await callSession.save();

      // Relay to the callee via the ride room (or user room if available)
      // We broadcast to the ride room, but the client will filter by calleeId
      socket.to(`ride-${rideId}`).emit('call:incoming', {
        callId: callSession._id,
        rideId,
        callerId,
        calleeId,
        callerRole: validation.senderRole,
        socketId: socket.id
      });
      
      // Send back the callId to the initiator
      socket.emit('call:initiate-success', { callId: callSession._id });
    } catch (err) {
      socket.emit('call:failed', { error: err.message });
    }
  });

  socket.on('call:offer', async (data) => {
    const { rideId, senderId, receiverId, callId, offer } = data;
    const validation = await validateRideParticipants(rideId, senderId, receiverId);
    if (!validation.valid) return;

    socket.to(`ride-${rideId}`).emit('call:offer', {
      callId,
      rideId,
      senderId,
      receiverId,
      offer,
      socketId: socket.id
    });
  });

  socket.on('call:answer', async (data) => {
    const { rideId, senderId, receiverId, callId, answer } = data;
    const validation = await validateRideParticipants(rideId, senderId, receiverId);
    if (!validation.valid) return;

    socket.to(`ride-${rideId}`).emit('call:answer', {
      callId,
      rideId,
      senderId,
      receiverId,
      answer,
      socketId: socket.id
    });
  });

  socket.on('call:ice-candidate', async (data) => {
    const { rideId, senderId, receiverId, callId, candidate } = data;
    const validation = await validateRideParticipants(rideId, senderId, receiverId);
    if (!validation.valid) return;

    socket.to(`ride-${rideId}`).emit('call:ice-candidate', {
      callId,
      rideId,
      senderId,
      receiverId,
      candidate,
      socketId: socket.id
    });
  });

  socket.on('call:accept', async (data) => {
    const { rideId, senderId, receiverId, callId } = data;
    const validation = await validateRideParticipants(rideId, senderId, receiverId);
    if (!validation.valid) return;

    // Update session
    await CallSession.findByIdAndUpdate(callId, {
      status: 'in_progress',
      connectedAt: new Date()
    });

    socket.to(`ride-${rideId}`).emit('call:accept', {
      callId,
      rideId,
      senderId,
      receiverId
    });
  });

  socket.on('call:decline', async (data) => {
    const { rideId, senderId, receiverId, callId } = data;
    const validation = await validateRideParticipants(rideId, senderId, receiverId);
    if (!validation.valid) return;

    await CallSession.findByIdAndUpdate(callId, {
      status: 'declined',
      endedAt: new Date(),
      endReason: 'declined'
    });

    socket.to(`ride-${rideId}`).emit('call:decline', {
      callId,
      rideId,
      senderId,
      receiverId
    });
  });

  socket.on('call:end', async (data) => {
    const { rideId, senderId, receiverId, callId } = data;
    const validation = await validateRideParticipants(rideId, senderId, receiverId);
    if (!validation.valid) return;

    const session = await CallSession.findById(callId);
    if (session && !session.endedAt) {
      session.status = 'completed';
      session.endedAt = new Date();
      session.endReason = 'user_ended';
      if (session.connectedAt) {
        session.durationSeconds = Math.round((session.endedAt - session.connectedAt) / 1000);
      }
      await session.save();
    }

    socket.to(`ride-${rideId}`).emit('call:end', {
      callId,
      rideId,
      senderId,
      receiverId
    });
  });

  socket.on('call:failed', async (data) => {
    const { rideId, senderId, receiverId, callId, reason } = data;
    
    // Attempt validation, but if it fails, we still want to log the failure if possible
    const validation = await validateRideParticipants(rideId, senderId, receiverId);
    if (!validation.valid) return;

    await CallSession.findByIdAndUpdate(callId, {
      status: 'failed',
      endedAt: new Date(),
      endReason: 'network_error'
    });

    socket.to(`ride-${rideId}`).emit('call:failed', {
      callId,
      rideId,
      senderId,
      receiverId,
      reason
    });
  });
};
