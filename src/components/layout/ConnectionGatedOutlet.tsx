/**
 * ConnectionGatedOutlet — render-prop primitive that dedupes the
 * "Not connected" alert block previously triplicated across
 * ExplorerLayout, PatientsLayout, and QualityLayout (Plan 26-01 / SHELL-01).
 *
 * Ownership (D-02 — EXPLICIT):
 *   Owns ONLY the "Not connected" alert. Does NOT wrap the Medplum
 *   React-context provider. That provider remains wherever each caller
 *   chooses — typically in the layout's connected-branch render-prop
 *   return, or at AppLayout.tsx root. This primitive never imports the
 *   Medplum React provider.
 *
 * API (D-01):
 *   - Default form: `<ConnectionGatedOutlet />` — renders `<Outlet />`
 *     when connected, canonical alert when not.
 *   - Render-prop form: `<ConnectionGatedOutlet render={(connected) => ...} />`
 *     — caller fully controls both branches. The typical layout use case
 *     is the render-prop form, because each layout wraps the connected
 *     branch with a layout-specific Medplum-provider + Outlet-context.
 *
 * Canonical alert copy (D-04) is lifted verbatim from the pre-migration
 * QualityLayout.tsx:85-101 — same icon, same color, same copy, same link.
 * All three pre-migration layouts had byte-identical alert blocks; this
 * primitive is their single source of truth.
 */
import { type ReactNode } from 'react';
import { Alert, Stack, Text } from '@mantine/core';
import { IconPlugConnectedX } from '@tabler/icons-react';
import { Link, Outlet } from 'react-router-dom';
import { useConnection } from '../../hooks/useConnection';

export interface ConnectionGatedOutletProps {
  /**
   * Optional render-prop override. Receives `connected` (true when
   * `useConnection().state.status === 'connected'`) and returns the
   * node to render. If omitted, default behavior is connected → Outlet,
   * disconnected → canonical alert.
   */
  render?: (connected: boolean) => ReactNode;
}

export function ConnectionGatedOutlet({
  render,
}: ConnectionGatedOutletProps = {}): JSX.Element {
  const { state } = useConnection();
  const connected = state.status === 'connected';

  if (render) {
    return <>{render(connected)}</>;
  }

  if (connected) {
    return <Outlet />;
  }

  return (
    <Stack gap="lg" p="xl">
      <Alert
        variant="light"
        color="red"
        icon={<IconPlugConnectedX size={20} />}
        title="Not connected"
      >
        <Text size="sm">
          Not connected to a FHIR server. Return to the{' '}
          <Link to="/" style={{ color: 'var(--mantine-color-blue-6)' }}>
            dashboard
          </Link>{' '}
          to connect.
        </Text>
      </Alert>
    </Stack>
  );
}
