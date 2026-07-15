/**
 * Global error handler middleware
 * Handles all errors and sends appropriate responses
 */
const errorHandler = (err, req, res, next) => {
  // Log error for debugging
  console.error('Error:', err);

  // Default error response
  let statusCode = err.statusCode || 500;
  let errorMessage = err.message || 'Internal Server Error';
  let errorDetails = null;

  // Handle specific error types
  if (err.name === 'ValidationError') {
    // Mongoose validation error
    statusCode = 400;
    errorMessage = 'Validation Error';
    errorDetails = Object.values(err.errors).map(e => e.message);
  } else if (err.name === 'CastError') {
    // Mongoose cast error (invalid ID)
    statusCode = 400;
    errorMessage = 'Invalid ID format';
    errorDetails = `Invalid ${err.path}: ${err.value}`;
  } else if (err.code === 11000) {
    // Mongoose duplicate key error
    statusCode = 409;
    errorMessage = 'Duplicate Entry';
    const field = Object.keys(err.keyPattern)[0];
    errorDetails = `${field} already exists`;
  } else if (err.name === 'JsonWebTokenError') {
    // JWT error
    statusCode = 401;
    errorMessage = 'Invalid Token';
    errorDetails = 'Authentication token is invalid';
  } else if (err.name === 'TokenExpiredError') {
    // JWT expired
    statusCode = 401;
    errorMessage = 'Token Expired';
    errorDetails = 'Authentication token has expired';
  } else if (err.name === 'MulterError') {
    // Multer file upload error
    statusCode = 400;
    errorMessage = 'File Upload Error';
    if (err.code === 'LIMIT_FILE_SIZE') {
      errorDetails = 'File size is too large';
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      errorDetails = 'Too many files uploaded';
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      errorDetails = 'Unexpected file field';
    } else {
      errorDetails = err.message;
    }
  } else if (err.name === 'StripeError') {
    // Stripe payment error
    statusCode = 400;
    errorMessage = 'Payment Error';
    errorDetails = err.message;
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: errorMessage,
    message: errorDetails || err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    timestamp: new Date().toISOString()
  });
};

module.exports = errorHandler;