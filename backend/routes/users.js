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
    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { ...(name && { name }), ...(avatar && { avatar }) },
      { new: true, runValidators: true }
    );
    res.json({ message: 'Profile updated!', user: updated });
  } catch (err) {
    res.status(400).json({ error: 'Update failed.', message: err.message });
  }
});

// ── GET /api/users/watchlist — get user's watchlist ──
router.get('/watchlist', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ watchlist: user.watchlist });
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

    if (idx !== -1) {
      // Already in list — remove it
      user.watchlist.splice(idx, 1);
      await user.save();
      return res.json({ message: 'Removed from watchlist.', action: 'removed', watchlist: user.watchlist });
    } else {
      // Not in list — add it
      user.watchlist.push({ itemId: String(itemId), itemType: itemType || 'movie' });
      await user.save();
      return res.json({ message: 'Added to watchlist.', action: 'added', watchlist: user.watchlist });
    }
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
        const baseId = String(movieId).split('_')[0];
        const Movie = require('../models/Movie');
        try {
          await Movie.findByIdAndUpdate(baseId, { $inc: { 'stats.views': 1 } });
        } catch (e) { /* ignore */ }
      }
    } else {
      const isOver30 = progress >= 1800;
      user.watchHistory.push({ movieId: String(movieId), progress, countedView: isOver30 });
      
      if (isOver30) {
        const baseId = String(movieId).split('_')[0];
        const Movie = require('../models/Movie');
        try {
          await Movie.findByIdAndUpdate(baseId, { $inc: { 'stats.views': 1 } });
        } catch (e) { /* ignore */ }
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

module.exports = router;
