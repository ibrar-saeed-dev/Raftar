const Parcel = require('../models/Parcel');
const Driver = require('../models/Driver');
const User = require('../models/User');
const { sendNotification } = require('../services/notificationService');
const { calculateDistance } = require('../services/mapService');

/**
 * Create parcel delivery
 */
exports.createParcelDelivery = async (req, res) => {
  try {
    const passengerId = req.user.id;
    const {
      pickup,
      dropoff,
      parcelDetails,
      receiverName,
      receiverPhone,
      codAmount,
      instructions
    } = req.body;

    // Validate required fields
    if (!pickup || !dropoff || !parcelDetails) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Calculate pricing
    const distance = await calculateDistance(
      pickup.location,
      dropoff.location
    );

    const basePrice = parcelDetails.size === 'small' ? 50 : 
                     parcelDetails.size === 'medium' ? 100 : 150;
    const distancePrice = distance.distance * 20; // Rs. 20 per km
    const weightPrice = (parcelDetails.weight || 0) * 10; // Rs. 10 per kg
    const totalPrice = basePrice + distancePrice + weightPrice;

    // Generate OTP for delivery
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const parcel = new Parcel({
      passengerId,
      pickup: {
        ...pickup,
        instructions: instructions || ''
      },
      dropoff: {
        ...dropoff,
        receiverName,
        receiverPhone,
        deliveryOTP: otp
      },
      parcelDetails,
      pricing: {
        basePrice,
        distancePrice,
        weightPrice,
        total: totalPrice,
        codAmount: codAmount || 0,
        codCollected: false
      },
      status: 'pending'
    });

    await parcel.save();

    // Find nearby drivers (cargo/parcel drivers)
    const nearbyDrivers = await Driver.find({
      'availability.status': 'available',
      isOnline: true,
      status: 'approved',
      'vehicleDetails.type': { $in: ['cargo', 'bike'] },
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: pickup.location.coordinates
          },
          $maxDistance: 10000 // 10km radius
        }
      }
    }).populate('userId', 'name phoneNumber');

    // Notify drivers
    for (const driver of nearbyDrivers) {
      if (driver.userId) {
        await sendNotification(driver.userId._id, 'NEW_PARCEL_REQUEST', {
          parcelId: parcel._id,
          pickup: pickup.address,
          dropoff: dropoff.address,
          size: parcelDetails.size,
          fare: totalPrice
        });
      }
    }

    res.status(201).json({
      success: true,
      parcel,
      message: 'Parcel delivery created successfully'
    });
  } catch (error) {
    console.error('Create parcel error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get parcel details
 */
exports.getParcelDetails = async (req, res) => {
  try {
    const { parcelId } = req.params;
    const userId = req.user.id;

    const parcel = await Parcel.findById(parcelId)
      .populate('passengerId', 'name phoneNumber profilePhoto')
      .populate('driverId', 'userId vehicleDetails stats')
      .populate('driverId.userId', 'name phoneNumber profilePhoto');

    if (!parcel) {
      return res.status(404).json({ error: 'Parcel not found' });
    }

    // Check authorization
    if (parcel.passengerId._id.toString() !== userId && 
        parcel.driverId?.userId?._id.toString() !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json({
      success: true,
      parcel
    });
  } catch (error) {
    console.error('Get parcel details error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Accept parcel delivery (driver)
 */
exports.acceptParcel = async (req, res) => {
  try {
    const { parcelId } = req.params;
    const driverId = req.user.id;

    const parcel = await Parcel.findById(parcelId);
    if (!parcel) {
      return res.status(404).json({ error: 'Parcel not found' });
    }

    if (parcel.status !== 'pending') {
      return res.status(400).json({ error: 'Parcel is no longer available' });
    }

    const driver = await Driver.findOne({ userId: driverId })
      .populate('userId', 'name phoneNumber rating');
    
    if (!driver || driver.availability.status !== 'available') {
      return res.status(400).json({ error: 'Driver not available' });
    }

    parcel.driverId = driver._id;
    parcel.status = 'accepted';
    await parcel.save();

    // Update driver
    driver.currentParcel = parcel._id;
    driver.availability.status = 'busy';
    await driver.save();

    // Notify passenger
    await sendNotification(parcel.passengerId, 'PARCEL_ACCEPTED', {
      parcelId: parcel._id,
      driver: {
        name: driver.userId.name,
        rating: driver.stats?.rating || 0
      }
    });

    res.json({
      success: true,
      parcel,
      message: 'Parcel accepted successfully'
    });
  } catch (error) {
    console.error('Accept parcel error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Pickup parcel
 */
exports.pickupParcel = async (req, res) => {
  try {
    const { parcelId } = req.params;
    const driverId = req.user.id;

    const parcel = await Parcel.findById(parcelId);
    if (!parcel) {
      return res.status(404).json({ error: 'Parcel not found' });
    }

    if (parcel.status !== 'accepted') {
      return res.status(400).json({ error: 'Parcel not ready for pickup' });
    }

    // Verify driver is assigned
    const driver = await Driver.findOne({ userId: driverId });
    if (!driver || parcel.driverId.toString() !== driver._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    parcel.status = 'picked_up';
    parcel.tracking.pickupTime = new Date();
    await parcel.save();

    // Notify passenger
    await sendNotification(parcel.passengerId, 'PARCEL_PICKED_UP', {
      parcelId: parcel._id
    });

    res.json({
      success: true,
      parcel,
      message: 'Parcel picked up successfully'
    });
  } catch (error) {
    console.error('Pickup parcel error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Deliver parcel
 */
exports.deliverParcel = async (req, res) => {
  try {
    const { parcelId } = req.params;
    const { otp } = req.body;
    const driverId = req.user.id;

    const parcel = await Parcel.findById(parcelId);
    if (!parcel) {
      return res.status(404).json({ error: 'Parcel not found' });
    }

    if (parcel.status !== 'picked_up') {
      return res.status(400).json({ error: 'Parcel not in transit' });
    }

    // Verify driver is assigned
    const driver = await Driver.findOne({ userId: driverId });
    if (!driver || parcel.driverId.toString() !== driver._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Verify OTP
    if (parcel.dropoff.deliveryOTP !== otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    parcel.status = 'delivered';
    parcel.tracking.deliveryTime = new Date();
    await parcel.save();

    // Update driver
    if (driver) {
      driver.currentParcel = null;
      driver.availability.status = 'available';
      driver.stats.totalRides = (driver.stats.totalRides || 0) + 1;
      driver.stats.totalEarnings = (driver.stats.totalEarnings || 0) + parcel.pricing.total;
      await driver.save();
    }

    // Handle COD
    if (parcel.pricing.codAmount > 0) {
      parcel.pricing.codCollected = true;
      await parcel.save();
    }

    // Notify passenger
    await sendNotification(parcel.passengerId, 'PARCEL_DELIVERED', {
      parcelId: parcel._id,
      codAmount: parcel.pricing.codAmount
    });

    res.json({
      success: true,
      parcel,
      message: 'Parcel delivered successfully'
    });
  } catch (error) {
    console.error('Deliver parcel error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Verify delivery OTP
 */
exports.verifyDeliveryOTP = async (req, res) => {
  try {
    const { parcelId } = req.params;
    const { otp } = req.body;

    if (!otp) {
      return res.status(400).json({ error: 'OTP is required' });
    }

    const parcel = await Parcel.findById(parcelId);
    if (!parcel) {
      return res.status(404).json({ error: 'Parcel not found' });
    }

    const isValid = parcel.dropoff.deliveryOTP === otp;
    
    res.json({
      success: true,
      isValid,
      message: isValid ? 'OTP is valid' : 'Invalid OTP'
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Update parcel status
 */
exports.updateParcelStatus = async (req, res) => {
  try {
    const { parcelId } = req.params;
    const { status } = req.body;
    const userId = req.user.id;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const parcel = await Parcel.findById(parcelId);
    if (!parcel) {
      return res.status(404).json({ error: 'Parcel not found' });
    }

    // Check authorization
    const driver = await Driver.findOne({ userId });
    if (parcel.passengerId.toString() !== userId && 
        (!driver || parcel.driverId.toString() !== driver._id.toString())) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const validStatuses = ['pending', 'accepted', 'picked_up', 'in_transit', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Prevent invalid status transitions
    const statusFlow = {
      pending: ['accepted', 'cancelled'],
      accepted: ['picked_up', 'cancelled'],
      picked_up: ['in_transit', 'cancelled'],
      in_transit: ['delivered', 'cancelled'],
      delivered: [],
      cancelled: []
    };

    if (!statusFlow[parcel.status]?.includes(status)) {
      return res.status(400).json({ error: 'Invalid status transition' });
    }

    parcel.status = status;
    if (status === 'delivered') {
      parcel.tracking.deliveryTime = new Date();
    }
    await parcel.save();

    // Notify passenger
    await sendNotification(parcel.passengerId, 'PARCEL_STATUS_UPDATED', {
      parcelId: parcel._id,
      status: status
    });

    res.json({
      success: true,
      parcel,
      message: 'Parcel status updated successfully'
    });
  } catch (error) {
    console.error('Update parcel status error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get parcel history
 */
exports.getParcelHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, status } = req.query;

    const query = {
      $or: [
        { passengerId: userId },
        { driverId: userId }
      ]
    };

    if (status) query.status = status;

    const parcels = await Parcel.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('passengerId', 'name phoneNumber')
      .populate('driverId', 'userId vehicleDetails')
      .populate('driverId.userId', 'name phoneNumber');

    const total = await Parcel.countDocuments(query);

    res.json({
      success: true,
      parcels,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get parcel history error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Cancel parcel
 */
exports.cancelParcel = async (req, res) => {
  try {
    const { parcelId } = req.params;
    const userId = req.user.id;

    const parcel = await Parcel.findById(parcelId);
    if (!parcel) {
      return res.status(404).json({ error: 'Parcel not found' });
    }

    // Check authorization
    if (parcel.passengerId.toString() !== userId) {
      const driver = await Driver.findOne({ userId });
      if (!driver || parcel.driverId.toString() !== driver._id.toString()) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
    }

    if (parcel.status === 'delivered') {
      return res.status(400).json({ error: 'Cannot cancel a delivered parcel' });
    }

    parcel.status = 'cancelled';
    await parcel.save();

    // Update driver if assigned
    if (parcel.driverId) {
      const driver = await Driver.findById(parcel.driverId);
      if (driver) {
        driver.currentParcel = null;
        driver.availability.status = 'available';
        await driver.save();
      }
    }

    // Notify involved parties
    await sendNotification(parcel.passengerId, 'PARCEL_CANCELLED', {
      parcelId: parcel._id
    });

    if (parcel.driverId) {
      await sendNotification(parcel.driverId, 'PARCEL_CANCELLED', {
        parcelId: parcel._id
      });
    }

    res.json({
      success: true,
      parcel,
      message: 'Parcel cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel parcel error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Collect COD
 */
exports.collectCOD = async (req, res) => {
  try {
    const { parcelId } = req.params;
    const driverId = req.user.id;

    const parcel = await Parcel.findById(parcelId);
    if (!parcel) {
      return res.status(404).json({ error: 'Parcel not found' });
    }

    // Verify driver is assigned
    const driver = await Driver.findOne({ userId: driverId });
    if (!driver || parcel.driverId.toString() !== driver._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (parcel.status !== 'delivered') {
      return res.status(400).json({ error: 'Parcel must be delivered to collect COD' });
    }

    if (parcel.pricing.codAmount <= 0) {
      return res.status(400).json({ error: 'No COD amount to collect' });
    }

    if (parcel.pricing.codCollected) {
      return res.status(400).json({ error: 'COD already collected' });
    }

    parcel.pricing.codCollected = true;
    await parcel.save();

    // Add COD amount to driver earnings
    if (driver) {
      driver.stats.totalEarnings = (driver.stats.totalEarnings || 0) + parcel.pricing.codAmount;
      await driver.save();
    }

    // Notify passenger
    await sendNotification(parcel.passengerId, 'COD_COLLECTED', {
      parcelId: parcel._id,
      codAmount: parcel.pricing.codAmount
    });

    res.json({
      success: true,
      parcel,
      message: 'COD collected successfully'
    });
  } catch (error) {
    console.error('Collect COD error:', error);
    res.status(500).json({ error: error.message });
  }
};