import { lazy, useCallback, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
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
import { CohortsPage } from './components/quality/CohortsPage';
import { ConnectionProvider } from './contexts/ConnectionContext';
import { TerminologyProvider } from './contexts/TerminologyContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { useSettings } from './hooks/useSettings';
import { useConnection } from './hooks/useConnection';
import { retry } from './utils/lazyRetry';

// ----------------------------------------------------------------------------
// Lazy-loaded quality drill-downs (EFF-02 — Phase 27 Plan 02).
//
// Each `lazy(() => retry(() => import('...')))` declaration:
//   1. Splits the component into its own Vite chunk (initial bundle shrinks).
//   2. Wraps the dynamic import in `retry(...)` so a transient chunk-load
//      failure (stale CDN cache after deploy, flaky network) is retried
//      3 times with 100/300/900ms exponential backoff before surfacing.
//   3. Re-shapes the named export to React.lazy's required default-export
//      module shape — the components are exported by name (not default).
//
// IMPORTANT: lazy() MUST be called at module scope (outside any component
// body) so React's lazy cache deduplicates the import across re-renders and
// StrictMode double-invocation. See 27-RESEARCH.md Pitfall 2.
//
// FUTURE TESTERS: if you write a test that renders <App /> and asserts
// content from one of these routes, you MUST use `await findBy*` (not
// `getBy*`). The chunk loads asynchronously. See
// `src/__tests__/lazy-routes.test.tsx` for the canonical pattern.
//
// NOT lazy (per 27-CONTEXT D-05): QualityOverviewPage (index landing),
// CohortsPage, patient/explorer/settings/dashboard routes — these are
// landing pages users hit on first load; lazy-loading them would cost a
// spinner on initial nav.
// ----------------------------------------------------------------------------
const ThresholdsPage = lazy(() =>
  retry(() => import('./components/quality/ThresholdsPage')).then((m) => ({
    default: m.ThresholdsPage,
  })),
);
const CompletenessDrillDown = lazy(() =>
  retry(() => import('./components/quality/CompletenessDrillDown')).then((m) => ({
    default: m.CompletenessDrillDown,
  })),
);
const CodingDrillDown = lazy(() =>
  retry(() => import('./components/quality/CodingDrillDown')).then((m) => ({
    default: m.CodingDrillDown,
  })),
);
const PlausibilityDrillDown = lazy(() =>
  retry(() => import('./components/quality/PlausibilityDrillDown')).then((m) => ({
    default: m.PlausibilityDrillDown,
  })),
);
const LabRangesDrillDown = lazy(() =>
  retry(() => import('./components/quality/LabRangesDrillDown')).then((m) => ({
    default: m.LabRangesDrillDown,
  })),
);
const DuplicatesDrillDown = lazy(() =>
  retry(() => import('./components/quality/DuplicatesDrillDown')).then((m) => ({
    default: m.DuplicatesDrillDown,
  })),
);
const ReferencesDrillDown = lazy(() =>
  retry(() => import('./components/quality/ReferencesDrillDown')).then((m) => ({
    default: m.ReferencesDrillDown,
  })),
);
// Plan 44-02 (IPS-01): /quality/ips reachable via Sidebar + QualityOverviewPage link.
const IPSPanel = lazy(() =>
  retry(() => import('./components/quality/IPSPanel')).then((m) => ({
    default: m.default,
  })),
);
/**
 * Phase 54 (SHELL-03 / D-04): redirects legacy /graph routes to the
 * parent resource detail page with `?mode=graph`. ResourceDetailPage
 * owns the lazy graph view import internally now.
 */
export function NavigateToMode({ mode }: { mode: string }) {
  const { resourceType, id, patientId } = useParams<{
    resourceType: string;
    id: string;
    patientId?: string;
  }>();
  const target = patientId
    ? `/patients/${patientId}/${resourceType}/${id}?mode=${mode}`
    : `/explorer/${resourceType}/${id}?mode=${mode}`;
  return <Navigate to={target} replace />;
}

function AppRoutes() {
  const { settings, usingDefaults, loading } = useSettings();
  const connection = useConnection();

  const handleConnect = useCallback(() => {
    if (settings) {
      connection.connect(settings);
    }
  }, [settings, connection]);

  const connectionStatus = connection.state.status;

  // Auto-connect on startup: once settings finish loading, if a server URL is
  // configured and the connection is still idle, fire the same connect flow
  // the manual button uses. One-shot per app mount — on error the sidebar
  // indicator reflects "Unreachable" and the user can click Connect manually.
  const autoConnectFiredRef = useRef(false);
  useEffect(() => {
    if (loading) return;
    if (autoConnectFiredRef.current) return;
    if (!settings?.fhir?.serverUrl) return;
    if (connection.state.status !== 'idle') return;
    autoConnectFiredRef.current = true;
    connection.connect(settings);
  }, [loading, settings, connection]);

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
            <Route path=":resourceType/:id/graph" element={<NavigateToMode mode="graph" />} />
          </Route>
          <Route path="/patients" element={<PatientsLayout />}>
            <Route index element={<PatientListPage />} />
            <Route path=":patientId" element={<PatientDetailPage />} />
            <Route
              path=":patientId/:resourceType/:id"
              element={<ResourceDetailPage />}
            />
            <Route
              path=":patientId/:resourceType/:id/graph"
              element={<NavigateToMode mode="graph" />}
            />
          </Route>
          <Route path="/quality" element={<QualityLayout />}>
            <Route index element={<QualityOverviewPage />} />
            <Route path="thresholds" element={<ThresholdsPage />} />
            <Route path="cohorts" element={<CohortsPage />} />
            <Route path="completeness/:type" element={<CompletenessDrillDown />} />
            <Route path="coding/:type" element={<CodingDrillDown />} />
            <Route path="plausibility/:type" element={<PlausibilityDrillDown />} />
            <Route path="lab-ranges" element={<LabRangesDrillDown />} />
            <Route path="duplicates" element={<DuplicatesDrillDown />} />
            <Route path="references/:type" element={<ReferencesDrillDown />} />
            <Route path="ips" element={<IPSPanel />} />
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
