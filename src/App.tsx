import { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import type { ConnectionStatus } from './components/layout/Sidebar';
import { loadSettings } from './config/settings';
import type { AppSettings } from './config/types';

function DashboardPage() {
  return <div>Dashboard</div>;
}

function SettingsPage() {
  return <div>Settings</div>;
}

function ExplorerPage() {
  return <div>Explorer (Phase 2)</div>;
}

function PatientsPage() {
  return <div>Patients (Phase 3)</div>;
}

function QualityPage() {
  return <div>Quality (Phase 5)</div>;
}

export function App() {
  const [_settings, setSettings] = useState<AppSettings | null>(null);
  const [_usingDefaults, setUsingDefaults] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');

  useEffect(() => {
    loadSettings().then(({ settings, usingDefaults }) => {
      setSettings(settings);
      setUsingDefaults(usingDefaults);
    });
  }, []);

  // connectionStatus will be wired in Plan 01-02 (connection flow)
  void setConnectionStatus;

  return (
    <Routes>
      <Route element={<AppLayout connectionStatus={connectionStatus} />}>
        <Route index element={<DashboardPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/explorer" element={<ExplorerPage />} />
        <Route path="/patients" element={<PatientsPage />} />
        <Route path="/quality" element={<QualityPage />} />
      </Route>
    </Routes>
  );
}

export default App;
