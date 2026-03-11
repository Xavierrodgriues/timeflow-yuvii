import { User } from 'lucide-react';
import '../styles/dashboard.css';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user } = useAuth();
  return (
    <div className="stub-page">
      <User size={48} style={{ opacity: 0.2 }} />
      <h2>Profile</h2>
      <p>Logged in as <strong>{user?.name}</strong> ({user?.email})</p>
      <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
        Profile management — coming soon.
      </p>
    </div>
  );
}
