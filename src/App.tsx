import { useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './components/dashboard/DashboardPage';
import { SettingsPage } from './components/settings/SettingsPage';
import { ExplorerLayout } from './components/explorer/ExplorerLayout';
import { ResourceTypeLanding } from './components/explorer/ResourceTypeLanding';
import { SearchResultsPage } from './components/explorer/SearchResultsPage';
import { ResourceDetailPage } from './components/explorer/ResourceDetailPage';
import { ConnectionProvider } from './contexts/ConnectionContext';
import { useSettings } from './hooks/useSettings';
import { useConnection } from './hooks/useConnection';

function PatientsPage() {
  return <div>Patients (Phase 3)</div>;
}

function QualityPage() {
  return <div>Quality (Phase 5)</div>;
}

function AppRoutes() {
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
        <Route path="/explorer" element={<ExplorerLayout />}>
          <Route index element={<ResourceTypeLanding />} />
          <Route path=":resourceType" element={<SearchResultsPage />} />
          <Route path=":resourceType/:id" element={<ResourceDetailPage />} />
        </Route>
        <Route path="/patients" element={<PatientsPage />} />
        <Route path="/quality" element={<QualityPage />} />
      </Route>
    </Routes>
  );
}

export function App() {
  return (
    <ConnectionProvider>
      <AppRoutes />
    </ConnectionProvider>
  );
}

export default App;
