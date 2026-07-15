const express = require('express');
const router = express.Router();
const driverController = require('../controllers/driverController');
const auth = require('../middleware/auth');
const { upload } = require('../middleware/upload');

// All routes require authentication
router.use(auth);

// Register as driver
router.post(
  '/register',
  upload.fields([
    { name: 'cnicFront', maxCount: 1 },
    { name: 'cnicBack', maxCount: 1 },
    { name: 'drivingLicense', maxCount: 1 },
    { name: 'vehicleRegistration', maxCount: 1 },
    { name: 'selfie', maxCount: 1 },
    { name: 'vehiclePhotos', maxCount: 4 },
  ]),
  driverController.registerDriver
);

// Get driver profile
router.get('/profile', driverController.getDriverProfile);

// Update driver profile
router.put('/profile', driverController.updateDriverProfile);

// Toggle online/offline
router.put('/online-status', driverController.toggleOnlineStatus);

// Get ride requests
router.get('/ride-requests', driverController.getRideRequests);

// Get driver earnings
router.get('/earnings', driverController.getEarnings);

// Get driver stats
router.get('/stats', driverController.getDriverStats);

// Set destination lock
router.put('/destination-lock', driverController.setDestinationLock);

// Request fuel advance
router.post('/fuel-advance', driverController.requestFuelAdvance);

// Get wallet transactions
router.get('/wallet/transactions', driverController.getWalletTransactions);

// Withdraw earnings
router.post('/withdraw', driverController.withdrawEarnings);

// Get driver ride history
router.get('/rides/history', driverController.getRideHistory);

// Get current ride
router.get('/current-ride', driverController.getCurrentRide);

// Accept advertisement wrap
router.post('/advertisement/accept', driverController.acceptAdvertisement);

module.exports = router;