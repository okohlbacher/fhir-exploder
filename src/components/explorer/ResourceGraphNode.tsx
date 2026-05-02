import { useNavigate, useParams } from 'react-router-dom';
import { Card, Stack, Text, Tooltip } from '@mantine/core';
import type { NodeProps, Node } from '@xyflow/react';
import type { Resource } from '@medplum/fhirtypes';
import { summarizeResource } from '../../utils/summarizeResource';

/**
 * Phase 49 — Plan 49-02 (GRPH-03 node component contract).
 *
 * Custom React Flow node — Mantine Card 220×64 (matches dagre NODE_WIDTH/HEIGHT
 * in applyDagreLayout.ts), uppercase mono resourceType label + sans-serif primary
 * label from Phase 46's summarizeResource. Hover Tooltip surfaces `secondary`.
 *
 * The CARD is the click target (not a Link) — single click navigates immediately
 * per D-05; double-click is NOT a graph-level affordance.
 *
 * Per UI-SPEC §"Color" — root node accent is 2px indigo-6 border; non-root is
 * 1px default-border. The accent variable is one of the 5 reserved indigo-6
 * surfaces in Phase 49 (UI-SPEC §"Accent reserved-for list").
 *
 * Defense-in-depth: FHIR-pattern regex validates {type, id} BEFORE navigate
 * (mirrors ResourceDetailPage.tsx:20-21 / T-02-08 pattern). Closes T-49-02-03.
 */

const FHIR_REFERENCE_PATTERN = /^[A-Z][a-zA-Z]+$/;
const FHIR_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9\-.]{0,63}$/;

export interface ResourceGraphNodeData extends Record<string, unknown> {
  resource: Resource;
  isRoot: boolean;
}

export type ResourceGraphNodeType = Node<ResourceGraphNodeData, 'resource'>;

export function ResourceGraphNode({ data }: NodeProps<ResourceGraphNodeType>) {
  const navigate = useNavigate();
  const { patientId } = useParams<{ patientId?: string }>();
  const { resource, isRoot } = data;
  const summary = summarizeResource(resource);
  const type = resource.resourceType;
  const id = resource.id ?? '';

  const safeNavigate = () => {
    if (!id) {
      // Resource has no server-assigned id — cannot navigate.
      return;
    }
    if (!FHIR_REFERENCE_PATTERN.test(type) || !FHIR_ID_PATTERN.test(id)) {
      return;
    }
    if (patientId && FHIR_ID_PATTERN.test(patientId)) {
      navigate(`/patients/${patientId}/${type}/${id}`);
      return;
    }
    navigate(`/explorer/${type}/${id}`);
  };

  return (
    <Tooltip
      label={summary.secondary ?? ''}
      disabled={!summary.secondary}
      position="right"
      withArrow
    >
      <Card
        withBorder
        radius="md"
        padding="xs"
        w={220}
        h={64}
        style={{
          cursor: id ? 'pointer' : 'default',
          borderColor: isRoot
            ? 'var(--mantine-color-indigo-6)'
            : 'var(--mantine-color-default-border)',
          borderWidth: isRoot ? 2 : 1,
        }}
        onClick={safeNavigate}
        data-testid={`graph-node-${type}/${id}`}
      >
        <Stack gap={2}>
          <Text size="xs" c="dimmed" ff="monospace" tt="uppercase" lh={1.2}>
            {type}
          </Text>
          <Text size="sm" fw={500} lineClamp={1}>
            {summary.primary}
          </Text>
        </Stack>
      </Card>
    </Tooltip>
  );
}
