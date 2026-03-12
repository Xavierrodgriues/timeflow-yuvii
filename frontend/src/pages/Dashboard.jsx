import { useState, useEffect } from 'react';
import { Clock, LogIn, LogOut, Timer, Coffee, CalendarDays, Ban } from 'lucide-react';
import { sessionApi } from '../services/api';
import '../styles/dashboard.css';

function pad(n) {
  return String(Math.floor(n)).padStart(2, '0');
}

function formatDuration(seconds) {
  if (seconds == null || isNaN(seconds)) return '0 hr 0 min 0 sec';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h} hr ${m} min ${s} sec`;
}

function formatTime(date) {
  if (!date) return '—';
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
  });
}

function formatDate(date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

function getShiftDateStr(offsetDays = 0) {
  const d = new Date();
  const hour = d.getHours();
  const minute = d.getMinutes();
  
  if (hour < 19 || (hour === 19 && minute < 30)) {
    d.setDate(d.getDate() - 1);
  }
  
  d.setDate(d.getDate() + offsetDays);
  
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getShiftDisplayDate(dateStr) {
  const d = new Date(`${dateStr}T12:00:00`);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Simulate data coming from a Python agent (placeholder values)
const SESSION_START = new Date(new Date().setHours(9, 0, 0, 0)); // 9:00 AM today

export default function Dashboard() {
  const [now, setNow] = useState(new Date());
  const [activeSession, setActiveSession] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [offsetDays, setOffsetDays] = useState(0);
  const currentShiftStr = getShiftDateStr(offsetDays);
  const isCurrentShift = offsetDays === 0;

  const [localActiveSecs, setLocalActiveSecs] = useState(0);
  const [localAwaySecs, setLocalAwaySecs] = useState(0);
  const [localIdleSecs, setLocalIdleSecs] = useState(0);
  const [localUnproductiveSecs, setLocalUnproductiveSecs] = useState(0);

  const [loadingAction, setLoadingAction] = useState(false);

  const isPast459AM = (d) => {
    const h = d.getHours();
    const m = d.getMinutes();
    if (h === 4 && m >= 59) return true;
    if (h >= 5 && (h < 19 || (h === 19 && m < 30))) return true;
    return false;
  };

  const canStop = localActiveSecs >= 28800 || isPast459AM(now);

  const handleStartTracking = async () => {
    setLoadingAction(true);
    try {
      await sessionApi.start({ fromUI: true });
      await fetchSessions();
    } catch (err) {
      console.error(err);
      alert('Failed to start tracking');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleStopTracking = async () => {
    if (!activeSession) return;
    setLoadingAction(true);
    try {
      await sessionApi.end({
        sessionId: activeSession._id,
        activeSeconds: localActiveSecs,
        idleSeconds: localIdleSecs,
        awaySeconds: localAwaySecs,
        unproductiveSeconds: localUnproductiveSecs
      });
      await fetchSessions();
    } catch (err) {
      console.error(err);
      alert('Failed to stop tracking');
    } finally {
      setLoadingAction(false);
    }
  };

  // Fetch session data from backend
  const fetchSessions = async () => {
    try {
      const data = await sessionApi.today(currentShiftStr);
      if (data.active) {
        setActiveSession(data.active);
        
        let active = data.active.activeSeconds || 0;
        let away = data.active.awaySeconds || 0;
        let idle = data.active.idleSeconds || 0;
        let unproductive = data.active.unproductiveSeconds || 0;
        
        if (data.active.lastHeartbeat) {
          const lastHb = new Date(data.active.lastHeartbeat);
          const diff = Math.max(0, Math.floor((new Date() - lastHb) / 1000));
          if (data.active.status === 'active') active += diff;
          if (data.active.status === 'away') away += diff;
          if (data.active.status === 'idle') idle += diff;
          if (data.active.status === 'unproductive') unproductive += diff;
        }

        setLocalActiveSecs(active);
        setLocalAwaySecs(away);
        setLocalIdleSecs(idle);
        setLocalUnproductiveSecs(unproductive);
      } else {
        setActiveSession(null);
        setLocalActiveSecs(0);
        setLocalAwaySecs(0);
        setLocalIdleSecs(0);
        setLocalUnproductiveSecs(0);
      }
      setHistory(data.history || []);
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and poll every 10 seconds
  useEffect(() => {
    fetchSessions();
    const id = setInterval(fetchSessions, 10000);
    return () => clearInterval(id);
  }, [currentShiftStr]);

  // Update clock and local counters every second
  useEffect(() => {
    const id = setInterval(() => {
      setNow(new Date());
      // Only increment live counters if watching today's shift
      if (activeSession && isCurrentShift) {
        if (activeSession.status === 'active') {
          setLocalActiveSecs((s) => s + 1);
        } else if (activeSession.status === 'away') {
          setLocalAwaySecs((s) => s + 1);
        } else if (activeSession.status === 'idle') {
          setLocalIdleSecs((s) => s + 1);
        } else if (activeSession.status === 'unproductive') {
          setLocalUnproductiveSecs((s) => s + 1);
        }
      }
    }, 1000);
    return () => clearInterval(id);
  }, [activeSession, isCurrentShift]);

  return (
    <div className="dashboard-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Your activity is being tracked automatically</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button 
            className="shift-nav-btn" 
            onClick={() => setOffsetDays(d => d - 1)}
            title="Previous Shift"
          >
            {'<'}
          </button>
          
          <div className="page-date-badge">
            <CalendarDays size={14} />
            {getShiftDisplayDate(currentShiftStr)} Shift
          </div>
          
          <button 
            className="shift-nav-btn" 
            onClick={() => setOffsetDays(d => d + 1)}
            disabled={isCurrentShift}
            title="Next Shift"
            style={{ opacity: isCurrentShift ? 0.3 : 1, cursor: isCurrentShift ? 'default' : 'pointer' }}
          >
            {'>'}
          </button>
        </div>
      </div>

      {/* Clock Banner */}
      <div className="clock-banner">
        <div className="clock-display">
          <div className="clock-time">{formatTime(now)}</div>
          <div className="clock-date">{formatDate(now)}</div>
        </div>
        <div className="clock-status-area">
          <span className="clock-label">Tracking Status</span>
          <div className="tracking-pill" style={{ 
            background: activeSession?.status === 'out_of_shift' ? 'rgba(107, 114, 128, 0.4)' :
                        activeSession?.status === 'idle' ? 'rgba(245, 158, 11, 0.4)' :
                        activeSession?.status === 'away' ? 'rgba(239, 68, 68, 0.4)' :
                        activeSession?.status === 'unproductive' ? 'rgba(220, 38, 38, 0.4)' :
                        'rgba(255,255,255,0.15)' 
          }}>
            <span className="tracking-dot" style={{
              background: activeSession?.status === 'out_of_shift' ? '#9ca3af' :
                          activeSession?.status === 'idle' ? '#fbbf24' :
                          activeSession?.status === 'away' ? '#f87171' :
                          activeSession?.status === 'unproductive' ? '#f87171' : '#4ade80'
            }} />
            {activeSession 
              ? (activeSession.status === 'out_of_shift' ? 'Shift Ended (Off-hours)' :
                 activeSession.status === 'idle' ? 'Idle Time (no input)' :
                 activeSession.status === 'away' ? 'User Away' :
                 activeSession.status === 'unproductive' ? '⚠ Unproductive Activity' : 'Auto-Tracking Active')
              : 'Waiting for Agent...'}
          </div>
        </div>
      </div>

      {/* Tracking Controls */}
      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', marginBottom: '1.5rem', padding: '1rem', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Tracking Controls</h3>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Start the timer to record your shift. The stop button activates after 8 hours of active time or at 4:59 AM.
          </p>
        </div>
        <div>
          {!activeSession ? (
            <button className="btn-start-tracking" onClick={handleStartTracking} disabled={loadingAction}>
              {loadingAction ? 'Starting...' : 'Start Tracking'}
            </button>
          ) : (
            <button 
              className="btn-stop-tracking" 
              onClick={handleStopTracking} 
              disabled={loadingAction || !canStop}
              title={!canStop ? "Stop available after 8 hours of active time or at 4:59 AM" : "Stop session"}
            >
              {loadingAction ? 'Stopping...' : 'Stop Tracking'}
            </button>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="stats-grid">
        {/* Start Time */}
        <div className="stat-card card-start">
          <div className="stat-card-top-bar" />
          <div className="stat-card-header">
            <span className="stat-label">Start Time</span>
            <div className="stat-icon icon-start">
              <LogIn size={16} />
            </div>
          </div>
          <div className="stat-value">{loading ? '—' : (activeSession ? formatTime(new Date(activeSession.startTime)) : '—')}</div>
          <div className="stat-meta">
            {loading ? 'Loading...' : activeSession 
              ? <span className="stat-badge badge-active">● Session running</span>
              : 'No active session'}
          </div>
        </div>

        {/* End Time */}
        <div className="stat-card card-end">
          <div className="stat-card-top-bar" />
          <div className="stat-card-header">
            <span className="stat-label">End Time</span>
            <div className="stat-icon icon-end">
              <LogOut size={16} />
            </div>
          </div>
          <div className="stat-value">—</div>
          <div className="stat-meta">Session in progress</div>
        </div>

        {/* Active Time */}
        <div className="stat-card card-active">
          <div className="stat-card-top-bar" />
          <div className="stat-card-header">
            <span className="stat-label">Active Time</span>
            <div className="stat-icon icon-active">
              <Timer size={16} />
            </div>
          </div>
          <div className="stat-value">{loading ? '—' : formatDuration(localActiveSecs)}</div>
          <div className="stat-meta">
            {loading ? 'Loading...' : activeSession?.status === 'active'
              ? <span className="stat-badge badge-active">● Counting</span>
              : 'Paused'}
          </div>
        </div>

        {/* Idle Time */}
        <div className="stat-card card-idle">
          <div className="stat-card-top-bar" style={{ background: '#fbbf24' }} />
          <div className="stat-card-header">
            <span className="stat-label">Idle Time</span>
            <div className="stat-icon icon-idle" style={{ background: '#fffbeb', color: '#f59e0b' }}>
              <Coffee size={16} />
            </div>
          </div>
          <div className="stat-value">{loading ? '—' : formatDuration(localIdleSecs)}</div>
          <div className="stat-meta">
            {loading ? 'Loading...' : activeSession?.status === 'idle'
              ? <span className="stat-badge badge-idle" style={{ background: '#fffbeb', color: '#d97706' }}>● Idle timer running</span>
              : 'Paused'}
          </div>
        </div>

        {/* Away Time */}
        <div className="stat-card card-away">
          <div className="stat-card-top-bar" />
          <div className="stat-card-header">
            <span className="stat-label">Away Time</span>
            <div className="stat-icon icon-away">
              <Coffee size={16} />
            </div>
          </div>
          <div className="stat-value">{loading ? '—' : formatDuration(localAwaySecs)}</div>
          <div className="stat-meta">
            {loading ? 'Loading...' : activeSession?.status === 'away' 
              ? <span className="stat-badge badge-end">● Away timer running</span> 
              : activeSession ? 'Monitored by agent' : '—'}
          </div>
        </div>

        {/* Unproductive Time */}
        <div className="stat-card card-unproductive">
          <div className="stat-card-top-bar" />
          <div className="stat-card-header">
            <span className="stat-label">Unproductive</span>
            <div className="stat-icon icon-unproductive">
              <Ban size={16} />
            </div>
          </div>
          <div className="stat-value">{loading ? '—' : formatDuration(localUnproductiveSecs)}</div>
          <div className="stat-meta">
            {loading ? 'Loading...' : activeSession?.status === 'unproductive'
              ? <span className="stat-badge badge-unproductive">● Unproductive timer running</span>
              : activeSession ? 'Monitored by agent' : '—'}
          </div>
        </div>
      </div>

      {/* Session Log */}
      <div className="section-header">
        <span className="section-title">Today's Sessions</span>
        <span className="section-count">{history.length} sessions</span>
      </div>

      <div className="log-card">
        {history.length === 0 ? (
          <div className="log-empty">
            <Clock size={36} strokeWidth={1.5} style={{ opacity: 0.25 }} />
            <p>No past sessions today. Your session history will appear here automatically.</p>
          </div>
        ) : (
          <table className="log-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Start Time</th>
                <th>End Time</th>
                <th>Active</th>
                <th>Idle</th>
                <th>Away</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map((log, i) => (
                <tr key={log._id}>
                  <td style={{ color: '#9ca3af' }}>{history.length - i}</td>
                  <td>{formatTime(new Date(log.startTime))}</td>
                  <td>{formatTime(new Date(log.endTime))}</td>
                  <td><span className="chip chip-green">{formatDuration(log.activeSeconds)}</span></td>
                  <td><span className="chip chip-amber">{formatDuration(log.idleSeconds)}</span></td>
                  <td><span className="chip chip-amber">{formatDuration(log.awaySeconds)}</span></td>
                  <td><span className="chip chip-purple">{formatDuration(log.totalSeconds)}</span></td>
                  <td><span className="chip chip-slate">Completed</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
