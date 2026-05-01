import dagre from '@dagrejs/dagre';
import { Position, type Node, type Edge } from '@xyflow/react';

/**
 * Phase 49 — Plan 49-02 (GRPH-04 layout half).
 *
 * Hierarchical TB (top-down) layout via dagre 3.0.0. Tuning constants
 * locked by UI-SPEC §"Spacing" — DO NOT use raw numerals elsewhere.
 *
 * dagre returns CENTER coordinates; React Flow uses TOP-LEFT, so this
 * helper translates `pos.x - NODE_WIDTH/2`, `pos.y - NODE_HEIGHT/2`.
 *
 * Defense-in-depth (Pitfall 2 from RESEARCH §"Common Pitfalls"): if dagre
 * emits NaN for orphan nodes, fall back to (0, level*100). The BFS guarantees
 * all nodes are reachable from root, but we keep the guard anyway.
 */

export const NODE_WIDTH = 220;
export const NODE_HEIGHT = 64;
export const NODESEP = 60;
export const RANKSEP = 90;
export const EDGESEP = 24;

export type LayoutDirection = 'TB' | 'LR';

export function applyDagreLayout(
  nodes: Node[],
  edges: Edge[],
  direction: LayoutDirection = 'TB',
): Node[] {
  const g = new dagre.graphlib.Graph()
    .setDefaultEdgeLabel(() => ({}))
    .setGraph({
      rankdir: direction,
      nodesep: NODESEP,
      ranksep: RANKSEP,
      edgesep: EDGESEP,
      ranker: 'network-simplex',
    });

  for (const n of nodes) g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  for (const e of edges) g.setEdge(e.source, e.target);

  dagre.layout(g);

  return nodes.map((n, idx) => {
    const dagreNode = g.node(n.id);
    const x =
      dagreNode && Number.isFinite(dagreNode.x)
        ? dagreNode.x - NODE_WIDTH / 2
        : 0;
    const y =
      dagreNode && Number.isFinite(dagreNode.y)
        ? dagreNode.y - NODE_HEIGHT / 2
        : idx * 100;
    return {
      ...n,
      position: { x, y },
      sourcePosition: direction === 'TB' ? Position.Bottom : Position.Right,
      targetPosition: direction === 'TB' ? Position.Top : Position.Left,
    };
  });
}
