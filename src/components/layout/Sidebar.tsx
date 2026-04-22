import { useState } from 'react';
import { AppShell, Box, Group, NavLink, Stack, Text, UnstyledButton } from '@mantine/core';
import {
  IconDashboard,
  IconDatabase,
  IconUsers,
  IconUsersGroup,
  IconChartBar,
  IconSettings,
} from '@tabler/icons-react';
import { NavLink as RouterNavLink, useMatch } from 'react-router-dom';
import { useTerminologyHealth } from '../../hooks/useTerminologyHealth';
import { TERMINOLOGY_STATUS_CONFIG } from '../../terminology/statusConfig';
import { FhirSettingsModal } from '../settings/FhirSettingsModal';
import { TerminologySettingsModal } from '../settings/TerminologySettingsModal';

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';

interface SidebarProps {
  connectionStatus: ConnectionStatus;
}

const STATUS_CONFIG: Record<
  ConnectionStatus,
  { color: string; label: string; pulse: boolean }
> = {
  idle: { color: '#adb5bd', label: 'FHIR server: Not connected', pulse: false },
  connecting: { color: '#adb5bd', label: 'FHIR server: Connecting…', pulse: true },
  connected: { color: '#40c057', label: 'FHIR server: Connected', pulse: false },
  error: { color: '#fa5252', label: 'FHIR server: Unreachable', pulse: false },
};

/**
 * Per-item descriptor. `exact: true` activates the row ONLY on an exact
 * path match (useMatch `end: true`). Undefined / false activates the row
 * on the path OR any descendant (useMatch `end: false`) — used for
 * section roots whose children should highlight the parent row.
 */
type NavItem = {
  label: string;
  icon: typeof IconDashboard;
  to: string;
  exact?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: IconDashboard, to: '/', exact: true },
  { label: 'Explorer', icon: IconDatabase, to: '/explorer' },
  { label: 'Patients', icon: IconUsers, to: '/patients' },
  { label: 'Quality', icon: IconChartBar, to: '/quality' },
  { label: 'Cohorts', icon: IconUsersGroup, to: '/quality/cohorts', exact: true },
];

/**
 * One sidebar nav row. Computes its own `active` state via `useMatch`,
 * so nested routes (e.g. `/patients/123`) highlight their section root
 * (e.g. the Patients row at `/patients`) without a custom matcher.
 *
 * **Option B — most-specific-wins.** The Quality row at `/quality` has
 * `exact: false`, so `useMatch({ path: '/quality', end: false })` also
 * matches `/quality/cohorts` by descendant rules. We suppress that by
 * subtracting a Cohorts-descendant match: when the user is anywhere
 * under `/quality/cohorts`, the Quality row's active state is forced
 * to false — only the Cohorts row lights up. ROADMAP Phase 26 success
 * criterion #3 says 'section root' (singular), which this enforces.
 *
 * Note on the Mantine NavLink + RouterNavLink composition: `@mantine/core`
 * NavLink with `component={RouterNavLink}` does NOT pass through
 * react-router's render-prop `isActive`, so we drive `active` via the
 * `useMatch` hook at this row level.
 */
function SidebarRow({ item }: { item: NavItem }) {
  const match = useMatch({ path: item.to, end: item.exact ?? false });
  // Option B: suppress the Quality section when a Cohorts descendant is
  // active. `/quality/cohorts` highlights ONLY Cohorts.
  const cohortsMatch = useMatch({ path: '/quality/cohorts', end: false });
  const active =
    item.to === '/quality' ? !!match && !cohortsMatch : !!match;
  return (
    <NavLink
      component={RouterNavLink}
      to={item.to}
      label={item.label}
      leftSection={<item.icon size={20} />}
      active={active}
    />
  );
}

export function Sidebar({ connectionStatus }: SidebarProps) {
  const status = STATUS_CONFIG[connectionStatus];
  const termHealth = useTerminologyHealth();
  const termStatus = TERMINOLOGY_STATUS_CONFIG[termHealth];

  // Settings row is the second exact-match site (was Sidebar.tsx:115 using
  // the old exact pathname comparison against '/settings'). Migrated to
  // useMatch end:true to match the NAV_ITEMS pattern; no sub-routes exist
  // under /settings, so end:true is behaviourally identical to the prior
  // check.
  const settingsMatch = useMatch({ path: '/settings', end: true });

  const [fhirModalOpen, setFhirModalOpen] = useState(false);
  const [termModalOpen, setTermModalOpen] = useState(false);

  return (
    <>
      <AppShell.Section p="md">
        <Text fw={600} size="lg">
          FHIR Exploder
        </Text>
        <Stack gap="xs" mt="xs">
          <UnstyledButton onClick={() => setFhirModalOpen(true)}>
            <Group gap="xs">
              <Box
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: status.color,
                  animation: status.pulse
                    ? 'pulse 1.5s ease-in-out infinite'
                    : undefined,
                }}
              />
              <Text size="xs" c="dimmed" td="underline" style={{ cursor: 'pointer' }}>
                {status.label}
              </Text>
            </Group>
          </UnstyledButton>
          <UnstyledButton onClick={() => setTermModalOpen(true)}>
            <Group gap="xs">
              <Box
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: termStatus.color,
                  animation: termStatus.pulse
                    ? 'pulse 1.5s ease-in-out infinite'
                    : undefined,
                }}
              />
              <Text size="xs" c="dimmed" td="underline" style={{ cursor: 'pointer' }}>
                {termStatus.label}
              </Text>
            </Group>
          </UnstyledButton>
        </Stack>
      </AppShell.Section>

      <AppShell.Section grow>
        {NAV_ITEMS.map((item) => (
          <SidebarRow key={item.to} item={item} />
        ))}
      </AppShell.Section>

      <AppShell.Section>
        <NavLink
          component={RouterNavLink}
          to="/settings"
          label="Settings"
          leftSection={<IconSettings size={20} />}
          active={!!settingsMatch}
        />
      </AppShell.Section>

      <FhirSettingsModal opened={fhirModalOpen} onClose={() => setFhirModalOpen(false)} />
      <TerminologySettingsModal opened={termModalOpen} onClose={() => setTermModalOpen(false)} />
    </>
  );
}
