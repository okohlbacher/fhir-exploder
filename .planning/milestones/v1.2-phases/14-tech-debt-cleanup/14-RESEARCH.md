# Phase 14: Tech Debt Cleanup - Research

**Researched:** 2026-04-13
**Domain:** TypeScript build errors, code review remediation, FHIR type casting
**Confidence:** HIGH

## Summary

Phase 14 is a mechanical cleanup phase with no new features. The work divides into two clear streams: (1) eliminating 54 TypeScript build errors across 24 files, and (2) resolving 17 info-level code review findings from phases 4 and 5. The error breakdown is well-understood from the discussion phase and verified against the current build output.

The highest-impact single fix is installing `@testing-library/dom` as a dev dependency, which clears 31 of 54 TS errors (all TS2305) and unblocks 15 of 16 currently-failing test files. The remaining errors are straightforward: 17 TS2352 casts addressed by a new `toRecord()` utility, 4 unused declarations to remove, and 1 `ResourceType` string narrowing fix.

**Primary recommendation:** Execute in the order specified by D-03 (install `@testing-library/dom` first, then unused declarations, then `toRecord()` utility + migration, then TS2345 fix, then info-level findings). This order maximizes early validation -- after step 1, `npm run test` should go from 16 failing files to 1.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Fix all 17 info-level findings as written in the review files. For IN-08 (shared sample cache for CodingDrillDown), add a TODO comment rather than building the cache infrastructure.
- **D-02:** All 4 pending todos are folded into Phase 14 scope (TS2345 readResource type-widening, unused variable warnings in tests, global not found in resource-type-landing-counts test, SearchRequest coercion TS2352). These overlap directly with DEBT-02 and avoid duplicate work.
- **D-03:** Quick wins first order:
  1. Install `@testing-library/dom` as dev dependency (clears 31 errors in one fix)
  2. Remove unused declarations (clears 4 errors)
  3. Create `src/utils/fhir-helpers.ts` with `toRecord()` + `getCodeDisplay()` helpers, apply across all 17 TS2352 error sites AND existing inline casts (~45 sites across the codebase)
  4. Fix remaining TS2345 ResourceType string error
  5. Address all 17 info-level code review findings
- **D-04:** Create `src/utils/fhir-helpers.ts` containing `toRecord(resource)` and `getCodeDisplay(concept)`. Date/period extraction left as-is.
- **D-05:** Install `@testing-library/dom` as a dev dependency.

### Claude's Discretion
- Exact naming of the utility module and helper functions
- Whether to fix test file TS errors alongside source file errors or in a separate pass within the quick-wins-first order
- Specific implementation of `getCodeDisplay()` (return type, null handling)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DEBT-01 | All 17 info-level code review findings from v1.0 phases 4+5 are resolved | Full enumeration of all 17 findings below with file locations and fix patterns |
| DEBT-02 | `npm run build` (tsc -b) completes with zero errors | Complete error inventory (54 errors, 4 categories) with verified fix strategies per category |
</phase_requirements>

## Standard Stack

No new libraries needed beyond installing a missing peer dependency.

### Core (Install)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @testing-library/dom | ^10.4.1 | DOM testing utilities (types) | Required peer dependency of @testing-library/react@16.3.2. Missing from devDependencies, causing 31 TS2305 errors. [VERIFIED: `npm view @testing-library/react peerDependencies` shows `@testing-library/dom: '^10.0.0'`] |

### Installation
```bash
npm install --save-dev @testing-library/dom
```

**Version verification:** `@testing-library/dom` latest is 10.4.1 [VERIFIED: npm registry 2026-04-13]. The peer requirement is `^10.0.0`, so 10.4.1 satisfies it.

## Architecture Patterns

### Pattern 1: Centralized FHIR Type Casting (`toRecord`)

**What:** A single utility function that performs `Resource -> Record<string, unknown>` via double-cast, replacing 47 scattered inline casts across the codebase.

**Why needed:** Medplum's `@medplum/fhirtypes` defines `Resource` as a discriminated union of ~165 FHIR resource types. TypeScript correctly flags `Resource as Record<string, unknown>` because `VisionPrescription` (and potentially others) lack an index signature. The fix is `as unknown as Record<string, unknown>`, but repeating this 47 times is unmaintainable. [VERIFIED: current build output confirms all 17 TS2352 errors reference VisionPrescription]

**Implementation:**
```typescript
// src/utils/fhir-helpers.ts
import type { CodeableConcept, Resource } from '@medplum/fhirtypes';

/**
 * Cast a FHIR Resource to a plain record for dynamic property access.
 * Centralizes the `as unknown as Record<string, unknown>` double-cast
 * needed because some Resource union members lack an index signature.
 */
export function toRecord(resource: Resource): Record<string, unknown> {
  return resource as unknown as Record<string, unknown>;
}
```

**Migration scope:** 47 sites across 16 files [VERIFIED: `grep -rn "as Record<string, unknown>" src/` counted 47 matches]. The 17 TS2352 error sites use `resource as Record<string, unknown>` (single cast, which fails); the remaining ~30 sites already use `as Record<string, unknown>` on values that happen to be typed loosely enough to work. All should migrate for consistency.

**Files requiring migration (by error count):**

| File | TS2352 Errors | Existing Casts | Total Sites |
|------|--------------|----------------|-------------|
| `src/components/explorer/SearchResultsPage.tsx` | 7 | 4 | 11 |
| `src/components/patients/MiiModuleTab.tsx` | 3 | 3 | 6 |
| `src/components/patients/PatientTimeline.tsx` | 2 | 3 | 5 |
| `src/components/patients/FhirResourcesView.tsx` | 2 | 2 | 4 |
| `src/components/explorer/ResourcePropertyTable.tsx` | 3 | 1 | 4 |
| `src/utils/export.ts` | 1 | 0 | 1 |
| `src/components/explorer/ResourceDetailPage.tsx` | 0 (TS2345) | 0 | 0 |
| Other files (settings, walkers, JsonTreeView, etc.) | 0 | ~16 | ~16 |

### Pattern 2: CodeableConcept Display Extraction (`getCodeDisplay`)

**What:** Utility to extract a human-readable display string from a `CodeableConcept`, consolidating a repeated pattern found in 4+ files.

**Current pattern (repeated):**
```typescript
const concept = (r as Record<string, unknown>).code;
if (concept && typeof concept === 'object') {
  const c = concept as Record<string, unknown>;
  if (Array.isArray(c.coding) && c.coding.length > 0) {
    const coding = c.coding[0] as Record<string, unknown>;
    return (coding.display as string) || (coding.code as string) || '';
  }
}
```

**Consolidated:**
```typescript
// src/utils/fhir-helpers.ts
export function getCodeDisplay(concept: CodeableConcept | undefined): string {
  if (!concept) return '';
  if (concept.text) return concept.text;
  const coding = concept.coding?.[0];
  if (!coding) return '';
  return coding.display ?? coding.code ?? '';
}
```

**Files with this pattern:** SearchResultsPage, MiiModuleTab, FhirResourcesView, PatientTimeline [VERIFIED: grep confirmed repeated coding extraction in all 4 files]

### Pattern 3: ResourceType Narrowing (TS2345 Fix)

**What:** `readResource(resourceType, id)` requires `ResourceType` (a union of ~165 string literals), but `useParams()` returns `string`. Need explicit narrowing.

**File:** `src/components/explorer/ResourceDetailPage.tsx:62`

**Fix:**
```typescript
import type { ResourceType } from '@medplum/fhirtypes';

// In the useEffect:
client.readResource(resourceType as ResourceType, id)
```

This is safe because the value comes from URL params that match server-known resource types. The `as ResourceType` assertion is the standard Medplum pattern for route-parameter-sourced types. [ASSUMED]

### Anti-Patterns to Avoid
- **Modifying Medplum type definitions:** Do not try to add index signatures to `Resource` or its constituents. The types are generated from the FHIR spec and should not be patched.
- **Suppressing with `// @ts-ignore`:** Every error has a clean fix; suppressions are not needed.
- **Using `any`:** The `toRecord()` helper uses `unknown` intermediary, not `any`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Resource-to-record casting | Inline `as unknown as Record<string, unknown>` everywhere | `toRecord()` utility | Single point of change if Medplum fixes their types in future versions |
| CodeableConcept display extraction | Inline coding[0].display fallback chains | `getCodeDisplay()` utility | 4+ files have this exact pattern; one function with null-safety |
| Testing library DOM types | Manual type declarations | `npm install --save-dev @testing-library/dom` | It's literally a missing peer dependency |

## Common Pitfalls

### Pitfall 1: Forgetting to Migrate Non-Error Casts
**What goes wrong:** Only fixing the 17 TS2352 error sites while leaving 30 working-but-identical casts untouched.
**Why it happens:** Working casts don't show up in build errors -- only the ones on `Resource`-typed variables fail.
**How to avoid:** Use grep to find ALL `as Record<string, unknown>` sites in `src/` and migrate all to `toRecord()`. Decision D-04 explicitly requires this.
**Warning signs:** `grep -rn "as Record<string, unknown>" src/` still returns results after the utility is applied.

### Pitfall 2: `@testing-library/dom` Version Mismatch
**What goes wrong:** Installing a version outside the peer range.
**Why it happens:** The peer requirement is `^10.0.0` but someone might install an older or newer major.
**How to avoid:** Install without a version pin (`npm install --save-dev @testing-library/dom`) -- npm will pick the latest 10.x which satisfies the peer.
**Warning signs:** `npm ls @testing-library/dom` shows peer dep warning.

### Pitfall 3: Breaking `getCodeDisplay` Callers with Different Return Types
**What goes wrong:** Callers expect `string | undefined` but the helper returns `string` (or vice versa).
**Why it happens:** Some callers use the display value in conditional chains that depend on truthiness.
**How to avoid:** Return `string` (empty string for no-value case). This preserves truthiness checks (`if (display)`) while eliminating undefined checks.

### Pitfall 4: Info-Level Findings Already Fixed by Earlier Steps
**What goes wrong:** Double-fixing or conflicting changes when an info finding was already addressed by the TS error fixes.
**Why it happens:** Some Phase 5 info findings (e.g., IN-04 dead `void NumberFormatter`) overlap with TS6133 unused declaration fixes.
**How to avoid:** After TS error fixes, re-check each info finding against the current code before applying.

## Code Review Findings Inventory

### Phase 4 Info-Level Findings (5 items)

| ID | File | Issue | Fix Approach |
|----|------|-------|-------------|
| IN-01 | `src/terminology/walker.ts:29-31` | Walker descends into Coding scalar fields unnecessarily | Add `typeof child === 'object'` guard before recursing |
| IN-02 | `src/terminology/TerminologyResolver.ts:63` | `'__unconfigured__'` sentinel duplicated in two files | Extract to exported constant in `terminologyKey.ts` |
| IN-03 | `src/terminology/TerminologyResolver.ts:23-34` | `extractDisplay` lacks guard for non-array `params.parameter` | Add `Array.isArray` check |
| IN-04 | `src/__tests__/resolved-resource.test.tsx:34` | Ref mutation during render phase (anti-pattern) | Move assignment into `useEffect` |
| IN-05 | `public/settings.yaml:7` | Commented-out credential shape in version-controlled file | Remove example token comment, reference docs instead |

### Phase 5 Info-Level Findings (12 items)

| ID | File | Issue | Fix Approach |
|----|------|-------|-------------|
| IN-01 | `src/components/quality/CodingDrillDown.tsx:14,35` | Duplicate React imports (line 14: `useEffect,useMemo,useRef`; line 35: `useState`) | Merge into single import |
| IN-02 | `src/quality/completenessWalker.ts:76` | `isNonEmpty` uses `for..in` with unused `_` | Replace with `Object.keys(...).length > 0` |
| IN-03 | Export utility | Filename contains colons (Windows-hostile) | Replace `[:.]` with `-` in generated filenames |
| IN-04 | `src/components/quality/ValidationPanel.tsx:73` | Dead `void NumberFormatter;` | Remove line |
| IN-05 | `src/components/quality/ValidationPanel.tsx:139` | Dead `void backends` | Destructure only used fields |
| IN-06 | `src/components/quality/CompletenessDrillDown.tsx` | `singleTypeList` array re-created each render | Wrap in `useMemo` |
| IN-07 | `src/components/quality/SampleSizeControl.tsx` | `onChange` coerces `0` to DEFAULT instead of clamping to MIN | Clamp to MIN (10) instead |
| IN-08 | `src/components/quality/CodingDrillDown.tsx` | Double-fetches samples (no shared cache) | Add TODO comment per D-01 (no infrastructure) |
| IN-09 | `src/hooks/useValidationRun.ts` | `errorMessage` cleared on subsequent starts | Acceptable -- add clarifying comment |
| IN-10 | `src/hooks/useValidationRun.ts` | Progress-update block duplicated ~40 lines | Extract helper function |
| IN-11 | `src/hooks/useCompletenessReport.ts` | Cancel-return in `next()` is subtle | Add clarifying comment |
| IN-12 | `src/components/quality/ValidationPanel.tsx` | `bannerKey` recomputed per render | Wrap in `useMemo` (already wrapped -- verify current state) |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (via `vitest.config.ts`) |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run` |
| Build check | `npm run build` (tsc -b && vite build) |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DEBT-01 | All 17 info findings addressed | manual (code review) | N/A -- diff review | N/A |
| DEBT-02 | Zero TS build errors | build | `npx tsc -b --noEmit` | N/A (build command) |
| DEBT-02 | Zero test file failures from types | test | `npx vitest run` | Existing 37 test files |

### Sampling Rate
- **Per task commit:** `npx tsc -b --noEmit` (type check) + `npx vitest run` (runtime)
- **Per wave merge:** `npm run build` (full build including vite)
- **Phase gate:** `npm run build` exits 0, `npx vitest run` green (all non-skipped pass)

### Wave 0 Gaps
None -- existing test infrastructure covers all phase requirements. The only gap is the missing `@testing-library/dom` dependency, which is the first fix in D-03.

### Current Test Baseline (Pre-Fix)
- **37 test files** (3 skipped)
- **16 failing** (15 from missing `@testing-library/dom` types, 1 from `terminology-health.test.ts` actual failure)
- **18 passing**, **3 skipped**
- **204 tests total**: 181 passed, 1 failed, 22 todo

[VERIFIED: `npx vitest run` output 2026-04-13]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `JSON.parse(JSON.stringify(x))` deep clone | `structuredClone(x)` | Available since Node 17 / all modern browsers | Phase 4 WR-04 noted this but it's out of scope for Phase 14 (info findings only) |
| `as Record<string, unknown>` direct cast | `as unknown as Record<string, unknown>` double-cast | TypeScript 5.x stricter overlap checking | Why the 17 TS2352 errors exist -- TS correctly rejects the single cast |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `resourceType as ResourceType` assertion is safe for URL-param-sourced values | Pattern 3 | Low -- worst case, Medplum throws a 404 for unknown types, already handled by the existing catch block |
| A2 | IN-12 (`bannerKey` useMemo) may already be fixed in current code | Phase 5 IN-12 | Low -- verified `useMemo` exists at line 84 of ValidationPanel.tsx; finding may be stale |

## Open Questions

1. **terminology-health.test.ts actual failure**
   - What we know: `probeTerminologyHealth` returns `'unreachable'` instead of `'ok'` in the test. This is 1 test failure unrelated to type errors.
   - What's unclear: Whether this is a pre-existing regression or related to recent changes.
   - Recommendation: Include in Phase 14 scope as part of "zero warnings/errors" goal. Investigate the mock setup in the test.

## Environment Availability

Step 2.6: SKIPPED (no external dependencies -- purely code/config changes using existing npm packages).

## Sources

### Primary (HIGH confidence)
- npm registry: `npm view @testing-library/dom version` -> 10.4.1, `npm view @testing-library/react peerDependencies` -> `@testing-library/dom: '^10.0.0'`
- TypeScript build output: `npx tsc -b --noEmit` -> 54 errors verified
- Vitest test output: `npx vitest run` -> 16 failing files, 1 actual test failure
- Codebase grep: 47 `as Record<string, unknown>` sites across src/

### Secondary (MEDIUM confidence)
- Phase 4 review: `git show 46e2c82:.planning/phases/04-terminology-resolution/04-REVIEW.md` -- 5 info findings
- Phase 5 review: `git show 2596316:.planning/phases/05-data-quality-dashboard/05-REVIEW.md` -- 12 info findings

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- single missing peer dependency, version verified against npm
- Architecture: HIGH -- patterns derived from actual codebase grep, error output, and review files
- Pitfalls: HIGH -- all pitfalls derived from verified codebase state

**Research date:** 2026-04-13
**Valid until:** 2026-05-13 (stable -- no external dependency changes expected)
