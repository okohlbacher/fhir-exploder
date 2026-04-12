/**
 * CompletenessDrillDown — /quality/completeness/:type sub-page.
 *
 * Per-field breakdown of populated/total counts for a single resource
 * type, using the same sampling hook as the parent panel so cache hits
 * carry across the navigation.
 *
 * Layout (05-UI-SPEC):
 *   Back button (auto-focused) → Title → Stack of rows where
 *   each row is a Group justify="space-between" with:
 *     left  = <Code>{path}</Code>
 *     right = <Progress /> + "{pct}% ({count}/{sampleSize})"
 *
 * Empty state: when the type has no bundled MII profile AND no
 * min>=1 paths, we surface the spec's fallback copy.
 */
import { useEffect, useMemo, useRef } from 'react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import {
  Alert,
  Button,
  Code,
  Group,
  Progress,
  Skeleton,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';

import { useCompletenessReport } from '../../hooks/useCompletenessReport';
import { useSampleSize } from './SampleSizeControl';
import type { QualityOutletContext } from './QualityLayout';
import { getProfileForType } from '../../quality/profiles';

export function CompletenessDrillDown() {
  const { type = '' } = useParams<{ type: string }>();
  const { client } = useOutletContext<QualityOutletContext>();
  const [sampleSize] = useSampleSize();
  const backRef = useRef<HTMLAnchorElement | null>(null);

  // Scope to a single type — same hook, single-element array. Memoise the
  // array so its identity is stable across renders (parity with
  // CodingDrillDown).
  const singleTypeList = useMemo(() => [type], [type]);
  const reports = useCompletenessReport(client, singleTypeList, sampleSize);
  const state = reports[type];

  useEffect(() => {
    // Auto-focus the back button on mount per accessibility spec.
    backRef.current?.focus();
  }, []);

  const profile = getProfileForType(type);

  return (
    <Stack gap="md" p="xl">
      <Button
        variant="subtle"
        leftSection={<IconArrowLeft size={16} />}
        component={Link}
        to="/quality"
        ref={backRef}
      >
        Back to Completeness
      </Button>

      <Title order={2}>
        {type} — Completeness breakdown
      </Title>

      {!profile && (
        <Alert color="yellow" variant="light">
          No MII profile bundled for {type}. Structural validation skipped for this type.
        </Alert>
      )}

      {state === undefined || state === 'loading' ? (
        <Stack gap="xs">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={24} radius="sm" />
          ))}
        </Stack>
      ) : state === 'error' ? (
        <Alert color="red" variant="light">
          Failed to sample {type}. Return to the Completeness tab and recompute metrics.
        </Alert>
      ) : (
        <>
          <DrillDownList
            perPath={state.perPath}
            sampleSize={state.sampleSize}
          />
          <Text size="xs" c="dimmed">
            Note: for array-valued paths, only the first element is
            inspected. A path counts as populated when the first entry in
            the array is non-empty. Slice-level gaps are surfaced in the
            Coding Coverage tab.
          </Text>
        </>
      )}
    </Stack>
  );
}

interface DrillDownListProps {
  perPath: Record<string, number>;
  sampleSize: number;
}

function DrillDownList({ perPath, sampleSize }: DrillDownListProps) {
  const paths = Object.keys(perPath);
  if (paths.length === 0 || sampleSize === 0) {
    return (
      <Text c="dimmed" size="sm">
        No required paths configured for this type.
      </Text>
    );
  }

  return (
    <Stack gap="sm">
      {paths.map((path) => {
        const count = perPath[path];
        const pct = sampleSize > 0 ? Math.round((count / sampleSize) * 100) : 0;
        return (
          <Group key={path} justify="space-between" wrap="nowrap">
            <Code>{path}</Code>
            <Group gap="sm" wrap="nowrap" style={{ minWidth: 240 }}>
              <Progress value={pct} style={{ flex: 1 }} />
              <Text size="sm" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                {pct}% ({count}/{sampleSize})
              </Text>
            </Group>
          </Group>
        );
      })}
    </Stack>
  );
}
