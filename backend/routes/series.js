const express = require('express');
const router = express.Router();
const Series = require('../models/Series');
const { protect, requirePlan } = require('../middleware/auth');

// ── GET /api/series — get all series (with filtering) ──
router.get('/', async (req, res) => {
  try {
    const { genre, search, featured, newRelease, page = 1, limit = 50 } = req.query;

    const filter = {};
    if (genre) filter.genres = genre;
    if (featured === 'true') filter.isFeatured = true;
    if (newRelease === 'true') {
      filter.$or = [
        { isNew: true },
        { isNewSeason: true },
        { isNewEpisode: true }
      ];
    }
    if (search) filter.$text = { $search: search };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [series, total] = await Promise.all([
      Series.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Series.countDocuments(filter)
    ]);

    res.json({
      series,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch series.', message: err.message });
  }
});

// ── GET /api/series/featured — featured series for hero section ──
router.get('/featured', async (req, res) => {
  try {
    const series = await Series.find({ isFeatured: true })
      .limit(5);
    res.json({ series });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch featured series.' });
  }
});

// ── GET /api/series/:id — get single series details ──
router.get('/:id', async (req, res) => {
  try {
    const series = await Series.findById(req.params.id);
    if (!series) return res.status(404).json({ error: 'Series not found.' });
    res.json({ series });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch series.' });
  }
});

// ── POST /api/series — add a series (admin use, no auth for now) ──
router.post('/', async (req, res) => {
  try {
    const series = await Series.create(req.body);
    res.status(201).json({ message: 'Series added!', series });
  } catch (err) {
    res.status(400).json({ error: 'Failed to add series.', message: err.message });
  }
});

// ── PUT /api/series/:id — update a series (admin use) ──
router.put('/:id', async (req, res) => {
  try {
    const series = await Series.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!series) return res.status(404).json({ error: 'Series not found.' });
    res.json({ message: 'Series updated successfully!', series });
  } catch (err) {
    res.status(400).json({ error: 'Failed to update series.', message: err.message });
  }
});

// ── DELETE /api/series/:id — delete a series (admin use) ──
router.delete('/:id', async (req, res) => {
  try {
    const series = await Series.findByIdAndDelete(req.params.id);
    if (!series) return res.status(404).json({ error: 'Series not found.' });
    res.json({ message: 'Series deleted successfully!' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete series.', message: err.message });
  }
});

module.exports = router;
