const mongoose = require('mongoose');

const seriesSchema = new mongoose.Schema({
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
  genres: [{
    type: String
  }],
  tags: [{
    type: String
  }],
  year: {
    type: String
  },
  rating: {
    type: Number,
    min: 0,
    max: 10,
    default: 0
  },
  quality: {
    type: String,
    default: '1080p'
  },
  duration: {
    type: String
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
seriesSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Series', seriesSchema);
