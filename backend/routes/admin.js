const express = require('express');
const User = require('../models/User');
const Session = require('../models/Session');
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

module.exports = router;
