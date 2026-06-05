const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Event = require('../models/Event');
const router = express.Router();

// ── Admin JWT middleware ──────────────────────────────────────────────────
const adminAuth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    if (payload.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    req.admin = payload;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// ── Admin login ── returns 24h token ─────────────────────────────────────
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === process.env.ADMIN_USER && password === process.env.ADMIN_PASS) {
    const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '24h' });
    return res.json({ token, expiresIn: 86400 });
  }
  res.status(401).json({ message: 'Invalid credentials' });
});

// ── Validate admin token (for session recovery on refresh) ───────────────
router.get('/validate', adminAuth, (req, res) => {
  res.json({ valid: true });
});

// ── Get all participants ──────────────────────────────────────────────────
router.get('/participants', adminAuth, async (req, res) => {
  try {
    const participants = await User.find({})
      .select('name email mobile college teamName currentStage completedStages finished completionSeconds timerStart finishTime createdAt')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ participants });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Analytics ─────────────────────────────────────────────────────────────
router.get('/analytics', adminAuth, async (req, res) => {
  try {
    const [totalUsers, completedUsers, avgResult, event] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ finished: true }),
      User.aggregate([
        { $match: { finished: true, completionSeconds: { $gt: 0 } } },
        { $group: { _id: null, avg: { $avg: '$completionSeconds' } } },
      ]),
      Event.findOne().sort({ createdAt: -1 }),
    ]);

    res.json({
      totalUsers,
      activeUsers: totalUsers - completedUsers,
      completedUsers,
      avgTime: avgResult[0]?.avg || null,
      eventStatus: event?.status || 'waiting',
    });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Set event status ──────────────────────────────────────────────────────
router.post('/event', adminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    let event = await Event.findOne().sort({ createdAt: -1 });
    if (!event) event = new Event();
    event.status = status;
    if (status === 'active' && !event.startedAt) event.startedAt = new Date();
    if (status === 'ended') event.endedAt = new Date();
    await event.save();
    res.json({ ok: true, status });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// ── PUBLIC: event state ───────────────────────────────────────────────────
router.get('/state', async (req, res) => {
  try {
    const event = await Event.findOne().sort({ createdAt: -1 }).lean();
    res.json({ status: event?.status || 'waiting' });
  } catch {
    res.json({ status: 'waiting' });
  }
});

module.exports = router;
