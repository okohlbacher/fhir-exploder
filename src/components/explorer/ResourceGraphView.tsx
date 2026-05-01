import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMedplum } from '@medplum/react-hooks';
import {
  Alert,
  Button,
  Group,
  Paper,
  Skeleton,
  Slider,
  SimpleGrid,
  Stack,
  Text,
  Title,
  useMantineColorScheme,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconArrowLeft,
  IconInfoCircle,
} from '@tabler/icons-react';
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './graph.module.css';
import type { Resource, ResourceType } from '@medplum/fhirtypes';
import { MAX_DEPTH, useGraphBfs } from './useGraphBfs';
import { applyDagreLayout } from './applyDagreLayout';
import { ResourceGraphNode } from './ResourceGraphNode';

const NODE_TYPES = { resource: ResourceGraphNode } as const;

/**
 * Phase 49 — Plan 49-03 (GRPH-01 + GRPH-04 wiring; closes GRPH-02 + GRPH-03 wiring).
 *
 * Lazy-loaded via React.lazy in App.tsx (Plan 49-01 Task 02). The data-testid
 * attribute on the outermost div is the LOAD-BEARING CONTRACT for the
 * theme-switch-invariant test (Plan 49-03 Task 03 / D-20.4): the SAME DOM
 * node must exist before AND after `setColorScheme('dark')`.
 */
export function ResourceGraphView() {
  const { resourceType, id, patientId } = useParams<{
    resourceType: string;
    id: string;
    patientId?: string;
  }>();
  const client = useMedplum();
  // Subscribe so the Mantine vars stay live; CSS bridge does the rest.
  useMantineColorScheme();
  const [resource, setResource] = useState<Resource | undefined>();
  const [resourceFetchFailed, setResourceFetchFailed] = useState(false);
  const [depth, setDepth] = useState(1);
  const [debouncedDepth] = useDebouncedValue(depth, 200);

  // Fetch the root resource (Phase 48 cancellation idiom).
  useEffect(() => {
    if (!resourceType || !id) return;
    let cancelled = false;
    setResource(undefined);
    setResourceFetchFailed(false);
    client
      .readResource(resourceType as ResourceType, id)
      .then((r) => {
        if (cancelled) return;
        setResource(r as Resource);
      })
      .catch(() => {
        if (cancelled) return;
        setResourceFetchFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [client, resourceType, id]);

  const bfs = useGraphBfs(client, resource, debouncedDepth);

  // Build React Flow nodes + edges from the BFS result.
  const reactFlowGraph = useMemo<{ nodes: Node[]; edges: Edge[] }>(() => {
    if (!bfs.result) return { nodes: [], edges: [] };
    const nodes: Node[] = Array.from(bfs.result.nodes.values()).map((n) => ({
      id: n.key,
      type: 'resource',
      position: { x: 0, y: 0 }, // overwritten by applyDagreLayout
      data: { resource: n.resource, isRoot: n.isRoot },
    }));
    const edges: Edge[] = bfs.result.edges.map((e, i) => ({
      id: `e-${i}-${e.source}->${e.target}`,
      source: e.source,
      target: e.target,
      type: 'smoothstep',
      label: e.label,
      animated: false,
    }));
    const positioned = applyDagreLayout(nodes, edges, 'TB');
    return { nodes: positioned, edges };
  }, [bfs.result]);

  const nodeCount = reactFlowGraph.nodes.length;
  const edgeCount = reactFlowGraph.edges.length;
  const truncated = bfs.result?.truncated === true;
  const empty =
    !bfs.loading &&
    bfs.result !== undefined &&
    nodeCount <= 1 &&
    !truncated;
  const allFailed =
    resourceFetchFailed || (!bfs.loading && bfs.result === undefined);

  const backHref = patientId
    ? `/patients/${patientId}/${resourceType}/${id}`
    : `/explorer/${resourceType}/${id}`;

  return (
    <div data-testid="graph-flow-root">
      <Stack gap="lg" p="lg">
        <Group gap="md" justify="space-between">
          <Stack gap={4}>
            <Title order={2}>Reference graph</Title>
            <Text size="sm" c="dimmed" ff="monospace">
              {resourceType}/{id}
            </Text>
          </Stack>
          <Button
            variant="subtle"
            leftSection={<IconArrowLeft size={16} />}
            component={Link}
            to={backHref}
          >
            Back to resource
          </Button>
        </Group>

        <Paper withBorder radius="lg" p="md">
          <Group gap="md" align="center">
            <Text size="sm" c="dimmed">
              Depth
            </Text>
            <Slider
              min={1}
              max={MAX_DEPTH}
              marks={[
                { value: 1, label: '1' },
                { value: 2, label: '2' },
                { value: 3, label: '3' },
              ]}
              value={depth}
              onChange={setDepth}
              w={200}
              color="indigo"
            />
            <Text size="xs" c="dimmed" ff="monospace" ml="auto">
              {nodeCount} {nodeCount === 1 ? 'node' : 'nodes'} · {edgeCount}{' '}
              {edgeCount === 1 ? 'edge' : 'edges'}
            </Text>
          </Group>
        </Paper>

        <Paper
          withBorder
          radius="lg"
          p={0}
          h="min(70vh, 720px)"
          pos="relative"
        >
          {bfs.loading || !resource ? (
            <SimpleGrid cols={2} spacing="md" p="md">
              <Skeleton height={64} radius="md" w={220} />
              <Skeleton height={64} radius="md" w={220} />
              <Skeleton height={64} radius="md" w={220} />
              <Skeleton height={64} radius="md" w={220} />
            </SimpleGrid>
          ) : (
            <ReactFlowProvider>
              <ReactFlow
                nodes={reactFlowGraph.nodes}
                edges={reactFlowGraph.edges}
                nodeTypes={NODE_TYPES}
                fitView
                proOptions={{ hideAttribution: false }}
              >
                <Background />
                <Controls position="top-right" />
                <MiniMap position="bottom-right" pannable zoomable />
              </ReactFlow>
            </ReactFlowProvider>
          )}
        </Paper>

        {truncated && (
          <Alert
            color="yellow"
            variant="light"
            icon={<IconAlertTriangle size={16} />}
            title={`Showing 150 of ${nodeCount}+ nodes`}
          >
            The graph was truncated to keep rendering responsive. Reduce the
            depth or click a child node to recenter and explore further.
          </Alert>
        )}
        {empty && !truncated && !allFailed && (
          <Alert
            color="gray"
            variant="light"
            icon={<IconInfoCircle size={16} />}
            title={`No references at depth ${depth}`}
          >
            This resource has no outgoing or incoming references within the
            current depth. Try increasing the depth via the slider above.
          </Alert>
        )}
        {allFailed && (
          <Alert
            color="red"
            variant="light"
            icon={<IconAlertCircle size={16} />}
            title="Unable to load references"
          >
            The FHIR server did not return reference data. Check the Blaze
            connection in Settings, then refresh.
          </Alert>
        )}
      </Stack>
    </div>
  );
}
