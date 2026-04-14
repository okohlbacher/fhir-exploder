/**
 * TrendsPanel — Plan 19-02 Task 2.
 *
 * The Trends tab content. Composes the toolbar (Clear history + Overlay +
 * Include-other-servers switches), hydration skeleton, empty/single/grid/
 * overlay states, soft-warning banner, and Clear History modal.
 *
 * Capture snapshot button on the main /quality toolbar is Plan 03 scope;
 * `onCapture` prop is threaded through for that wiring but remains
 * undefined in Plan 02. The EmptyState's Capture button is rendered with
 * the (possibly undefined) onClick — a no-op click for Plan 02, real
 * handler in Plan 03.
 */
import {
  Alert,
  Button,
  Center,
  Group,
  Modal,
  Paper,
  SimpleGrid,
  Skeleton,
  Stack,
  Switch,
  Text,
  Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconAlertTriangle,
  IconCamera,
  IconChartLine,
  IconTrash,
} from '@tabler/icons-react';
import { useState } from 'react';
import {
  filterSnapshotsByServer,
  TRENDS_SOFT_LIMIT,
} from '../../quality/trendsHistory';
import { type MetricKey } from '../../quality/thresholds';
import { useTrendsHistory } from '../../hooks/useTrendsHistory';
import { TrendMiniChart } from './TrendMiniChart';
import { TrendOverlayChart } from './TrendOverlayChart';

const METRIC_KEYS: readonly MetricKey[] = [
  'completeness',
  'coverage',
  'validation',
  'plausibility',
  'labRanges',
  'duplicates',
  'references',
] as const;

const GRID_COLS = { base: 1, xs: 2, sm: 2, md: 3, xl: 4 } as const;

export interface TrendsPanelProps {
  serverUrl: string;
  onCapture?: () => void;
}

interface EmptyStateProps {
  variant: 'zero' | 'one';
  otherServerCount?: number;
  onCapture?: () => void;
}

function EmptyState({ variant, otherServerCount, onCapture }: EmptyStateProps) {
  const heading = variant === 'one' ? '1 snapshot captured' : 'No snapshots yet';
  const body =
    variant === 'one'
      ? 'Capture at least one more to see trends.'
      : 'Click Capture snapshot to record the current metrics.';
  return (
    <Center h={320}>
      <Stack align="center" gap="sm">
        <IconChartLine size={48} color="var(--mantine-color-gray-5)" />
        <Title order={3}>{heading}</Title>
        <Text size="sm" c="dimmed">
          {body}
        </Text>
        {otherServerCount != null && otherServerCount > 0 ? (
          <Text size="xs" c="dimmed">
            You have {otherServerCount} snapshot(s) from other servers. Toggle
            &apos;Include other servers&apos; above to see them.
          </Text>
        ) : null}
        <Button
          variant="filled"
          color="blue"
          leftSection={<IconCamera size={16} />}
          onClick={onCapture}
        >
          Capture snapshot
        </Button>
      </Stack>
    </Center>
  );
}

export function TrendsPanel({ serverUrl, onCapture }: TrendsPanelProps) {
  const { snapshots, hydrated, clearAll } = useTrendsHistory();
  const [overlayOn, setOverlayOn] = useState(false);
  const [includeOthers, setIncludeOthers] = useState(false);
  const [clearOpen, clearCtrl] = useDisclosure(false);

  // "Other server" = any snapshot whose serverUrl does not match current. The
  // switch should be enabled whenever such snapshots exist, regardless of
  // whether the current server also has snapshots. UI-SPEC I-07 + I-08.
  const otherServerSnapshots = snapshots.filter((s) => s.serverUrl !== serverUrl);
  const hasOtherServers = otherServerSnapshots.length > 0;
  const filtered = includeOthers
    ? snapshots
    : filterSnapshotsByServer(snapshots, serverUrl);
  const canOverlay = filtered.length >= 2;

  const clearAriaLabel =
    snapshots.length === 0
      ? 'Clear all snapshots (no snapshots to clear).'
      : 'Clear all snapshots from browser storage.';
  const overlayAriaLabel =
    !canOverlay
      ? 'Overlay all metrics (need at least 2 snapshots).'
      : 'Overlay all metrics';
  const otherServerCount = otherServerSnapshots.length;
  const includeAriaLabel = hasOtherServers
    ? `Include snapshots from ${otherServerCount} other server(s).`
    : 'Include snapshots from other servers (no other servers in history).';

  const handleConfirmClear = () => {
    clearAll();
    clearCtrl.close();
    notifications.show({
      color: 'blue',
      title: 'History cleared',
      message: 'All snapshots removed.',
      autoClose: 3000,
    });
  };

  // Content area: decide which variant to render.
  let content: React.ReactNode;
  if (!hydrated) {
    content = (
      <SimpleGrid cols={GRID_COLS} spacing="sm">
        {Array.from({ length: 7 }, (_, i) => (
          <Skeleton key={i} height={200} radius="sm" />
        ))}
      </SimpleGrid>
    );
  } else if (
    filtered.length === 0 &&
    snapshots.length > 0 &&
    !includeOthers &&
    hasOtherServers
  ) {
    // Filtered-empty state — user has snapshots from OTHER servers only.
    content = (
      <EmptyState
        variant="zero"
        otherServerCount={otherServerCount}
        onCapture={onCapture}
      />
    );
  } else if (filtered.length === 0) {
    content = <EmptyState variant="zero" onCapture={onCapture} />;
  } else if (filtered.length === 1) {
    content = <EmptyState variant="one" onCapture={onCapture} />;
  } else if (overlayOn) {
    content = (
      <TrendOverlayChart snapshots={filtered} includeOtherServers={includeOthers} />
    );
  } else {
    content = (
      <SimpleGrid cols={GRID_COLS} spacing="sm">
        {METRIC_KEYS.map((k) => (
          <TrendMiniChart
            key={k}
            metric={k}
            snapshots={filtered}
            includeOtherServers={includeOthers}
          />
        ))}
      </SimpleGrid>
    );
  }

  return (
    <Stack gap="md">
      <Group justify="space-between" wrap="wrap">
        <Group gap="sm">
          <Button
            variant="subtle"
            color="gray"
            leftSection={<IconTrash size={16} />}
            onClick={clearCtrl.open}
            disabled={snapshots.length === 0}
            aria-label={clearAriaLabel}
          >
            Clear history
          </Button>
        </Group>
        <Group gap="md">
          <Switch
            label="Overlay all metrics"
            checked={overlayOn}
            onChange={(event) => setOverlayOn(event.currentTarget.checked)}
            disabled={!canOverlay}
            aria-label={overlayAriaLabel}
          />
          <Switch
            label="Include other servers"
            checked={includeOthers}
            onChange={(event) => setIncludeOthers(event.currentTarget.checked)}
            disabled={!hasOtherServers}
            aria-label={includeAriaLabel}
          />
        </Group>
      </Group>

      {snapshots.length > TRENDS_SOFT_LIMIT ? (
        <Alert
          color="yellow"
          variant="light"
          icon={<IconAlertTriangle size={16} />}
          title="Many snapshots stored"
        >
          <Text size="sm">
            You have {snapshots.length} snapshots in browser storage. Consider
            clearing older snapshots to keep performance healthy. Browser
            storage caps at ~5 MB.
          </Text>
        </Alert>
      ) : null}

      <Paper>{content}</Paper>

      <Modal
        opened={clearOpen}
        onClose={clearCtrl.close}
        title="Clear all snapshots?"
        centered
        size="md"
        radius="sm"
      >
        <Stack gap="md">
          <Text size="sm">
            This will remove all {snapshots.length} snapshot(s) from browser
            storage. Trend history cannot be recovered from the UI. This does
            not affect current metric scores.
          </Text>
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={clearCtrl.close}>
              Keep history
            </Button>
            <Button color="red" onClick={handleConfirmClear}>
              Clear history
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
