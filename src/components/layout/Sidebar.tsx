import { useState, useMemo } from 'react';
import {
  AppShell,
  Badge,
  Box,
  Card,
  Group,
  Kbd,
  NavLink,
  Stack,
  Switch,
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
import { openSpotlight } from '@mantine/spotlight';
import { useTerminologyHealth } from '../../hooks/useTerminologyHealth';
import { TERMINOLOGY_STATUS_CONFIG } from '../../terminology/statusConfig';
import { FhirSettingsModal } from '../settings/FhirSettingsModal';
import { TerminologySettingsModal } from '../settings/TerminologySettingsModal';
import { useExpertMode } from '../../contexts/ExpertModeContext';
import { useSettings } from '../../hooks/useSettings';
import { useConnectionContext } from '../../contexts/ConnectionContext';
import { useResourceCounts } from '../../hooks/useResourceCounts';
import { parseResourceTypes } from '../../fhir/capability';

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
      // Plan 44-02 (IPS-01): IPS Validator sub-nav under Quality cluster.
      { label: 'IPS Validator', to: '/quality/ips', suppressParent: true },
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
function SidebarRow({ item, rightSection }: { item: NavItem; rightSection?: React.ReactNode }) {
  const match = useMatch({ path: item.to, end: item.exact ?? false });
  // Suppress the parent when a child with suppressParent=true is active.
  // Hooks must be called unconditionally — evaluate all potential children
  // every render, then decide.
  const cohortsMatch = useMatch({ path: '/quality/cohorts', end: false });
  const thresholdsMatch = useMatch({ path: '/quality/thresholds', end: false });
  const ipsMatch = useMatch({ path: '/quality/ips', end: false });
  const suppressed =
    item.to === '/quality'
      ? !!cohortsMatch || !!thresholdsMatch || !!ipsMatch
      : false;
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
        rightSection={rightSection}
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

  // Phase 56 SIDE-02/SIDE-03/SIDE-04 additions
  const { isExpert, toggle } = useExpertMode();
  const { settings } = useSettings();
  const serverUrl = settings?.fhir?.serverUrl;
  const { state } = useConnectionContext();
  const client = state.status === 'connected' ? state.client : null;
  const capability = state.status === 'connected' ? state.capability : null;
  const parsedTypes = useMemo(() => (capability ? parseResourceTypes(capability) : []), [capability]);
  const typeNames = useMemo(() => parsedTypes.map((t) => t.type), [parsedTypes]);
  const counts = useResourceCounts(client, typeNames);
  const nonZeroTypeCount = useMemo(
    () => Object.values(counts).filter((v) => typeof v === 'number' && v > 0).length,
    [counts],
  );

  return (
    <>
      <AppShell.Section p="md">
        <Text fw={600} size="lg">
          FHIR Exploder
        </Text>

        {/* Surface 1 — ⌘K hint button (SIDE-04): opens command palette */}
        <UnstyledButton
          onClick={() => openSpotlight()}
          style={{ width: '100%', display: 'block' }}
          mt="xs"
          aria-label="Open command palette"
          data-testid="cmd-k-hint"
        >
          <Group
            justify="space-between"
            gap="xs"
            wrap="nowrap"
            px="xs"
            py={6}
            style={{ border: '1px solid var(--mantine-color-gray-3)', borderRadius: 4 }}
          >
            <Text size="xs" c="dimmed">Go to resource type…</Text>
            <Kbd size="xs">⌘K</Kbd>
          </Group>
        </UnstyledButton>

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

            {/* Surface 2 — conditional server URL (SIDE-03): expert mode only */}
            {isExpert && serverUrl && (
              <Text size="xs" c="dimmed" ff="monospace" truncate="end" data-testid="sidebar-server-url">
                {serverUrl}
              </Text>
            )}

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
        {/* Surface 4 — Explorer count badge (SIDE-04) */}
        {NAV_ITEMS.map((item) => {
          const badge =
            item.to === '/explorer' && nonZeroTypeCount > 0 ? (
              <Badge variant="light" size="xs" color="gray" data-testid="explorer-count-badge">
                {nonZeroTypeCount}
              </Badge>
            ) : undefined;
          return <SidebarRow key={item.to} item={item} rightSection={badge} />;
        })}
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

      {/* Surface 3 — Expert Toggle row (SIDE-02): after Settings section */}
      <AppShell.Section p="sm">
        <Group justify="space-between" align="center" wrap="nowrap">
          <Text size="xs" c="dimmed">Expert mode</Text>
          <Switch
            size="xs"
            checked={isExpert}
            onChange={toggle}
            aria-label="Expert mode toggle"
            data-testid="expert-mode-switch"
          />
        </Group>
      </AppShell.Section>

      <FhirSettingsModal opened={fhirModalOpen} onClose={() => setFhirModalOpen(false)} />
      <TerminologySettingsModal opened={termModalOpen} onClose={() => setTermModalOpen(false)} />
    </>
  );
}
