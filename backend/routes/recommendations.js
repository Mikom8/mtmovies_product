const express = require('express');
const router = express.Router();
const Movie = require('../models/Movie');
const Series = require('../models/Series');
const mongoose = require('mongoose');

// Minimal projection — only what the mobile app needs to render a recommendation card
const CARD_FIELDS = '_id title poster backdrop rating year genres tags';

/**
 * GET /api/recommendations
 *
 * Query params:
 *   tags     — comma-separated list of tags from the current item
 *   genres   — comma-separated list of genres from the current item
 *   excludeId — the _id of the current item (to exclude it from results)
 *   limit    — how many results to return (default 9, max 20)
 *
 * Strategy (server-side, no client scoring):
 *   1. Run parallel queries on Movie + Series collections
 *   2. Filter by tags.$in OR genres.$in — MongoDB uses indexes, no full scan
 *   3. Sort by createdAt DESC so newest matching content surfaces first
 *   4. Pick `limit * 2` candidates from each collection, merge, re-score,
 *      then slice to `limit` — keeps payload tiny while getting best matches
 */
router.get('/', async (req, res) => {
  try {
    const tags = (req.query.tags || '').split(',').map(t => t.trim()).filter(Boolean);
    const genres = (req.query.genres || '').split(',').map(g => g.trim()).filter(Boolean);
    const excludeId = req.query.excludeId;
    const limit = Math.min(parseInt(req.query.limit) || 9, 20);

    // Need at least one signal to match on
    if (!tags.length && !genres.length) {
      return res.json({ recommendations: [] });
    }

    // Build the $or filter — MongoDB will use the index on tags/genres
    const orClauses = [];
    if (tags.length) orClauses.push({ tags: { $in: tags } });
    if (genres.length) orClauses.push({ genres: { $in: genres } });

    const idFilter = excludeId && mongoose.Types.ObjectId.isValid(excludeId)
      ? { _id: { $ne: new mongoose.Types.ObjectId(excludeId) } }
      : {};

    const dbFilter = { ...idFilter, $or: orClauses };

    // Fetch candidates from both collections in parallel
    // We over-fetch (limit * 3) so the merge+re-score can pick the best ones
    const candidateCount = limit * 3;

    const [movies, series] = await Promise.all([
      Movie.find(dbFilter)
        .select(CARD_FIELDS)
        .sort({ createdAt: -1 })
        .limit(candidateCount)
        .lean(),
      Series.find(dbFilter)
        .select(CARD_FIELDS)
        .sort({ createdAt: -1 })
        .limit(candidateCount)
        .lean()
    ]);

    // Tag sets for scoring
    const tagSet = new Set(tags);
    const genreSet = new Set(genres);

    const score = (item) => {
      let s = 0;
      (item.tags || []).forEach(t => { if (tagSet.has(t)) s += 4; });
      (item.genres || []).forEach(g => { if (genreSet.has(g)) s += 8; });
      return s;
    };

    // Merge, attach type, sort by score desc
    const all = [
      ...movies.map(m => ({ ...m, type: 'movie' })),
      ...series.map(s => ({ ...s, type: 'series' }))
    ];

    all.sort((a, b) => score(b) - score(a));

    const recommendations = all.slice(0, limit);

    res.json({ recommendations });
  } catch (err) {
    console.error('[Recommendations] Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch recommendations.', message: err.message });
  }
});

module.exports = router;
