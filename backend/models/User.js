const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: 2,
    maxlength: 50
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Invalid email format']
  },
  password: {
    type: String,
    minlength: 6,
    select: false // never return password in queries
  },
  googleId: {
    type: String,
    default: null
  },
  avatar: {
    type: String,
    default: 'https://res.cloudinary.com/dyop5rdpn/image/upload/v1692821899/MT%20Movies/profile_skqfj2.png'
  },
  plan: {
    type: String,
    enum: ['free', 'basic', 'popular', 'family'],
    default: 'free'
  },
  planExpiresAt: {
    type: Date,
    default: null
  },
  watchlist: [{
    itemId: { type: String, required: true },
    itemType: { type: String, enum: ['movie', 'series'], default: 'movie' }
  }],
  watchHistory: [{
    movieId: { type: String, required: true },
    watchedAt: { type: Date, default: Date.now },
    progress: { type: Number, default: 0 }, // seconds watched
    countedView: { type: Boolean, default: false }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  lastNameChangedAt: {
    type: Date,
    default: null
  },
  tokenVersion: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
