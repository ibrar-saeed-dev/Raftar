const Ride = require('../models/Ride');
const Booking = require('../models/Booking');
const Driver = require('../models/Driver');
const Rating = require('../models/Rating');

exports.getPassengerHistory = async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch rides (solo, parcel, etc.) where user is passenger
    const rides = await Ride.find({
      passengerId: userId,
      status: { $in: ['completed', 'cancelled'] }
    })
      .populate({
        path: 'driverId',
        populate: { path: 'userId', select: 'name phoneNumber profileImage' }
      })
      .sort({ createdAt: -1 })
      .lean();

    // Fetch carpools where user is passenger or joined passenger
    const bookings = await Booking.find({
      type: 'carpool',
      status: { $in: ['completed', 'cancelled'] },
      $or: [
        { passengerId: userId },
        { 'carpool.passengers.user': userId }
      ]
    })
      .populate({
        path: 'driverId',
        populate: { path: 'userId', select: 'name phoneNumber profileImage' }
      })
      .sort({ createdAt: -1 })
      .lean();

    // Fetch ratings given by this passenger
    const ratingsGiven = await Rating.find({ ratedBy: userId }).lean();
    const ratingMap = {};
    ratingsGiven.forEach(r => {
      ratingMap[r.bookingId.toString()] = r;
    });

    // Map rides
    const formattedRides = rides.map(ride => ({
      _id: ride._id,
      tripType: ride.type === 'parcel' ? 'Parcel' : (ride.type === 'carpool' ? 'Carpool' : 'Ride'),
      date: ride.tracking?.completedAt || ride.updatedAt || ride.createdAt,
      pickup: ride.pickup,
      dropoff: ride.dropoff,
      fare: ride.fare?.final || ride.fare?.accepted || 0,
      driverName: ride.driverId?.userId?.name || 'Unknown Driver',
      driverPhone: ride.driverId?.userId?.phoneNumber || '',
      status: ride.status,
      ratingGiven: ratingMap[ride._id.toString()]?.stars || ride.ratings?.passengerRating?.rating || null
    }));

    // Map bookings
    const formattedBookings = bookings.map(booking => {
      // Find what the passenger paid (if joined)
      let passengerFare = booking.carpool?.pricePerSeat || 0;
      return {
        _id: booking._id,
        tripType: 'Carpool',
        date: booking.updatedAt || booking.createdAt,
        pickup: booking.pickup,
        dropoff: booking.dropoff,
        fare: passengerFare,
        driverName: booking.driverId?.userId?.name || 'Unknown Driver',
        driverPhone: booking.driverId?.userId?.phoneNumber || '',
        status: booking.status,
        ratingGiven: ratingMap[booking._id.toString()]?.stars || null
      };
    });

    let combined = [...formattedRides, ...formattedBookings];
    combined.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({ success: true, history: combined });
  } catch (error) {
    console.error('Error fetching passenger history:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getDriverHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const driver = await Driver.findOne({ userId });
    
    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    // Fetch rides where driver is driver
    const rides = await Ride.find({
      driverId: driver._id,
      status: { $in: ['completed', 'cancelled'] }
    })
      .populate('passengerId', 'name phoneNumber profileImage')
      .sort({ createdAt: -1 })
      .lean();

    // Fetch carpools where driver is driver
    const bookings = await Booking.find({
      type: 'carpool',
      driverId: driver._id,
      status: { $in: ['completed', 'cancelled'] }
    })
      .populate('passengerId', 'name phoneNumber profileImage')
      .populate('carpool.passengers.user', 'name phoneNumber profileImage')
      .sort({ createdAt: -1 })
      .lean();

    // Fetch ratings given by this driver
    const ratingsGiven = await Rating.find({ ratedBy: userId }).lean();
    const ratingMap = {};
    ratingsGiven.forEach(r => {
      ratingMap[r.bookingId.toString()] = r;
    });

    // Map rides
    const formattedRides = rides.map(ride => ({
      _id: ride._id,
      tripType: ride.type === 'parcel' ? 'Parcel' : (ride.type === 'carpool' ? 'Carpool' : 'Ride'),
      date: ride.tracking?.completedAt || ride.updatedAt || ride.createdAt,
      pickup: ride.pickup,
      dropoff: ride.dropoff,
      earnings: ride.fare?.final || ride.fare?.accepted || 0,
      passengerName: ride.type === 'parcel' ? (ride.parcel?.receiverName || 'Receiver') : (ride.passengerId?.name || 'Unknown Passenger'),
      status: ride.status,
      ratingGiven: ratingMap[ride._id.toString()]?.stars || ride.ratings?.driverRating?.rating || null
    }));

    // Map bookings
    const formattedBookings = bookings.map(booking => {
      let passengerName = booking.passengerId?.name || 'Multiple Passengers';
      let totalEarnings = 0;
      if (booking.carpool && booking.carpool.passengers) {
        const droppedOff = booking.carpool.passengers.filter(p => p.status === 'dropped_off');
        if (droppedOff.length > 0) {
            totalEarnings = droppedOff.length * (booking.carpool.pricePerSeat || 0);
            if (droppedOff.length === 1 && droppedOff[0].user) {
               passengerName = droppedOff[0].user.name || passengerName;
            }
        }
      }
      
      return {
        _id: booking._id,
        tripType: 'Carpool',
        date: booking.updatedAt || booking.createdAt,
        pickup: booking.pickup,
        dropoff: booking.dropoff,
        earnings: totalEarnings,
        passengerName,
        status: booking.status,
        ratingGiven: ratingMap[booking._id.toString()]?.stars || null
      };
    });

    let combined = [...formattedRides, ...formattedBookings];
    combined.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({ success: true, history: combined });
  } catch (error) {
    console.error('Error fetching driver history:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getPassengerSpending = async (req, res) => {
  try {
    const userId = req.user.id;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    const monthStart = new Date(today);
    monthStart.setDate(1);

    // Fetch rides (solo, parcel, etc.) where user is passenger
    const rides = await Ride.find({
      passengerId: userId,
      status: 'completed'
    }).lean();

    // Fetch carpools where user is passenger or joined passenger
    const bookings = await Booking.find({
      type: 'carpool',
      status: { $in: ['completed', 'dropped_off'] },
      $or: [
        { passengerId: userId },
        { 'carpool.passengers.user': userId }
      ]
    }).lean();

    const allTrips = [];

    rides.forEach(ride => {
      allTrips.push({
        date: ride.tracking?.completedAt || ride.updatedAt || ride.createdAt,
        amount: ride.fare?.final || ride.fare?.accepted || 0,
        type: ride.type === 'parcel' ? 'parcel' : 'ride'
      });
    });

    bookings.forEach(booking => {
      let passengerFare = 0;
      if (booking.carpool && booking.carpool.pricePerSeat) {
        passengerFare = booking.carpool.pricePerSeat;
      }
      allTrips.push({
        date: booking.updatedAt || booking.createdAt,
        amount: passengerFare,
        type: 'carpool'
      });
    });

    const spending = {
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
      spending.total += tripAmount;
      if (spending.breakdown[trip.type] !== undefined) {
        spending.breakdown[trip.type] += tripAmount;
      }

      // Time periods
      if (tripDate >= today) {
        spending.today += tripAmount;
        spending.rides.today += 1;
      }
      if (tripDate >= weekStart) {
        spending.weekly += tripAmount;
        spending.rides.weekly += 1;
      }
      if (tripDate >= monthStart) {
        spending.monthly += tripAmount;
        spending.rides.monthly += 1;
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
      spending,
      chartData: {
        labels: last7Days.map(d => d.label),
        data: last7Days.map(d => d.amount)
      },
      currency: 'PKR'
    });
  } catch (error) {
    console.error('Error fetching passenger spending:', error);
    res.status(500).json({ error: error.message });
  }
};
