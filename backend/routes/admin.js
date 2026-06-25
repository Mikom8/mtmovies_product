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

// ── GET /api/admin/stats ──
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const paidUsers  = await User.countDocuments({ plan: { $ne: 'free' } });
    const totalTransactions = await Transaction.countDocuments();

    res.json({
      success: true,
      stats: { totalUsers, paidUsers, totalTransactions }
    });
  } catch (error) {
    console.error('[Admin] Error fetching stats:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── POST /api/admin/notifications/send ──
router.post('/notifications/send', async (req, res) => {
  try {
    const { title, body, imageUrl } = req.body;
    if (!title || !body) {
      return res.status(400).json({ success: false, message: 'Title and body are required.' });
    }

    // Dynamic import required because expo-server-sdk is an ES Module
    const { Expo } = await import('expo-server-sdk');
    const expo = new Expo();

    // Find all users who have at least one push token
    // 'pushTokens.0' checks that the first element exists (array is non-empty)
    const users = await User.find({ 'pushTokens.0': { $exists: true } });

    let messages = [];
    for (let user of users) {
      for (let pushToken of user.pushTokens) {
        if (!Expo.isExpoPushToken(pushToken)) {
          console.error(`Push token ${pushToken} is not a valid Expo push token`);
          continue;
        }

        messages.push({
          to: pushToken,
          sound: 'default',
          title: title,
          body: body,
          data: { imageUrl: imageUrl || null },
        });
      }
    }

    const chunks = expo.chunkPushNotifications(messages);
    let tickets = [];
    for (let chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (err) {
        console.error('Error sending push notification chunk:', err);
      }
    }

    res.json({ success: true, message: `Notifications sent to ${messages.length} devices.` });
  } catch (error) {
    console.error('[Admin] Error sending notifications:', error);
    res.status(500).json({ success: false, message: 'Failed to send notifications.' });
  }
});

module.exports = router;
