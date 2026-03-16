const express = require('express');
const Session = require('../models/Session');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(protect);

/**
 * Helper: Get the shift date (YYYY-MM-DD)
 * Shift starts at 19:30 (7:30 PM). If current time is earlier than 19:30,
 * it belongs to yesterday's shift.
 */
function getShiftDateStr() {
  const d = new Date();
  const hour = d.getHours();
  const minute = d.getMinutes();

  if (hour < 19 || (hour === 19 && minute < 30)) {
    d.setDate(d.getDate() - 1);
  }

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// ─────────────────────────────────────────────────────────────
// POST /api/sessions/start
// Called by Python agent when system starts / Or UI Start button
// ─────────────────────────────────────────────────────────────
router.post('/start', async (req, res) => {
  try {
    const { fromUI, date: clientDate } = req.body || {};
    const date = clientDate || getShiftDateStr();

    // Check if there's an active session for THIS user
    let existing = await Session.findOne({ user: req.user._id, date, status: { $ne: 'ended' } });

    if (existing) {
      if (fromUI) {
        // If UI calls start but it's already active, just return it
        return res.status(200).json({ success: true, session: existing, resumed: true });
      } else {
        // Agent calls start and it's active, resume tracking
        return res.status(200).json({ success: true, session: existing, resumed: true });
      }
    }

    // Force end ANY existing active sessions for this user on any machine (stale roaming sessions)
    await Session.updateMany(
      { user: req.user._id, status: { $ne: 'ended' } },
      { $set: { status: 'ended', endTime: new Date() } }
    );

    if (!fromUI) {
      // Agent is trying to start tracking, but the user hasn't pressed Start yet in the UI
      return res.status(400).json({ success: false, waitingForUser: true, message: 'Waiting for user to click Start in UI.' });
    }

    // fromUI is true and no existing session -> start one!
    const session = await Session.create({
      user: req.user._id,
      date,
      startTime: new Date(),
      status: 'active',
      lastHeartbeat: new Date(),
    });

    res.status(201).json({ success: true, session, resumed: false });
  } catch (err) {
    console.error('Start session error:', err);
    res.status(500).json({ success: false, message: 'Failed to start session.' });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/sessions/heartbeat
// Called by Python agent every 30s, carries current counters
// Body: { sessionId, activeSeconds, awaySeconds, idleSeconds, status }
// ─────────────────────────────────────────────────────────────
router.post('/heartbeat', async (req, res) => {
  try {
    const { sessionId, activeSeconds, awaySeconds, idleSeconds, unproductiveSeconds, status } = req.body;

    const session = await Session.findOne({ _id: sessionId, user: req.user._id });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }
    if (session.status === 'ended') {
      return res.status(400).json({ success: false, message: 'Session already ended.' });
    }

    session.activeSeconds = activeSeconds ?? session.activeSeconds;
    session.awaySeconds = awaySeconds ?? session.awaySeconds;
    session.idleSeconds = idleSeconds ?? session.idleSeconds;
    session.unproductiveSeconds = unproductiveSeconds ?? session.unproductiveSeconds;
    session.totalSeconds = (activeSeconds ?? 0) + (awaySeconds ?? 0) + (idleSeconds ?? 0) + (unproductiveSeconds ?? 0);
    session.status = status ?? session.status;
    session.lastHeartbeat = new Date();

    await session.save();

    res.status(200).json({ success: true, session });
  } catch (err) {
    console.error('Heartbeat error:', err);
    res.status(500).json({ success: false, message: 'Heartbeat failed.' });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/sessions/event
// Called by Python agent on status change (idle/away/resume)
// Body: { sessionId, type }  — type: 'active'|'idle'|'away'|'resume'
// ─────────────────────────────────────────────────────────────
router.post('/event', async (req, res) => {
  try {
    const { sessionId, type } = req.body;
    if (!['active', 'idle', 'away', 'resume', 'unproductive', 'resume_productive'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid event type.' });
    }

    const session = await Session.findOne({ _id: sessionId, user: req.user._id });
    if (!session) return res.status(404).json({ success: false, message: 'Session not found.' });

    session.events.push({ type, timestamp: new Date() });
    // resume and resume_productive both return to active
    session.status = (type === 'resume' || type === 'resume_productive') ? 'active' : type;

    // Only update these if provided (Agent now sends them)
    if (req.body.activeSeconds !== undefined) session.activeSeconds = req.body.activeSeconds;
    if (req.body.awaySeconds !== undefined) session.awaySeconds = req.body.awaySeconds;
    if (req.body.idleSeconds !== undefined) session.idleSeconds = req.body.idleSeconds;
    if (req.body.unproductiveSeconds !== undefined) session.unproductiveSeconds = req.body.unproductiveSeconds;

    session.totalSeconds = (session.activeSeconds || 0) + (session.awaySeconds || 0) + (session.idleSeconds || 0) + (session.unproductiveSeconds || 0);
    session.lastHeartbeat = new Date();
    await session.save();

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Event error:', err);
    res.status(500).json({ success: false, message: 'Failed to record event.' });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/sessions/end
// Called by Python agent when system shuts down
// Body: { sessionId, activeSeconds, awaySeconds, idleSeconds }
// ─────────────────────────────────────────────────────────────
router.post('/end', async (req, res) => {
  try {
    const { sessionId, activeSeconds, awaySeconds, idleSeconds, unproductiveSeconds } = req.body;

    const session = await Session.findOne({ _id: sessionId, user: req.user._id });
    if (!session) return res.status(404).json({ success: false, message: 'Session not found.' });

    session.endTime = new Date();
    session.activeSeconds = activeSeconds ?? session.activeSeconds;
    session.awaySeconds = awaySeconds ?? session.awaySeconds;
    session.idleSeconds = idleSeconds ?? session.idleSeconds;
    session.unproductiveSeconds = unproductiveSeconds ?? session.unproductiveSeconds;
    session.totalSeconds = Math.floor((session.endTime - session.startTime) / 1000);
    session.status = 'ended';
    await session.save();

    res.status(200).json({ success: true, session });
  } catch (err) {
    console.error('End session error:', err);
    res.status(500).json({ success: false, message: 'Failed to end session.' });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/sessions/today
// Dashboard: active session + today's ended sessions
// ─────────────────────────────────────────────────────────────
router.get('/today', async (req, res) => {
  try {
    const date = req.query.date || getShiftDateStr();

    const sessions = await Session.find({ user: req.user._id, date }).sort({ startTime: -1 });

    const active = sessions.find((s) => s.status !== 'ended') || null;
    const history = sessions.filter((s) => s.status === 'ended');

    res.status(200).json({ success: true, active, history });
  } catch (err) {
    console.error('Today sessions error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch sessions.' });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/sessions/history?days=7
// Last N days of sessions
// ─────────────────────────────────────────────────────────────
router.get('/history', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const from = new Date();
    from.setDate(from.getDate() - days + 1);
    const fromStr = from.toISOString().split('T')[0];

    const sessions = await Session.find({
      user: req.user._id,
      date: { $gte: fromStr },
    }).sort({ startTime: -1 });

    res.status(200).json({ success: true, sessions });
  } catch (err) {
    console.error('History error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch history.' });
  }
});

module.exports = router;
