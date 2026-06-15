const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { generateToken, protect } = require('../middleware/auth');
const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ── POST /api/auth/google ──
router.post('/google', async (req, res) => {
  try {
    const { access_token } = req.body;
    if (!access_token) return res.status(400).json({ error: 'Missing Google access token.' });

    // Fetch user profile from Google using the access token
    // Using native fetch available in Node.js 18+
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` }
    });
    
    if (!profileRes.ok) {
      throw new Error('Failed to fetch Google profile');
    }
    
    const payload = await profileRes.json();
    const { email, name, picture, sub: googleId } = payload;

    // Find or create user
    let user = await User.findOne({ email: email.toLowerCase() });
    let isNewUser = false;

    if (!user) {
      // Create a new user (no password required for Google auth since we don't validate it if missing)
      user = await User.create({
        name,
        email: email.toLowerCase(),
        googleId,
        avatar: picture
      });
      isNewUser = true;
    } else if (!user.googleId) {
      // Link existing account to Google
      user.googleId = googleId;
      if (!user.avatar || user.avatar.includes('profile_skqfj2.png')) {
        user.avatar = picture;
      }
      await user.save();
    }

    res.json({
      message: 'Google login successful!',
      token: generateToken(user._id),
      isNewUser,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        plan: user.plan,
        avatar: user.avatar,
        watchHistory: user.watchHistory,
        watchlist: user.watchlist
      }
    });
  } catch (err) {
    console.error('Google Auth Error:', err);
    res.status(500).json({ error: 'Google authentication failed.', message: err.message });
  }
});

// ── POST /api/auth/check-email ──
router.post('/check-email', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });
    
    const user = await User.findOne({ email: email.toLowerCase() });
    res.json({ exists: !!user });
  } catch (err) {
    res.status(500).json({ error: 'Server error.', message: err.message });
  }
});

// ── POST /api/auth/register ──
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ error: 'Name, email and password are required.' });

    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing)
      return res.status(400).json({ error: 'An account with this email already exists.' });

    const user = await User.create({ name, email, password });

    res.status(201).json({
      message: 'Account created successfully!',
      token: generateToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        plan: user.plan,
        avatar: user.avatar,
        watchHistory: user.watchHistory,
        watchlist: user.watchlist
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed.', message: err.message });
  }
});

// ── POST /api/auth/login ──
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required.' });

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user)
      return res.status(401).json({ error: 'No account found with that email.' });

    if (!user.password)
      return res.status(401).json({ error: 'This account uses Google sign-in. Please use Google.' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch)
      return res.status(401).json({ error: 'Incorrect password or email.' });

    res.json({
      message: 'Login successful!',
      token: generateToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        plan: user.plan,
        avatar: user.avatar,
        watchHistory: user.watchHistory,
        watchlist: user.watchlist
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Login failed.', message: err.message });
  }
});

// ── GET /api/auth/me — get current logged-in user ──
router.get('/me', protect, async (req, res) => {
  res.json({
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        plan: req.user.plan,
        planExpiresAt: req.user.planExpiresAt,
        avatar: req.user.avatar,
        watchHistory: req.user.watchHistory,
        watchlist: req.user.watchlist
      }
  });
});

module.exports = router;
