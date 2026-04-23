import { useState } from 'react';
import {
  AppShell,
  Badge,
  Box,
  Card,
  Group,
  NavLink,
  Stack,
  Text,
  UnstyledButton,
} from '@mantine/core';
import {
  IconDashboard,
  IconDatabase,
  IconUsers,
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
  { color: string; label: string; badge: string; badgeColor: string; pulse: boolean }
> = {
  idle: {
    color: '#adb5bd',
    label: 'FHIR server: Not connected',
    badge: 'Disconnected',
    badgeColor: 'gray',
    pulse: false,
  },
  connecting: {
    color: '#adb5bd',
    label: 'FHIR server: Connecting…',
    badge: 'Connecting',
    badgeColor: 'gray',
    pulse: true,
  },
  connected: {
    color: '#40c057',
    label: 'FHIR server: Connected',
    badge: 'Connected',
    badgeColor: 'green',
    pulse: false,
  },
  error: {
    color: '#fa5252',
    label: 'FHIR server: Unreachable',
    badge: 'Unreachable',
    badgeColor: 'red',
    pulse: false,
  },
};

/**
 * Per-item descriptor. `exact: true` activates the row ONLY on an exact
 * path match (useMatch `end: true`). Undefined / false activates the row
 * on the path OR any descendant (useMatch `end: false`) — used for
 * section roots whose children should highlight the parent row.
 *
 * `children` adds an expanded sub-nav when the user is anywhere under the
 * section's `to` path (Phase 30 redesign Step 1 — Quality gets Overview,
 * Cohorts, Thresholds children).
 */
type NavItem = {
  label: string;
  icon: typeof IconDashboard;
  to: string;
  exact?: boolean;
  children?: NavChild[];
};

type NavChild = {
  label: string;
  to: string;
  /**
   * When true, the child row's active state is also subtracted from the
   * parent row's active state (Option B — most-specific-wins). Defaults to
   * true for non-exact parent paths, which is what Quality / Cohorts /
   * Thresholds expect.
   */
  suppressParent?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: IconDashboard, to: '/', exact: true },
  { label: 'Explorer', icon: IconDatabase, to: '/explorer' },
  { label: 'Patients', icon: IconUsers, to: '/patients' },
  {
    label: 'Quality',
    icon: IconChartBar,
    to: '/quality',
    children: [
      { label: 'Overview', to: '/quality', suppressParent: false },
      { label: 'Cohorts', to: '/quality/cohorts', suppressParent: true },
      { label: 'Thresholds', to: '/quality/thresholds', suppressParent: true },
    ],
  },
];

/**
 * Styles for the active-row left rail (2px indigo) and panel bg. Applied via
 * Mantine's `styles` prop so we keep NavLink's native data-active contract
 * (the Sidebar.test.tsx suite asserts `data-active="true"` on active rows).
 */
const ACTIVE_ROW_STYLES = {
  root: {
    borderLeft: '2px solid transparent',
    paddingLeft: '10px',
  },
} as const;

function activeStylesWhen(active: boolean) {
  return active
    ? {
        root: {
          borderLeft: '2px solid var(--mantine-color-indigo-6)',
          paddingLeft: '10px',
          backgroundColor: 'var(--panel, #fff)',
        },
      }
    : ACTIVE_ROW_STYLES;
}

/**
 * Top-level sidebar nav row. Computes its own `active` state via `useMatch`,
 * so nested routes (e.g. `/patients/123`) highlight their section root
 * (e.g. the Patients row at `/patients`) without a custom matcher.
 *
 * **Option B — most-specific-wins.** For rows that have `children`, when the
 * user is under a child path whose `suppressParent` is true the parent row's
 * active state is forced to false — only the child row lights up. ROADMAP
 * Phase 26 success criterion #3 says 'section root' (singular), which this
 * enforces (now generalised for Thresholds as well as Cohorts).
 */
function SidebarRow({ item }: { item: NavItem }) {
  const match = useMatch({ path: item.to, end: item.exact ?? false });
  // Suppress the parent when a child with suppressParent=true is active.
  // Hooks must be called unconditionally — evaluate all potential children
  // every render, then decide.
  const cohortsMatch = useMatch({ path: '/quality/cohorts', end: false });
  const thresholdsMatch = useMatch({ path: '/quality/thresholds', end: false });
  const suppressed =
    item.to === '/quality' ? !!cohortsMatch || !!thresholdsMatch : false;
  const active = !!match && !suppressed;

  // Show children when the user is anywhere under `item.to` (any match,
  // including before suppression) — the sub-nav should expand on
  // /quality/cohorts and /quality/thresholds even though the parent row
  // itself is dimmed.
  const underSection = !!match;
  const children = item.children && underSection ? item.children : undefined;

  return (
    <>
      <NavLink
        component={RouterNavLink}
        to={item.to}
        label={item.label}
        leftSection={<item.icon size={20} />}
        active={active}
        styles={activeStylesWhen(active)}
      />
      {children?.map((child) => (
        <SidebarChildRow key={child.to} child={child} />
      ))}
    </>
  );
}

function SidebarChildRow({ child }: { child: NavChild }) {
  // Overview is exact-match on /quality; the other children default to
  // descendant-match. Infer from the path: children at the parent path use
  // exact (to avoid matching descendants); deeper paths use descendant.
  // Simpler heuristic: any child that also matches the parent path uses
  // exact=true. Here Overview has to='/quality' === parent → exact.
  const isOverview = child.to === '/quality';
  const match = useMatch({ path: child.to, end: isOverview });
  const active = !!match;
  return (
    <NavLink
      component={RouterNavLink}
      to={child.to}
      label={child.label}
      active={active}
      styles={activeStylesWhen(active)}
      // Indent children visually under the parent icon.
      pl={44}
    />
  );
}

export function Sidebar({ connectionStatus }: SidebarProps) {
  const status = STATUS_CONFIG[connectionStatus];
  const termHealth = useTerminologyHealth();
  const termStatus = TERMINOLOGY_STATUS_CONFIG[termHealth];

  const settingsMatch = useMatch({ path: '/settings', end: true });

  const [fhirModalOpen, setFhirModalOpen] = useState(false);
  const [termModalOpen, setTermModalOpen] = useState(false);

  return (
    <>
      <AppShell.Section p="md">
        <Text fw={600} size="lg">
          FHIR Exploder
        </Text>

        {/* Server card — consolidates the prior FHIR + Terminology status pills
            into a single surface. Clicking the FHIR row (or anywhere on the
            card header) opens the FHIR settings modal; clicking the
            Terminology row opens the terminology modal. Text strings
            ("FHIR server: X", "Terminology: Y") are preserved so the V-15
            sidebar terminology test contract still holds. */}
        <Card withBorder p="sm" radius="md" mt="xs">
          <Stack gap={6}>
            <UnstyledButton onClick={() => setFhirModalOpen(true)}>
              <Group justify="space-between" gap="xs" wrap="nowrap">
                <Text size="xs" fw={600} c="dimmed" tt="uppercase" lts="0.5px">
                  Server
                </Text>
                <Badge color={status.badgeColor} variant="light" size="xs">
                  {status.badge}
                </Badge>
              </Group>
            </UnstyledButton>

            <UnstyledButton onClick={() => setFhirModalOpen(true)}>
              <Group gap="xs" wrap="nowrap">
                <Box
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: status.color,
                    animation: status.pulse
                      ? 'pulse 1.5s ease-in-out infinite'
                      : undefined,
                    flexShrink: 0,
                  }}
                />
                <Text size="xs" c="dimmed" style={{ cursor: 'pointer' }}>
                  {status.label}
                </Text>
              </Group>
            </UnstyledButton>

            <UnstyledButton onClick={() => setTermModalOpen(true)}>
              <Group gap="xs" wrap="nowrap">
                <Box
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: termStatus.color,
                    animation: termStatus.pulse
                      ? 'pulse 1.5s ease-in-out infinite'
                      : undefined,
                    flexShrink: 0,
                  }}
                />
                <Text size="xs" c="dimmed" style={{ cursor: 'pointer' }}>
                  {termStatus.label}
                </Text>
              </Group>
            </UnstyledButton>
          </Stack>
        </Card>
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
          styles={activeStylesWhen(!!settingsMatch)}
        />
      </AppShell.Section>

      <FhirSettingsModal opened={fhirModalOpen} onClose={() => setFhirModalOpen(false)} />
      <TerminologySettingsModal opened={termModalOpen} onClose={() => setTermModalOpen(false)} />
    </>
  );
}
