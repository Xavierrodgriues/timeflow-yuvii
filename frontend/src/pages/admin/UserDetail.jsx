import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminApi } from '../../services/api';
import { Clock, LogIn, LogOut, Timer, Coffee, CalendarDays, Ban, ArrowLeft } from 'lucide-react';
import '../../styles/dashboard.css';

// Reusing formatting utilities from Dashboard
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

export default function UserDetail() {
  const { userId } = useParams();
  const navigate = useNavigate();
  
  const [targetUser, setTargetUser] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [offsetDays, setOffsetDays] = useState(0);
  const currentShiftStr = getShiftDateStr(offsetDays);
  const isCurrentShift = offsetDays === 0;

  // Local counters that increment between API fetches representing *their* live time
  const [localActiveSecs, setLocalActiveSecs] = useState(0);
  const [localAwaySecs, setLocalAwaySecs] = useState(0);
  const [localIdleSecs, setLocalIdleSecs] = useState(0);
  const [localUnproductiveSecs, setLocalUnproductiveSecs] = useState(0);

  const fetchUserData = async () => {
    try {
      const data = await adminApi.getUserSessions(userId, currentShiftStr);
      setTargetUser(data.user);
      
      if (data.active) {
        setActiveSession(data.active);
        
        let active = data.active.activeSeconds || 0;
        let away = data.active.awaySeconds || 0;
        let idle = data.active.idleSeconds || 0;
        let unproductive = data.active.unproductiveSeconds || 0;
        
        // Extrapolate time since last heartbeat
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
      setHistory(data.todayHistory || []);
    } catch (err) {
      console.error('Failed to fetch user data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch immediately and poll every 10 seconds (same as normal Dashboard)
  useEffect(() => {
    setLoading(true);
    fetchUserData();
    const id = setInterval(fetchUserData, 10000);
    return () => clearInterval(id);
  }, [userId, currentShiftStr]);

  // Update live counters
  useEffect(() => {
    const id = setInterval(() => {
      if (activeSession && isCurrentShift) {
        if (activeSession.status === 'active') setLocalActiveSecs((s) => s + 1);
        else if (activeSession.status === 'away') setLocalAwaySecs((s) => s + 1);
        else if (activeSession.status === 'idle') setLocalIdleSecs((s) => s + 1);
        else if (activeSession.status === 'unproductive') setLocalUnproductiveSecs((s) => s + 1);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [activeSession, isCurrentShift]);

  if (loading && !targetUser) {
    return (
      <div className="dashboard-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Loading user data...</p>
      </div>
    );
  }

  if (!targetUser) {
    return (
      <div className="dashboard-page">
        <p>User not found.</p>
        <button className="btn-secondary" onClick={() => navigate('/admin/users')}>Back to Users</button>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            className="btn-secondary" 
            style={{ padding: '0.5rem', borderRadius: '50%' }}
            onClick={() => navigate('/admin/users')}
            title="Back to Users"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="page-title">{targetUser.name}'s Dashboard</h1>
            <p className="page-subtitle">{targetUser.email} &bull; {targetUser.role === 'admin' ? 'Administrator' : 'Employee'}</p>
          </div>
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

      {/* Status Banner */}
      <div className="clock-banner" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', color: 'var(--text-color)' }}>
        <div className="clock-display">
          <div className="clock-time" style={{ color: 'var(--text-color)', fontSize: '1.5rem' }}>Current Status</div>
        </div>
        <div className="clock-status-area">
          <div className="tracking-pill" style={{ 
            background: activeSession?.status === 'out_of_shift' ? 'rgba(107, 114, 128, 0.2)' :
                        activeSession?.status === 'idle' ? 'rgba(245, 158, 11, 0.2)' :
                        activeSession?.status === 'away' ? 'rgba(239, 68, 68, 0.2)' :
                        activeSession?.status === 'unproductive' ? 'rgba(220, 38, 38, 0.2)' :
                        'rgba(74, 222, 128, 0.2)',
            color: 'var(--text-color)'
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
                 activeSession.status === 'unproductive' ? '⚠ Unproductive Activity' : 'Active Working')
              : 'Agent Not Running / No Session'}
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="stats-grid">
        <div className="stat-card card-start">
          <div className="stat-card-top-bar" />
          <div className="stat-card-header">
            <span className="stat-label">Start Time</span>
            <div className="stat-icon icon-start"><LogIn size={16} /></div>
          </div>
          <div className="stat-value">{loading ? '—' : (activeSession ? formatTime(new Date(activeSession.startTime)) : '—')}</div>
          <div className="stat-meta">{loading ? 'Loading...' : activeSession ? <span className="stat-badge badge-active">● Session running</span> : 'No active session'}</div>
        </div>

        <div className="stat-card card-end">
          <div className="stat-card-top-bar" />
          <div className="stat-card-header">
            <span className="stat-label">End Time</span>
            <div className="stat-icon icon-end"><LogOut size={16} /></div>
          </div>
          <div className="stat-value">—</div>
          <div className="stat-meta">Session in progress</div>
        </div>

        <div className="stat-card card-active">
          <div className="stat-card-top-bar" />
          <div className="stat-card-header">
            <span className="stat-label">Active Time</span>
            <div className="stat-icon icon-active"><Timer size={16} /></div>
          </div>
          <div className="stat-value">{loading ? '—' : formatDuration(localActiveSecs)}</div>
          <div className="stat-meta">{loading ? 'Loading...' : activeSession?.status === 'active' ? <span className="stat-badge badge-active">● Counting</span> : 'Paused'}</div>
        </div>

        <div className="stat-card card-idle">
          <div className="stat-card-top-bar" style={{ background: '#fbbf24' }} />
          <div className="stat-card-header">
            <span className="stat-label">Idle Time</span>
            <div className="stat-icon icon-idle" style={{ background: '#fffbeb', color: '#f59e0b' }}><Coffee size={16} /></div>
          </div>
          <div className="stat-value">{loading ? '—' : formatDuration(localIdleSecs)}</div>
          <div className="stat-meta">{loading ? 'Loading...' : activeSession?.status === 'idle' ? <span className="stat-badge badge-idle" style={{ background: '#fffbeb', color: '#d97706' }}>● Idle timer running</span> : 'Paused'}</div>
        </div>

        <div className="stat-card card-away">
          <div className="stat-card-top-bar" />
          <div className="stat-card-header">
            <span className="stat-label">Away Time</span>
            <div className="stat-icon icon-away"><Coffee size={16} /></div>
          </div>
          <div className="stat-value">{loading ? '—' : formatDuration(localAwaySecs)}</div>
          <div className="stat-meta">{loading ? 'Loading...' : activeSession?.status === 'away' ? <span className="stat-badge badge-end">● Away timer running</span> : activeSession ? 'Monitored by agent' : '—'}</div>
        </div>

        <div className="stat-card card-unproductive">
          <div className="stat-card-top-bar" />
          <div className="stat-card-header">
            <span className="stat-label">Unproductive</span>
            <div className="stat-icon icon-unproductive"><Ban size={16} /></div>
          </div>
          <div className="stat-value">{loading ? '—' : formatDuration(localUnproductiveSecs)}</div>
          <div className="stat-meta">{loading ? 'Loading...' : activeSession?.status === 'unproductive' ? <span className="stat-badge badge-unproductive">● Unproductive timer running</span> : activeSession ? 'Monitored by agent' : '—'}</div>
        </div>
      </div>

      {/* Session Log */}
      <div className="section-header">
        <span className="section-title">Session Log ({getShiftDisplayDate(currentShiftStr)})</span>
        <span className="section-count">{history.length} sessions</span>
      </div>

      <div className="log-card">
        {history.length === 0 ? (
          <div className="log-empty">
            <Clock size={36} strokeWidth={1.5} style={{ opacity: 0.25 }} />
            <p>No past sessions for this date.</p>
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
