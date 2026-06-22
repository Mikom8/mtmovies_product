const express = require('express');
const router = express.Router();
const Movie = require('../models/Movie');
const { protect, requirePlan } = require('../middleware/auth');

// ── GET /api/movies — get all movies (with filtering) ──
router.get('/', async (req, res) => {
  try {
    const { genre, type, search, featured, newRelease, page = 1, limit = 50 } = req.query;

    const filter = {};
    if (genre) filter.genres = genre;
    if (type) filter.type = type;
    if (featured === 'true') filter.isFeatured = true;
    if (newRelease === 'true') filter.isNew = true;
    if (search) filter.$text = { $search: search };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [movies, total] = await Promise.all([
      Movie.find(filter)
        .select('-telegram') // Hide telegram details from list for size optimization (they are in details anyway)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Movie.countDocuments(filter)
    ]);

    res.json({
      movies,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch movies.', message: err.message });
  }
});

// ── GET /api/movies/featured — featured movies for hero section ──
router.get('/featured', async (req, res) => {
  try {
    const movies = await Movie.find({ isFeatured: true })
      .select('-telegram')
      .limit(5);
    res.json({ movies });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch featured movies.' });
  }
});

// ── GET /api/movies/:id — get single movie details ──
router.get('/:id', async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) return res.status(404).json({ error: 'Movie not found.' });
    res.json({ movie });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch movie.' });
  }
});

// ── GET /api/movies/:id/stream — get streaming URL (requires login + plan) ──
router.get('/:id/stream', protect, async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) return res.status(404).json({ error: 'Movie not found.' });

    // Check plan access
    const planLevels = { free: 0, basic: 1, popular: 2, family: 3 };
    const userLevel = planLevels[req.user.plan] || 0;
    const requiredLevel = movie.isFree ? 0 : 1;

    if (userLevel < requiredLevel) {
      return res.status(403).json({
        error: 'Upgrade your plan to watch this title.',
        requiredPlan: 'basic'
      });
    }

    // Increment view count
    await Movie.findByIdAndUpdate(req.params.id, { $inc: { 'stats.views': 1 } });

    res.json({ telegram: movie.telegram, title: movie.title });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get stream.' });
  }
});

// ── POST /api/movies — add a movie (admin use, no auth for now) ──
router.post('/', async (req, res) => {
  try {
    const movie = await Movie.create(req.body);
    res.status(201).json({ message: 'Movie added!', movie });
  } catch (err) {
    res.status(400).json({ error: 'Failed to add movie.', message: err.message });
  }
});

// ── PUT /api/movies/:id — update a movie (admin use) ──
router.put('/:id', async (req, res) => {
  try {
    const movie = await Movie.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!movie) return res.status(404).json({ error: 'Movie not found.' });
    res.json({ message: 'Movie updated successfully!', movie });
  } catch (err) {
    res.status(400).json({ error: 'Failed to update movie.', message: err.message });
  }
});

// ── DELETE /api/movies/:id — delete a movie (admin use) ──
router.delete('/:id', async (req, res) => {
  try {
    const movie = await Movie.findByIdAndDelete(req.params.id);
    if (!movie) return res.status(404).json({ error: 'Movie not found.' });
    res.json({ message: 'Movie deleted successfully!' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete movie.', message: err.message });
  }
});

module.exports = router;
