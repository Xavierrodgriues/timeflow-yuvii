const express = require('express');
const TimeClaim = require('../models/TimeClaim');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All routes are protected and for the logged-in user
router.use(protect);

// ─────────────────────────────────────────────────────────────
// POST /api/claims
// Employee submits a new time claim
// ─────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { date, durationSeconds, reason } = req.body;

    if (!date || !durationSeconds || !reason) {
      return res.status(400).json({ success: false, message: 'All fields (date, durationSeconds, reason) are required.' });
    }

    const claim = await TimeClaim.create({
      userId: req.user._id,
      date,
      durationSeconds,
      reason,
      status: 'pending'
    });

    res.status(201).json({ success: true, claim });
  } catch (err) {
    console.error('Time Claim Creation Error:', err);
    res.status(500).json({ success: false, message: 'Failed to submit time claim.' });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/claims/my
// Employee views their own claim history
// ─────────────────────────────────────────────────────────────
router.get('/my', async (req, res) => {
  try {
    const claims = await TimeClaim.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, claims });
  } catch (err) {
    console.error('Fetch My Claims Error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch personal claims.' });
  }
});

module.exports = router;
