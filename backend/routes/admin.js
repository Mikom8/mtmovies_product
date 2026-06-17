const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const User = require('../models/User');

// Get all pending transactions
router.get('/payments/pending', async (req, res) => {
  try {
    const pendingTransactions = await Transaction.find({ status: 'pending' })
      .populate('userId', 'email name')
      .sort({ processedAt: -1 })
      .limit(100);

    res.json({
      success: true,
      data: pendingTransactions
    });
  } catch (error) {
    console.error('[Admin] Error fetching pending:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get all transactions (recent 100)
router.get('/payments/all', async (req, res) => {
  try {
    const transactions = await Transaction.find()
      .populate('userId', 'email name')
      .sort({ processedAt: -1 })
      .limit(100);

    res.json({
      success: true,
      data: transactions
    });
  } catch (error) {
    console.error('[Admin] Error fetching all:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Approve transaction
router.post('/payments/:transactionId/approve', async (req, res) => {
  try {
    const { transactionId } = req.params;

    const transaction = await Transaction.findOne({ transactionId });
    
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    if (transaction.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Transaction already processed' });
    }

    // Update transaction
    transaction.status = 'completed';
    transaction.payerName = 'Admin Approved';
    await transaction.save();

    // Activate user plan
    const user = await User.findById(transaction.userId);
    
    if (user) {
      user.plan = transaction.planRequested.toLowerCase();
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 30);
      user.planExpiresAt = expirationDate;
      await user.save();
    }

    console.log(`[Admin] Approved transaction: ${transactionId}`);

    res.json({
      success: true,
      message: 'Transaction approved and user plan activated'
    });

  } catch (error) {
    console.error('[Admin] Approve error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Reject transaction
router.post('/payments/:transactionId/reject', async (req, res) => {
  try {
    const { transactionId } = req.params;

    const transaction = await Transaction.findOne({ transactionId });
    
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    if (transaction.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Transaction already processed' });
    }

    transaction.status = 'rejected';
    await transaction.save();

    console.log(`[Admin] Rejected transaction: ${transactionId}`);

    res.json({
      success: true,
      message: 'Transaction rejected'
    });

  } catch (error) {
    console.error('[Admin] Reject error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
