const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  mobile: { type: String, required: true },
  college: { type: String, required: true },
  teamName: { type: String, default: '' },
  currentStage: { type: Number, default: 1 },
  completedStages: { type: [Number], default: [] },
  finished: { type: Boolean, default: false },
  timerStart: { type: Number, default: null },
  finishTime: { type: Number, default: null },
  completionSeconds: { type: Number, default: null },
}, { timestamps: true });

userSchema.virtual('completionTime').get(function() {
  if (this.finished && this.timerStart && this.finishTime) {
    return Math.floor((this.finishTime - this.timerStart) / 1000);
  }
  return null;
});

module.exports = mongoose.model('User', userSchema);
