const { body, param, validationResult } = require('express-validator');

exports.validateCreateParcel = [
  body('pickup.address').notEmpty().withMessage('Pickup address is required'),
  body('pickup.location.coordinates').isArray().withMessage('Valid pickup coordinates required'),
  body('dropoff.address').notEmpty().withMessage('Dropoff address is required'),
  body('dropoff.location.coordinates').isArray().withMessage('Valid dropoff coordinates required'),
  body('parcelDetails.size').isIn(['small', 'medium', 'large']).withMessage('Invalid parcel size'),
  body('receiverName').notEmpty().withMessage('Receiver name is required'),
  body('receiverPhone').notEmpty().withMessage('Receiver phone is required'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

exports.validateParcelId = [
  param('parcelId').isMongoId().withMessage('Invalid parcel ID'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

exports.validateDeliveryOTP = [
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];