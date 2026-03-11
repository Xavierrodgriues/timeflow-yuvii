import { Settings } from 'lucide-react';
import '../styles/dashboard.css';

export default function SettingsPage() {
  return (
    <div className="stub-page">
      <Settings size={48} style={{ opacity: 0.2 }} />
      <h2>Settings</h2>
      <p>Configure your preferences and integrations — coming soon.</p>
    </div>
  );
}
