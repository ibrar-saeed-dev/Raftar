const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const auth = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// Create carpool booking (Driver)
router.post('/carpool', bookingController.createCarpoolBooking);

// Create monthly pass
router.post('/monthly-pass', bookingController.createMonthlyPass);

// Get available carpools (Passenger)
router.get('/carpool/available', bookingController.getAvailableCarpools);

// Post a carpool request (Passenger)
router.post('/carpool/request', bookingController.createCarpoolRequest);

// Cancel a carpool request (Passenger)
router.delete('/carpool/request/:carpoolId', bookingController.cancelCarpoolRequest);

// Cancel a carpool (Driver)
router.delete('/carpool/:carpoolId', bookingController.cancelCarpool);

// Accept a carpool request (Driver)
router.post('/carpool/request/:carpoolId/accept', bookingController.acceptCarpoolRequest);

// Get driver's created carpools (Driver)
router.get('/driver-carpools', bookingController.getDriverCarpools);

// Request to join carpool (Passenger)
router.post('/carpool/:carpoolId/join', bookingController.joinCarpool);

// Accept join request (Driver)
router.post('/carpool/:carpoolId/accept/:passengerId', bookingController.acceptJoinRequest);

// Reject join request (Driver)
router.post('/carpool/:carpoolId/reject/:passengerId', bookingController.rejectJoinRequest);

// Pickup passenger (Driver)
router.post('/carpool/:carpoolId/pickup/:passengerId', bookingController.pickupPassenger);

// Dropoff passenger (Driver)
router.post('/carpool/:carpoolId/dropoff/:passengerId', bookingController.dropoffPassenger);

// Start carpool (Driver)
router.post('/carpool/:carpoolId/start', bookingController.startCarpool);

// Complete carpool (Driver)
router.post('/carpool/:carpoolId/complete', bookingController.completeCarpool);

// Leave carpool (Passenger)
router.post('/carpool/:carpoolId/leave', bookingController.leaveCarpool);

// Get monthly pass details
router.get('/monthly-pass/:passId', bookingController.getMonthlyPass);

// Renew monthly pass
router.put('/monthly-pass/:passId/renew', bookingController.renewMonthlyPass);

// Pink pool booking
router.post('/pink-pool', bookingController.createPinkPoolBooking);

// Family vault booking
router.post('/family-vault', bookingController.createFamilyVaultBooking);

// Get family vault trips
router.get('/family-vault/children', bookingController.getFamilyVaultTrips);

// Get passenger's own carpool requests
router.get('/passenger-carpools', bookingController.getPassengerCarpools);

// Get available passenger carpool requests (for Drivers)
router.get('/carpool/requests', bookingController.getAvailableCarpoolRequests);

// Track family vault child
router.get('/family-vault/:childId/track', bookingController.trackChild);

module.exports = router;