const { body } = require('express-validator');
const { validateRequest } = require('./server/middleware/validation');
const authController = require('./server/controllers/authController');

console.log('body is', typeof body);
console.log('validateRequest is', typeof validateRequest);
console.log('authController.register is', typeof authController.register);
