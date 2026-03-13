const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Session = require('../models/Session');
const Config = require('../models/Config');
const { protect, adminOnly } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// All routes here are protected and require admin role
router.use(protect);
router.use(adminOnly);

// GET /api/admin/users - Get all users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.status(200).json({ success: true, users });
  } catch (err) {
    console.error('Fetch users error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch users.' });
  }
});

// POST /api/admin/users - Create a new user (admin only)
router.post(
  '/users',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').optional().isIn(['user', 'admin']).withMessage('Invalid role'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const { name, email, password, role } = req.body;

      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(409).json({ success: false, message: 'Email already registered.' });
      }

      const user = await User.create({ name, email, password, role: role || 'user' });

      res.status(201).json({
        success: true,
        user: { id: user._id, name: user.name, email: user.email, role: user.role },
      });
    } catch (err) {
      console.error('Create user error:', err);
      res.status(500).json({ success: false, message: 'Server error during user creation.' });
    }
  }
);

// PUT /api/admin/users/:id - Update user details (admin only)
router.put(
  '/users/:userId',
  [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('email').optional().isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').optional({ checkFalsy: true }).isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').optional().isIn(['user', 'admin']).withMessage('Invalid role'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const { userId } = req.params;
      const { name, email, password, role } = req.body;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }

      if (email && email !== user.email) {
        const existing = await User.findOne({ email });
        if (existing) {
          return res.status(409).json({ success: false, message: 'Email already registered to another user.' });
        }
        user.email = email;
      }

      if (name) user.name = name;
      if (role) user.role = role;
      
      if (password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
      }

      await user.save();

      res.status(200).json({
        success: true,
        user: { id: user._id, name: user.name, email: user.email, role: user.role, isActive: user.isActive },
      });
    } catch (err) {
      console.error('Update user error:', err);
      res.status(500).json({ success: false, message: 'Server error during user update.' });
    }
  }
);

// DELETE /api/admin/users/:id - Delete a user (admin only)
router.delete('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if the admin is trying to delete themselves
    if (userId === req.user.id) {
        return res.status(400).json({ success: false, message: 'Cannot delete your own account.' });
    }

    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Optionally delete all sessions associated with this user
    await Session.deleteMany({ user: userId });

    res.status(200).json({ success: true, message: 'User deleted successfully.' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ success: false, message: 'Server error during user deletion.' });
  }
});

// GET /api/admin/users/:userId/sessions - Get specific user's sessions
router.get('/users/:userId/sessions', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Validate user exists
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Helper to get shift date
    const d = new Date();
    const hour = d.getHours();
    const minute = d.getMinutes();
    if (hour < 19 || (hour === 19 && minute < 30)) d.setDate(d.getDate() - 1);
    
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const todayShift = `${yyyy}-${mm}-${dd}`;

    const date = req.query.date || todayShift;
    const historyDays = parseInt(req.query.historyDays) || 7;

    // Fetch today's sessions for active status
    const todaySessions = await Session.find({ user: userId, date }).sort({ startTime: -1 });
    const active = todaySessions.find((s) => s.status !== 'ended') || null;
    const todayHistory = todaySessions.filter((s) => s.status === 'ended');

    // Fetch history for the last N days
    const from = new Date();
    from.setDate(from.getDate() - historyDays + 1);
    const fromStr = from.toISOString().split('T')[0];

    const historicalSessions = await Session.find({
      user: userId,
      date: { $gte: fromStr },
    }).sort({ startTime: -1 });

    res.status(200).json({ 
      success: true, 
      user,
      active, 
      todayHistory,
      historicalSessions
    });
  } catch (err) {
    console.error('Fetch user sessions error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch user sessions.' });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/admin/claims
// Admin views all time claims
// ─────────────────────────────────────────────────────────────
router.get('/claims', async (req, res) => {
  try {
    const TimeClaim = require('../models/TimeClaim');
    const claims = await TimeClaim.find()
      .populate('userId', 'name email')
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, claims });
  } catch (err) {
    console.error('Fetch all claims error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch claims.' });
  }
});

// ─────────────────────────────────────────────────────────────
// PUT /api/admin/claims/:id
// Admin approves or rejects a time claim
// ─────────────────────────────────────────────────────────────
router.put('/claims/:id', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }

    const TimeClaim = require('../models/TimeClaim');
    const claim = await TimeClaim.findById(req.params.id);
    if (!claim) {
      return res.status(404).json({ success: false, message: 'Claim not found.' });
    }

    if (claim.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Claim is already ${claim.status}.` });
    }

    claim.status = status;
    claim.reviewedBy = req.user._id;
    claim.reviewedAt = new Date();
    await claim.save();

    // If approved, apply the time adjustment to the user's session for that date
    if (status === 'approved') {
      // Find the first session for that user & date, or create one if they didn't work at all that day
      let session = await Session.findOne({ user: claim.userId, date: claim.date }).sort({ startTime: 1 });
      
      if (!session) {
        // No session exists for that date. The user missed the shift completely, but got manual time.
        // Create an "ended" session containing just the manual time.
        const d = new Date(`${claim.date}T12:00:00`);
        session = new Session({
          user: claim.userId,
          date: claim.date,
          startTime: d,
          endTime: new Date(d.getTime() + claim.durationSeconds * 1000),
          status: 'ended',
          activeSeconds: 0,
          idleSeconds: 0,
          awaySeconds: 0,
          unproductiveSeconds: 0,
          totalSeconds: 0
        });
      }

      // Add the claimed duration to the session
      session.activeSeconds = (session.activeSeconds || 0) + claim.durationSeconds;
      session.totalSeconds = (session.totalSeconds || 0) + claim.durationSeconds;
      
      // Update endTime to ensure the span reflects the new total if the session is ended
      if (session.status === 'ended' && session.endTime && session.startTime) {
        // Ensure the end time extends to fit the new total duration
        const minimumEndTime = new Date(session.startTime.getTime() + session.totalSeconds * 1000);
        if (session.endTime < minimumEndTime) {
          session.endTime = minimumEndTime;
        }
      }

      await session.save();
    }

    res.status(200).json({ success: true, claim });
  } catch (err) {
    console.error('Update claim error:', err);
    res.status(500).json({ success: false, message: 'Failed to update claim.' });
  }
});

// ─────────────────────────────────────────────────────────────
// CONFIGURATION ROUTES
// ─────────────────────────────────────────────────────────────

// GET /api/admin/config/unproductive
router.get('/config/unproductive', async (req, res) => {
  try {
    let config = await Config.findOne({ key: 'unproductiveKeywords' });
    if (!config) {
      // Seed default if it doesn't exist
      config = await Config.create({
        key: 'unproductiveKeywords',
        value: [
          'steam.exe', 'epicgameslauncher.exe', 'spotify.exe', 'discord.exe',
          'facebook', 'instagram', 'youtube', 'netflix', 'tiktok', 'reddit', 'amazon', 'flipkart'
        ]
      });
    }
    res.status(200).json({ success: true, keywords: config.value });
  } catch (err) {
    console.error('Fetch config error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch configuration.' });
  }
});

// PUT /api/admin/config/unproductive
router.put('/config/unproductive', async (req, res) => {
  try {
    const { keywords } = req.body;
    if (!Array.isArray(keywords)) {
      return res.status(400).json({ success: false, message: 'Keywords must be an array.' });
    }

    let config = await Config.findOne({ key: 'unproductiveKeywords' });
    if (!config) {
      config = new Config({ key: 'unproductiveKeywords' });
    }
    config.value = keywords;
    await config.save();

    res.status(200).json({ success: true, keywords: config.value });
  } catch (err) {
    console.error('Update config error:', err);
    res.status(500).json({ success: false, message: 'Failed to update configuration.' });
  }
});

module.exports = router;
