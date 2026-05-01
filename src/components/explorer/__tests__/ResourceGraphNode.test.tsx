/**
 * Phase 49 — Wave 0 test scaffold for the React Flow custom node component.
 *
 * Plan 02 Task 04 fills these in (visual + interaction contract per
 * UI-SPEC §"ResourceGraphNode.tsx — visual structure"):
 *   - Card padding="xs" + 220×64 hard size
 *   - Top row: <Text size="xs" c="dimmed" ff="monospace" tt="uppercase">{resourceType}</Text>
 *   - Main: <Text size="sm" fw={500} lineClamp={1}>{summarizeResource(target).primary}</Text>
 *   - Tooltip on hover with summarizeResource(target).secondary
 *   - Root node (data.isRoot=true) gets 2px indigo-6 border; non-root 1px default-border
 */
import { describe, it } from 'vitest';

describe('ResourceGraphNode', () => {
  it.skip('renders summarizeResource(target).primary with fw=500, lineClamp=1, size=sm', () => {
    // TODO(49-02): fill in body — Plan 02 Task 04.
  });
  it.skip('shows Mantine Tooltip with summarizeResource(target).secondary on hover', () => {
    // TODO(49-02): fill in body — Plan 02 Task 04.
  });
  it.skip('root node (data.isRoot=true) gets 2px indigo-6 border; non-root gets 1px default-border', () => {
    // TODO(49-02): fill in body — Plan 02 Task 04.
  });
});
