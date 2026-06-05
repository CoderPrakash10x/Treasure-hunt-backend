const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

// Returns top 20 finishers sorted by completionSeconds ASC
// Also returns full participant list for admin leaderboard view
router.get('/', auth, async (req, res) => {
  try {
    const leaderboard = await User.find({
      finished: true,
      completionSeconds: { $gt: 0 }
    })
      .select('name email college teamName completionSeconds currentStage finished createdAt')
      .sort({ completionSeconds: 1 })
      .limit(20)
      .lean();

    res.json({ leaderboard });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
