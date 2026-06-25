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

// Send Push Notifications
const { Expo } = require('expo-server-sdk');
let expo = new Expo();

router.post('/notifications/send', async (req, res) => {
  try {
    const { title, body, imageUrl } = req.body;
    if (!title || !body) {
      return res.status(400).json({ success: false, message: 'Title and body are required.' });
    }

    // Find all users who have at least one push token
    const users = await User.find({ pushTokens: { $exists: true, $not: { $size: 0 } } });
    
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

    let chunks = expo.chunkPushNotifications(messages);
    let tickets = [];
    for (let chunk of chunks) {
      try {
        let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('Error sending push notification chunk:', error);
      }
    }

    res.json({ success: true, message: `Notifications sent to ${messages.length} devices.` });
  } catch (error) {
    console.error('[Admin] Error sending notifications:', error);
    res.status(500).json({ success: false, message: 'Failed to send notifications.' });
  }
});

module.exports = router;
