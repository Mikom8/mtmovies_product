const mongoose = require('mongoose');

const movieSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  titleAmharic: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  descriptionAmharic: {
    type: String
  },
  poster: {
    type: String,
    required: true
  },
  backdrop: {
    type: String
  },
  videoUrl: {
    type: String  // streaming URL (e.g. Cloudinary, AWS S3)
  },
  trailerUrl: {
    type: String
  },
  genre: [{
    type: String,
    enum: ['Action', 'Drama', 'Comedy', 'Thriller', 'Romance', 'Horror', 'Sci-Fi', 'Documentary', 'Animation', 'Crime']
  }],
  type: {
    type: String,
    enum: ['movie', 'series'],
    default: 'movie'
  },
  year: {
    type: Number
  },
  duration: {
    type: Number  // in minutes for movies
  },
  rating: {
    type: Number,
    min: 0,
    max: 10,
    default: 0
  },
  language: {
    type: String,
    default: 'English'
  },
  hasAmharicDub: {
    type: Boolean,
    default: false
  },
  hasAmharicSubtitles: {
    type: Boolean,
    default: true
  },
  quality: {
    type: String,
    enum: ['720p', '1080p', '4K'],
    default: '1080p'
  },
  requiredPlan: {
    type: String,
    enum: ['free', 'basic', 'popular', 'family'],
    default: 'basic'
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  isNewRelease: {
    type: Boolean,
    default: false
  },
  views: {
    type: Number,
    default: 0
  },
  // For series only
  seasons: [{
    seasonNumber: Number,
    episodes: [{
      episodeNumber: Number,
      title: String,
      description: String,
      videoUrl: String,
      duration: Number
    }]
  }]
}, { timestamps: true });

// Index for fast searching
movieSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Movie', movieSchema);
