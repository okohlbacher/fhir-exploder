import { useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './components/dashboard/DashboardPage';
import { SettingsPage } from './components/settings/SettingsPage';
import { ExplorerLayout } from './components/explorer/ExplorerLayout';
import { ResourceTypeLanding } from './components/explorer/ResourceTypeLanding';
import { SearchResultsPage } from './components/explorer/SearchResultsPage';
import { ResourceDetailPage } from './components/explorer/ResourceDetailPage';
import { PatientsLayout } from './components/patients/PatientsLayout';
import { PatientListPage } from './components/patients/PatientListPage';
import { PatientDetailPage } from './components/patients/PatientDetailPage';
import { QualityLayout } from './components/quality/QualityLayout';
import { QualityOverviewPage } from './components/quality/QualityOverviewPage';
import { ThresholdsPage } from './components/quality/ThresholdsPage';
import { CompletenessDrillDown } from './components/quality/CompletenessDrillDown';
import { CodingDrillDown } from './components/quality/CodingDrillDown';
import { PlausibilityDrillDown } from './components/quality/PlausibilityDrillDown';
import { LabRangesDrillDown } from './components/quality/LabRangesDrillDown';
import { DuplicatesDrillDown } from './components/quality/DuplicatesDrillDown';
import { ReferencesDrillDown } from './components/quality/ReferencesDrillDown';
import { ConnectionProvider } from './contexts/ConnectionContext';
import { TerminologyProvider } from './contexts/TerminologyContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { useSettings } from './hooks/useSettings';
import { useConnection } from './hooks/useConnection';

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
    <TerminologyProvider settings={settings}>
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
          <Route path="/patients" element={<PatientsLayout />}>
            <Route index element={<PatientListPage />} />
            <Route path=":patientId" element={<PatientDetailPage />} />
            <Route
              path=":patientId/:resourceType/:id"
              element={<ResourceDetailPage />}
            />
          </Route>
          <Route path="/quality" element={<QualityLayout />}>
            <Route index element={<QualityOverviewPage />} />
            <Route path="thresholds" element={<ThresholdsPage />} />
            <Route path="completeness/:type" element={<CompletenessDrillDown />} />
            <Route path="coding/:type" element={<CodingDrillDown />} />
            <Route path="plausibility/:type" element={<PlausibilityDrillDown />} />
            <Route path="lab-ranges" element={<LabRangesDrillDown />} />
            <Route path="duplicates" element={<DuplicatesDrillDown />} />
            <Route path="references/:type" element={<ReferencesDrillDown />} />
          </Route>
        </Route>
      </Routes>
    </TerminologyProvider>
  );
}

export function App() {
  return (
    <SettingsProvider>
      <ConnectionProvider>
        <AppRoutes />
      </ConnectionProvider>
    </SettingsProvider>
  );
}

export default App;
