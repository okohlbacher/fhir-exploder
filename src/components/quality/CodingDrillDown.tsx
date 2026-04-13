/**
 * CodingDrillDown — /quality/coding/:type sub-page (Plan 05-04).
 *
 * Per-field coding coverage breakdown for a single resource type, using
 * the same sampling hook as the parent panel so cache hits carry across
 * the navigation. Renders an example CodeableConcept per path via
 * @medplum/react CodeableConceptDisplay so terminology-resolved display
 * values come "for free" from the Phase 4 TerminologyProvider.
 *
 * Layout (05-UI-SPEC lines 289-306):
 *   Back button (auto-focused) → Title → Table rows of
 *     Field path | system+code % | text-only % | empty % | Example coded value
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import {
  Alert,
  Button,
  Code,
  Skeleton,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { CodeableConceptDisplay } from '@medplum/react';
import type { CodeableConcept, Resource } from '@medplum/fhirtypes';

import { useCodingCoverage } from '../../hooks/useCodingCoverage';
import { useSampleSize } from './SampleSizeControl';
import type { QualityOutletContext } from './QualityLayout';
import { sampleResources } from '../../quality/sampling';
import { classifyCodedFields } from '../../quality/codingCoverageWalker';
import type { ClassifiedCodedField } from '../../quality/types';

/**
 * Fetch a sample and collect per-path example CodeableConcepts.
 * Prefer systemCode examples; fall back to textOnly; then empty.
 */
function useExamplesByPath(
  client: QualityOutletContext['client'],
  type: string,
  sampleSize: number,
): Record<string, CodeableConcept | undefined> {
  const [examples, setExamples] = useState<
    Record<string, CodeableConcept | undefined>
  >({});

  useEffect(() => {
    let cancelled = false;
    sampleResources(client, type, sampleSize)
      .then((sample: Resource[]) => {
        if (cancelled) return;
        const byPath: Record<string, CodeableConcept | undefined> = {};
        const fallback: Record<string, CodeableConcept | undefined> = {};
        const typePrefix = `${type}.`;
        for (const r of sample) {
          const fields: ClassifiedCodedField[] = classifyCodedFields(r);
          for (const f of fields) {
            const stripped = f.path.startsWith(typePrefix)
              ? f.path.slice(typePrefix.length)
              : f.path;
            const key = stripped.replace(/\[\d+\]/g, '[*]');
            if (!byPath[key] && f.classification === 'systemCode' && f.value) {
              byPath[key] = f.value;
            } else if (!fallback[key] && f.value) {
              fallback[key] = f.value;
            }
          }
        }
        // Backfill with textOnly/empty examples where no systemCode was found.
        for (const k of Object.keys(fallback)) {
          if (!byPath[k]) byPath[k] = fallback[k];
        }
        setExamples(byPath);
      })
      .catch(() => {
        if (cancelled) return;
        setExamples({});
      });
    return () => {
      cancelled = true;
    };
  }, [client, type, sampleSize]);

  return examples;
}

function pct(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 100);
}

export function CodingDrillDown() {
  const { type = '' } = useParams<{ type: string }>();
  const { client } = useOutletContext<QualityOutletContext>();
  const [sampleSize] = useSampleSize();
  const backRef = useRef<HTMLAnchorElement | null>(null);

  const singleTypeList = useMemo(() => [type], [type]);
  const reports = useCodingCoverage(client, singleTypeList, sampleSize);
  const state = reports[type];

  // TODO: Consider shared sample cache to avoid double-fetching when switching between drill-down views (Phase 5 IN-08)
  // Fetch examples in parallel so the drill-down can show a
  // CodeableConceptDisplay per path. Cached via QualityMetricsCache by
  // virtue of useCodingCoverage — this parallel fetch is intentionally
  // simple rather than reusing the cached sample.
  const examplesByPath = useExamplesByPath(client, type, sampleSize);

  useEffect(() => {
    backRef.current?.focus();
  }, []);

  return (
    <Stack gap="md" p="xl">
      <Button
        variant="subtle"
        leftSection={<IconArrowLeft size={16} />}
        component={Link}
        to="/quality"
        ref={backRef}
      >
        Back to Coding Coverage
      </Button>

      <Title order={2}>
        {type} — Coding coverage breakdown
      </Title>

      {state === undefined || state === 'loading' ? (
        <Stack gap="xs">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={24} radius="sm" />
          ))}
        </Stack>
      ) : state === 'error' ? (
        <Alert color="red" variant="light">
          Failed to sample {type}. Return to the Coding Coverage tab and recompute metrics.
        </Alert>
      ) : state.totalCodedFields === 0 ? (
        <Alert color="gray" variant="light">
          No CodeableConcept fields found in the first {state.sampleSize} sampled{' '}
          {type} resources.
        </Alert>
      ) : (
        <DrillDownTable perPath={state.perPath} examplesByPath={examplesByPath} />
      )}
    </Stack>
  );
}

interface DrillDownTableProps {
  perPath: Record<string, { systemCode: number; textOnly: number; empty: number }>;
  examplesByPath: Record<string, CodeableConcept | undefined>;
}

function DrillDownTable({ perPath, examplesByPath }: DrillDownTableProps) {
  const paths = Object.keys(perPath).sort();
  if (paths.length === 0) {
    return (
      <Text c="dimmed" size="sm">
        No CodeableConcept fields were found in the sampled resources.
      </Text>
    );
  }
  return (
    <Table striped highlightOnHover>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Field path</Table.Th>
          <Table.Th>system+code</Table.Th>
          <Table.Th>text-only</Table.Th>
          <Table.Th>empty</Table.Th>
          <Table.Th>Example coded value</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {paths.map((path) => {
          const row = perPath[path];
          const total = row.systemCode + row.textOnly + row.empty;
          const sys = pct(row.systemCode, total);
          const txt = pct(row.textOnly, total);
          const emp = pct(row.empty, total);
          const example = examplesByPath[path];
          return (
            <Table.Tr key={path}>
              <Table.Td>
                <Code>{path}</Code>
              </Table.Td>
              <Table.Td>
                <Text c="blue.6" size="sm">
                  {sys}%
                </Text>
              </Table.Td>
              <Table.Td>
                <Text c="orange.6" size="sm">
                  {txt}%
                </Text>
              </Table.Td>
              <Table.Td>
                <Text c="red.6" size="sm">
                  {emp}%
                </Text>
              </Table.Td>
              <Table.Td>
                {example ? (
                  <CodeableConceptDisplay value={example} />
                ) : (
                  <Text size="sm" c="dimmed">
                    —
                  </Text>
                )}
              </Table.Td>
            </Table.Tr>
          );
        })}
      </Table.Tbody>
    </Table>
  );
}
