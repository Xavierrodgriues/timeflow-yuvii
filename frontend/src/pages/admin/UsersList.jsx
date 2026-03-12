import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../services/api';
import { Users, UserPlus, Clock } from 'lucide-react';
import '../../styles/dashboard.css'; // Reusing dashboard styles for consistency

export default function UsersList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'user' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchUsers = async () => {
    try {
      const data = await adminApi.getUsers();
      setUsers(data.users || []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) {
      setError('Please fill in all required fields.');
      return;
    }
    try {
      await adminApi.createUser(formData);
      setShowAddModal(false);
      setFormData({ name: '', email: '', password: '', role: 'user' });
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to create user');
    }
  };

  return (
    <div className="dashboard-page">
      <div className="page-header" style={{ justifyContent: 'space-between', display: 'flex' }}>
        <div>
          <h1 className="page-title">Users Management</h1>
          <p className="page-subtitle">Manage your team and view their tracking data</p>
        </div>
        <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', alignSelf: 'center', padding: '0.5rem 1rem' }} onClick={() => setShowAddModal(true)}>
          <UserPlus size={16} />
          Add Employee
        </button>
      </div>

      <div className="log-card">
        {loading ? (
          <div className="log-empty">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="log-empty">
            <Users size={36} strokeWidth={1.5} style={{ opacity: 0.25 }} />
            <p>No users found.</p>
          </div>
        ) : (
          <table className="log-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id}>
                  <td style={{ fontWeight: 500 }}>{u.name}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{u.email}</td>
                  <td>
                    <span className={`chip ${u.role === 'admin' ? 'chip-purple' : 'chip-slate'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td>
                    <span className={`chip ${u.isActive ? 'chip-green' : 'chip-red'}`}>
                      {u.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td>
                    <button 
                      className="btn-secondary" 
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                      onClick={() => navigate(`/admin/users/${u._id}`)}
                    >
                      <Clock size={14} />
                      View Timers
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--card-bg)', padding: '2rem', borderRadius: '12px', width: '400px', border: '1px solid var(--border-color)', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Add New Employee</h2>
            {error && <div style={{ color: 'var(--accent-red)', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</div>}
            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Name</label>
                <input 
                  type="text" name="name" value={formData.name} onChange={handleInputChange}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-base)', color: 'var(--text-color)' }}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Email</label>
                <input 
                  type="email" name="email" value={formData.email} onChange={handleInputChange}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-base)', color: 'var(--text-color)' }}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Password</label>
                <input 
                  type="password" name="password" value={formData.password} onChange={handleInputChange}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-base)', color: 'var(--text-color)' }}
                  required minLength={6}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Role</label>
                <select 
                  name="role" value={formData.role} onChange={handleInputChange}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-base)', color: 'var(--text-color)' }}
                >
                  <option value="user">Employee</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
