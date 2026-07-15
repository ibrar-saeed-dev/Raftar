const Rating = require('../models/Rating');
const User = require('../models/User');
const Driver = require('../models/Driver');

exports.submitRating = async (req, res) => {
  try {
    const { bookingId, tripType, ratedUser, ratedUserRole, stars, complaint } = req.body;
    const ratedBy = req.user.id;
    
    const ratedByRole = ratedUserRole === 'driver' ? 'passenger' : 'driver';

    const existingRating = await Rating.findOne({ bookingId, ratedBy });
    if (existingRating) {
      return res.status(400).json({ error: 'You have already rated this trip.' });
    }

    const rating = new Rating({
      bookingId,
      tripType,
      ratedBy,
      ratedByRole,
      ratedUser,
      ratedUserRole,
      stars,
      complaint
    });
    
    await rating.save();

    if (ratedUserRole === 'driver') {
      const driver = await Driver.findOne({ userId: ratedUser });
      if (driver) {
        const currentTotal = driver.stats?.totalRatings || 0;
        const currentAverage = driver.stats?.rating || 0;
        
        const newTotal = currentTotal + 1;
        const newAverage = ((currentAverage * currentTotal) + stars) / newTotal;
        
        if (!driver.stats) driver.stats = {};
        driver.stats.rating = Number(newAverage.toFixed(1));
        driver.stats.totalRatings = newTotal;
        
        await driver.save();
      }
    } else {
      const user = await User.findById(ratedUser);
      if (user) {
        const currentTotal = user.stats?.totalRatings || 0;
        const currentAverage = user.stats?.rating || 0;
        
        const newTotal = currentTotal + 1;
        const newAverage = ((currentAverage * currentTotal) + stars) / newTotal;
        
        if (!user.stats) user.stats = {};
        user.stats.rating = Number(newAverage.toFixed(1));
        user.stats.totalRatings = newTotal;
        
        await user.save();
      }
    }

    res.status(201).json({ success: true, rating });
  } catch (error) {
    console.error('Submit rating error:', error);
    res.status(500).json({ error: 'Failed to submit rating' });
  }
};

exports.getUserRating = async (req, res) => {
  try {
    const { userId, role } = req.query;
    
    if (role === 'driver') {
      const driver = await Driver.findOne({ userId });
      if (!driver) return res.status(404).json({ error: 'Driver not found' });
      return res.json({ 
        success: true, 
        rating: driver.stats?.rating || 0, 
        totalRatings: driver.stats?.totalRatings || 0 
      });
    } else {
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ error: 'User not found' });
      return res.json({ 
        success: true, 
        rating: user.stats?.rating || 0, 
        totalRatings: user.stats?.totalRatings || 0 
      });
    }
  } catch (error) {
    console.error('Get user rating error:', error);
    res.status(500).json({ error: 'Failed to get user rating' });
  }
};
