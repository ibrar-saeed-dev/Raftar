const crypto = require('crypto');
const jwt = require('jsonwebtoken');

exports.generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRY || '7d'
  });
};

exports.generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

exports.generateUUID = () => {
  return crypto.randomUUID();
};

exports.hashPassword = async (password) => {
  const bcrypt = require('bcryptjs');
  return await bcrypt.hash(password, 10);
};

exports.comparePassword = async (password, hash) => {
  const bcrypt = require('bcryptjs');
  return await bcrypt.compare(password, hash);
};

exports.calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const deg2rad = (deg) => {
  return deg * (Math.PI/180);
};

exports.calculateFare = (distance, vehicleType, surgeMultiplier = 1) => {
  const baseFares = {
    bike: 50,
    rickshaw: 80,
    car: 120
  };
  
  const perKmRates = {
    bike: 15,
    rickshaw: 25,
    car: 35
  };
  
  const baseFare = baseFares[vehicleType] || 50;
  const perKmRate = perKmRates[vehicleType] || 20;
  
  let fare = baseFare + (distance * perKmRate);
  fare *= surgeMultiplier;
  
  return Math.round(fare);
};

exports.isValidPhoneNumber = (phone) => {
  const regex = /^(\+92|0)?[3][0-9]{9}$/;
  return regex.test(phone);
};

exports.isValidEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

exports.isValidCNIC = (cnic) => {
  const regex = /^[0-9]{5}-[0-9]{7}-[0-9]{1}$/;
  return regex.test(cnic);
};

exports.formatCurrency = (amount, currency = 'PKR') => {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: currency
  }).format(amount);
};

exports.formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

exports.getRandomInt = (min, max) => {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

exports.sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

exports.retry = async (fn, retries = 3, delay = 1000) => {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    await exports.sleep(delay);
    return exports.retry(fn, retries - 1, delay * 2);
  }
};

exports.groupBy = (array, key) => {
  return array.reduce((result, item) => {
    const groupKey = item[key];
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {});
};

exports.pagination = (page, limit, total) => {
  const totalPages = Math.ceil(total / limit);
  return {
    page: parseInt(page),
    limit: parseInt(limit),
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1
  };
};