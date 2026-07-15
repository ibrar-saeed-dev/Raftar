const mongoose = require('mongoose');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs/database.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

const connectDB = async () => {
  try {
    // REMOVED DEPRECATED OPTIONS
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 2,
    });

    logger.info(`✅ MongoDB Connected: ${conn.connection.host}`);
    logger.info(`📊 Database: ${conn.connection.name}`);
    return conn;
  } catch (error) {
    logger.error(`❌ MongoDB Connection Error: ${error.message}`);
    throw error;
  }
};

// Connection event handlers
mongoose.connection.on('connected', () => {
  logger.info('🟢 MongoDB connected successfully');
});

mongoose.connection.on('error', (err) => {
  logger.error(`🔴 MongoDB connection error: ${err.message}`);
});

mongoose.connection.on('disconnected', () => {
  logger.warn('🟡 MongoDB disconnected');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    logger.info('🟣 MongoDB connection closed through app termination');
    process.exit(0);
  } catch (err) {
    logger.error(`🔴 Error closing MongoDB connection: ${err.message}`);
    process.exit(1);
  }
});

module.exports = { connectDB, logger };