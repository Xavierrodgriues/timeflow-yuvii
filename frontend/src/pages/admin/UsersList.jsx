import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../services/api';
import { Users, UserPlus, Clock, Mail, Lock, Shield, X, User, MoreVertical, Edit2, Trash2, AlertTriangle, Search } from 'lucide-react';
import '../../styles/dashboard.css'; // Reusing dashboard styles for consistency

export default function UsersList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'user' });
  const [editFormData, setEditFormData] = useState({ name: '', email: '', password: '', role: 'user' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenDropdownId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

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

  const handleEditInputChange = (e) => {
    setEditFormData({ ...editFormData, [e.target.name]: e.target.value });
    setError('');
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setEditFormData({ name: user.name, email: user.email, password: '', role: user.role });
    setError('');
    setShowEditModal(true);
  };

  const openDeleteModal = (user) => {
    setSelectedUser(user);
    setError('');
    setShowDeleteModal(true);
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

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!editFormData.name || !editFormData.email) {
      setError('Name and email are required.');
      return;
    }
    try {
      // Create payload. Only include password if it was typed
      const payload = { ...editFormData };
      if (!payload.password) {
        delete payload.password;
      }
      
      await adminApi.updateUser(selectedUser._id, payload);
      setShowEditModal(false);
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to update user');
    }
  };

  const handleDeleteUser = async () => {
    try {
      await adminApi.deleteUser(selectedUser._id);
      setShowDeleteModal(false);
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to delete user');
    }
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="dashboard-page">
      <div className="page-header" style={{ justifyContent: 'space-between', display: 'flex', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Users Management</h1>
          <p className="page-subtitle">Manage your team and view their tracking data</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div className="input-with-icon" style={{ width: '250px', display: 'flex', alignItems: 'center', height: '100%' }}>
            <Search size={16} className="input-icon" style={{ color: '#9ca3af', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="Search by name..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="dash-input"
              style={{ padding: '0.6rem 0.8rem 0.6rem 2.2rem', fontSize: '0.875rem', height: '40px', margin: 0 }}
            />
          </div>
          <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0 1rem', height: '40px', margin: 0 }} onClick={() => setShowAddModal(true)}>
            <UserPlus size={16} />
            Add Employee
          </button>
        </div>
      </div>

      <div className="log-card">
        {loading ? (
          <div className="log-empty">Loading users...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="log-empty">
            <Users size={36} strokeWidth={1.5} style={{ opacity: 0.25 }} />
            <p>No users found matching "{searchQuery}"</p>
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
              {filteredUsers.map((u) => (
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
                  <td style={{ position: 'relative' }}>
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <button 
                        className="btn-secondary" 
                        style={{ padding: '0.4rem', borderRadius: '8px', background: 'transparent', border: '1px solid transparent' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdownId(openDropdownId === u._id ? null : u._id);
                        }}
                      >
                        <MoreVertical size={18} style={{ color: 'var(--text-muted)' }} />
                      </button>
                      
                      {openDropdownId === u._id && (
                        <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '4px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', zIndex: 50, minWidth: '160px', overflow: 'hidden' }}>
                          <button 
                            className="dropdown-item"
                            style={{ width: '100%', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '0.875rem', color: '#374151', textAlign: 'left' }}
                            onClick={() => navigate(`/admin/users/${u._id}`)}
                          >
                            <Clock size={16} /> View Timers
                          </button>
                          <button 
                            className="dropdown-item"
                            style={{ width: '100%', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '0.875rem', color: '#374151', textAlign: 'left' }}
                            onClick={() => openEditModal(u)}
                          >
                            <Edit2 size={16} /> Edit Details
                          </button>
                          <div style={{ height: '1px', background: '#e5e7eb' }}></div>
                          <button 
                            className="dropdown-item"
                            style={{ width: '100%', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '0.875rem', color: '#ef4444', textAlign: 'left' }}
                            onClick={() => openDeleteModal(u)}
                          >
                            <Trash2 size={16} /> Delete User
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="modal-close-btn" onClick={() => setShowAddModal(false)}>
              <X size={20} />
            </button>
            <div className="modal-header">
              <div className="modal-icon-wrapper">
                <UserPlus size={28} strokeWidth={2.5} />
              </div>
              <h2 className="modal-title">Add New Employee</h2>
              <p className="modal-subtitle">Fill in the details to create a new team member account.</p>
            </div>
            
            {error && (
              <div style={{ background: '#fef2f2', color: '#dc2626', padding: '0.75rem', borderRadius: '8px', fontSize: '0.875rem', marginBottom: '1.5rem', border: '1px solid #f87171', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Shield size={16} />
                {error}
              </div>
            )}
            
            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="dash-form-group">
                <label className="dash-label">Full Name</label>
                <div className="input-with-icon">
                  <User size={18} className="input-icon" />
                  <input 
                    type="text" name="name" value={formData.name} onChange={handleInputChange}
                    className="dash-input" placeholder="e.g. Jane Doe"
                    required
                  />
                </div>
              </div>
              <div className="dash-form-group">
                <label className="dash-label">Email Address</label>
                <div className="input-with-icon">
                  <Mail size={18} className="input-icon" />
                  <input 
                    type="email" name="email" value={formData.email} onChange={handleInputChange}
                    className="dash-input" placeholder="jane@example.com"
                    required
                  />
                </div>
              </div>
              <div className="dash-form-group">
                <label className="dash-label">Password</label>
                <div className="input-with-icon">
                  <Lock size={18} className="input-icon" />
                  <input 
                    type="password" name="password" value={formData.password} onChange={handleInputChange}
                    className="dash-input" placeholder="Min. 6 characters"
                    required minLength={6}
                  />
                </div>
              </div>
              <div className="dash-form-group">
                <label className="dash-label">Role</label>
                <div className="input-with-icon">
                  <Shield size={18} className="input-icon" />
                  <select 
                    name="role" value={formData.role} onChange={handleInputChange}
                    className="dash-input"
                  >
                    <option value="user">Employee</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn-confirm">
                  <UserPlus size={18} />
                  Create Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <button className="modal-close-btn" onClick={() => setShowEditModal(false)}>
              <X size={20} />
            </button>
            <div className="modal-header">
              <div className="modal-icon-wrapper" style={{ background: '#ecfdf5', color: '#10b981', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)' }}>
                <Edit2 size={24} strokeWidth={2.5} />
              </div>
              <h2 className="modal-title">Edit Employee Details</h2>
              <p className="modal-subtitle">Update information for {selectedUser?.name}</p>
            </div>
            
            {error && (
              <div style={{ background: '#fef2f2', color: '#dc2626', padding: '0.75rem', borderRadius: '8px', fontSize: '0.875rem', marginBottom: '1.5rem', border: '1px solid #f87171', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Shield size={16} />
                {error}
              </div>
            )}
            
            <form onSubmit={handleUpdateUser} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="dash-form-group">
                <label className="dash-label">Full Name</label>
                <div className="input-with-icon">
                  <User size={18} className="input-icon" />
                  <input 
                    type="text" name="name" value={editFormData.name} onChange={handleEditInputChange}
                    className="dash-input" placeholder="e.g. Jane Doe"
                    required
                  />
                </div>
              </div>
              <div className="dash-form-group">
                <label className="dash-label">Email Address</label>
                <div className="input-with-icon">
                  <Mail size={18} className="input-icon" />
                  <input 
                    type="email" name="email" value={editFormData.email} onChange={handleEditInputChange}
                    className="dash-input" placeholder="jane@example.com"
                    required
                  />
                </div>
              </div>
              <div className="dash-form-group">
                <label className="dash-label">New Password (Optional)</label>
                <div className="input-with-icon">
                  <Lock size={18} className="input-icon" />
                  <input 
                    type="password" name="password" value={editFormData.password} onChange={handleEditInputChange}
                    className="dash-input" placeholder="Leave blank to keep current password"
                    minLength={6}
                  />
                </div>
                <small style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  Only fill this if you want to change the user's password.
                </small>
              </div>
              <div className="dash-form-group">
                <label className="dash-label">Role</label>
                <div className="input-with-icon">
                  <Shield size={18} className="input-icon" />
                  <select 
                    name="role" value={editFormData.role} onChange={handleEditInputChange}
                    className="dash-input"
                  >
                    <option value="user">Employee</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="submit" className="btn-confirm" style={{ background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)' }}>
                  <Edit2 size={18} />
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center' }}>
            <div className="modal-icon-wrapper" style={{ background: '#fef2f2', color: '#ef4444', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.15)' }}>
              <AlertTriangle size={28} strokeWidth={2.5} />
            </div>
            <h2 className="modal-title">Delete Employee</h2>
            <p className="modal-subtitle" style={{ marginBottom: '1.5rem', lineHeight: '1.5' }}>
              Are you sure you want to delete <strong>{selectedUser?.name}</strong>? This action cannot be undone and will permanently remove their account and all associated time logs.
            </p>
            
            {error && (
              <div style={{ background: '#fef2f2', color: '#dc2626', padding: '0.75rem', borderRadius: '8px', fontSize: '0.875rem', marginBottom: '1.5rem', border: '1px solid #f87171' }}>
                {error}
              </div>
            )}
            
            <div className="modal-actions" style={{ marginTop: '2rem' }}>
              <button className="btn-cancel" onClick={() => setShowDeleteModal(false)}>Cancel</button>
              <button 
                className="btn-confirm" 
                onClick={handleDeleteUser}
                style={{ background: 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.25)' }}
              >
                <Trash2 size={18} />
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
