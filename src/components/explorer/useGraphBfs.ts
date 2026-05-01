import { useEffect, useState } from 'react';
import type { MedplumClient } from '@medplum/core';
import type { Bundle, Resource, ResourceType } from '@medplum/fhirtypes';
import {
  reverseReferenceCatalog,
  type ReverseReferenceEntry,
} from '../../utils/reverseReferenceCatalog';

/**
 * Phase 49 — Plan 49-02 (GRPH-02 + part of GRPH-03).
 *
 * Depth-bounded + node-capped BFS over a FHIR resource's outgoing AND incoming
 * references. Outgoing fan via reference-bearing fields; incoming fan via the
 * Phase 48 reverseReferenceCatalog at depth=1 ONLY (CONTEXT D-04a).
 *
 * Cancellation idiom mirrors RelatedResourcesPanel.tsx:42-64 (Phase 48):
 *   let cancelled = false; ... if (cancelled) return; ... return () => { cancelled = true; }
 * NOT a request-abort primitive (Medplum 5.1.7 client.get() has no signal slot
 * — verified Phase 42 useMiiExtensionCounts precedent).
 *
 * The BFS is exported as both a hook (useGraphBfs) and a pure function
 * (runGraphBfs) — the pure function makes the depth-cap + node-cap +
 * parallel-fanout tests trivial (no React Test Library, no providers).
 */

export const MAX_DEPTH = 3;
export const MAX_NODES = 150;
export const PER_FETCH_COUNT = 100;

export interface GraphBfsNode {
  key: string; // `${resourceType}/${id}`
  resource: Resource;
  depthFromRoot: number;
  isRoot: boolean;
}

export interface GraphBfsEdge {
  source: string; // resource key
  target: string; // resource key
  label: string; // FHIR reference field name (outgoing) or catalog param (incoming)
}

export interface GraphBfsResult {
  nodes: Map<string, GraphBfsNode>;
  edges: GraphBfsEdge[];
  truncated: boolean;
}

export interface GraphBfsSignal {
  cancelled: boolean;
}

function key(r: { resourceType: string; id?: string }): string {
  return `${r.resourceType}/${r.id ?? ''}`;
}

/**
 * Walk an arbitrary FHIR resource looking for any value that has a string
 * `reference` property. Captures the immediate parent property name as the
 * edge label.
 *
 * The regex test mirrors ResourceDetailPage.tsx:20-21 (T-02-08) and
 * RESEARCH §"Reference extraction" — rejects absolute URLs / cross-server
 * references. Closes T-49-02-02 (cross-server reference traversal).
 */
const REFERENCE_RE = /^[A-Z][a-zA-Z]+\/[A-Za-z0-9][A-Za-z0-9\-.]{0,63}$/;

function extractReferences(r: Resource): Array<{ refStr: string; fieldName: string }> {
  const out: Array<{ refStr: string; fieldName: string }> = [];
  const seen = new WeakSet<object>();
  function walk(value: unknown, path: string): void {
    if (!value || typeof value !== 'object') return;
    if (seen.has(value as object)) return;
    seen.add(value as object);
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i += 1) walk(value[i], path);
      return;
    }
    const obj = value as Record<string, unknown>;
    const ref = obj.reference;
    if (typeof ref === 'string' && REFERENCE_RE.test(ref)) {
      out.push({ refStr: ref, fieldName: path.split('.').pop() ?? '' });
    }
    for (const k of Object.keys(obj)) {
      walk(obj[k], path ? `${path}.${k}` : k);
    }
  }
  walk(r as unknown, '');
  return out;
}

function parseRef(refStr: string): { type: ResourceType; id: string } {
  const [type, id] = refStr.split('/');
  return { type: type as ResourceType, id };
}

async function fetchOutgoingTargets(
  client: MedplumClient,
  r: Resource,
): Promise<Array<{ target: Resource; fieldName: string }>> {
  const refs = extractReferences(r);
  // PARALLEL fanout — Promise.all per D-18; serial would multiply latency.
  const settled = await Promise.all(
    refs.map(async ({ refStr, fieldName }) => {
      const { type, id } = parseRef(refStr);
      try {
        const target = (await client.readResource(type, id)) as Resource;
        return { target, fieldName } as { target: Resource; fieldName: string };
      } catch {
        return null; // D-14 silent per-fetch
      }
    }),
  );
  return settled.filter(
    (x): x is { target: Resource; fieldName: string } => x !== null,
  );
}

async function fetchIncomingSources(
  client: MedplumClient,
  r: Resource,
): Promise<Array<{ source: Resource; fieldName: string }>> {
  const catalog: readonly ReverseReferenceEntry[] =
    reverseReferenceCatalog[r.resourceType] ?? [];
  if (catalog.length === 0 || !r.id) return [];
  // PARALLEL fanout per D-18.
  const arrays = await Promise.all(
    catalog.map(async (entry) => {
      const url = `${entry.type}?${entry.param}=${r.resourceType}/${r.id}&_count=${PER_FETCH_COUNT}`;
      try {
        const raw = await client.get(client.fhirUrl(url).toString());
        const bundle: Bundle =
          typeof raw === 'string' ? JSON.parse(raw) : (raw as Bundle);
        return (bundle.entry ?? [])
          .map((e) => e.resource)
          .filter((res): res is Resource => Boolean(res))
          .map((source) => ({ source, fieldName: entry.param }));
      } catch {
        return []; // D-14 silent per-fetch
      }
    }),
  );
  return arrays.flat();
}

/**
 * Pure async BFS. Exported for unit testing without React.
 */
export async function runGraphBfs(
  client: MedplumClient,
  root: Resource,
  depth: number,
  signal: GraphBfsSignal = { cancelled: false },
): Promise<GraphBfsResult> {
  const effectiveDepth = Math.max(1, Math.min(depth, MAX_DEPTH));
  const nodes = new Map<string, GraphBfsNode>();
  const edges: GraphBfsEdge[] = [];
  const rootKey = key(root);
  nodes.set(rootKey, { key: rootKey, resource: root, depthFromRoot: 0, isRoot: true });
  let truncated = false;
  let frontier: Resource[] = [root];

  for (let level = 1; level <= effectiveDepth; level += 1) {
    if (signal.cancelled) return { nodes, edges, truncated };
    if (nodes.size >= MAX_NODES) {
      truncated = true;
      break;
    }

    // Per-frontier-resource: fetch outgoing AND (level===1 only) incoming, in parallel.
    const fanouts = await Promise.all(
      frontier.map(async (r) => {
        const outgoingP = fetchOutgoingTargets(client, r);
        const incomingP =
          level === 1
            ? fetchIncomingSources(client, r)
            : Promise.resolve([] as Array<{ source: Resource; fieldName: string }>);
        const [outgoing, incoming] = await Promise.all([outgoingP, incomingP]);
        return { r, outgoing, incoming };
      }),
    );
    if (signal.cancelled) return { nodes, edges, truncated };

    const nextFrontier: Resource[] = [];
    outer: for (const { r, outgoing, incoming } of fanouts) {
      const rKey = key(r);
      for (const { target, fieldName } of outgoing) {
        if (nodes.size >= MAX_NODES) {
          truncated = true;
          break outer;
        }
        const tKey = key(target);
        if (!nodes.has(tKey)) {
          nodes.set(tKey, {
            key: tKey,
            resource: target,
            depthFromRoot: level,
            isRoot: false,
          });
          nextFrontier.push(target);
        }
        edges.push({ source: rKey, target: tKey, label: fieldName });
      }
      for (const { source, fieldName } of incoming) {
        if (nodes.size >= MAX_NODES) {
          truncated = true;
          break outer;
        }
        const sKey = key(source);
        if (!nodes.has(sKey)) {
          nodes.set(sKey, {
            key: sKey,
            resource: source,
            depthFromRoot: level,
            isRoot: false,
          });
          nextFrontier.push(source);
        }
        // D-10: incoming arrow points AT the current resource (source → r).
        edges.push({ source: sKey, target: rKey, label: fieldName });
      }
    }
    frontier = nextFrontier;
  }

  return { nodes, edges, truncated };
}

/**
 * React hook wrapper — fires runGraphBfs in a useEffect and surfaces
 * { result, loading } via React state.
 *
 * Dependencies: [client, rootKey, depth] — re-runs on root or depth change.
 * Cancellation flag flips on unmount or dep change to suppress stale render.
 */
export interface UseGraphBfsState {
  loading: boolean;
  result: GraphBfsResult | undefined;
}

export function useGraphBfs(
  client: MedplumClient,
  root: Resource | undefined,
  depth: number,
): UseGraphBfsState {
  const [state, setState] = useState<UseGraphBfsState>({
    loading: true,
    result: undefined,
  });
  const rootKey = root ? key(root) : undefined;

  useEffect(() => {
    if (!root) return;
    const signal: GraphBfsSignal = { cancelled: false };
    setState({ loading: true, result: undefined });
    runGraphBfs(client, root, depth, signal)
      .then((result) => {
        if (signal.cancelled) return;
        setState({ loading: false, result });
      })
      .catch(() => {
        if (signal.cancelled) return;
        setState({
          loading: false,
          result: { nodes: new Map(), edges: [], truncated: false },
        });
      });
    return () => {
      signal.cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, rootKey, depth]);

  return state;
}
