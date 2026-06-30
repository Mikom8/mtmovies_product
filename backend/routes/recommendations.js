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
 *   tags      — comma-separated tags from the current item
 *   genres    — comma-separated genres from the current item
 *   year      — release year of the current item
 *   excludeId — _id of current item (excluded from results)
 *   limit     — how many results (default 9, max 20)
 *
 * Scoring priority: genre > tag > year
 *   genre match  → +10 per shared genre
 *   tag match    → +5  per shared tag
 *   year         → +3 if within 3 years, +1 if within 7 years
 *
 * Cross-type results (movies + series) are always mixed:
 *   We fetch up to `candidateCount` from each collection independently,
 *   score all, then interleave to guarantee both types appear if available.
 */

function scoreItem(item, tagSet, genreSet, targetYear) {
  let s = 0;

  // 1. Genre overlap — highest priority (10 pts each)
  (item.genres || []).forEach(g => { if (genreSet.has(g)) s += 10; });

  // 2. Tag overlap — second priority (5 pts each)
  (item.tags || []).forEach(t => { if (tagSet.has(t)) s += 5; });

  // 3. Year proximity — lowest priority
  if (targetYear) {
    const itemYear = parseInt(item.year) || 0;
    const diff = Math.abs(targetYear - itemYear);
    if (diff <= 3) s += 3;
    else if (diff <= 7) s += 1;
  }

  return s;
}

router.get('/', async (req, res) => {
  try {
    const tags    = (req.query.tags    || '').split(',').map(t => t.trim()).filter(Boolean);
    const genres  = (req.query.genres  || '').split(',').map(g => g.trim()).filter(Boolean);
    const targetYear = parseInt(req.query.year) || 0;
    const excludeId  = req.query.excludeId;
    const limit      = Math.min(parseInt(req.query.limit) || 9, 20);

    // Need at least one signal to match on
    if (!tags.length && !genres.length) {
      return res.json({ recommendations: [] });
    }

    // Build the $or filter — MongoDB uses indexes on tags/genres
    const orClauses = [];
    if (genres.length) orClauses.push({ genres: { $in: genres } });
    if (tags.length)   orClauses.push({ tags:   { $in: tags   } });

    const idFilter = excludeId && mongoose.Types.ObjectId.isValid(excludeId)
      ? { _id: { $ne: new mongoose.Types.ObjectId(excludeId) } }
      : {};

    const dbFilter = { ...idFilter, $or: orClauses };

    // Over-fetch candidates from BOTH collections in parallel.
    // Large candidate pool ensures cross-type results aren't crowded out.
    const candidateCount = limit * 8;

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

    const tagSet   = new Set(tags);
    const genreSet = new Set(genres);

    // Score and sort each type independently
    const scoredMovies = movies
      .map(m => ({ item: { ...m, type: 'movie' },   score: scoreItem(m, tagSet, genreSet, targetYear) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score);

    const scoredSeries = series
      .map(s => ({ item: { ...s, type: 'series' },  score: scoreItem(s, tagSet, genreSet, targetYear) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score);

    // Interleave movies and series to guarantee cross-type diversity.
    // Strategy: merge both sorted arrays by score, but ensure at least
    // min(3, available) slots go to the minority type.
    const combined = [];
    let mi = 0, si = 0;

    while (combined.length < limit) {
      const hasMovie  = mi < scoredMovies.length;
      const hasSeries = si < scoredSeries.length;

      if (!hasMovie && !hasSeries) break;

      if (!hasSeries) {
        combined.push(scoredMovies[mi++].item);
      } else if (!hasMovie) {
        combined.push(scoredSeries[si++].item);
      } else {
        // Pick whichever has higher score; tie-break: alternate types
        if (scoredMovies[mi].score >= scoredSeries[si].score) {
          combined.push(scoredMovies[mi++].item);
        } else {
          combined.push(scoredSeries[si++].item);
        }
      }
    }

    res.json({ recommendations: combined });
  } catch (err) {
    console.error('[Recommendations] Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch recommendations.', message: err.message });
  }
});

module.exports = router;
