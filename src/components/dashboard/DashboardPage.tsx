import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Card,
  Grid,
  Group,
  RingProgress,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconCircleCheck,
  IconDatabase,
} from '@tabler/icons-react';
import type { ConnectionState } from '../../fhir/types';
import type { AppSettings } from '../../config/types';
import { parseResourceTypes } from '../../fhir/capability';
import { useResourceCounts } from '../../hooks/useResourceCounts';
import { groupByCategory, CATEGORY_ORDER } from '../../utils/fhir-categories';
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

export function DashboardPage({
  settings,
  usingDefaults,
  connectionState,
  onConnect,
}: DashboardPageProps) {
  const navigate = useNavigate();

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

  const isConnected = connectionState.status === 'connected';

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

          {/* Summary strip */}
          <SimpleGrid cols={{ base: 1, sm: 3 }}>
            <Card withBorder padding="lg">
              <Group justify="space-between">
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                    Total Resources
                  </Text>
                  <Text size="xl" fw={700}>
                    {totalResources.toLocaleString()}
                  </Text>
                </div>
                <IconDatabase size={32} color="var(--mantine-color-blue-5)" />
              </Group>
            </Card>
            <Card withBorder padding="lg">
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Resource Types
              </Text>
              <Text size="xl" fw={700}>
                {resourceTypeNames.length}
              </Text>
              <Text size="xs" c="dimmed">
                from CapabilityStatement
              </Text>
            </Card>
            <Card withBorder padding="lg">
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                With Data
              </Text>
              <Text size="xl" fw={700}>
                {Object.values(counts).filter(
                  (c) => typeof c === 'number' && c > 0
                ).length}
              </Text>
              <Text size="xs" c="dimmed">
                types containing resources
              </Text>
            </Card>
          </SimpleGrid>

          {/* Category tiles — only show categories that have data */}
          <Title order={4}>Data by Category</Title>
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

              // Top types by count for this category
              const topTypes = stat.types
                .filter((t) => typeof counts[t.type] === 'number' && (counts[t.type] as number) > 0)
                .sort(
                  (a, b) =>
                    (counts[b.type] as number) - (counts[a.type] as number)
                )
                .slice(0, 4);

              if (stat.populatedTypes === 0 && populatedCategories.length > 0) return null;

              return (
                <Grid.Col key={stat.category} span={{ base: 12, sm: 6, md: 4 }}>
                  <Card
                    withBorder
                    padding="lg"
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate('/explorer')}
                  >
                    <Group justify="space-between" mb="xs">
                      <Text fw={600}>{stat.category}</Text>
                      <RingProgress
                        size={50}
                        thickness={4}
                        roundCaps
                        sections={[
                          { value: pct, color: `var(--mantine-color-${color}-5)` },
                        ]}
                        label={
                          <Text size="xs" ta="center" fw={700}>
                            {stat.populatedTypes}
                          </Text>
                        }
                      />
                    </Group>
                    <Text size="sm" c="dimmed" mb="xs">
                      {stat.totalCount.toLocaleString()} resources in{' '}
                      {stat.populatedTypes}/{stat.totalTypes} types
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
                            <Text size="xs" c="dimmed">
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
        </>
      )}
    </Stack>
  );
}
