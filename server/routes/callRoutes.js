const express = require('express');
const router = express.Router();
const callController = require('../controllers/callController');
const auth = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// Request TURN credentials
router.post('/turn-credentials', callController.getTurnCredentials);

// Log call status transition
router.post('/log', callController.logCallTransition);

// Get call history for a ride
router.get('/history/:rideId', callController.getRideCallHistory);

module.exports = router;
