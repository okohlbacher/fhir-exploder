/**
 * Phase 43 VAL-07 — Semantic near-miss walker.
 *
 * Walks SNOMED CT / ICD-10 hierarchies via the configured terminology
 * server's `CodeSystem/$lookup` endpoint when an external validator
 * returns `code-invalid`. Surfaces "Did you mean?" suggestions: parents
 * (broader → specific) THEN children (specific → very specific), capped
 * at 10 suggestions, depth ≤ 3, total nodes ≤ 50.
 *
 * Design notes:
 *   - Reuses Phase 4's `TerminologyResolver` (LRU cache + silent fallback).
 *     `resolver.client` is the configured MedplumClient; `resolver.lookupDisplay`
 *     is the cached display resolver.
 *   - BFS over (system, code) with a visited Set keyed by `${system}|${code}`
 *     to defeat SNOMED's cyclic `Is a` references (Pitfall: T-43-05).
 *   - Each branch stays on the same axis: a node visited as a parent only
 *     enqueues parents; a node visited as a child only enqueues children.
 *     Otherwise ancestors and descendants intermix and break D-09 ordering.
 *   - Silent fallback (D-12): when `resolver.client` is null, when the seed
 *     `$lookup` fails, or when any subsequent `$lookup` throws, the walker
 *     returns whatever it has gathered so far — never throws to the caller.
 *   - Bounds (D-08, D-09) are non-configurable in v1.6. A `maxDepth` setting
 *     is a Phase 4x backlog candidate.
 *
 * NOT in this module:
 *   - Caching of suggestion arrays. Each call computes fresh; per-resource
 *     cost is ≤ 50 LRU-cached lookups.
 *   - UI rendering. ResourceIssueTable owns the inline expandable row.
 *   - Cascade integration. cascadingValidator decides when to call.
 */
import type { Parameters } from '@medplum/fhirtypes';
import type { TerminologyResolver } from '../terminology/TerminologyResolver';

/** D-08 / D-09 bounds — non-configurable in v1.6. */
const MAX_DEPTH = 3;
const MAX_NODES = 50;
const MAX_SUGGESTIONS = 10;

/** Public suggestion shape rendered by ResourceIssueTable. */
export interface NearMissSuggestion {
  system: string;
  code: string;
  display: string;
  relation: 'parent' | 'child' | 'sibling';
  depth: number;
}

interface WalkNode {
  system: string;
  code: string;
  depth: number;
  relation: 'parent' | 'child';
}

/**
 * Walk SNOMED CT / ICD-10 hierarchy around `invalidCode` and return up to
 * `MAX_SUGGESTIONS` suggestions ordered ancestors-first then descendants
 * (each block sorted by depth ASC then display alphabetical).
 *
 * Returns `[]` when:
 *   - `resolver.client` is null (no terminology server configured) — D-12.
 *   - The seed `$lookup` fails or returns no parent/child relations.
 *   - All terminology fetches fail (still no error to caller — silent).
 */
export async function walkNearMisses(
  system: string,
  invalidCode: string,
  resolver: TerminologyResolver,
): Promise<NearMissSuggestion[]> {
  // D-12: terminology server unavailable → silent fallback. Caller receives
  // [] which the UI translates into "no chevron, no Collapse row".
  if (!resolver || !resolver.client) return [];

  const visited = new Set<string>();
  const queue: WalkNode[] = [];
  const ancestors: NearMissSuggestion[] = [];
  const descendants: NearMissSuggestion[] = [];

  // Seed: $lookup the invalid code itself to get its immediate parents+children.
  const seedParams = await fetchLookupWithProperties(resolver, system, invalidCode, [
    'parent',
    'child',
  ]);
  if (!seedParams) return [];

  for (const { value, role } of extractRelations(seedParams)) {
    const key = `${system}|${value}`;
    if (visited.has(key)) continue;
    visited.add(key);
    queue.push({ system, code: value, depth: 1, relation: role });
  }

  // BFS. totalNodes counts every node visited (across both axes — single
  // counter, not per-axis). Defends against pathological hierarchies (e.g.,
  // SNOMED `Disorder of body system` has tens of thousands of descendants).
  let totalNodes = 1; // 1 for the seed
  while (queue.length > 0 && totalNodes < MAX_NODES) {
    const node = queue.shift();
    if (!node) break;

    const display = await resolver.lookupDisplay(node.system, node.code);
    const suggestion: NearMissSuggestion = {
      system: node.system,
      code: node.code,
      display: display ?? node.code,
      relation: node.relation,
      depth: node.depth,
    };
    if (node.relation === 'parent') ancestors.push(suggestion);
    else descendants.push(suggestion);

    totalNodes++;
    if (node.depth >= MAX_DEPTH) continue;

    // Per-axis branching: a parent BFS node only enqueues parents; a child
    // BFS node only enqueues children. Mixing breaks D-09 ordering.
    const axisParams = await fetchLookupWithProperties(resolver, node.system, node.code, [
      node.relation,
    ]);
    if (!axisParams) continue;
    for (const { value, role } of extractRelations(axisParams)) {
      if (role !== node.relation) continue; // stay on axis
      const key = `${node.system}|${value}`;
      if (visited.has(key)) continue;
      visited.add(key);
      queue.push({
        system: node.system,
        code: value,
        depth: node.depth + 1,
        relation: node.relation,
      });
    }
  }

  // D-09: ancestors first (broader → specific), then descendants. Sort each
  // block by depth ASC (closer first) then display ASC (alphabetical tiebreak).
  ancestors.sort((a, b) => a.depth - b.depth || a.display.localeCompare(b.display));
  descendants.sort((a, b) => a.depth - b.depth || a.display.localeCompare(b.display));
  return [...ancestors, ...descendants].slice(0, MAX_SUGGESTIONS);
}

/**
 * Extract parent/child relations from a `CodeSystem/$lookup` Parameters
 * response. Per Pitfall 3 (FHIR R4 §5.5.1 polymorphic `value[x]`), falls
 * through `valueCode → valueString → valueCoding.code` so the walker
 * survives Ontoserver vs. HAPI vs. strict-spec response variance.
 */
function extractRelations(
  p: Parameters,
): Array<{ value: string; role: 'parent' | 'child' }> {
  const out: Array<{ value: string; role: 'parent' | 'child' }> = [];
  for (const prop of p.parameter ?? []) {
    if (prop.name !== 'property') continue;
    const codePart = prop.part?.find((q) => q.name === 'code')?.valueCode;
    if (codePart !== 'parent' && codePart !== 'child') continue;
    const valuePart = prop.part?.find((q) => q.name === 'value');
    // Polymorphism: value[x] can be valueCode (Ontoserver SNOMED default),
    // valueString (some HAPI configs), or valueCoding (strict R4 spec).
    const value =
      valuePart?.valueCode ??
      valuePart?.valueString ??
      valuePart?.valueCoding?.code;
    if (typeof value === 'string' && value.length > 0) {
      out.push({ value, role: codePart });
    }
  }
  return out;
}

/**
 * Issue a `CodeSystem/$lookup?system=...&code=...&property=parent&property=child`
 * via `resolver.client.get`. Returns null on any error (D-12 silent fallback).
 *
 * Built OUTSIDE the BFS try/catch so a network blip in one node doesn't
 * abort the whole walk — the caller continues with whatever was already
 * collected.
 */
async function fetchLookupWithProperties(
  resolver: TerminologyResolver,
  system: string,
  code: string,
  properties: Array<'parent' | 'child'>,
): Promise<Parameters | null> {
  if (!resolver.client) return null;
  try {
    const qs = new URLSearchParams({ system, code });
    for (const p of properties) qs.append('property', p);
    const result = await resolver.client.get<Parameters>(
      `CodeSystem/$lookup?${qs.toString()}`,
    );
    return result;
  } catch {
    return null; // D-12 silent fallback — never throw to caller
  }
}
