const Driver = require('../models/Driver');
const User = require('../models/User');
const Ride = require('../models/Ride');
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const { sendNotification } = require('../services/notificationService');
const { calculateDistance } = require('../services/mapService');

exports.registerDriver = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      vehicleDetails,
      preferences,
      availability
    } = req.body;

    // Check if user already registered as driver
    const existingDriver = await Driver.findOne({ userId });
    if (existingDriver) {
      return res.status(400).json({ error: 'User already registered as driver' });
    }

    // Handle file uploads
    const files = req.files;
    const documents = {
      cnicFront: files?.cnicFront?.[0]?.path || '',
      cnicBack: files?.cnicBack?.[0]?.path || '',
      drivingLicense: files?.drivingLicense?.[0]?.path || '',
      vehicleRegistration: files?.vehicleRegistration?.[0]?.path || '',
      selfie: files?.selfie?.[0]?.path || ''
    };

    // Create driver profile
    const driver = new Driver({
      userId,
      documents,
      vehicleDetails: JSON.parse(vehicleDetails),
      preferences: preferences || {},
      availability: availability || { status: 'offline' },
      status: 'pending'
    });

    await driver.save();

    // Update user role
    await User.findByIdAndUpdate(userId, { role: 'driver' });

    // Notify admin
    await sendNotification('admin', 'NEW_DRIVER_REGISTRATION', {
      driverId: driver._id,
      userId: userId
    });

    res.status(201).json({
      success: true,
      driver,
      message: 'Driver registration submitted for verification'
    });
  } catch (error) {
    console.error('Register driver error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getDriverProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const driver = await Driver.findOne({ userId })
      .populate('userId', 'name phoneNumber email profilePhoto');

    if (!driver) {
      return res.status(404).json({ error: 'Driver profile not found' });
    }

    res.json({
      success: true,
      driver
    });
  } catch (error) {
    console.error('Get driver profile error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.updateDriverProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const updates = req.body;

    const driver = await Driver.findOne({ userId });
    if (!driver) {
      return res.status(404).json({ error: 'Driver profile not found' });
    }

    // Update allowed fields
    const allowedUpdates = ['vehicleDetails', 'preferences', 'availability'];
    for (const key of allowedUpdates) {
      if (updates[key]) {
        driver[key] = { ...driver[key], ...updates[key] };
      }
    }

    await driver.save();

    res.json({
      success: true,
      driver,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Update driver profile error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.toggleOnlineStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { isOnline } = req.body;

    const driver = await Driver.findOne({ userId });
    if (!driver) {
      return res.status(404).json({ error: 'Driver profile not found' });
    }

    if (driver.status !== 'approved') {
      return res.status(403).json({ error: 'Driver not approved yet' });
    }

    driver.isOnline = isOnline;
    driver.availability.status = isOnline ? 'available' : 'offline';
    driver.availability.lastUpdated = new Date();
    await driver.save();

    // Update location in Redis for real-time tracking
    if (isOnline) {
      // Add to Redis online drivers set
    }

    res.json({
      success: true,
      isOnline: driver.isOnline,
      message: `Driver is now ${isOnline ? 'online' : 'offline'}`
    });
  } catch (error) {
    console.error('Toggle online status error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getRideRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const driver = await Driver.findOne({ userId });
    
    if (!driver || !driver.isOnline) {
      return res.status(400).json({ error: 'Driver is offline' });
    }

    if (!driver.vehicleDetails?.type) {
      console.warn(`[RideRequests] Driver ${driver._id} has no vehicleType set!`);
    }

    const { type } = req.query;
    
    let statusFilter = 'searching';
    let typeFilter = { $ne: 'intercity' };
    
    if (type === 'intercity') {
      statusFilter = 'scheduled';
      typeFilter = 'intercity';
    }

    // Get nearby ride requests
    const rides = await Ride.find({
      status: statusFilter,
      type: typeFilter,
      'pickup.location': {
        $near: {
          $geometry: driver.location,
          $maxDistance: 10000 // 10km radius
        }
      },
      vehicleType: driver.vehicleDetails?.type
    }).populate('passengerId', 'name phoneNumber rating stats');

    console.log(`[RideRequests] Query returned ${rides.length} rides for driver ${driver._id}`);

    res.json({
      success: true,
      rides
    });
  } catch (error) {
    console.error('Get ride requests error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getEarnings = async (req, res) => {
  try {
    const userId = req.user.id;
    const driver = await Driver.findOne({ userId });
    
    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    const monthStart = new Date(today);
    monthStart.setDate(1);

    // Fetch all completed rides & parcels
    const rides = await Ride.find({
      driverId: driver._id,
      status: 'completed'
    });

    // Fetch all completed carpools
    const bookings = await Booking.find({
      type: 'carpool',
      driverId: driver._id,
      status: 'completed'
    });

    // Combine them into a simple array of { date, amount, type }
    const allTrips = [];
    
    rides.forEach(ride => {
      allTrips.push({
        date: ride.tracking?.completedAt || ride.updatedAt || ride.createdAt,
        amount: ride.fare?.final || ride.fare?.accepted || 0,
        type: ride.type === 'parcel' ? 'parcel' : 'ride'
      });
    });

    bookings.forEach(booking => {
      let totalEarnings = 0;
      if (booking.carpool && booking.carpool.passengers) {
        const droppedOff = booking.carpool.passengers.filter(p => p.status === 'dropped_off');
        totalEarnings = droppedOff.length * (booking.carpool.pricePerSeat || 0);
      }
      allTrips.push({
        date: booking.updatedAt || booking.createdAt,
        amount: totalEarnings,
        type: 'carpool'
      });
    });

    const earnings = {
      today: 0,
      weekly: 0,
      monthly: 0,
      total: 0,
      rides: {
        today: 0,
        weekly: 0,
        monthly: 0,
        total: allTrips.length
      },
      breakdown: {
        ride: 0,
        parcel: 0,
        carpool: 0
      }
    };

    // Calculate chart data (last 7 days)
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      last7Days.push({
        dateStr: d.toISOString().split('T')[0],
        label: d.toLocaleDateString('en-US', { weekday: 'short' }),
        amount: 0
      });
    }

    allTrips.forEach(trip => {
      const tripDate = new Date(trip.date);
      const tripAmount = trip.amount || 0;

      // Totals & Breakdowns
      earnings.total += tripAmount;
      if (earnings.breakdown[trip.type] !== undefined) {
        earnings.breakdown[trip.type] += tripAmount;
      }

      // Time periods
      if (tripDate >= today) {
        earnings.today += tripAmount;
        earnings.rides.today += 1;
      }
      if (tripDate >= weekStart) {
        earnings.weekly += tripAmount;
        earnings.rides.weekly += 1;
      }
      if (tripDate >= monthStart) {
        earnings.monthly += tripAmount;
        earnings.rides.monthly += 1;
      }

      // Chart data
      const tripDateStr = tripDate.toISOString().split('T')[0];
      const chartDay = last7Days.find(d => d.dateStr === tripDateStr);
      if (chartDay) {
        chartDay.amount += tripAmount;
      }
    });

    res.json({
      success: true,
      earnings,
      chartData: {
        labels: last7Days.map(d => d.label),
        data: last7Days.map(d => d.amount)
      },
      currency: 'PKR'
    });
  } catch (error) {
    console.error('Get earnings error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getDriverStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const driver = await Driver.findOne({ userId });
    
    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    const stats = {
      profile: {
        status: driver.status,
        isOnline: driver.isOnline,
        rating: driver.stats.rating || 0,
        totalRatings: driver.stats.totalRatings || 0,
        totalRides: driver.stats.totalRides || 0,
        totalEarnings: driver.stats.totalEarnings || 0,
        vehicleType: driver.vehicleDetails?.type,
        vehicleModel: driver.vehicleDetails?.model
      },
      todayEarnings: 0,
      weeklyEarnings: 0,
      walletBalance: 0,
      completedTrips: driver.stats.totalRides || 0,
      recentActivity: []
    };

    // Get recent rides
    const recentRides = await Ride.find({
      driverId: driver._id
    })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('passengerId', 'name');

    stats.recentActivity = recentRides.map(ride => ({
      id: ride._id,
      passenger: ride.passengerId?.name || 'Unknown',
      fare: ride.fare?.final || 0,
      status: ride.status,
      time: ride.createdAt
    }));

    // Get wallet balance
    const wallet = await Payment.aggregate([
      {
        $match: {
          userId: userId,
          type: { $in: ['ride', 'wallet_add'] },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    stats.walletBalance = wallet.length > 0 ? wallet[0].total : 0;

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Get driver stats error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.setDestinationLock = async (req, res) => {
  try {
    const userId = req.user.id;
    const { enabled, homeLocation, radius } = req.body;

    const driver = await Driver.findOne({ userId });
    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    driver.preferences.destinationLock = {
      enabled: enabled || false,
      homeLocation: homeLocation || driver.preferences?.destinationLock?.homeLocation,
      radius: radius || 5000 // 5km default
    };

    await driver.save();

    res.json({
      success: true,
      destinationLock: driver.preferences.destinationLock,
      message: 'Destination lock updated'
    });
  } catch (error) {
    console.error('Set destination lock error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.requestFuelAdvance = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, reason } = req.body;

    // Check if driver has completed at least 10 rides
    const driver = await Driver.findOne({ userId });
    if (!driver || (driver.stats.totalRides || 0) < 10) {
      return res.status(400).json({ error: 'Minimum 10 rides required for fuel advance' });
    }

    // Check if last advance was more than 7 days ago
    const lastAdvance = await Payment.findOne({
      userId,
      type: 'fuel_advance',
      status: 'completed'
    })
    .sort({ createdAt: -1 });

    if (lastAdvance) {
      const daysDiff = (Date.now() - lastAdvance.createdAt) / (1000 * 60 * 60 * 24);
      if (daysDiff < 7) {
        return res.status(400).json({ error: 'Fuel advance only available once per week' });
      }
    }

    // Create fuel advance request
    const advance = new Payment({
      userId,
      amount,
      type: 'fuel_advance',
      paymentMethod: 'wallet',
      status: 'pending',
      metadata: {
        reason: reason || 'Fuel advance',
        driverId: driver._id
      }
    });

    await advance.save();

    // Notify admin
    await sendNotification('admin', 'FUEL_ADVANCE_REQUEST', {
      driverId: driver._id,
      amount,
      userId
    });

    res.json({
      success: true,
      advance,
      message: 'Fuel advance request submitted'
    });
  } catch (error) {
    console.error('Request fuel advance error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getWalletTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    const transactions = await Payment.find({ userId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Payment.countDocuments({ userId });

    res.json({
      success: true,
      transactions,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get wallet transactions error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.withdrawEarnings = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, bankAccount, bankName, accountHolder } = req.body;

    // Check balance
    const balance = await Payment.aggregate([
      {
        $match: {
          userId: userId,
          type: { $in: ['ride', 'wallet_add'] },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    const currentBalance = balance.length > 0 ? balance[0].total : 0;
    
    if (currentBalance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Create withdrawal request
    const withdrawal = new Payment({
      userId,
      amount,
      type: 'withdrawal',
      paymentMethod: 'bank_transfer',
      status: 'pending',
      metadata: {
        bankAccount,
        bankName,
        accountHolder
      }
    });

    await withdrawal.save();

    res.json({
      success: true,
      withdrawal,
      message: 'Withdrawal request submitted successfully'
    });
  } catch (error) {
    console.error('Withdraw earnings error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getRideHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    const driver = await Driver.findOne({ userId });
    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    const rides = await Ride.find({ driverId: driver._id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('passengerId', 'name phoneNumber');

    const total = await Ride.countDocuments({ driverId: driver._id });

    res.json({
      success: true,
      rides,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get ride history error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getCurrentRide = async (req, res) => {
  try {
    const userId = req.user.id;
    const driver = await Driver.findOne({ userId });
    
    if (!driver) {
      return res.json({ success: true, ride: null });
    }

    let ride = null;
    
    if (driver.currentRide) {
      ride = await Ride.findById(driver.currentRide)
        .populate('passengerId', 'name phoneNumber profilePhoto stats rating');
    } else {
      // Find a ride where this driver has a pending bid
      ride = await Ride.findOne({
        status: 'searching',
        'bids.driverId': driver._id
      }).sort({ createdAt: -1 }).populate('passengerId', 'name phoneNumber profilePhoto stats rating');
    }

    res.json({
      success: true,
      ride
    });
  } catch (error) {
    console.error('Get current ride error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.acceptAdvertisement = async (req, res) => {
  try {
    const userId = req.user.id;
    const { advertisementId, terms } = req.body;

    const driver = await Driver.findOne({ userId });
    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    // Update driver with advertisement
    driver.advertisement = {
      id: advertisementId,
      acceptedAt: new Date(),
      terms: terms || {},
      status: 'active',
      commission: 0 // Zero commission for advertisement drivers
    };

    await driver.save();

    res.json({
      success: true,
      message: 'Advertisement accepted, commission set to 0%',
      advertisement: driver.advertisement
    });
  } catch (error) {
    console.error('Accept advertisement error:', error);
    res.status(500).json({ error: error.message });
  }
};