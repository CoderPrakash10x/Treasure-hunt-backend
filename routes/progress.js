const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

// ── Sync progress from client ─────────────────────────────────────────────
// BUG FIX: timerStart was blocked from updating; finishTime/completionSeconds
// now always written correctly when finished=true
router.post('/sync', auth, async (req, res) => {
  try {
    const { currentStage, completedStages, timerStart, finished, finishTime } = req.body;
    const update = {};

    if (currentStage !== undefined) update.currentStage = currentStage;
    if (completedStages !== undefined) update.completedStages = completedStages;

    // Always update timerStart if not yet set on server
    if (timerStart !== undefined) {
      const existing = await User.findById(req.user.id).select('timerStart').lean();
      if (!existing?.timerStart) update.timerStart = timerStart;
    }

    if (finished !== undefined) update.finished = finished;
    if (finishTime !== undefined) update.finishTime = finishTime;

    // FIX: Calculate completionSeconds correctly — use server timerStart as fallback
    if (finished === true) {
      const existingUser = await User.findById(req.user.id).select('timerStart').lean();
      const startTs = existingUser?.timerStart || timerStart;
      const endTs = finishTime || Date.now();
      if (startTs) {
        update.completionSeconds = Math.max(1, Math.floor((endTs - startTs) / 1000));
        update.finishTime = endTs;
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: update },
      { new: true, upsert: false }
    );

    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ ok: true, completionSeconds: user.completionSeconds });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Get progress ──────────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('currentStage completedStages finished finishTime timerStart completionSeconds')
      .lean();
    if (!user) return res.status(404).json({ message: 'Not found' });
    res.json(user);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
