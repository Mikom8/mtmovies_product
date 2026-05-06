const express = require('express');
const router = express.Router();
const Movie = require('../models/Movie');
const { protect, requirePlan } = require('../middleware/auth');

// ── GET /api/movies — get all movies (with filtering) ──
router.get('/', async (req, res) => {
  try {
    const { genre, type, search, featured, newRelease, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (genre) filter.genre = genre;
    if (type) filter.type = type;
    if (featured === 'true') filter.isFeatured = true;
    if (newRelease === 'true') filter.isNewRelease = true;
    if (search) filter.$text = { $search: search };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [movies, total] = await Promise.all([
      Movie.find(filter)
        .select('-videoUrl -seasons.episodes.videoUrl') // don't expose video URLs publicly
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
      .select('-videoUrl')
      .limit(5);
    res.json({ movies });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch featured movies.' });
  }
});

// ── GET /api/movies/:id — get single movie details ──
router.get('/:id', async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id).select('-videoUrl -seasons.episodes.videoUrl');
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
    const requiredLevel = planLevels[movie.requiredPlan] || 1;

    if (userLevel < requiredLevel) {
      return res.status(403).json({
        error: 'Upgrade your plan to watch this title.',
        requiredPlan: movie.requiredPlan
      });
    }

    // Increment view count
    await Movie.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });

    res.json({ videoUrl: movie.videoUrl, title: movie.title });
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

module.exports = router;
