const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Movie = require('../models/Movie');
const { protect } = require('../middleware/auth');

// All user routes require login
router.use(protect);

// ── GET /api/users/profile ──
router.get('/profile', async (req, res) => {
  const user = await User.findById(req.user._id);
  res.json({ user });
});

// ── PUT /api/users/profile — update name or avatar ──
router.put('/profile', async (req, res) => {
  try {
    const { name, avatar } = req.body;
    const user = await User.findById(req.user._id);

    if (name && name !== user.name) {
      const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
      if (user.lastNameChangedAt) {
        const elapsed = Date.now() - new Date(user.lastNameChangedAt).getTime();
        if (elapsed < THIRTY_DAYS_MS) {
          const daysLeft = Math.ceil((THIRTY_DAYS_MS - elapsed) / (24 * 60 * 60 * 1000));
          return res.status(429).json({
            error: 'Name change not allowed yet.',
            daysLeft,
            message: `You can change your name again in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`
          });
        }
      }
      user.name = name;
      user.lastNameChangedAt = new Date();
    }

    if (avatar) user.avatar = avatar;

    await user.save();
    res.json({ message: 'Profile updated!', user });
  } catch (err) {
    res.status(400).json({ error: 'Update failed.', message: err.message });
  }
});

// ── PUT /api/users/password — change password ──
router.put('/password', async (req, res) => {
  try {
    const { oldPassword, newPassword, logoutOtherDevices } = req.body;

    if (!oldPassword || !newPassword)
      return res.status(400).json({ field: 'general', message: 'All fields are required.' });

    if (newPassword.length < 6)
      return res.status(400).json({ field: 'newPassword', message: 'Password must be at least 6 characters.' });

    const user = await User.findById(req.user._id).select('+password');

    if (!user.password)
      return res.status(400).json({ field: 'oldPassword', message: 'Your account uses Google sign-in. No password to change.' });

    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch)
      return res.status(401).json({ field: 'oldPassword', message: 'Current password is incorrect.' });

    if (oldPassword === newPassword)
      return res.status(400).json({ field: 'newPassword', message: 'New password must be different from current.' });

    user.password = newPassword;

    // Increment tokenVersion to invalidate all other sessions
    if (logoutOtherDevices) {
      user.tokenVersion = (user.tokenVersion || 0) + 1;
    }

    await user.save();

    // Issue a fresh token for the current device (uses new tokenVersion)
    const { generateToken } = require('../middleware/auth');
    const newToken = generateToken(user._id, user.tokenVersion);

    res.json({ message: 'Password changed successfully!', token: newToken });
  } catch (err) {
    res.status(500).json({ field: 'general', message: 'Something went wrong. Try again.' });
  }
});


const getPopulatedWatchlist = async (watchlist) => {
  const Series = require('../models/Series');
  const populated = await Promise.all(
    watchlist.map(async (item) => {
      let details = null;
      try {
        if (item.itemType === 'series') {
          details = await Series.findById(item.itemId).lean();
        } else {
          details = await Movie.findById(item.itemId).lean();
        }
      } catch (err) {
        // Ignore errors and leave details as null
      }
      return {
        _id: item._id,
        itemId: item.itemId,
        itemType: item.itemType,
        itemDetails: details
      };
    })
  );
  // Filter out any items whose details could not be found (e.g. deleted movie/series)
  return populated.filter(item => item.itemDetails !== null);
};

// ── GET /api/users/watchlist — get user's watchlist ──
router.get('/watchlist', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const populatedList = await getPopulatedWatchlist(user.watchlist);
    res.json({ watchlist: populatedList });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch watchlist.' });
  }
});

// ── POST /api/users/watchlist — toggle item in watchlist ──
router.post('/watchlist', async (req, res) => {
  try {
    const { itemId, itemType } = req.body;
    if (!itemId) return res.status(400).json({ error: 'itemId is required.' });

    const user = await User.findById(req.user._id);
    const idx = user.watchlist.findIndex(w => w.itemId === String(itemId));

    let action = '';
    if (idx !== -1) {
      // Already in list — remove it
      user.watchlist.splice(idx, 1);
      action = 'removed';
    } else {
      // Not in list — add it
      user.watchlist.push({ itemId: String(itemId), itemType: itemType || 'movie' });
      action = 'added';
    }

    await user.save();
    const populatedList = await getPopulatedWatchlist(user.watchlist);
    res.json({
      message: action === 'removed' ? 'Removed from watchlist.' : 'Added to watchlist.',
      action,
      watchlist: populatedList
    });
  } catch (err) {
    res.status(400).json({ error: 'Failed to update watchlist.' });
  }
});

// ── POST /api/users/history — save watch progress ──
router.post('/history', async (req, res) => {
  try {
    const { movieId, progress } = req.body;
    const user = await User.findById(req.user._id);

    const existing = user.watchHistory.find(h => h.movieId === String(movieId));
    if (existing) {
      existing.progress = progress;
      existing.watchedAt = new Date();

      // If watched > 30 mins (1800s) and not yet counted
      if (progress >= 1800 && !existing.countedView) {
        existing.countedView = true;
        const isSeries = String(movieId).includes('_');
        const baseId = String(movieId).split('_')[0];
        try {
          if (isSeries) {
            const Series = require('../models/Series');
            await Series.findByIdAndUpdate(baseId, { $inc: { 'stats.views': 1 } });
          } else {
            const Movie = require('../models/Movie');
            await Movie.findByIdAndUpdate(baseId, { $inc: { 'stats.views': 1 } });
          }
        } catch (e) { /* ignore */ }
      }
    } else {
      const isOver30 = progress >= 1800;
      user.watchHistory.push({ movieId: String(movieId), progress, countedView: isOver30 });

      if (isOver30) {
        const isSeries = String(movieId).includes('_');
        const baseId = String(movieId).split('_')[0];
        try {
          if (isSeries) {
            const Series = require('../models/Series');
            await Series.findByIdAndUpdate(baseId, { $inc: { 'stats.views': 1 } });
          } else {
            const Movie = require('../models/Movie');
            await Movie.findByIdAndUpdate(baseId, { $inc: { 'stats.views': 1 } });
          }
        } catch (e) { /* ignore */ }
      }
    }

    // Keep only latest 20 items
    if (user.watchHistory && user.watchHistory.length > 0) {
      user.watchHistory.sort((a, b) => new Date(b.watchedAt) - new Date(a.watchedAt));
      if (user.watchHistory.length > 20) {
        user.watchHistory.splice(20);
      }
    }

    await user.save();
    res.json({ message: 'Progress saved.' });
  } catch (err) {
    res.status(400).json({ error: 'Failed to save progress.' });
  }
});

// ── PUT /api/users/plan — upgrade subscription plan ──
router.put('/plan', async (req, res) => {
  try {
    const { plan } = req.body;
    const validPlans = ['free', 'basic', 'popular', 'family'];
    if (!validPlans.includes(plan))
      return res.status(400).json({ error: 'Invalid plan.' });

    // Set plan expiry to 30 days from now
    const planExpiresAt = new Date();
    planExpiresAt.setDate(planExpiresAt.getDate() + 30);

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { plan, planExpiresAt },
      { new: true }
    );

    res.json({ message: `Upgraded to ${plan} plan!`, user });
  } catch (err) {
    res.status(400).json({ error: 'Plan upgrade failed.' });
  }
});

// ── POST /api/users/push-token — save device push token ──
router.post('/push-token', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token is required.' });

    const user = await User.findById(req.user._id);
    
    // Add token if it doesn't already exist
    if (!user.pushTokens) {
      user.pushTokens = [];
    }
    if (!user.pushTokens.includes(token)) {
      user.pushTokens.push(token);
      await user.save();
    }

    res.json({ message: 'Token saved successfully.' });
  } catch (err) {
    res.status(400).json({ error: 'Failed to save push token.' });
  }
});

module.exports = router;
