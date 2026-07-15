const express = require('express');
const router = express.Router();
const historyController = require('../controllers/historyController');
const auth = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// Get passenger history
router.get('/passenger', historyController.getPassengerHistory);

// Get passenger spending summary
router.get('/passenger/spending', historyController.getPassengerSpending);

// Get driver history
router.get('/driver', historyController.getDriverHistory);

module.exports = router;
