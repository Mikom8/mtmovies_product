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
  type: {
    type: String,
    enum: ['movie', 'series'],
    default: 'movie'
  },
  genres: [{
    type: String
  }],
  tags: [{
    type: String
  }],
  year: {
    type: Number
  },
  rating: {
    type: Number,
    min: 0,
    max: 10,
    default: 0
  },
  duration: {
    type: String
  },
  quality: {
    type: String,
    default: '1080p'
  },
  hasAmharicDub: {
    type: Boolean,
    default: false
  },
  poster: {
    type: String,
    required: true
  },
  backdrop: {
    type: String
  },
  trailerEmbedId: {
    type: String
  },
  telegram: {
    chatId: String,
    messageId: String
  },
  stats: {
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 }
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  isNew: {
    type: Boolean,
    default: false
  },
  isFree: {
    type: Boolean,
    default: false
  },
  // For series only
  seasons: [{
    seasonNumber: Number,
    episodes: [{
      episodeNumber: Number,
      title: String,
      duration: String,
      telegramChatId: String,
      telegramMessageId: String
    }]
  }]
}, { timestamps: true, suppressReservedKeysWarning: true });

// Index for fast searching
movieSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Movie', movieSchema);
