import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import AdminLogin from './pages/admin/AdminLogin';
import Dashboard from './pages/Dashboard';
import Reports from './pages/Reports';
import Team from './pages/Team';
import SettingsPage from './pages/SettingsPage';
import Profile from './pages/Profile';
import UsersList from './pages/admin/UsersList';
import UserDetail from './pages/admin/UserDetail';
import Claims from './pages/Claims';
import AdminClaims from './pages/admin/AdminClaims';

import './index.css';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: 'var(--bg-base)', color: 'var(--text-muted)',
        fontSize: '0.9rem', fontFamily: 'Inter, sans-serif',
      }}>
        Loading…
      </div>
    );
  }
  return user ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) {
    return user.role === 'admin' ? <Navigate to="/admin/users" replace /> : <Navigate to="/" replace />;
  }
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login"       element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/admin/login" element={<PublicRoute><AdminLogin /></PublicRoute>} />

      <Route path="/" element={
        <ProtectedRoute>
          <Layout><Dashboard /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/reports" element={
        <ProtectedRoute>
          <Layout><Reports /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/team" element={
        <ProtectedRoute>
          <Layout><Team /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/settings" element={
        <ProtectedRoute>
          <Layout><SettingsPage /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/profile" element={
        <ProtectedRoute>
          <Layout><Profile /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/claims" element={
        <ProtectedRoute>
          <Layout><Claims /></Layout>
        </ProtectedRoute>
      } />

      {/* Admin Routes */}
      <Route path="/admin/users" element={
        <ProtectedRoute>
          <Layout><UsersList /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/admin/users/:userId" element={
        <ProtectedRoute>
          <Layout><UserDetail /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/admin/claims" element={
        <ProtectedRoute>
          <Layout><AdminClaims /></Layout>
        </ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
