import { useState, useEffect } from 'react';
import { adminApi } from '../../services/api';
import { Settings, ShieldAlert, Plus, X, ServerCrash } from 'lucide-react';
import '../../styles/dashboard.css';

export default function AdminSettings() {
  const [keywords, setKeywords] = useState([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchConfig = async () => {
    try {
      const data = await adminApi.getUnproductiveConfig();
      if (data.success) {
        setKeywords(data.keywords || []);
      }
    } catch (err) {
      console.error('Failed to fetch config:', err);
      setError('Failed to load configuration. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleAddKeyword = async (e) => {
    e?.preventDefault();
    if (!newKeyword.trim()) return;

    const trimmed = newKeyword.trim().toLowerCase();
    if (keywords.includes(trimmed)) {
      setError(`"${trimmed}" is already in the list.`);
      return;
    }

    const updatedKeywords = [...keywords, trimmed];
    await saveConfig(updatedKeywords);
    setNewKeyword('');
  };

  const handleRemoveKeyword = async (keywordToRemove) => {
    const updatedKeywords = keywords.filter(k => k !== keywordToRemove);
    await saveConfig(updatedKeywords);
  };

  const saveConfig = async (updatedKeywords) => {
    setSaving(true);
    setError('');
    setSuccessMsg('');
    try {
      await adminApi.updateUnproductiveConfig(updatedKeywords);
      setKeywords(updatedKeywords);
      setSuccessMsg('Configuration saved successfully.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update configuration.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">System Settings</h1>
          <p className="page-subtitle">Configure application tracking rules</p>
        </div>
      </div>

      <div className="log-card" style={{ padding: '2rem', maxWidth: '800px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{ background: '#fef2f2', color: '#dc2626', padding: '0.75rem', borderRadius: '12px' }}>
            <ShieldAlert size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#111827', margin: 0 }}>Unproductive Applications & Websites</h2>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0.2rem 0 0 0' }}>
              When the tracking agent detects these process names or domains in the active window, it categorizes the time as "Unproductive". 
            </p>
          </div>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.875rem', marginBottom: '1.5rem', border: '1px solid #f87171', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ServerCrash size={16} />
            {error}
          </div>
        )}

        {successMsg && (
          <div style={{ background: '#ecfdf5', color: '#059669', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.875rem', marginBottom: '1.5rem', border: '1px solid #34d399' }}>
            {successMsg}
          </div>
        )}

        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem' }}>
          <form onSubmit={handleAddKeyword} style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
            <input 
              type="text" 
              placeholder="e.g. netflix.com or steam.exe" 
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              className="dash-input"
              style={{ flex: 1 }}
              disabled={loading || saving}
            />
            <button 
              type="submit" 
              className="btn-primary" 
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0 1.5rem', height: '44px' }}
              disabled={loading || saving || !newKeyword.trim()}
            >
              <Plus size={18} />
              Add Keyword
            </button>
          </form>

          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '1rem' }}>
              Active Keywords ({keywords.length})
            </h3>
            
            {loading ? (
              <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>Loading configuration...</div>
            ) : keywords.length === 0 ? (
              <div style={{ color: '#6b7280', fontSize: '0.9rem', padding: '1rem', background: '#fff', borderRadius: '8px', border: '1px dashed #d1d5db', textAlign: 'center' }}>
                No unproductive keywords configured. App will track everything as active/idle.
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {keywords.map(keyword => (
                  <div 
                    key={keyword} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.5rem', 
                      background: '#ffffff', 
                      border: '1px solid #e5e7eb', 
                      padding: '0.4rem 0.5rem 0.4rem 0.8rem', 
                      borderRadius: '999px',
                      fontSize: '0.85rem',
                      color: '#374151',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                    }}
                  >
                    <span>{keyword}</span>
                    <button 
                      onClick={() => handleRemoveKeyword(keyword)}
                      disabled={saving}
                      style={{ 
                        background: '#fef2f2', 
                        color: '#ef4444', 
                        border: 'none', 
                        width: '22px', 
                        height: '22px', 
                        borderRadius: '50%', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => {
                        if (!saving) {
                          e.currentTarget.style.background = '#fee2e2';
                          e.currentTarget.style.color = '#dc2626';
                        }
                      }}
                      onMouseOut={(e) => {
                         if (!saving) {
                          e.currentTarget.style.background = '#fef2f2';
                          e.currentTarget.style.color = '#ef4444';
                         }
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '1.25rem' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e40af', marginBottom: '0.5rem' }}>How it works</h3>
          <ul style={{ fontSize: '0.85rem', color: '#1e3a8a', paddingLeft: '1.5rem', margin: 0, lineHeight: '1.6' }}>
            <li>Desktop apps: Match the exact process name (e.g. <code>discord.exe</code> or <code>Spotify</code> on Mac).</li>
            <li>Websites: Match the domain name or title (e.g. <code>facebook</code> or <code>instagram.com</code>).</li>
            <li>Matches are case-insensitive.</li>
            <li>The desktop agent pulls these keywords automatically every 30 seconds.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
