import { useState, useEffect } from 'react';
import { claimApi } from '../services/api';
import { Clock, Plus, RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import '../styles/dashboard.css'; // Reusing dashboard styles for consistency

export default function Claims() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Form State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchClaims = async () => {
    try {
      setLoading(true);
      const res = await claimApi.getMy();
      setClaims(res.claims || []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load claims');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const h = parseInt(hours) || 0;
    const m = parseInt(minutes) || 0;

    if (h === 0 && m === 0) {
      alert("Please enter a valid duration.");
      return;
    }
    
    const durationSeconds = (h * 3600) + (m * 60);

    try {
      setSubmitting(true);
      await claimApi.create({ date, durationSeconds, reason });
      setHours('');
      setMinutes('');
      setReason('');
      fetchClaims(); // Refresh list
    } catch (err) {
      alert(err.message || "Failed to submit claim.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDuration = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'approved': return <CheckCircle size={16} style={{ color: 'var(--success-color)' }} />;
      case 'rejected': return <XCircle size={16} style={{ color: 'var(--danger-color)' }} />;
      default: return <RefreshCw size={16} style={{ color: 'var(--text-muted)' }} />;
    }
  };

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Time Claims</h1>
          <p className="page-subtitle">Request missing time to be added to your session.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Form Card */}
        <div className="log-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1.25rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '1.05rem', color: '#111827' }}>
            <div style={{ background: '#ecfdf5', color: '#10b981', padding: '0.3rem', borderRadius: '8px', display: 'flex' }}>
              <Plus size={16} />
            </div>
            New Claim
          </h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="dash-form-group">
              <label className="dash-label">Shift Date</label>
              <input 
                type="date" 
                className="dash-input" 
                value={date} 
                onChange={(e) => setDate(e.target.value)} 
                required 
              />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="dash-form-group">
                <label className="dash-label">Hours</label>
                <input 
                  type="number" 
                  min="0" 
                  max="24" 
                  className="dash-input" 
                  placeholder="0"
                  value={hours} 
                  onChange={(e) => setHours(e.target.value)} 
                />
              </div>
              <div className="dash-form-group">
                <label className="dash-label">Minutes</label>
                <input 
                  type="number" 
                  min="0" 
                  max="59" 
                  className="dash-input" 
                  placeholder="0"
                  value={minutes} 
                  onChange={(e) => setMinutes(e.target.value)} 
                />
              </div>
            </div>

            <div className="dash-form-group">
              <label className="dash-label">Reason</label>
              <textarea 
                className="dash-textarea" 
                placeholder="Why are you claiming this time?"
                rows="3"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="dash-btn" disabled={submitting} style={{ marginTop: '0.5rem' }}>
              {submitting ? 'Submitting...' : 'Submit Claim'}
            </button>
          </form>
        </div>

        {/* List Card */}
        <div>
          <div className="section-header">
            <span className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={16} style={{ color: 'var(--accent)' }}/> My Claims
            </span>
            <button className="shift-nav-btn" onClick={fetchClaims} title="Refresh">
              <RefreshCw size={14} />
            </button>
          </div>
          
          <div className="log-card">
            <table className="log-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Claimed Time</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Submitted At</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>Loading claims...</td></tr>
                ) : error ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--danger-color)' }}><AlertCircle size={16}/> {error}</td></tr>
                ) : claims.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ padding: 0 }}>
                      <div className="log-empty">
                        <Clock size={36} strokeWidth={1.5} style={{ opacity: 0.25 }} />
                        <p>You haven't submitted any time claims yet.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  claims.map(claim => (
                    <tr key={claim._id}>
                      <td style={{ fontWeight: 500 }}>{claim.date}</td>
                      <td><span className="chip chip-purple">{formatDuration(claim.durationSeconds)}</span></td>
                      <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={claim.reason}>
                        {claim.reason}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'capitalize' }}>
                          {getStatusIcon(claim.status)}
                          <span style={{ 
                            color: claim.status === 'approved' ? 'var(--success-color)' : 
                                   claim.status === 'rejected' ? 'var(--danger-color)' : 'var(--text-muted)'
                          }}>
                            {claim.status}
                          </span>
                        </div>
                      </td>
                      <td style={{ color: '#9ca3af', fontSize: '0.82rem' }}>
                        {new Date(claim.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
