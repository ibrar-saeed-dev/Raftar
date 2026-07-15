const { calculateDistance } = require('./mapService');

/**
 * Calculate AI-based fare for a ride
 * @param {Object} pickup - Pickup location
 * @param {Object} dropoff - Dropoff location
 * @param {string} vehicleType - Type of vehicle
 * @param {Object} options - Additional options
 * @returns {Object} - Fare details
 */
exports.calculateAIFare = async (pickup, dropoff, vehicleType, options = {}) => {
  try {
    // Calculate distance
    const distanceResult = await calculateDistance(pickup, dropoff);
    const distance = distanceResult.distance || 0;
    const duration = distanceResult.duration || 0;

    // Base fare per vehicle type
    const baseFares = {
      bike: 50,
      rickshaw: 80,
      car: 120,
      cargo: 150
    };

    // Per km rates
    const perKmRates = {
      bike: 15,
      rickshaw: 25,
      car: 35,
      cargo: 40
    };

    // Per minute rates (for traffic)
    const perMinuteRates = {
      bike: 2,
      rickshaw: 3,
      car: 4,
      cargo: 5
    };

    const baseFare = baseFares[vehicleType] || 50;
    const perKmRate = perKmRates[vehicleType] || 20;
    const perMinuteRate = perMinuteRates[vehicleType] || 3;

    // Calculate base fare
    let fare = baseFare + (distance * perKmRate) + (duration * perMinuteRate);

    // Apply surge pricing if applicable
    if (options.surgeMultiplier) {
      fare *= options.surgeMultiplier;
    }

    // Apply time-based pricing
    const hour = new Date().getHours();
    if (hour >= 22 || hour <= 5) {
      // Night time surcharge (10% extra)
      fare *= 1.1;
    } else if (hour >= 7 && hour <= 9) {
      // Morning rush hour (15% extra)
      fare *= 1.15;
    } else if (hour >= 17 && hour <= 19) {
      // Evening rush hour (15% extra)
      fare *= 1.15;
    }

    // Apply minimum fare
    const minFare = process.env.MIN_RIDE_FARE || 50;
    if (fare < minFare) {
      fare = minFare;
    }

    // Apply maximum fare
    const maxFare = process.env.MAX_RIDE_FARE || 10000;
    if (fare > maxFare) {
      fare = maxFare;
    }

    // Round to nearest 5
    fare = Math.ceil(fare / 5) * 5;

    return {
      baseFare,
      distanceFare: distance * perKmRate,
      timeFare: duration * perMinuteRate,
      surgeMultiplier: options.surgeMultiplier || 1,
      total: fare,
      distance,
      duration,
      vehicleType,
      currency: 'PKR'
    };
  } catch (error) {
    console.error('AI Fare calculation error:', error);
    // Return default fare if calculation fails
    return {
      baseFare: 50,
      distanceFare: 0,
      timeFare: 0,
      surgeMultiplier: 1,
      total: 100,
      distance: 0,
      duration: 0,
      vehicleType,
      currency: 'PKR'
    };
  }
};

/**
 * Calculate fare for carpool rides
 * @param {number} totalFare - Total fare for the ride
 * @param {number} totalSeats - Total seats available
 * @param {number} bookedSeats - Number of seats booked
 * @returns {Object} - Per seat fare
 */
exports.calculateCarpoolFare = (totalFare, totalSeats, bookedSeats) => {
  const seats = Math.max(totalSeats, 1);
  const booked = Math.min(bookedSeats, seats);
  
  // Discount for carpool (20% off compared to solo)
  const discount = 0.8;
  const perSeatFare = (totalFare * discount) / seats;
  
  return {
    totalFare,
    perSeatFare: Math.ceil(perSeatFare / 5) * 5,
    totalSeats: seats,
    bookedSeats: booked,
    availableSeats: seats - booked,
    discountApplied: discount,
    savings: totalFare - (perSeatFare * booked)
  };
};

/**
 * Calculate fare for parcel delivery
 * @param {Object} pickup - Pickup location
 * @param {Object} dropoff - Dropoff location
 * @param {string} size - Parcel size (small, medium, large)
 * @param {number} weight - Parcel weight in kg
 * @returns {Object} - Fare details
 */
exports.calculateParcelFare = async (pickup, dropoff, size, weight) => {
  try {
    const distanceResult = await calculateDistance(pickup, dropoff);
    const distance = distanceResult.distance || 0;

    // Base prices by size
    const sizePrices = {
      small: 50,
      medium: 100,
      large: 150
    };

    // Per km rates
    const perKmRates = {
      small: 10,
      medium: 15,
      large: 20
    };

    const basePrice = sizePrices[size] || 100;
    const perKmRate = perKmRates[size] || 15;
    const weightCharge = (weight || 0) * 10; // Rs. 10 per kg

    let total = basePrice + (distance * perKmRate) + weightCharge;

    // Minimum fare
    if (total < 50) total = 50;

    return {
      basePrice,
      distanceFare: distance * perKmRate,
      weightCharge,
      total: Math.ceil(total / 5) * 5,
      distance,
      size,
      weight: weight || 0,
      currency: 'PKR'
    };
  } catch (error) {
    console.error('Parcel fare calculation error:', error);
    return {
      basePrice: 100,
      distanceFare: 0,
      weightCharge: 0,
      total: 150,
      distance: 0,
      size,
      weight: weight || 0,
      currency: 'PKR'
    };
  }
};

/**
 * Calculate surge pricing multiplier based on demand
 * @param {Object} location - Current location
 * @param {string} vehicleType - Type of vehicle
 * @returns {number} - Surge multiplier
 */
exports.calculateSurgeMultiplier = async (location, vehicleType) => {
  try {
    // In production, this would check real-time demand
    // For now, return a default multiplier based on time and day
    
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay(); // 0 = Sunday, 6 = Saturday
    
    let multiplier = 1.0;
    
    // Weekend surge
    if (day === 5 || day === 6) {
      multiplier = 1.2;
    }
    
    // Peak hours
    if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
      multiplier = 1.3;
    }
    
    // Late night
    if (hour >= 22 || hour <= 5) {
      multiplier = 1.4;
    }
    
    // Special events or weather conditions would be added here
    
    return Math.min(multiplier, 3.0); // Cap at 3x
  } catch (error) {
    console.error('Surge calculation error:', error);
    return 1.0;
  }
};

/**
 * Calculate commission for platform
 * @param {number} fare - Total fare
 * @param {string} rideType - Type of ride (solo, carpool, parcel)
 * @returns {Object} - Commission details
 */
exports.calculateCommission = (fare, rideType) => {
  const commissionRates = {
    solo: 0.15, // 15%
    carpool: 0.05, // 5%
    parcel: 0.10, // 10%
    corporate: 0.08 // 8%
  };

  const rate = commissionRates[rideType] || 0.15;
  const commission = fare * rate;
  const driverEarning = fare - commission;

  return {
    fare,
    commissionRate: rate,
    commission: Math.round(commission),
    driverEarning: Math.round(driverEarning),
    currency: 'PKR'
  };
};

/**
 * Calculate discount for monthly pass
 * @param {number} dailyFare - Daily fare amount
 * @param {number} days - Number of days
 * @param {number} discount - Discount percentage
 * @returns {Object} - Monthly pass pricing
 */
exports.calculateMonthlyPass = (dailyFare, days = 22, discount = 20) => {
  const totalDaily = dailyFare * days;
  const discountAmount = (totalDaily * discount) / 100;
  const total = totalDaily - discountAmount;

  return {
    dailyFare,
    days,
    discount: discount,
    discountAmount: Math.round(discountAmount),
    total: Math.round(total),
    perDaySavings: Math.round(discountAmount / days),
    currency: 'PKR'
  };
};