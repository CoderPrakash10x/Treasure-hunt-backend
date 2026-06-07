require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');

const app = express();

// ── Security ──────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin:'https://treasure-hunt-frontend-coral.vercel.app' || "",
  credentials: true,
}));

// ── Rate limiting ─────────────────────────────────────────────────────────
app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000,
  message: { message: 'Too many requests. Try again later.' },
}));

app.use('/api', rateLimit({
  windowMs: 60 * 1000,
  max: 5000,
}));

// ── Body parsing ──────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));

// ── Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/progress', require('./routes/progress'));
app.use('/api/event', require('./routes/admin'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/leaderboard', require('./routes/leaderboard'));

app.get('/api/health', (_, res) => res.json({ ok: true }));

// ── 404 ───────────────────────────────────────────────────────────────────
app.use((_, res) => res.status(404).json({ message: 'Not found' }));

// ── Error handler ─────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error' });
});

// ── DB + Start ────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✓ MongoDB connected');
    app.listen(PORT, () => console.log(`✓ Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('✗ MongoDB connection failed:', err.message);
    process.exit(1);
  });
