import { Suspense } from 'react';
import { AppShell, Center, Loader } from '@mantine/core';
import { Outlet } from 'react-router-dom';
import { Sidebar, type ConnectionStatus } from './Sidebar';
import { FeedbackButton } from '../feedback/FeedbackButton';

interface AppLayoutProps {
  connectionStatus: ConnectionStatus;
}

/**
 * Suspense fallback for lazy-loaded routes (EFF-02 — Phase 27 Plan 02).
 *
 * Single global fallback at the AppLayout Outlet level — per 27-CONTEXT D-06.
 * The data-testid="route-loading" hook is REQUIRED so tests can assert the
 * fallback appears before the lazy chunk resolves (per D-09).
 *
 * Known limitation (React Router #12474, watchpoint): when navigating between
 * two already-resolved lazy routes, this fallback may execute but not render
 * visually because React Router keeps the previous route mounted until the
 * new chunk resolves. Initial mount works correctly. The mitigation
 * `<Suspense key={location.key}>` was deliberately NOT applied — it would
 * force a remount on every nav and harm UX even for cached chunks. Revisit
 * in v1.5 only if a user reports the missing-spinner UX during route nav.
 */
function RouteLoadingFallback() {
  return (
    <Center py="xl" data-testid="route-loading">
      <Loader size="md" />
    </Center>
  );
}

export function AppLayout({ connectionStatus }: AppLayoutProps) {
  return (
    <AppShell
      navbar={{ width: 240, breakpoint: 0 }}
      padding="lg"
    >
      <AppShell.Navbar bg="gray.0">
        <Sidebar connectionStatus={connectionStatus} />
      </AppShell.Navbar>
      <AppShell.Main>
        <Suspense fallback={<RouteLoadingFallback />}>
          <Outlet />
        </Suspense>
      </AppShell.Main>
      {import.meta.env.DEV && <FeedbackButton />}
    </AppShell>
  );
}
