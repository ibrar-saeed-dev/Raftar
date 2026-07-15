module.exports = {
  RIDE_STATUS: {
    PENDING: 'pending',
    SEARCHING: 'searching',
    ACCEPTED: 'accepted',
    STARTED: 'started',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled'
  },
  
  RIDE_TYPES: {
    SOLO: 'solo',
    CARPOOL: 'carpool',
    PARCEL: 'parcel'
  },
  
  VEHICLE_TYPES: {
    BIKE: 'bike',
    RICKSHAW: 'rickshaw',
    ECONOMY: 'economy',
    PREMIUM: 'premium'
  },
  
  PAYMENT_METHODS: {
    CASH: 'cash',
    EASYPAISA: 'easypaisa',
    JAZZCASH: 'jazzcash',
    RAAST: 'raast',
    WALLET: 'wallet'
  },
  
  USER_ROLES: {
    PASSENGER: 'passenger',
    DRIVER: 'driver',
    ADMIN: 'admin',
    FLEET_OWNER: 'fleet_owner'
  },
  
  DRIVER_STATUS: {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    SUSPENDED: 'suspended',
    ACTIVE: 'active'
  },
  
  PARCEL_STATUS: {
    PENDING: 'pending',
    ACCEPTED: 'accepted',
    PICKED_UP: 'picked_up',
    IN_TRANSIT: 'in_transit',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled'
  },
  
  NOTIFICATION_TYPES: {
    RIDE_REQUEST: 'ride_request',
    RIDE_ACCEPTED: 'ride_accepted',
    RIDE_STARTED: 'ride_started',
    RIDE_COMPLETED: 'ride_completed',
    RIDE_CANCELLED: 'ride_cancelled',
    PAYMENT_RECEIVED: 'payment_received',
    DRIVER_APPROVED: 'driver_approved',
    DRIVER_REJECTED: 'driver_rejected',
    PROMOTIONAL: 'promotional',
    SOS_ALERT: 'sos_alert'
  },
  
  MAX_DISTANCE: 10, // km
  MAX_RIDE_DURATION: 120, // minutes
  MIN_RIDE_FARE: 50,
  MAX_RIDE_FARE: 10000,
  
  COMMISSION_RATES: {
    RIDE: 0.15, // 15%
    PARCEL: 0.10, // 10%
    CARPOOL: 0.05 // 5%
  },
  
  DOCUMENT_TYPES: {
    CNIC_FRONT: 'cnicFront',
    CNIC_BACK: 'cnicBack',
    DRIVING_LICENSE: 'drivingLicense',
    VEHICLE_REGISTRATION: 'vehicleRegistration',
    SELFIE: 'selfie'
  },
  
  SUPPORTED_LANGUAGES: ['en', 'ur'],
  SUPPORTED_CURRENCIES: ['PKR'],
  
  REDIS_KEYS: {
    ONLINE_DRIVERS: 'online_drivers',
    ACTIVE_RIDES: 'active_rides',
    USER_SESSIONS: 'user_sessions',
    OTP_PREFIX: 'otp:'
  }
};