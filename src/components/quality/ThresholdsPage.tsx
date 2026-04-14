/**
 * ThresholdsPage — /quality/thresholds route.
 *
 * Lets the user configure per-metric quality thresholds (DQ-11). Values
 * persist to localStorage under STORAGE_KEY via useThresholds (Plan 01).
 * Layout + copy locked in 18-UI-SPEC.md I-02 + I-03.
 */
import {
  ActionIcon,
  Anchor,
  Badge,
  Button,
  Group,
  Modal,
  NumberInput,
  Paper,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconRestore, IconX } from '@tabler/icons-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DEFAULT_THRESHOLDS,
  METRIC_LABELS,
  type MetricKey,
} from '../../quality/thresholds';
import { useThresholds } from '../../hooks/useThresholds';

const METRIC_ORDER: MetricKey[] = [
  'completeness',
  'coverage',
  'validation',
  'plausibility',
  'labRanges',
  'duplicates',
  'references',
];

interface ThresholdRowProps {
  metric: MetricKey;
  storedValue: number | null | undefined;
  onCommit: (value: number) => void;
  onClear: () => void;
  onUnset: () => void;
}

function ThresholdRow({
  metric,
  storedValue,
  onCommit,
  onClear,
  onUnset,
}: ThresholdRowProps) {
  // Local state: initialized from storedValue OR default.
  // null (explicitly disabled) → empty input; undefined (absent) → default; number → number.
  const initial: number | string =
    storedValue === null
      ? ''
      : typeof storedValue === 'number'
        ? storedValue
        : DEFAULT_THRESHOLDS[metric];
  const [localValue, setLocalValue] = useState<number | string>(initial);

  // Determine the Active badge state from stored value.
  let badge: { label: string; color: string; variant: 'light' | 'outline' };
  if (typeof storedValue === 'number') {
    badge = { label: 'custom', color: 'blue', variant: 'light' };
  } else if (storedValue === null) {
    badge = { label: 'disabled', color: 'gray', variant: 'light' };
  } else {
    badge = { label: 'default', color: 'gray', variant: 'outline' };
  }

  const handleBlur = () => {
    if (localValue === '' || localValue === undefined) {
      // Empty on blur = unset (remove key → fall back to default).
      // Distinct from the Clear ActionIcon, which explicitly sets null (disable).
      onUnset();
      return;
    }
    const n = typeof localValue === 'number' ? localValue : Number(localValue);
    if (Number.isFinite(n)) {
      onCommit(n);
    }
  };

  return (
    <Table.Tr>
      <Table.Td style={{ fontWeight: 600 }}>{METRIC_LABELS[metric]}</Table.Td>
      <Table.Td>{DEFAULT_THRESHOLDS[metric]}%</Table.Td>
      <Table.Td style={{ width: 200 }}>
        <NumberInput
          value={localValue}
          min={0}
          max={100}
          step={1}
          suffix="%"
          clampBehavior="strict"
          placeholder="no alert"
          onChange={(v) => setLocalValue(v as number | string)}
          onBlur={handleBlur}
          aria-label={`${METRIC_LABELS[metric]} threshold`}
        />
      </Table.Td>
      <Table.Td style={{ width: 100 }}>
        <Badge color={badge.color} variant={badge.variant} size="sm">
          {badge.label}
        </Badge>
      </Table.Td>
      <Table.Td style={{ width: 60 }}>
        <ActionIcon
          variant="subtle"
          color="gray"
          aria-label={`Clear threshold for ${METRIC_LABELS[metric]}`}
          onClick={() => {
            setLocalValue('');
            onClear();
          }}
        >
          <IconX size={14} />
        </ActionIcon>
      </Table.Td>
    </Table.Tr>
  );
}

export function ThresholdsPage() {
  const { stored, setThreshold, clearThreshold, resetThreshold, resetAll } =
    useThresholds();
  const [resetOpen, resetCtrl] = useDisclosure(false);

  const handleConfirmReset = () => {
    resetAll();
    resetCtrl.close();
    notifications.show({
      color: 'blue',
      title: 'Thresholds reset',
      message: 'All metrics restored to shipped defaults.',
    });
  };

  return (
    <Stack gap="lg" p="xl">
      <Anchor component={Link} to="/quality">
        ← Back to Data Quality
      </Anchor>
      <Title order={2}>Configure Quality Thresholds</Title>
      <Text size="sm" c="dimmed">
        Set the minimum acceptable score for each quality metric. Metrics below their
        threshold are flagged in red on the dashboard. Leave a row empty to disable
        alerting for that metric.
      </Text>

      <Paper withBorder radius="sm" p="md">
        <Table striped withTableBorder withColumnBorders={false}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Metric</Table.Th>
              <Table.Th>Default</Table.Th>
              <Table.Th>Alert if below</Table.Th>
              <Table.Th>Active</Table.Th>
              <Table.Th></Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {METRIC_ORDER.map((m) => (
              <ThresholdRow
                key={m}
                metric={m}
                storedValue={m in stored ? stored[m] : undefined}
                onCommit={(v) => setThreshold(m, v)}
                onClear={() => clearThreshold(m)}
                onUnset={() => resetThreshold(m)}
              />
            ))}
          </Table.Tbody>
        </Table>
      </Paper>

      <Group justify="flex-end">
        <Button
          variant="subtle"
          color="red"
          leftSection={<IconRestore size={16} />}
          onClick={resetCtrl.open}
        >
          Reset to defaults
        </Button>
      </Group>

      <Modal
        opened={resetOpen}
        onClose={resetCtrl.close}
        title="Reset thresholds to defaults?"
        centered
        size="md"
        radius="sm"
      >
        <Stack gap="md">
          <Text size="sm">
            This will clear all custom thresholds and restore every metric to its
            shipped default. This cannot be undone from the UI — you will need to
            re-enter any custom values.
          </Text>
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={resetCtrl.close}>
              Keep current thresholds
            </Button>
            <Button color="red" onClick={handleConfirmReset}>
              Reset to defaults
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
