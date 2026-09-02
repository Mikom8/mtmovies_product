const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const hlsDir = path.join(__dirname, 'tmp_hls');
if (!fs.existsSync(hlsDir)) {
  fs.mkdirSync(hlsDir, { recursive: true });
}

const authRoutes = require('./routes/auth');
const movieRoutes = require('./routes/movies');
const seriesRoutes = require('./routes/series');
const userRoutes = require('./routes/users');
const streamRoutes = require('./routes/stream');
const paymentRoutes = require('./routes/payments');
const adminRoutes = require('./routes/admin');
const recommendationRoutes = require('./routes/recommendations');
const { initTelegramClient } = require('./services/telegram');
const { requireApiKey } = require('./middleware/apiKey');
const rateLimit = require('express-rate-limit');

const app = express();

// Trust proxy if behind a reverse proxy (e.g. Railway, Heroku)
app.set('trust proxy', 1);

// ── Rate Limiters ──
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per 15 minutes
  message: { error: 'Too many requests from this IP, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 auth requests per 15 minutes
  message: { error: 'Too many authentication attempts, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Middleware ──
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Uptime Robot & Root Check ──
app.all('/head', (req, res) => {
  res.status(200).send('OK');
});

app.get('/', (req, res) => {
  res.status(200).send('MT Movies API is awake and running!');
});

// ── Health check (Exempt from API Key) ──
app.get('/api/health', (req, res) => {
  res.json({ status: 'MT Movies API is running', timestamp: new Date() });
});

// Serve already-transcoded HLS segments statically (Exempt from API Key)
app.use('/api/stream/hls', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-cache');
  next();
}, express.static(hlsDir));

// Exempt the dynamic stream routes as well, since video players cannot send custom headers
app.use('/api/stream', streamRoutes);

// ── API Key Protection Middleware ──
// All routes below this will require the x-api-key header or api_key query param.
app.use('/api', requireApiKey, apiLimiter);

// ── Routes (registered BEFORE static so dynamic segment-wait routes take priority) ──
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/series', seriesRoutes);
app.use('/api/users', userRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/recommendations', recommendationRoutes);

// ── 404 handler ──
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Error handler ──
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong', message: err.message });
});

// ── Start server ──
const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 MT Movies server running on port ${PORT}`);
});

// ── Self-pinging interval for Render free tier (every 13 minutes) ──
const THIRTEEN_MINUTES = 13 * 60 * 1000;
setInterval(async () => {
  try {
    const baseUrl = process.env.RENDER_EXTERNAL_URL || process.env.SERVER_URL || `http://localhost:${PORT}`;
    const targetUrl = baseUrl.endsWith('/head') ? baseUrl : `${baseUrl.replace(/\/$/, '')}/head`;
    if (typeof fetch === 'function') {
      await fetch(targetUrl);
    } else {
      const axios = require('axios');
      await axios.get(targetUrl);
    }
    console.log(`[Self-Ping] Pinged ${targetUrl} successfully at ${new Date().toISOString()}`);
  } catch (err) {
    console.error('[Self-Ping] Failed to ping server:', err.message);
  }
}, THIRTEEN_MINUTES);

// ── Connect to MongoDB ──
if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI is not set. Database will not connect.');
} else {
  mongoose
    .connect(process.env.MONGODB_URI)
    .then(async () => {
      console.log('✅ Connected to MongoDB Atlas');
      
      // Initialize Telegram MTProto Client
      await initTelegramClient();
    })
    .catch((err) => {
      console.error('❌ MongoDB connection failed:', err.message);
    });
}
