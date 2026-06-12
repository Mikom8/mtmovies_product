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
const { initTelegramClient } = require('./services/telegram');

const app = express();

// ── Middleware ──
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes (registered BEFORE static so dynamic segment-wait routes take priority) ──
app.use('/api/auth', authRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/series', seriesRoutes);
app.use('/api/users', userRoutes);
app.use('/api/stream', streamRoutes);
app.use('/api/payments', paymentRoutes);

// Serve already-transcoded HLS segments statically (fallback after dynamic routes)
app.use('/api/stream/hls', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-cache');
  next();
}, express.static(hlsDir));


// ── Uptime Robot & Root Check ──
app.get('/', (req, res) => {
  res.status(200).send('MT Movies API is awake and running!');
});

// ── Health check ──
app.get('/api/health', (req, res) => {
  res.json({ status: 'MT Movies API is running', timestamp: new Date() });
});

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
