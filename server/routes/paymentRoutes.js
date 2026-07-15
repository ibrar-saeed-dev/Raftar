const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const auth = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// IMPORTANT: Specific routes must come before parameter routes

// Payment methods (specific routes)
router.get('/methods', paymentController.getPaymentMethods);
router.post('/methods', paymentController.addPaymentMethod);

// Wallet operations (specific routes)
router.get('/wallet/balance', paymentController.getWalletBalance);
router.post('/wallet/add', paymentController.addToWallet);
router.post('/wallet/withdraw', paymentController.withdrawFromWallet);

// Payment intent
router.post('/create-intent', paymentController.createPaymentIntent);

// Confirm payment
router.post('/confirm', paymentController.confirmPayment);

// Refund payment
router.post('/refund', paymentController.refundPayment);

// Transaction history (specific route)
router.get('/transactions', paymentController.getTransactionHistory);

// Subscription
router.post('/subscription', paymentController.createSubscription);

// Payment gateways (specific routes)
router.post('/raast/pay', paymentController.raastPayment);
router.post('/easypaisa/pay', paymentController.easypaisaPayment);
router.post('/jazzcash/pay', paymentController.jazzcashPayment);

// Delete payment method (with param)
router.delete('/methods/:methodId', paymentController.removePaymentMethod);

// Transaction details (with param - should be last)
router.get('/transactions/:transactionId', paymentController.getTransactionDetails);

module.exports = router;