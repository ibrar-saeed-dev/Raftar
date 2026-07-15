const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const auth = require('../middleware/auth');
const { isAdmin } = require('../middleware/roleCheck');

// All routes require admin authentication
router.use(auth);
router.use(isAdmin);

// ============================================
// DASHBOARD & ANALYTICS (Specific routes)
// ============================================
router.get('/dashboard', adminController.getDashboardStats);

router.get('/analytics/revenue', adminController.getRevenueAnalytics);
router.get('/analytics/users', adminController.getUserAnalytics);
router.get('/analytics/rides', adminController.getRideAnalytics);
router.get('/analytics/heatmap', adminController.getHeatmapData);

// ============================================
// SYSTEM SETTINGS
// ============================================
router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSettings);

// ============================================
// COMMISSION SETTINGS
// ============================================
router.get('/commission', adminController.getCommissionSettings);
router.put('/commission', adminController.updateCommissionSettings);

// ============================================
// REPORTS
// ============================================
router.get('/reports', adminController.getReports);
router.post('/reports/generate', adminController.generateReport);

// ============================================
// USERS MANAGEMENT
// ============================================
router.get('/users', adminController.getUsers);
router.put('/users/:userId/block', adminController.blockUser);
router.put('/users/:userId/unblock', adminController.unblockUser);
router.put('/users/:userId/verify', adminController.verifyUser);
router.delete('/users/:userId', adminController.deleteUser);
router.get('/users/:userId', adminController.getUserDetails);

// ============================================
// DRIVERS MANAGEMENT
// ============================================
router.get('/drivers', adminController.getDrivers);
router.put('/drivers/:driverId/approve', adminController.approveDriver);
router.put('/drivers/:driverId/reject', adminController.rejectDriver);
router.put('/drivers/:driverId/suspend', adminController.suspendDriver);
router.put('/drivers/:driverId/activate', adminController.activateDriver);
router.delete('/drivers/:driverId', adminController.deleteDriver);
router.get('/drivers/:driverId', adminController.getDriverDetails);

// ============================================
// TRIPS MANAGEMENT
// ============================================
router.get('/trips', adminController.getTrips);
router.put('/trips/:tripId/cancel', adminController.cancelTrip);
router.put('/trips/:tripId/refund', adminController.refundTrip);
router.get('/trips/:tripId', adminController.getTripDetails);

// ============================================
// PAYMENTS MANAGEMENT
// ============================================
router.get('/payments', adminController.getPayments);
router.put('/payments/:paymentId/refund', adminController.refundPayment);
router.get('/payments/:paymentId', adminController.getPaymentDetails);

// ============================================
// WITHDRAWALS
// ============================================
router.get('/withdrawals', adminController.getWithdrawals);
router.put('/withdrawals/:withdrawalId/approve', adminController.approveWithdrawal);
router.put('/withdrawals/:withdrawalId/reject', adminController.rejectWithdrawal);

// ============================================
// FLEET MANAGEMENT
// ============================================
router.get('/fleets', adminController.getFleets);
router.post('/fleets', adminController.createFleet);
router.put('/fleets/:fleetId', adminController.updateFleet);
router.delete('/fleets/:fleetId', adminController.deleteFleet);

module.exports = router;