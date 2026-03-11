const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    date: {
      type: String, // YYYY-MM-DD
      required: true,
      index: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      default: null,
    },
    activeSeconds: {
      type: Number,
      default: 0,
    },
    awaySeconds: {
      type: Number,
      default: 0,
    },
    idleSeconds: {
      type: Number,
      default: 0,
    },
    totalSeconds: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['active', 'idle', 'away', 'ended'],
      default: 'active',
    },
    // Heartbeat from Python agent (last ping time)
    lastHeartbeat: {
      type: Date,
      default: Date.now,
    },
    // Granular activity events from Python agent
    events: [
      {
        type: { type: String, enum: ['active', 'idle', 'away', 'resume'] },
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// Compound index for quick lookups
sessionSchema.index({ user: 1, date: -1 });

module.exports = mongoose.model('Session', sessionSchema);
