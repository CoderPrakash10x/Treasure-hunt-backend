const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['waiting', 'active', 'paused', 'ended'],
    default: 'waiting',
  },
  startedAt: { type: Date, default: null },
  endedAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);
