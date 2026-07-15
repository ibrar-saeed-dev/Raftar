export const COLORS = {
  primary: '#FFD700',
  secondary: '#4ECDC4',
  danger: '#FF6B6B',
  warning: '#FF9F43',
  success: '#00B894',
  info: '#45B7D1',
  background: '#121212',
  surface: '#1E1E1E',
  surfaceLight: '#2A2A2A',
  text: '#FFFFFF',
  textSecondary: '#888888',
  textMuted: '#666666',
  border: '#333333'
};

export const VEHICLE_TYPES = [
  { id: 'bike', label: 'Bike', icon: 'motorcycle', price: 100, capacity: 1 },
  { id: 'rickshaw', label: 'Rickshaw', icon: 'three-wheeler', price: 150, capacity: 3 },
  { id: 'car', label: 'Car', icon: 'directions-car', price: 200, capacity: 4 }
];

export const RIDE_STATUS = {
  PENDING: 'pending',
  SEARCHING: 'searching',
  ACCEPTED: 'accepted',
  STARTED: 'started',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

export const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash', icon: 'money' },
  { id: 'easypaisa', label: 'Easypaisa', icon: 'phone-android' },
  { id: 'jazzcash', label: 'JazzCash', icon: 'phone-android' },
  { id: 'raast', label: 'Raast', icon: 'account-balance' },
  { id: 'wallet', label: 'Wallet', icon: 'account-balance-wallet' }
];

export const DOCUMENT_TYPES = [
  { id: 'cnicFront', label: 'CNIC Front', required: true },
  { id: 'cnicBack', label: 'CNIC Back', required: true },
  { id: 'drivingLicense', label: 'Driving License', required: true },
  { id: 'vehicleRegistration', label: 'Vehicle Registration', required: true },
  { id: 'selfie', label: 'Selfie with CNIC', required: true }
];

export const NOTIFICATION_TYPES = {
  RIDE_REQUEST: 'ride_request',
  RIDE_ACCEPTED: 'ride_accepted',
  RIDE_STARTED: 'ride_started',
  RIDE_COMPLETED: 'ride_completed',
  RIDE_CANCELLED: 'ride_cancelled',
  PAYMENT_RECEIVED: 'payment_received',
  DRIVER_APPROVED: 'driver_approved',
  DRIVER_REJECTED: 'driver_rejected',
  PROMOTIONAL: 'promotional'
};