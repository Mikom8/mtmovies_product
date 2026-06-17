const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const paymentController = require('../controllers/paymentController');

// Submit payment for manual verification
router.post('/submit', protect, paymentController.submitPayment);

module.exports = router;
