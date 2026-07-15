const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

let io = null;

const initializeSocket = (server) => {
  io = socketIO(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      
      if (!user || !user.isActive) {
        return next(new Error('User not found or inactive'));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Join user room
    socket.join(`user-${socket.user._id}`);

    // Handle ride joining
    socket.on('join-ride', (rideId) => {
      socket.join(`ride-${rideId}`);
      console.log(`User ${socket.user._id} joined ride ${rideId}`);
    });

    // Handle driver location updates
    socket.on('driver-location', (data) => {
      const { rideId, location } = data;
      io.to(`ride-${rideId}`).emit('driver-location', {
        driverId: socket.user._id,
        location
      });
    });

    // Handle chat messages
    socket.on('chat-message', (data) => {
      const { rideId, message } = data;
      io.to(`ride-${rideId}`).emit('chat-message', {
        userId: socket.user._id,
        message,
        timestamp: new Date()
      });
    });

    // Handle SOS alerts
    socket.on('sos-alert', (data) => {
      const { rideId, location } = data;
      io.to(`ride-${rideId}`).emit('sos-triggered', {
        userId: socket.user._id,
        location
      });
      
      // Notify admins
      io.to('admin').emit('sos-alert', {
        userId: socket.user._id,
        rideId,
        location
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

const emitToUser = (userId, event, data) => {
  if (!io) return;
  io.to(`user-${userId}`).emit(event, data);
};

const emitToRide = (rideId, event, data) => {
  if (!io) return;
  io.to(`ride-${rideId}`).emit(event, data);
};

module.exports = {
  initializeSocket,
  getIO,
  emitToUser,
  emitToRide
};