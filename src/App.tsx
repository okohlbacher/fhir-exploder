import { useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './components/dashboard/DashboardPage';
import { SettingsPage } from './components/settings/SettingsPage';
import { useSettings } from './hooks/useSettings';
import { useConnection } from './hooks/useConnection';

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
  const { settings, usingDefaults } = useSettings();
  const connection = useConnection();

  const handleConnect = useCallback(() => {
    if (settings) {
      connection.connect(settings);
    }
  }, [settings, connection]);

  const connectionStatus = connection.state.status;

  return (
    <Routes>
      <Route element={<AppLayout connectionStatus={connectionStatus} />}>
        <Route
          index
          element={
            <DashboardPage
              settings={settings}
              usingDefaults={usingDefaults}
              connectionState={connection.state}
              onConnect={handleConnect}
            />
          }
        />
        <Route
          path="/settings"
          element={<SettingsPage settings={settings} usingDefaults={usingDefaults} />}
        />
        <Route path="/explorer" element={<ExplorerPage />} />
        <Route path="/patients" element={<PatientsPage />} />
        <Route path="/quality" element={<QualityPage />} />
      </Route>
    </Routes>
  );
}

export default App;
