const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

const sign = (user) =>
  jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });

// ── Idempotent register: same email returns existing user ─────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, mobile, college, teamName } = req.body;
    if (!name || !email || !mobile || !college)
      return res.status(400).json({ message: 'Missing required fields' });

    let user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      user = await User.create({ name, email, mobile, college, teamName: teamName || '' });
    }

    const token = sign(user);
    return res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        college: user.college,
        teamName: user.teamName,
      },
      progress: {
        currentStage: user.currentStage,
        completedStages: user.completedStages,
        finished: user.finished,
        finishTime: user.finishTime,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ── Verify token ─────────────────────────────────────────────────────────
router.get('/verify', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).lean();
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ valid: true, user: { id: user._id, name: user.name, email: user.email, college: user.college } });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
