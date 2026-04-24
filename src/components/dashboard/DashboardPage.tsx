import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  Collapse,
  Drawer,
  Grid,
  Group,
  Progress,
  SimpleGrid,
  Stack,
  Text,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconChevronDown,
  IconChevronRight,
  IconCircleCheck,
} from '@tabler/icons-react';
import type { ConnectionState } from '../../fhir/types';
import type { AppSettings } from '../../config/types';
import { parseResourceTypes } from '../../fhir/capability';
import { useResourceCounts } from '../../hooks/useResourceCounts';
import { groupByCategory, CATEGORY_ORDER } from '../../utils/fhir-categories';
import {
  MII_MODULES,
  fhirResourceTypesOf,
  type MiiModule,
} from '../../utils/mii-modules';
import { ServerInfoCard } from './ServerInfoCard';

interface DashboardPageProps {
  settings: AppSettings | null;
  usingDefaults: boolean;
  connectionState: ConnectionState;
  onConnect: () => void;
}

const ERROR_TITLES: Record<string, string> = {
  network: 'Cannot reach FHIR server',
  auth: 'Authentication failed',
  invalid_response: 'Unexpected server response',
  unknown: 'Connection failed',
};

const CATEGORY_COLORS: Record<string, string> = {
  Individuals: 'blue',
  Clinical: 'red',
  Diagnostics: 'violet',
  Medications: 'green',
  'Care Provision': 'teal',
  Workflow: 'orange',
  Financial: 'yellow',
  Conformance: 'gray',
  Terminology: 'cyan',
  Infrastructure: 'indigo',
  Other: 'gray',
};

const MONO_NUMERIC: React.CSSProperties = {
  fontFamily: 'var(--font-mono, var(--mantine-font-family-monospace))',
  fontVariantNumeric: 'tabular-nums',
};

export function DashboardPage({
  settings,
  usingDefaults,
  connectionState,
  onConnect,
}: DashboardPageProps) {
  const navigate = useNavigate();
  // Phase 30 redesign Step 2: sections open by default — the category
  // breakdown and MII overview are the primary dashboard content, not
  // hidden drill-downs.
  const [categoryOpened, { toggle: toggleCategory }] = useDisclosure(true);
  const [miiOpened, { toggle: toggleMii }] = useDisclosure(true);
  // D-12 (plan 33-06): session-only "Show extension modules" toggle gating
  // the extension tile subgrid. Seeded closed; no localStorage — mirrors
  // the D-09 idiom used in MiiModuleTabs (plan 33-05). Phase 33 renders
  // zero extension modules so the toggle is length-guarded invisible;
  // Phase 34's extension data drop activates it automatically.
  const [extensionGridOpened, { toggle: toggleExtensionGrid }] =
    useDisclosure(false);
  // D-14 (plan 33-06): tile click target switched from navigate('/patients')
  // to a right-edge Drawer showing module details + Open-in-Explorer button.
  // State is session-only (useDisclosure); selectedModule is the currently-
  // clicked MII module literal from MII_MODULES.
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] =
    useDisclosure(false);
  const [selectedModule, setSelectedModule] = useState<MiiModule | null>(null);

  const resourceTypes = useMemo(() => {
    if (connectionState.status === 'connected') {
      return parseResourceTypes(connectionState.capability);
    }
    return [];
  }, [connectionState]);

  const resourceTypeNames = useMemo(
    () => resourceTypes.map((rt) => rt.type),
    [resourceTypes]
  );

  const client =
    connectionState.status === 'connected' ? connectionState.client : null;
  const counts = useResourceCounts(client, resourceTypeNames);

  const grouped = useMemo(
    () => groupByCategory(resourceTypes),
    [resourceTypes]
  );

  const orderedCategories = useMemo(() => {
    const ordered = CATEGORY_ORDER.filter((cat) => grouped.has(cat));
    for (const cat of grouped.keys()) {
      if (!ordered.includes(cat)) ordered.push(cat);
    }
    return ordered;
  }, [grouped]);

  // Compute per-category stats
  const categoryStats = useMemo(() => {
    return orderedCategories.map((cat) => {
      const types = grouped.get(cat)!;
      let totalCount = 0;
      let populatedTypes = 0;
      let loading = false;
      for (const t of types) {
        const c = counts[t.type];
        if (c === 'loading') loading = true;
        if (typeof c === 'number') {
          totalCount += c;
          if (c > 0) populatedTypes++;
        }
      }
      return {
        category: cat,
        types,
        totalCount,
        populatedTypes,
        totalTypes: types.length,
        loading,
      };
    });
  }, [orderedCategories, grouped, counts]);

  const totalResources = categoryStats.reduce((s, c) => s + c.totalCount, 0);
  const populatedCategories = categoryStats.filter((c) => c.populatedTypes > 0);
  const patientCount =
    typeof counts['Patient'] === 'number' ? counts['Patient'] : null;
  const typesWithData = Object.values(counts).filter(
    (c) => typeof c === 'number' && c > 0,
  ).length;

  const isConnected = connectionState.status === 'connected';

  // D-12 (plan 33-06): partition MII_MODULES into base vs extension via
  // m.category. Base tiles keep the 4-col grid at top; extension tiles
  // render inside a length-guarded "Show extension modules" Collapse.
  // Phase 33 data has 7 base + 0 extension — the extension Collapse is
  // structurally present but invisible until Phase 34's 14 extension
  // entries activate the length guard.
  const baseModules = MII_MODULES.filter((m) => m.category === 'base');
  const extensionModules = MII_MODULES.filter(
    (m) => m.category === 'extension',
  );

  // D-14 (plan 33-06): tile click opens a Drawer instead of navigating
  // straight to /patients. Drawer surfaces only already-fetched counts —
  // no new FHIR fetches per plan invariant.
  const handleTileClick = (mod: MiiModule) => {
    setSelectedModule(mod);
    openDrawer();
  };

  // Shared tile renderer so base and extension grids render identically.
  // Closure-captures counts, handleTileClick, MONO_NUMERIC from the
  // enclosing scope.
  const renderMiiTile = (module: MiiModule) => {
    const types = fhirResourceTypesOf(module);
    // Sum counts across types so plan-33-03 multi-type modules in
    // Phase 34 show a combined tile count. For narrow-schema
    // single-type modules (Phase 33), types.length === 1 and this
    // is arithmetically identical to counts[module.fhirResourceType].
    const c = types.reduce<number | 'loading' | undefined>((acc, t) => {
      const v = counts[t];
      if (v === 'loading' || acc === 'loading') return 'loading';
      if (typeof v === 'number') {
        return typeof acc === 'number' ? acc + v : v;
      }
      return acc;
    }, undefined);
    const n = typeof c === 'number' ? c : null;
    const empty = n === null || n === 0;
    return (
      <Card
        key={module.key}
        withBorder
        padding="md"
        radius="md"
        style={{
          cursor: 'pointer',
          opacity: empty ? 0.55 : 1,
        }}
        onClick={() => handleTileClick(module)}
      >
        <Group justify="space-between" wrap="nowrap" align="flex-start">
          <Stack gap={2} style={{ minWidth: 0 }}>
            <Text fw={600} size="sm">
              {module.germanLabel}
            </Text>
            <Text
              size="xs"
              c="dimmed"
              style={{
                fontFamily:
                  'var(--font-mono, var(--mantine-font-family-monospace))',
              }}
            >
              {types.join(' / ')}
            </Text>
          </Stack>
          <Text size="xl" fw={600} style={MONO_NUMERIC}>
            {n === null ? '—' : n.toLocaleString()}
          </Text>
        </Group>
      </Card>
    );
  };

  return (
    <Stack gap="lg">
      {/* Show connection UI only when NOT connected */}
      {!isConnected && (
        <>
          <Title order={2}>Server Connection</Title>

          {usingDefaults && (
            <Alert
              variant="light"
              color="orange"
              icon={<IconAlertTriangle size={20} />}
              title="Using default settings"
            >
              Using default settings (localhost:8080, open auth). Create a
              settings.yaml file to customize.
            </Alert>
          )}

          {settings && (
            <ServerInfoCard
              settings={settings}
              connectionState={connectionState}
              onConnect={onConnect}
            />
          )}

          {connectionState.status === 'error' && (
            <Alert
              variant="light"
              color="red"
              icon={<IconAlertCircle size={20} />}
              title={
                ERROR_TITLES[connectionState.error.type] ?? 'Connection failed'
              }
            >
              {connectionState.error.message}
              {'\n'}
              {connectionState.error.suggestion}
            </Alert>
          )}

          {connectionState.status !== 'connecting' && (
            <Stack align="center" py="xl">
              <Title order={3}>Not Connected</Title>
              <Text c="dimmed">
                Configure your FHIR server in settings.yaml and click Connect to
                begin exploring.
              </Text>
            </Stack>
          )}
        </>
      )}

      {/* Connected: show overview tiles */}
      {isConnected && (
        <>
          <Group justify="space-between" align="center">
            <Title order={2}>Dashboard</Title>
            <Group gap="xs">
              <IconCircleCheck size={16} color="var(--mantine-color-green-6)" />
              <Text size="sm" c="dimmed">
                {connectionState.capability.software?.name ?? 'FHIR Server'}
                {connectionState.capability.software?.version
                  ? ` v${connectionState.capability.software.version}`
                  : ''}
              </Text>
            </Group>
          </Group>

          {/* Summary strip (Phase 30 Step 2 — 4 cards, added Patients tile) */}
          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }}>
            <SummaryTile
              label="Total Resources"
              value={totalResources}
              hint="across all types"
            />
            <SummaryTile
              label="Resource Types"
              value={resourceTypeNames.length}
              hint="from CapabilityStatement"
            />
            <SummaryTile
              label="With Data"
              value={typesWithData}
              hint="types containing resources"
            />
            <SummaryTile
              label="Patients"
              value={patientCount}
              hint={patientCount === null ? 'loading…' : 'patient records'}
            />
          </SimpleGrid>

          {/* Data by category (open by default) */}
          <SectionHeader
            title="Data by Category"
            opened={categoryOpened}
            onToggle={toggleCategory}
          />
          <Collapse in={categoryOpened}>
            <Grid>
              {(populatedCategories.length > 0
                ? populatedCategories
                : categoryStats
              ).map((stat) => {
                const color = CATEGORY_COLORS[stat.category] ?? 'gray';
                const pct =
                  stat.totalTypes > 0
                    ? Math.round((stat.populatedTypes / stat.totalTypes) * 100)
                    : 0;

                const topTypes = stat.types
                  .filter(
                    (t) =>
                      typeof counts[t.type] === 'number' &&
                      (counts[t.type] as number) > 0,
                  )
                  .sort(
                    (a, b) =>
                      (counts[b.type] as number) - (counts[a.type] as number),
                  )
                  .slice(0, 4);

                if (stat.populatedTypes === 0 && populatedCategories.length > 0)
                  return null;

                return (
                  <Grid.Col key={stat.category} span={{ base: 12, sm: 6, md: 4 }}>
                    <Card
                      withBorder
                      padding="lg"
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate('/explorer')}
                    >
                      <Group gap="xs" mb={4}>
                        <Box
                          w={8}
                          h={8}
                          style={{
                            borderRadius: 2,
                            background: `var(--mantine-color-${color}-6)`,
                          }}
                        />
                        <Text fw={600}>{stat.category}</Text>
                      </Group>
                      <Text
                        size="xl"
                        fw={600}
                        style={MONO_NUMERIC}
                        mb={6}
                      >
                        {stat.totalCount.toLocaleString()}
                      </Text>
                      <Progress
                        value={pct}
                        color={color}
                        size={3}
                        radius="xl"
                        mb="xs"
                      />
                      <Text size="xs" c="dimmed" mb="xs">
                        {stat.populatedTypes}/{stat.totalTypes} types populated
                      </Text>
                      {topTypes.length > 0 && (
                        <Stack gap={2}>
                          {topTypes.map((t) => (
                            <Group key={t.type} justify="space-between">
                              <Text
                                size="xs"
                                c={color}
                                style={{ cursor: 'pointer' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/explorer/${t.type}`);
                                }}
                              >
                                {t.type}
                              </Text>
                              <Text size="xs" c="dimmed" style={MONO_NUMERIC}>
                                {(counts[t.type] as number).toLocaleString()}
                              </Text>
                            </Group>
                          ))}
                        </Stack>
                      )}
                    </Card>
                  </Grid.Col>
                );
              })}
            </Grid>
          </Collapse>

          {/* MII module overview (open by default) — Phase 30 Step 2.
              D-13 (plan 33-06): heading now unambiguously states the scope
              ("Server-wide totals") so users can't mistake the counts for
              per-cohort or per-patient figures. Closes UAT-FU-04. */}
          <SectionHeader
            title="MII Kerndatensatz · Server-wide totals"
            opened={miiOpened}
            onToggle={toggleMii}
          />
          <Collapse in={miiOpened}>
            {/* D-12 base tiles: 7 modules in the 4-col grid, rendered
                identically to the Phase 30 baseline. */}
            <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }}>
              {baseModules.map(renderMiiTile)}
            </SimpleGrid>
            {/* D-12 extension toggle + subgrid: length-guarded so Phase 33
                renders nothing (no extension modules yet). Phase 34's data
                drop flips this on automatically. */}
            {extensionModules.length > 0 && (
              <>
                <UnstyledButton
                  onClick={toggleExtensionGrid}
                  aria-expanded={extensionGridOpened}
                  mt="md"
                >
                  <Group gap="xs">
                    {extensionGridOpened ? (
                      <IconChevronDown size={14} />
                    ) : (
                      <IconChevronRight size={14} />
                    )}
                    <Text size="sm" c="dimmed">
                      Show extension modules ({extensionModules.length})
                    </Text>
                  </Group>
                </UnstyledButton>
                <Collapse in={extensionGridOpened}>
                  <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} mt="xs">
                    {extensionModules.map(renderMiiTile)}
                  </SimpleGrid>
                </Collapse>
              </>
            )}
          </Collapse>

          {/* D-14 (plan 33-06): tile click target. Drawer shows already-
              fetched count data (no new FHIR fetches in Phase 33) with an
              Open-in-Explorer action that navigates to /explorer/<primary>
              for the first FHIR type of the selected module. */}
          <Drawer
            opened={drawerOpened}
            onClose={closeDrawer}
            position="right"
            title={selectedModule?.germanLabel ?? 'Module details'}
            padding="md"
            size="sm"
          >
            {selectedModule && (
              <Stack gap="sm">
                <Group gap="xs">
                  <Box
                    w={10}
                    h={10}
                    style={{
                      borderRadius: 2,
                      background: `var(--mantine-color-${selectedModule.badgeColor}-6)`,
                    }}
                  />
                  <Text size="sm" fw={600}>
                    {selectedModule.germanLabel}
                  </Text>
                </Group>
                <Stack gap={2}>
                  <Text
                    size="xs"
                    c="dimmed"
                    tt="uppercase"
                    fw={700}
                    lts="0.5px"
                  >
                    FHIR resource type(s)
                  </Text>
                  <Text size="sm" ff="monospace">
                    {fhirResourceTypesOf(selectedModule).join(', ')}
                  </Text>
                </Stack>
                <Stack gap={2}>
                  <Text
                    size="xs"
                    c="dimmed"
                    tt="uppercase"
                    fw={700}
                    lts="0.5px"
                  >
                    Server-wide count
                  </Text>
                  <Text size="xl" fw={600} style={MONO_NUMERIC}>
                    {(() => {
                      const types = fhirResourceTypesOf(selectedModule);
                      const sum = types.reduce((acc, t) => {
                        const v = counts[t];
                        return acc + (typeof v === 'number' ? v : 0);
                      }, 0);
                      return sum.toLocaleString();
                    })()}
                  </Text>
                </Stack>
                <Button
                  fullWidth
                  variant="light"
                  onClick={() => {
                    const primary = fhirResourceTypesOf(selectedModule)[0];
                    closeDrawer();
                    navigate(`/explorer/${primary}`);
                  }}
                >
                  Open in Explorer
                </Button>
              </Stack>
            )}
          </Drawer>
        </>
      )}
    </Stack>
  );
}

// --- local helpers ---

interface SummaryTileProps {
  label: string;
  value: number | null;
  hint: string;
}

function SummaryTile({ label, value, hint }: SummaryTileProps) {
  return (
    <Card withBorder padding="lg">
      <Text size="xs" c="dimmed" tt="uppercase" fw={700} lts="0.5px">
        {label}
      </Text>
      <Text fw={600} style={{ ...MONO_NUMERIC, fontSize: 34, lineHeight: 1.1 }} mt={4}>
        {value === null ? '—' : value.toLocaleString()}
      </Text>
      <Text size="xs" c="dimmed" mt={2}>
        {hint}
      </Text>
    </Card>
  );
}

interface SectionHeaderProps {
  title: string;
  opened: boolean;
  onToggle: () => void;
}

function SectionHeader({ title, opened, onToggle }: SectionHeaderProps) {
  return (
    <UnstyledButton onClick={onToggle} aria-expanded={opened}>
      <Group gap="xs">
        {opened ? (
          <IconChevronDown size={16} />
        ) : (
          <IconChevronRight size={16} />
        )}
        <Title order={4}>{title}</Title>
      </Group>
    </UnstyledButton>
  );
}
