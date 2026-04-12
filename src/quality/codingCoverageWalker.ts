/**
 * codingCoverageWalker — Plan 05-04 classifier for the Coding Coverage axis.
 *
 * This module is a SIBLING to `src/terminology/walker.ts` (Phase 4) — it
 * does NOT modify or extend collectCodings. The Phase 4 walker yields
 * every bare Coding in a resource for display-value resolution; this
 * module yields every CodeableConcept-shaped node bucketed into one of
 * three classifications: systemCode / textOnly / empty.
 *
 * ## CC-shape heuristic (Pitfall 5 defense)
 *
 * A node is treated as a CodeableConcept iff:
 *   1. It has a `coding` array OR a string `text` (the CC marker fields).
 *   2. Its key set is a subset of { coding, text, extension, id }.
 *
 * Rule 2 is the Pitfall 5 allowlist. Identifier carries keys like
 * `value` / `use` / `type` / `assigner`, Reference carries `reference`,
 * Quantity carries `value` / `unit` / `system` / `code`. Any of those
 * extra keys breaks the allowlist and the heuristic correctly rejects
 * the node as NOT a CodeableConcept. A regression test asserts that
 * `Patient.identifier[0]` is never classified.
 *
 * A bare `Coding` (has `system` + `code` but no `coding` array and no
 * `text`) fails the Rule 1 marker check, so it is also not classified.
 * Bare Codings are Phase 4's concern, not ours.
 *
 * ## Path format
 *
 * Paths use dotted notation with `[index]` for array positions:
 *   - `Condition.code`
 *   - `Observation.component[0].code`
 *   - `Patient.identifier[0].type`
 *
 * `aggregateCoverage` collapses `[0]`/`[1]`/... to `[*]` so repeated
 * array positions aggregate under a single `perPath` key.
 */
import type { CodeableConcept, Resource } from '@medplum/fhirtypes';
import type {
  ClassifiedCodedField,
  CodedClassification,
  PerTypeCoverageReport,
} from './types';

/** Allowlist of keys that appear on genuine CodeableConcepts. */
const CC_KEYS = new Set(['coding', 'text', 'extension', 'id']);

function isCodeableConcept(node: Record<string, unknown>): boolean {
  const keys = Object.keys(node);
  // Rule 1: key set must be a subset of the CC allowlist. This is what
  // excludes Identifier (`value`/`use`/`type`), Reference (`reference`),
  // Quantity (`value`/`unit`/`code`), etc.
  for (const k of keys) {
    if (!CC_KEYS.has(k)) return false;
  }
  // Rule 2: we need SOME reason to think this is a CC. Either:
  //   a) a CC marker is present (coding array / text string / extension / id), or
  //   b) the node is literally `{}` — an empty placeholder at what the
  //      caller labelled as a CC-position via the path argument.
  // Rule 2a catches the common case. Rule 2b handles the FHIR authoring
  // pattern where a CC field is declared with an empty object when the
  // coder had no value to record — per 05-04-PLAN behavior table, an
  // empty-object CC must classify as `empty`.
  if (keys.length === 0) return true;
  const hasMarker =
    Array.isArray(node.coding) ||
    typeof node.text === 'string' ||
    'extension' in node ||
    'id' in node;
  return hasMarker;
}

function classifyCC(cc: CodeableConcept): CodedClassification {
  const hasSystemCode =
    Array.isArray(cc.coding) &&
    cc.coding.some(
      (c) => typeof c?.system === 'string' && typeof c?.code === 'string',
    );
  if (hasSystemCode) return 'systemCode';
  if (typeof cc.text === 'string' && cc.text.length > 0) return 'textOnly';
  return 'empty';
}

/**
 * Walk a resource (or any FHIR-shaped object) and classify every
 * CodeableConcept-shaped node. The returned paths include the
 * `resourceType` prefix when the walker starts at a resource root via
 * `classifyCodedFields(resource)`; aggregation strips that prefix.
 *
 * Mirrors `collectCodings` from src/terminology/walker.ts:
 *   - typeof !== 'object' early-return
 *   - Array.isArray handled with `[i]` path segments
 *   - No depth limit (FHIR nesting is bounded by spec)
 *   - No prototype chain traversal (Object.keys only)
 */
export function classifyCodedFields(
  resource: unknown,
  path = '',
  out: ClassifiedCodedField[] = [],
): ClassifiedCodedField[] {
  if (!resource || typeof resource !== 'object') return out;

  if (Array.isArray(resource)) {
    resource.forEach((v, i) => classifyCodedFields(v, `${path}[${i}]`, out));
    return out;
  }

  const node = resource as Record<string, unknown>;

  // Starting from a resource root: seed path with resourceType so nested
  // CCs carry a clean prefix like `Condition.code`.
  if (path === '' && typeof node.resourceType === 'string') {
    for (const [k, v] of Object.entries(node)) {
      if (k === 'resourceType') continue;
      classifyCodedFields(v, `${node.resourceType}.${k}`, out);
    }
    return out;
  }

  if (path && isCodeableConcept(node)) {
    const cc = node as CodeableConcept;
    out.push({ path, classification: classifyCC(cc), value: cc });
    // Shape-matched: do not recurse into coding[]/text — Codings are
    // Phase 4 territory and strings are primitives.
    return out;
  }

  for (const [k, v] of Object.entries(node)) {
    classifyCodedFields(v, path ? `${path}.${k}` : k, out);
  }
  return out;
}

/**
 * Reduce a sample of resources into a `PerTypeCoverageReport`.
 *
 * ResourceType prefix is stripped from aggregation paths so samples of
 * `Condition` resources all aggregate under `code` (not `Condition.code`).
 * Array indexes are collapsed: `component[0].code` and `component[1].code`
 * both feed into the `component[*].code` bucket.
 *
 * `totalCodedFields` is the denominator used by the rollup (sum of the
 * three buckets). Zero-CC resources produce a zeroed report — the hook
 * treats that as "no coverage signal" and excludes the type from the
 * OverviewStrip average (locked rule in 05-01-SUMMARY).
 */
export function aggregateCoverage(sample: Resource[]): PerTypeCoverageReport {
  const perPath: Record<
    string,
    { systemCode: number; textOnly: number; empty: number }
  > = {};
  let systemCode = 0;
  let textOnly = 0;
  let empty = 0;

  for (const r of sample) {
    const fields = classifyCodedFields(r);
    const typePrefix = r.resourceType ? `${r.resourceType}.` : '';
    for (const f of fields) {
      const stripped = typePrefix && f.path.startsWith(typePrefix)
        ? f.path.slice(typePrefix.length)
        : f.path;
      const aggregationPath = stripped.replace(/\[\d+\]/g, '[*]');
      const bucket =
        perPath[aggregationPath] ??
        (perPath[aggregationPath] = {
          systemCode: 0,
          textOnly: 0,
          empty: 0,
        });
      bucket[f.classification]++;
      if (f.classification === 'systemCode') systemCode++;
      else if (f.classification === 'textOnly') textOnly++;
      else empty++;
    }
  }

  const totalCodedFields = systemCode + textOnly + empty;
  return {
    systemCode,
    textOnly,
    empty,
    totalCodedFields,
    perPath,
    sampleSize: sample.length,
  };
}
