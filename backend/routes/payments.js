const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const paymentController = require('../controllers/paymentController');

// Modern automated verification endpoint
router.post('/verify', protect, paymentController.verifyPayment);

module.exports = router;
