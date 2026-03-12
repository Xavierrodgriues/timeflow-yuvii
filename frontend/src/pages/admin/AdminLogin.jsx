import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Clock, ShieldCheck } from 'lucide-react';
import '../../styles/auth.css';

export default function AdminLogin() {
  const { adminLogin } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanEmail = form.email.trim();
    const cleanPassword = form.password.trim();
    
    if (!cleanEmail || !cleanPassword) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    const result = await adminLogin({ email: cleanEmail, password: cleanPassword });
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      navigate('/admin/users');
    }
  };

  return (
    <div className="auth-page" style={{ 
      background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(59, 130, 246, 0.1))' 
    }}>
      <div className="auth-card" style={{ borderTop: '4px solid #a855f7' }}>
        <div className="auth-logo">
          <div className="auth-logo-icon" style={{ background: '#f3e8ff', color: '#a855f7' }}>
            <ShieldCheck size={20} />
          </div>
          <span className="auth-logo-name">TimeTracker <span style={{ fontSize: '0.8rem', opacity: 0.7, fontWeight: 'normal' }}>Admin</span></span>
        </div>

        <h1 className="auth-title">Administrator Portal</h1>
        <p className="auth-subtitle">Sign in to manage your organization</p>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Admin Email</label>
            <input
              id="email"
              className="form-input"
              type="email"
              name="email"
              placeholder="admin@example.com"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              className="form-input"
              type="password"
              name="password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              autoComplete="current-password"
            />
          </div>

          <button className="btn-primary" type="submit" disabled={loading} style={{ background: '#a855f7' }}>
            {loading ? 'Authenticating…' : 'Secure Sign In'}
          </button>
        </form>

        <p className="auth-footer" style={{ marginTop: '2rem' }}>
          <a href="/login" style={{ color: 'var(--text-muted)' }}>← Go back to employee login</a>
        </p>
      </div>
    </div>
  );
}
