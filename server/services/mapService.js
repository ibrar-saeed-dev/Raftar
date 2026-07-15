const axios = require('axios');

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

exports.getDistance = async (origin, destination) => {
  try {
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/distancematrix/json`,
      {
        params: {
          origins: `${origin.coordinates[1]},${origin.coordinates[0]}`,
          destinations: `${destination.coordinates[1]},${destination.coordinates[0]}`,
          key: GOOGLE_MAPS_API_KEY
        }
      }
    );

    const data = response.data;
    if (data.rows[0]?.elements[0]?.status === 'OK') {
      return {
        distance: data.rows[0].elements[0].distance.value / 1000, // in km
        duration: data.rows[0].elements[0].duration.value / 60, // in minutes
        distanceText: data.rows[0].elements[0].distance.text,
        durationText: data.rows[0].elements[0].duration.text
      };
    }
    throw new Error('Could not calculate distance');
  } catch (error) {
    console.error('Distance calculation error:', error);
    // Return approximate distance for fallback
    return {
      distance: 5, // 5km fallback
      duration: 15, // 15 minutes fallback
      distanceText: '5 km',
      durationText: '15 mins'
    };
  }
};

exports.getGeocode = async (address) => {
  try {
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json`,
      {
        params: {
          address,
          key: GOOGLE_MAPS_API_KEY
        }
      }
    );

    if (response.data.status === 'OK' && response.data.results.length > 0) {
      const location = response.data.results[0].geometry.location;
      return {
        coordinates: [location.lng, location.lat],
        address: response.data.results[0].formatted_address,
        placeId: response.data.results[0].place_id
      };
    }
    throw new Error('Geocoding failed');
  } catch (error) {
    console.error('Geocode error:', error);
    throw error;
  }
};

exports.findNearbyDrivers = async (location, vehicleType) => {
  try {
    const Driver = require('../models/Driver');
    
    const drivers = await Driver.find({
      'availability.status': 'available',
      isOnline: true,
      status: 'approved',
      'vehicleDetails.type': vehicleType || { $exists: true },
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: location.coordinates
          },
          $maxDistance: 10000 // 10km radius
        }
      }
    })
    .populate('userId', 'name phoneNumber rating')
    .limit(20);

    return drivers;
  } catch (error) {
    console.error('Find nearby drivers error:', error);
    return [];
  }
};

exports.calculateRoute = async (origin, destination, waypoints = []) => {
  try {
    const params = {
      origin: `${origin.coordinates[1]},${origin.coordinates[0]}`,
      destination: `${destination.coordinates[1]},${destination.coordinates[0]}`,
      key: GOOGLE_MAPS_API_KEY
    };

    if (waypoints.length > 0) {
      params.waypoints = waypoints.map(w => 
        `${w.coordinates[1]},${w.coordinates[0]}`
      ).join('|');
    }

    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/directions/json`,
      { params }
    );

    if (response.data.status === 'OK') {
      const route = response.data.routes[0];
      const leg = route.legs[0];
      
      return {
        distance: leg.distance.value / 1000,
        duration: leg.duration.value / 60,
        polyline: route.overview_polyline.points,
        steps: leg.steps.map(step => ({
          instruction: step.html_instructions,
          distance: step.distance.text,
          duration: step.duration.text,
          location: {
            lat: step.start_location.lat,
            lng: step.start_location.lng
          }
        }))
      };
    }
    throw new Error('Route calculation failed');
  } catch (error) {
    console.error('Route calculation error:', error);
    return {
      distance: 10,
      duration: 20,
      polyline: '',
      steps: []
    };
  }
};

exports.findMatchingRoutes = async (pickup, dropoff, timeWindow) => {
  try {
    const Booking = require('../models/Booking');
    
    // Find carpool bookings that match
    const matching = await Booking.find({
      type: 'carpool',
      status: 'searching',
      'carpool.seatsAvailable': { $gt: 0 },
      'pickup.location': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: pickup.coordinates
          },
          $maxDistance: 5000
        }
      }
    });

    // Filter by route similarity
    const filtered = matching.filter(booking => {
      const pickupDist = this.calculateDistance(
        pickup.coordinates,
        booking.pickup.location.coordinates
      );
      const dropoffDist = this.calculateDistance(
        dropoff.coordinates,
        booking.dropoff.location.coordinates
      );
      
      return pickupDist < 3000 && dropoffDist < 3000; // Within 3km
    });

    return filtered;
  } catch (error) {
    console.error('Find matching routes error:', error);
    return [];
  }
};

exports.calculateDistance = (coord1, coord2) => {
  // Haversine formula
  const R = 6371; // Earth's radius in km
  const dLat = this.toRad(coord2[1] - coord1[1]);
  const dLon = this.toRad(coord2[0] - coord1[0]);
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(this.toRad(coord1[1])) * Math.cos(this.toRad(coord2[1])) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

exports.toRad = (value) => {
  return value * Math.PI / 180;
};