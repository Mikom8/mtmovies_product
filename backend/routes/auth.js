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

    if (user.plan && user.plan !== 'free' && user.planExpiresAt && new Date() > new Date(user.planExpiresAt)) {
      user.plan = 'free';
      user.planExpiresAt = null;
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
        planExpiresAt: user.planExpiresAt,
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
        planExpiresAt: user.planExpiresAt,
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

    if (user.plan && user.plan !== 'free' && user.planExpiresAt && new Date() > new Date(user.planExpiresAt)) {
      user.plan = 'free';
      user.planExpiresAt = null;
      await user.save();
    }

    res.json({
      message: 'Login successful!',
      token: generateToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        plan: user.plan,
        planExpiresAt: user.planExpiresAt,
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

// ── POST /api/auth/forgot-password ──
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ error: 'No account found with this email.' });

    // Generate a 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Set code and expiration (15 minutes from now)
    user.resetPasswordCode = code;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
    await user.save();

    // Send email using Resend API (via native fetch)
    const apiKey = process.env.RESEND_API || process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error('Resend API key missing.');
      return res.status(500).json({ error: 'Email service is not configured.' });
    }

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        from: 'MTMovies <onboarding@resend.dev>', // Resend demands onboarding@resend.dev for free accounts
        to: email.toLowerCase(),
        subject: 'Reset Your MTMovies Password',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; background-color: #0a0a0a; color: #ffffff;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h2 style="color: #E50914; margin: 0;">MTMovies</h2>
              <p style="font-size: 14px; color: #888;">Password Recovery</p>
            </div>
            <p>Hello,</p>
            <p>You requested a password reset. Use the 6-digit recovery code below to reset your password. This code will expire in 15 minutes.</p>
            <div style="text-align: center; margin: 30px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #E50914; background-color: #1a1a1a; padding: 10px 20px; border-radius: 5px; border: 1px dashed #E50914;">${code}</span>
            </div>
            <p style="font-size: 12px; color: #555;">If you did not request this, you can safely ignore this email.</p>
          </div>
        `
      })
    });

    const emailData = await emailRes.json();
    if (!emailRes.ok) {
      console.error('Resend Email Error:', emailData);
      return res.status(500).json({ error: 'Failed to send recovery email.' });
    }

    res.json({ message: 'Recovery code sent successfully!' });
  } catch (err) {
    res.status(500).json({ error: 'Forgot password request failed.', message: err.message });
  }
});

// ── POST /api/auth/verify-reset-code ──
router.post('/verify-reset-code', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: 'Email and verification code are required.' });

    const user = await User.findOne({
      email: email.toLowerCase(),
      resetPasswordCode: code,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification code.' });
    }

    res.json({ message: 'Code verified successfully!' });
  } catch (err) {
    res.status(500).json({ error: 'Code verification failed.', message: err.message });
  }
});

// ── POST /api/auth/reset-password ──
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: 'Email, code, and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
      resetPasswordCode: code,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification code.' });
    }

    // Set new password
    user.password = newPassword;
    
    // Clear code and expiry
    user.resetPasswordCode = null;
    user.resetPasswordExpires = null;
    
    // Invalidate other tokens
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    
    await user.save();

    res.json({ message: 'Password reset successfully! You can now log in.' });
  } catch (err) {
    res.status(500).json({ error: 'Password reset failed.', message: err.message });
  }
});

module.exports = router;
