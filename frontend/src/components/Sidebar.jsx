import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  BarChart2,
  Users,
  Settings,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Clock,
} from 'lucide-react';
import '../styles/sidebar.css';

const userNavItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Reports',   icon: BarChart2,       path: '/reports' },
  { label: 'Team',      icon: Users,           path: '/team' },
  { label: 'Settings',  icon: Settings,        path: '/settings' },
  { label: 'Profile',   icon: User,            path: '/profile' },
];

const adminNavItems = [
  { label: 'Users Mgt', icon: Users,           path: '/admin/users' },
  { label: 'Settings',  icon: Settings,        path: '/settings' },
  { label: 'Profile',   icon: User,            path: '/profile' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const initial = user?.name ? user.name[0].toUpperCase() : '?';
  const roleDisplay = user?.role === 'admin' ? 'Administrator' : 'Team Member';
  const navItems = user?.role === 'admin' ? adminNavItems : userNavItems;

  const handleNav = (path) => navigate(path);
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="logo-icon"><Clock size={18} /></div>
          <span className="logo-text">TimeTracker</span>
        </div>
        <button
          className="sidebar-toggle"
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </div>

      <nav className="sidebar-nav">
        <span className="sidebar-section-label">Main Menu</span>
        {navItems.map(({ label, icon: Icon, path }) => (
          <button
            key={path}
            className={`nav-item${location.pathname === path ? ' active' : ''}`}
            onClick={() => handleNav(path)}
            title={collapsed ? label : undefined}
          >
            <Icon className="nav-icon" size={18} />
            <span className="nav-label">{label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="user-avatar">{initial}</div>
          <div className="user-info">
            <div className="user-name">{user?.name}</div>
            <div className="user-role">{roleDisplay}</div>
          </div>
        </div>
        <button
          className="nav-item logout"
          onClick={handleLogout}
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut className="nav-icon" size={18} />
          <span className="nav-label">Logout</span>
        </button>
      </div>
    </aside>
  );
}
