const express = require('express');
const router = express.Router();
const rideController = require('../controllers/rideController');
const auth = require('../middleware/auth');

// Unauthenticated routes
router.get('/shared/:token', rideController.getSharedRideDetails);
router.get('/redirect', rideController.redirectDeepLink);

// All routes below require authentication
router.use(auth);

// IMPORTANT: Specific routes must come before parameter routes
// Calculate fare (specific route)
router.post('/calculate-fare', rideController.calculateFare);

// Update driver location (specific route)
router.post('/location', rideController.updateDriverLocation);

// Get ride history (specific route)
router.get('/history', rideController.getRideHistory);

// Get active rides (specific route)
router.get('/active', rideController.getActiveRides);

// Chat routes (specific routes)
router.get('/:rideId/chat', rideController.getChatMessages);
router.post('/:rideId/chat', rideController.sendChatMessage);

// SOS alert (specific route)
router.post('/:rideId/sos', rideController.triggerSOS);

// Generate share token (specific route)
router.post('/:rideId/share', rideController.generateShareToken);

// Rate driver (specific route)
router.post('/:rideId/rate-driver', rideController.rateDriver);

// Rate passenger (specific route)
router.post('/:rideId/rate-passenger', rideController.ratePassenger);

// Accept ride (driver)
router.put('/:rideId/accept', rideController.acceptRide);

// Counter offer (driver)
router.put('/:rideId/counter-offer', rideController.counterOffer);

// Accept counter offer (passenger)
router.put('/:rideId/accept-counter', rideController.acceptCounterOffer);

// Start ride (driver)
router.put('/:rideId/start', rideController.startRide);

// Complete ride (driver)
router.put('/:rideId/complete', rideController.completeRide);

// Cancel ride
router.put('/:rideId/cancel', rideController.cancelRide);

// Create ride (should come last or use different method)
router.post('/', rideController.createRide);

// Get ride details (should be last because it catches all :rideId)
router.get('/:rideId', rideController.getRideDetails);

module.exports = router;