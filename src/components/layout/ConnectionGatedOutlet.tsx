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
 *   - Children form: `<ConnectionGatedOutlet>{customConnectedTree}</ConnectionGatedOutlet>`
 *     — children replace the default connected branch (the `<Outlet />`);
 *     disconnected branch still renders the canonical alert. This is the
 *     typical layout use case — each layout's connected tree wraps an
 *     <Outlet> with its own Medplum-provider + Outlet-context, but the
 *     disconnected alert stays de-duplicated.
 *   - Render-prop form: `<ConnectionGatedOutlet render={(connected) => ...} />`
 *     — full override of BOTH branches. Use when the caller needs custom
 *     disconnected UI too.
 *   - Precedence: `render` > `children` > defaults.
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
   * Optional render-prop override — full control of BOTH branches.
   * Receives `connected` (true when
   * `useConnection().state.status === 'connected'`) and returns the
   * node to render. Takes precedence over `children` if both are provided.
   */
  render?: (connected: boolean) => ReactNode;
  /**
   * Optional connected-branch replacement. When provided, renders in
   * place of the default `<Outlet />` while connected; the disconnected
   * branch still shows the canonical alert. Typical layout use.
   */
  children?: ReactNode;
}

export function ConnectionGatedOutlet({
  render,
  children,
}: ConnectionGatedOutletProps = {}): JSX.Element {
  const { state } = useConnection();
  const connected = state.status === 'connected';

  if (render) {
    return <>{render(connected)}</>;
  }

  if (connected) {
    return <>{children ?? <Outlet />}</>;
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
