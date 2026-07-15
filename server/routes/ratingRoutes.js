const express = require('express');
const router = express.Router();
const ratingController = require('../controllers/ratingController');
const protect = require('../middleware/auth');

router.post('/submit', protect, ratingController.submitRating);
router.get('/user-rating', protect, ratingController.getUserRating);

module.exports = router;
