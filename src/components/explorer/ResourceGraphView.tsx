import { useParams } from 'react-router-dom';
import { Stack, Title, Text, Skeleton } from '@mantine/core';

/**
 * Phase 49 — GRPH-01..GRPH-04. Reference graph view for any FHIR resource.
 *
 * Wave 1 (Plan 49-01): SKELETON STUB. Mounted at:
 *   - `/explorer/:resourceType/:id/graph`
 *   - `/patients/:patientId/:resourceType/:id/graph` (preserves patient-context
 *     breadcrumb per RESEARCH §"Open Questions" Q-1)
 *
 * Wave 2 (Plan 49-02) fills in:
 *   - `useGraphBfs` hook (BFS over outgoing + incoming references, depth=3,
 *     node cap=150)
 *   - `ResourceGraphNode` custom React Flow node (Mantine Card 220×64,
 *     summarizeResource label, root-node accent border)
 *   - `applyDagreLayout` helper (TB direction, NODE_WIDTH/HEIGHT/NODESEP/
 *     RANKSEP/EDGESEP module constants — no magic numbers)
 *
 * Wave 3 (Plan 49-03) wires:
 *   - Theme bridge `graph.module.css` mapping React Flow `--xy-*` → Mantine
 *     `--mantine-color-*` CSS variables (D-11)
 *   - `<ReactFlowProvider>` + `<Controls />` + `<MiniMap />` chrome
 *   - The 5 mandatory tests (D-20.1..5)
 *   - Bundle-delta gate enforcement
 *   - HUMAN-UAT scaffold
 *
 * The `data-testid="graph-flow-root"` attribute on the outermost div is the
 * SAME DOM node before and after `useMantineColorScheme().setColorScheme(...)`
 * — this is the contract proven by Plan 03 Task 03's theme-switch invariant
 * test (D-20.4 / RESEARCH §"Test 4"). DO NOT remount this div based on theme.
 *
 * The `export function ResourceGraphView` (named, not default) is required by
 * the lazy-route shape in App.tsx:
 *   `lazy(() => retry(() => import(...)).then((m) => ({ default: m.ResourceGraphView })))`
 * (Phase 27 EFF-02 idiom).
 */
export function ResourceGraphView() {
  const { resourceType, id } = useParams<{
    resourceType: string;
    id: string;
  }>();
  return (
    <div data-testid="graph-flow-root">
      <Stack gap="lg" p="lg">
        <Title order={2}>Reference graph</Title>
        <Text size="sm" c="dimmed" ff="monospace">
          {resourceType}/{id}
        </Text>
        <Skeleton h="60vh" radius="lg" />
      </Stack>
    </div>
  );
}
