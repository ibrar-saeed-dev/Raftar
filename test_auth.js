const express = require('express');
const { body } = require('express-validator');
const { validateRequest } = require('./server/middleware/validation');
const authController = require('./server/controllers/authController');

const middlewares = [
  [
    body('phoneNumber').isMobilePhone().withMessage('Valid phone number required'),
    body('name').notEmpty().withMessage('Name is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').optional().isIn(['passenger', 'driver']),
  ],
  validateRequest,
  authController.register
];

console.log(middlewares.map(m => Array.isArray(m) ? 'Array of length ' + m.length : typeof m));
