const express = require('express');
const router = express.Router();
const parcelController = require('../controllers/parcelController');
const auth = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// IMPORTANT: Specific routes must come before parameter routes

// Get parcel history (specific route - must come before /:parcelId)
router.get('/history', parcelController.getParcelHistory);

// Create parcel delivery (POST - no params)
router.post('/', parcelController.createParcelDelivery);

// Parcel routes with params (these should come after specific routes)
router.get('/:parcelId', parcelController.getParcelDetails);

// Accept parcel delivery (driver)
router.put('/:parcelId/accept', parcelController.acceptParcel);

// Pickup parcel
router.put('/:parcelId/pickup', parcelController.pickupParcel);

// Deliver parcel
router.put('/:parcelId/deliver', parcelController.deliverParcel);

// Verify OTP for delivery
router.post('/:parcelId/verify-otp', parcelController.verifyDeliveryOTP);

// Update parcel status
router.put('/:parcelId/status', parcelController.updateParcelStatus);

// Cancel parcel
router.put('/:parcelId/cancel', parcelController.cancelParcel);

// COD collection
router.post('/:parcelId/collect-cod', parcelController.collectCOD);

module.exports = router;