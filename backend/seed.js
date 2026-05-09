require('dotenv').config();
const mongoose = require('mongoose');
const Movie = require('./models/Movie');
const path = require('path');
const fs = require('fs');

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');
    
    await Movie.deleteMany({});
    console.log('Cleared existing movies');

    const moviesPath = path.resolve(__dirname, '../dashboard/src/data/movies.js');
    let moviesRaw = fs.readFileSync(moviesPath, 'utf8');
    moviesRaw = moviesRaw.replace('export const MOVIES =', 'const MOVIES =') + '\nreturn MOVIES;';
    const MOVIES = new Function(moviesRaw)();

    const seriesPath = path.resolve(__dirname, '../dashboard/src/data/series.js');
    let seriesRaw = fs.readFileSync(seriesPath, 'utf8');
    seriesRaw = seriesRaw.replace('export const SERIES =', 'const SERIES =') + '\nreturn SERIES;';
    const SERIES = new Function(seriesRaw)();

    const mappedMovies = MOVIES.map(m => ({
      title: m.title,
      titleAmharic: m.titleAmharic,
      description: m.description,
      type: 'movie',
      genres: m.genre ? m.genre.split(' • ').map(g => g.trim()) : [],
      tags: [],
      year: parseInt(m.year) || 2024,
      rating: parseFloat(m.rating) || 0,
      duration: String(m.duration),
      quality: m.quality || '1080p',
      hasAmharicDub: !!m.hasAmharicDub,
      poster: m.poster,
      backdrop: m.backdrop,
      trailerEmbedId: m.trailerEmbedId || '',
      telegram: {
        chatId: String(m.telegramChatId || ''),
        messageId: String(m.telegramMessageId || '')
      },
      stats: { views: 0, likes: 0 },
      isFeatured: !!m.isFeatured,
      isNew: !!m.isNew,
      isFree: !!m.isFree
    }));
    
    const mappedSeries = SERIES.map(s => ({
      title: s.title,
      titleAmharic: s.titleAmharic,
      description: s.description,
      type: 'series',
      genres: s.genre ? s.genre.split(' • ').map(g => g.trim()) : [],
      tags: [],
      year: parseInt(String(s.year).split('-')[0]) || 2024,
      rating: parseFloat(s.rating) || 0,
      duration: '',
      quality: s.quality || '1080p',
      hasAmharicDub: !!s.hasAmharicDub,
      poster: s.poster,
      backdrop: s.backdrop,
      trailerEmbedId: s.trailerEmbedId || '',
      telegram: { chatId: '', messageId: '' },
      stats: { views: 0, likes: 0 },
      isFeatured: !!s.isFeatured,
      isNew: !!s.isNew,
      isFree: !!s.isFree,
      seasons: s.seasons
    }));

    await Movie.insertMany([...mappedMovies, ...mappedSeries]);
    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

seed();
