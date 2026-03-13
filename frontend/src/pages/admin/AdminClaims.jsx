import { useState, useEffect } from 'react';
import { adminApi } from '../../services/api';
import { ShieldCheck, RefreshCw, CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';
import '../../styles/dashboard.css'; 

export default function AdminClaims() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchClaims = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getClaims();
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

  const handleAction = async (id, status) => {
    if (!window.confirm(`Are you sure you want to ${status} this claim?`)) return;
    
    try {
      await adminApi.updateClaimStatus(id, status);
      fetchClaims();
    } catch (err) {
      alert(err.message || `Failed to ${status} claim`);
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
      default: return <Clock size={16} style={{ color: 'var(--warning-color)' }} />;
    }
  };

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Claims Management</h1>
          <p className="page-subtitle">Review and handle manual time claim requests from employees.</p>
        </div>
      </div>

      <div className="section-header">
        <span className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShieldCheck size={18} style={{ color: 'var(--accent)' }}/> All Employee Claims
        </span>
        <button className="shift-nav-btn" onClick={fetchClaims} title="Refresh">
          <RefreshCw size={14} />
        </button>
      </div>
        
      <div className="log-card">
        <table className="log-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Shift Date</th>
              <th>Claimed Time</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Reviewed By</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>Loading claims...</td></tr>
            ) : error ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--danger-color)' }}><AlertCircle size={16}/> {error}</td></tr>
            ) : claims.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ padding: 0 }}>
                  <div className="log-empty">
                    <Clock size={36} strokeWidth={1.5} style={{ opacity: 0.25 }} />
                    <p>No claims found.</p>
                  </div>
                </td>
              </tr>
            ) : (
              claims.map(claim => (
                <tr key={claim._id}>
                  <td style={{ fontWeight: 600 }}>
                    {claim.userId?.name || 'Unknown User'}
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{claim.userId?.email}</div>
                  </td>
                  <td style={{ fontWeight: 500 }}>{claim.date}</td>
                  <td><span className="chip chip-purple">{formatDuration(claim.durationSeconds)}</span></td>
                  <td style={{ maxWidth: '250px' }}>
                    <div style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>{claim.reason}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Requested: {new Date(claim.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td>
                    <div style={{ 
                      display: 'inline-flex', alignItems: 'center', gap: '6px', 
                      padding: '4px 8px', borderRadius: '4px',
                      textTransform: 'capitalize', fontSize: '0.85rem', fontWeight: 500,
                      backgroundColor: claim.status === 'approved' ? 'rgba(16, 185, 129, 0.1)' : 
                                       claim.status === 'rejected' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                      color: claim.status === 'approved' ? 'var(--success-color)' : 
                             claim.status === 'rejected' ? 'var(--danger-color)' : 'var(--warning-color)'
                    }}>
                      {getStatusIcon(claim.status)}
                      {claim.status}
                    </div>
                  </td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {claim.reviewedBy ? (
                      <>
                        <div style={{ fontWeight: 500 }}>{claim.reviewedBy.name}</div>
                        <div style={{ fontSize: '0.75rem' }}>{new Date(claim.reviewedAt).toLocaleDateString()}</div>
                      </>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {claim.status === 'pending' ? (
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button 
                          style={{ 
                            background: '#10b981', border: 'none', color: 'white', 
                            padding: '0.35rem 0.75rem', borderRadius: '6px', 
                            fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' 
                          }}
                          onClick={() => handleAction(claim._id, 'approved')}
                        >
                          Approve
                        </button>
                        <button 
                          style={{ 
                            background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', 
                            padding: '0.35rem 0.75rem', borderRadius: '6px', 
                            fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' 
                          }}
                          onClick={() => handleAction(claim._id, 'rejected')}
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Handled</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
