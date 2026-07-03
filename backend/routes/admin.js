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

    // Find all users who have at least one push token
    const users = await User.find({ 'pushTokens.0': { $exists: true } });

    // Build the message list — validate each token manually
    const messages = [];
    for (const user of users) {
      for (const pushToken of (user.pushTokens || [])) {
        // Expo push tokens look like: ExponentPushToken[xxxxxx]
        if (typeof pushToken === 'string' && pushToken.startsWith('ExponentPushToken[')) {
          messages.push({
            to: pushToken,
            sound: 'default',
            title,
            body,
            data: { imageUrl: imageUrl || null },
          });
        }
      }
    }

    if (messages.length === 0) {
      return res.json({ success: true, message: 'No registered devices found. 0 notifications sent.' });
    }

    // Send directly to Expo Push API via HTTP — no SDK needed, avoids ESM issues
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      const errData = await response.json();
      console.error('[Admin] Expo push error:', errData);
      return res.status(500).json({ success: false, message: 'Expo push API rejected the request.' });
    }

    res.json({ success: true, message: `Notifications sent to ${messages.length} device(s).` });
  } catch (error) {
    console.error('[Admin] Error sending notifications:', error);
    res.status(500).json({ success: false, message: 'Failed to send notifications.' });
  }
});

// ── GET /api/admin/tmdb/:type/:id ──
router.get('/tmdb/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params; // type is 'movie' or 'series'
    if (!process.env.TMDB_TOKEN) {
      return res.status(500).json({ success: false, message: 'TMDB token not configured' });
    }

    const tmdbType = type === 'movie' ? 'movie' : 'tv';
    const response = await fetch(`https://api.themoviedb.org/3/${tmdbType}/${id}?append_to_response=credits`, {
      headers: {
        'Authorization': `Bearer ${process.env.TMDB_TOKEN}`,
        'accept': 'application/json'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ success: false, message: 'Failed to fetch from TMDB' });
    }

    const data = await response.json();

    // Parse cast
    const cast = (data.credits?.cast || [])
      .slice(0, 10) // Top 10 actors
      .map(c => ({
        name: c.name,
        image: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : ''
      }));

    // Parse genres
    const genres = (data.genres || []).map(g => g.name).join(', ');

    // Parse duration
    let duration = '';
    if (type === 'movie' && data.runtime) {
      const hours = Math.floor(data.runtime / 60);
      const minutes = data.runtime % 60;
      duration = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    } else if (type === 'series' && data.episode_run_time && data.episode_run_time.length > 0) {
      duration = `${data.episode_run_time[0]}m`;
    }

    // Parse year
    let year = '';
    const dateStr = type === 'movie' ? data.release_date : data.first_air_date;
    if (dateStr) year = dateStr.split('-')[0];

    const result = {
      title: data.title || data.name || '',
      description: data.overview || '',
      genres: genres,
      cast: cast,
      year: year,
      duration: duration,
      poster: data.poster_path ? `https://image.tmdb.org/t/p/original${data.poster_path}` : '',
      backdrop: data.backdrop_path ? `https://image.tmdb.org/t/p/original${data.backdrop_path}` : '',
    };

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[Admin] TMDB error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching TMDB' });
  }
});

module.exports = router;
