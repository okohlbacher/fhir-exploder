# Phase 42: Pre-probe extension-module counts (MII-EXT-15) — Research

**Researched:** 2026-04-29
**Domain:** React hooks + parallel FHIR `_summary=count` fan-out + Mantine 8 tab-pill rendering + idempotent context-callback wiring
**Confidence:** HIGH (all critical claims grounded in current source files in this repo)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01 — Append count to primary line.** Tab pill renders `{germanLabel} ({count})` on the primary line (e.g. `Onkologie (12)`); FHIR-type subtitle unchanged. Touches `TabPillLabel` in `src/components/patients/MiiModuleTabs.tsx` (lines 64-100). Pills auto-size on count digit width — no fixed-width concern.

- **D-02 — Sum across types.** For multi-type modules (`fhirResourceTypesOf(mod).length > 1`, e.g. Onkologie = `[Condition, Observation, Procedure, MedicationStatement]`, MTB = 3 types, Pathologie = 3 types, Kardiologie = 3 types, Intensivmedizin = 3 types, Bildgebung = 2 types), the displayed count is the SUM of per-type `_summary=count` results. Single number per module pill. Per-type breakdown UI explicitly NOT in scope.

- **D-03 — No placeholder; per-tab independent fade-in.** Tabs render exactly as today until each module's count resolves; then label updates to `{germanLabel} ({count})` for that single tab. No `(…)` placeholder, no `Loader`, no skeleton. Per-tab independent — fastest module appears first.

- **D-04 — Extension-only.** Hook fans out across `category === 'extension'` modules ONLY (14 modules). Base 7 modules unchanged.

- **D-05 — Feed publisher from pre-probe.** Hook dispatches `reportEmptiness(moduleKey, count === 0)` for every extension module after its count resolves. Use the coordinator's exposed callback directly (NOT `useEmptyExtensionsPublisher` in a loop — Rules of Hooks).

- **D-06 — Dim only after count resolves to 0.** Pills at full opacity during fetch. After resolve: `count === 0` → `opacity: 0.55`; `count > 0` → full opacity. Use `data-testid="extension-tab-pill"` + `data-empty={isEmpty}` for regression assertions.

### Claude's Discretion

- **Cleanup primitive:** `cancelled`-flag (recommended, matches `PatientRelatedResources.tsx`) vs `AbortController`. Pick ONE and document.
- **Cache scope:** hook-internal `useRef<Map<string, number>>` keyed by `${patientId}:${moduleId}`.
- **Concurrency cap:** defer unless UAT shows lag.

### Deferred Ideas (OUT OF SCOPE)

- Manual refresh / re-probe button.
- Per-type breakdown tooltip.
- Pre-probe for base 7 modules.
- Cache survival across patient switch.
- Counts on Dashboard MII tile grid or ClinicalTimeline (Phase 33/34 surfaces — Phase 42 is patient-detail tabs only).
- Replacing Phase 34's coordinator with a Phase 42 source-of-truth.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MII-EXT-15 | Patient-detail extension-module tabs show pre-probed counts on tab labels (`Onkologie (12)`); zero-count tabs render dimmed `(0)`; counts cached per `(patientId, moduleId)` for the session. | (1) Hook signature + fan-out pattern grounded in `PatientRelatedResources.tsx:36-58` (proven precedent). (2) D-05 integration verified — `reportEmptiness` is exposed and ALREADY idempotent (line 106 of coordinator). (3) Render-site mechanics ground in `MiiModuleTabs.tsx:64-100, 178-187, 245-254`. (4) Test seams + fixture pattern grounded in existing `MiiModuleTabs.test.tsx`. |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

| Constraint | Source | Implication for Phase 42 |
|------------|--------|--------------------------|
| React 18.3.1 (NOT 19) | CLAUDE.md "Tech Stack" | Use stable React 18 hooks; no `use()`, no actions. |
| TypeScript 5.7+ | CLAUDE.md | Type the hook return as `Record<string, number \| undefined>`. |
| Mantine 8.3.18 | CLAUDE.md | `<Tabs.Tab style={{ opacity }}>` IS supported (verified in `MiiModuleTab.tsx:143`); inline-style serialization is NOT grep-friendly so tests use `data-testid` + `getComputedStyle`. |
| Medplum 5.1.7 — `client.get(client.fhirUrl(url).toString())` | CLAUDE.md "Connecting MedplumClient to Blaze" | Standard fetch idiom; returns `Bundle`. Phase 42 uses identical pattern. |
| Read-only explorer; no SMART on FHIR; direct Blaze access | CLAUDE.md, PROJECT.md | No auth changes; counts are anonymous GETs with no PHI. |
| GSD workflow enforcement: no direct edits outside a GSD command | CLAUDE.md | Phase 42 plans must be created via `/gsd-plan-phase` chain. |
| Local-first runtime (`localhost` or reachable Blaze) | CLAUDE.md | Concurrency cap may matter on a remote Blaze; current decision is "defer until UAT shows lag". |
| Forbidden: `@tanstack/react-query` | CLAUDE.md "Do NOT Use" | Cache must be hand-rolled inside `useRef<Map>` — NOT introduced via react-query. |
| Forbidden: Tailwind CSS, Mantine 9 | CLAUDE.md "Do NOT Use" | Style via Mantine `style={{ opacity }}` prop only. |

## Summary

Phase 42 is a near-port of `src/components/explorer/PatientRelatedResources.tsx:36-58` generalized over the 14 MII extension modules. The pattern — `_summary=count&_count=0` parallel fan-out with per-type `.catch(() => 0)` fallback and a `cancelled`-flag cleanup — is already battle-tested in this codebase, ships in production, and was hand-walked by the user during Phase 38 UAT. Phase 42's only novel mechanics are (a) per-module aggregation across multiple FHIR types (D-02), (b) integration with Phase 34's `useEmptyExtensionsCoordinator` via the already-exposed `reportEmptiness` callback (D-05), and (c) tab-label / opacity rendering at two existing render sites in `MiiModuleTabs.tsx`.

**Critical D-05 risk-check result:** `reportEmptiness` IS already idempotent. `useEmptyExtensionsCoordinator.tsx:106` reads `if (prev[moduleKey] === isEmpty) return prev;` — the dedupe guard is in place. **Phase 42 needs NO additional task to add the guard.** The coexistence of pre-probe (Phase 42) + post-visit publisher (Phase 34's `MiiModuleTab`) is safe: same `(moduleKey, isEmpty)` will short-circuit, different values will overwrite cleanly.

**Module count discrepancy worth flagging:** CONTEXT.md says "15 of them" in one place and ROADMAP §Phase 42 implies a different count. Source-of-truth (`src/utils/mii-modules.ts`) ships **7 base + 14 extension = 21 total** (verified `grep -c "category: 'base'"` = 7, `grep -c "category: 'extension'"` returns 15 because the union-type declaration line ALSO matches; counted by hand: 14 extension entries from `bildgebung` through `symptom`). MII-EXT-15 is a requirement ID (the 15th MII-extension requirement), not a module count.

**Primary recommendation:** Mirror `PatientRelatedResources.tsx` line-for-line; substitute the hardcoded `RELATED_TYPES` array for the existing `MII_MODULES.filter(m => m.category === 'extension')` loop; per module, use `Promise.all(types.map(fetchOne))` then `.reduce((a, b) => a + b, 0)` to aggregate; on resolve, call `reportEmptiness(moduleKey, total === 0)` from inside the `.then(...)`. Use the `cancelled`-flag idiom (NOT `AbortController`) — D-05 guards `setState` correctly without signal plumbing, and the closest sibling code uses this pattern.

## Standard Stack

### Core (already installed — no `npm install` needed)

| Library | Version (verified `package.json` 2026-04-29) | Purpose | Why Standard |
|---------|----------|---------|--------------|
| `@medplum/react-hooks` | ^5.1.7 | `useMedplum()` returns `MedplumClient` for FHIR fetches `[VERIFIED: package.json line]` | Already used in every patient-detail surface; same `client.get(client.fhirUrl(url).toString())` idiom across `PatientRelatedResources.tsx`, `MiiModuleTab.tsx`, `ClinicalTimeline.tsx` `[VERIFIED: codebase grep]` |
| `@medplum/fhirtypes` | ^5.1.7 | `Bundle` type for response parsing `[VERIFIED: package.json]` | Already imported in `PatientRelatedResources.tsx:5`, `MiiModuleTab.tsx:5` `[VERIFIED]` |
| `react` | ^18.3.1 | `useEffect`, `useRef`, `useState` for hook implementation `[VERIFIED: package.json]` | Hook entirely in stable React 18 surface; no React 19 features needed `[CITED: CLAUDE.md tech stack]` |
| `@mantine/core` | ^8.3.18 | `<Tabs.Tab style={{ opacity }}>` for D-06 dimming `[VERIFIED: package.json]` | Inline `style` prop already used at `MiiModuleTab.tsx:143` for the same opacity-0.55 idiom — direct precedent `[VERIFIED: codebase line]` |

### Supporting (transitively present)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@testing-library/react` | ^16.3.2 `[VERIFIED: package.json]` | Hook + integration tests | All Phase 42 regression tests |
| `vitest` (transitive via `vitest/config`) | (transitive) `[VERIFIED: vitest.config.ts]` | Test runner with `globals: true`, `environment: 'jsdom'` | All Phase 42 tests |
| `@medplum/core` | ^5.1.7 | `MedplumClient` type (peer of react-hooks) | Mock surface in tests (see "Test Seams") |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `cancelled`-flag | `AbortController` (Phase 31 idiom — `src/quality/cascadingValidator.ts:131-183`) `[VERIFIED]` | AbortController actually aborts in-flight fetches (saves bandwidth); cancelled-flag only guards `setState`. For 14 fast `_summary=count` GETs against localhost Blaze, the bandwidth saving is negligible and signal plumbing adds boilerplate. **Recommendation: cancelled-flag for consistency with `PatientRelatedResources.tsx`.** |
| Hook-internal `useRef<Map>` | Module-scope singleton `Map` | Module-scope survives unmount → fast back-button between patients. CONTEXT.md says "session" lifetime is "not a hard requirement"; hook-internal is simpler and matches the `EmptyExtensionsProvider` re-keying pattern (provider remounts on patientId change → cache resets, identical lifecycle). |
| `Promise.all` no cap | `p-limit`-style chunking (~14 parallel) | 14 GETs against localhost Blaze is fine. CONTEXT.md says "defer unless UAT shows lag". |

**Installation:** none required — every dependency is already pinned in `package.json` `[VERIFIED]`.

**Version verification (npm registry):** Phase 42 introduces no new dependencies, so version-check is N/A. All consumed packages locked at v1.6 baseline (1064 tests passing as of 2026-04-29).

## Architecture Patterns

### Recommended Project Structure

Phase 42 adds **one** new file and modifies **one** existing file (minimum viable diff):

```
src/
├── hooks/
│   └── useMiiExtensionCounts.tsx   # NEW — the hook
├── components/patients/
│   └── MiiModuleTabs.tsx            # MODIFIED — TabPillLabel + Tabs.Tab dim wrapper
└── components/patients/__tests__/
    └── MiiModuleTabs.test.tsx       # MODIFIED — adds count + dim regression tests
```

Hook lives next to `useEmptyExtensionsCoordinator.tsx` in `src/hooks/` (same directory) for discoverability.

### Pattern 1: `_summary=count&_count=0` parallel fan-out (closest precedent)

**What:** Fire one FHIR GET per `(module, type)` pair in parallel, aggregate per-module via reduce, guard `setState` via `cancelled`-flag in cleanup.

**When to use:** Pre-probe count fan-out across N independent equally-weighted requests with no chaining or timeout race condition. (If chaining or timeout race exists, use AbortController — see Phase 31 reference below.)

**Example (verified working pattern):**
```typescript
// Source: src/components/explorer/PatientRelatedResources.tsx:36-58 [VERIFIED]
useEffect(() => {
  let cancelled = false;
  const initial: Record<string, number | 'loading'> = {};
  for (const rt of RELATED_TYPES) initial[rt.type] = 'loading';
  setCounts(initial);

  for (const rt of RELATED_TYPES) {
    const url = `${rt.type}?${rt.param}=Patient/${patientId}&_summary=count&_count=0`;
    client
      .get(client.fhirUrl(url).toString())
      .then((raw) => {
        if (cancelled) return;
        const bundle: Bundle = typeof raw === 'string' ? JSON.parse(raw) : raw;
        setCounts((prev) => ({ ...prev, [rt.type]: bundle.total ?? 0 }));
      })
      .catch(() => {
        if (cancelled) return;
        setCounts((prev) => ({ ...prev, [rt.type]: 0 }));
      });
  }

  return () => { cancelled = true; };
}, [client, patientId]);
```

### Pattern 2: Per-type fan-out for multi-type modules (D-02 aggregation source)

**What:** For modules with multiple FHIR types (Bildgebung = 2, Onkologie = 4, MTB / Kardiologie / Intensivmedizin / Pathologie = 3), fan out per type, then reduce to a single number.

**Example (verified working pattern):**
```typescript
// Source: src/components/patients/MiiModuleTab.tsx:78-95 [VERIFIED]
const fetchOne = (type: string): Promise<Resource[]> => {
  const param = getPatientSearchParamForType(module, type);
  const extra = getExtraQueryForType(module, type);
  let url = `${type}?${param}=Patient/${patientId}&_count=50&_sort=-_lastUpdated`;
  if (extra) url += `&${extra}`;
  return client
    .get(client.fhirUrl(url).toString())
    .then((raw) => {
      const bundle: Bundle = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return (bundle.entry ?? []).map((e) => e.resource).filter(Boolean) as Resource[];
    })
    .catch(() => [] as Resource[]); // D-06: per-type failure → empty
};

Promise.all(types.map(fetchOne)).then((perType) => {
  if (cancelled) return;
  const all = perType.flat();
  // ...
});
```

**Phase 42 adaptation:** swap `_count=50&_sort=-_lastUpdated` for `_summary=count&_count=0`; `.catch(() => 0)` instead of `.catch(() => [])`; `.reduce((a, b) => a + b, 0)` instead of `.flat()`.

### Pattern 3: Idempotent emptiness publishing into Phase 34 coordinator (D-05)

**What:** Call `reportEmptiness(moduleKey, count === 0)` from inside the per-module `.then(...)` resolution. The coordinator already de-dupes via `if (prev[moduleKey] === isEmpty) return prev;` so the pre-probe + post-visit dual-source coexistence is automatically safe.

**Example (verified working pattern):**
```typescript
// Source: src/hooks/useEmptyExtensionsCoordinator.tsx:104-109 [VERIFIED]
const reportEmptiness = useCallback((moduleKey: string, isEmpty: boolean) => {
  setEmptyMap((prev) => {
    if (prev[moduleKey] === isEmpty) return prev; // no-op, avoid render loop
    return { ...prev, [moduleKey]: isEmpty };
  });
}, []);
```

**Phase 42 adaptation (Rules of Hooks compliance per D-05):** `useMiiExtensionCounts` calls `useEmptyExtensionsCoordinator()` ONCE at the top, destructures `reportEmptiness`, then invokes it imperatively inside `.then(...)` for each module. Do NOT call `useEmptyExtensionsPublisher` in a loop.

### Anti-Patterns to Avoid

- **Calling `useEmptyExtensionsPublisher` in a `MII_MODULES.map(...)` loop:** violates Rules of Hooks (variable hook count across renders). The user explicitly called this out in CONTEXT.md D-05.
- **Adding a `prev[key] === isEmpty` guard inside `useMiiExtensionCounts`:** redundant — coordinator already does this. Adds dead code.
- **Module-scope singleton `Map`:** survives patient navigation, requires explicit invalidation, breaks the `EmptyExtensionsProvider key={patientId}` re-keying pattern. Hook-internal `useRef<Map>` keyed on composite ID is simpler and correct.
- **AbortController without justification:** Phase 31 uses it because it threads abort across chained fetch tiers (cache → external → terminology) with timeout race conditions; Phase 42 has none of those. Mismatched complexity.
- **Putting hook call in outer `MiiModuleTabs` (line 102):** the coordinator's `EmptyExtensionsProvider` mounts at line 109. The hook MUST be called from `MiiModuleTabsInner` (line 115) — INSIDE the provider — so `useEmptyExtensionsCoordinator()` resolves to the real (non-no-op) callback. Calling from outer would silently use the no-op fallback at line 146 of the coordinator and `reportEmptiness` would do nothing.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Per-module FHIR URL composition | Manual `${type}?${param}=Patient/...` strings | `getPatientSearchParamForType(module, type)` + `getExtraQueryForType(module, type)` from `src/utils/mii-modules.ts:402-423` `[VERIFIED]` | Already handles per-type overrides (Specimen→`subject`, ResearchStudy→`enrollment`, Laborbefund extra `category=laboratory`). The D-17 contract test (`src/__tests__/mii-modules.test.ts`) locks all 22 module/type pairs. |
| FHIR URL building | String concatenation | `client.fhirUrl(url).toString()` (Medplum standard) | Already used in 3+ places. Handles base URL prefix correctly when Medplum is pointed at a non-Medplum FHIR server (Blaze) per CLAUDE.md "Connecting MedplumClient to Blaze". |
| Idempotent emptiness signaling | Tracking `lastReported[moduleKey]` in the hook | `reportEmptiness` from `useEmptyExtensionsCoordinator()` — already de-dupes at `useEmptyExtensionsCoordinator.tsx:106` `[VERIFIED]` | Coordinator is the canonical pub/sub layer; double-de-dupe is dead code. |
| Iterating extension modules | Hardcoded `EXTENSION_KEYS = ['bildgebung', ...]` | `MII_MODULES.filter(m => m.category === 'extension')` (canonical pattern at `MiiModuleTabs.tsx:121`) `[VERIFIED]` | Single source of truth; survives future module additions. |
| Cancelled-flag boilerplate | Custom `useIsMounted()` hook | Inline `let cancelled = false; ... return () => { cancelled = true; };` per `PatientRelatedResources.tsx:37,57` `[VERIFIED]` | Already the codebase idiom in 2+ places (`PatientRelatedResources.tsx`, `MiiModuleTab.tsx:66,108`). Custom hook adds indirection. |

**Key insight:** Phase 42 is mostly assembly of existing helpers — `MII_MODULES`, `getPatientSearchParamForType`, `getExtraQueryForType`, `useMedplum`, `useEmptyExtensionsCoordinator`, the `cancelled`-flag idiom, `client.fhirUrl`. The only NEW code is the hook function itself, the count-aggregation reduce, and the two render-site changes in `MiiModuleTabs.tsx`. Total novel surface ≈ 80 LOC.

## Runtime State Inventory

> Phase 42 is greenfield additive code (one new hook file, two render-site edits). Includes a localStorage-adjacent integration with Phase 34's `useEmptyExtensionsCoordinator`, but the integration is purely a runtime callback — no schema change, no migration.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — Phase 42 stores no persistent data. The `localStorage.patients.hideEmptyExtensions.v1` key (Phase 34) is read by the coordinator but Phase 42 never writes to it directly. | None |
| Live service config | None — no FHIR server config changes; same Blaze endpoint and same auth (none) as Phase 34. | None |
| OS-registered state | None — no daemons, schedulers, or system services. | None |
| Secrets / env vars | None — no API keys, no auth headers. (Phase 43 will add validator auth; Phase 42 is read-only anonymous FHIR.) | None |
| Build artifacts | None — no new dependencies, no scripts, no codegen. `prepare` script unchanged. | None |

**Nothing in any category — verified by file inspection of `useEmptyExtensionsCoordinator.tsx`, `package.json`, and the absence of any storage/secrets touchpoint in the proposed hook.**

## Common Pitfalls

### Pitfall 1: Calling the hook from `MiiModuleTabs` (outer) instead of `MiiModuleTabsInner`

**What goes wrong:** `reportEmptiness` is a no-op; Phase 34's "Hide N empty modules" toggle stays at the pre-Phase-42 behavior (visited-and-empty only).

**Why it happens:** `useEmptyExtensionsCoordinator()` returns a no-op fallback (`useEmptyExtensionsCoordinator.tsx:144-153`) when called outside an `EmptyExtensionsProvider`. The provider mounts at `MiiModuleTabs.tsx:109`, so any consumer in the OUTER `MiiModuleTabs` function gets the no-op. The hook MUST be called from `MiiModuleTabsInner` (line 115).

**How to avoid:** In the plan, explicitly state "Hook is called from `MiiModuleTabsInner`, line ~123 (right after `useEmptyExtensionsCoordinator()`). Add a comment cross-referencing the provider boundary."

**Warning signs:** Phase 34 toggle still shows "Visit a tab to discover empty modules" copy on patient mount. Pre-probed counts appear on labels but coordinator integration silently fails.

### Pitfall 2: Forgetting `_count=0` in the `_summary=count` URL

**What goes wrong:** Server returns the entire bundle (potentially thousands of resources) instead of just the count metadata. Page hangs / Blaze 503 / OOM in extreme cases.

**Why it happens:** FHIR `_summary=count` doesn't actually exclude `entry[]` on every server; some return entries anyway. `_count=0` belt-and-braces the request.

**How to avoid:** URL pattern is exactly `${type}?${param}=Patient/${patientId}&_summary=count&_count=0` — match `PatientRelatedResources.tsx:43` byte-for-byte. Tests should assert the `_count=0` is present (mock `client.get` and read the URL argument).

**Warning signs:** Slow tab-pill counts; large Blaze response bodies in DevTools Network tab.

### Pitfall 3: Forgetting per-type catch fallback for multi-type modules

**What goes wrong:** A single failing FHIR type (e.g. `Specimen` query 400s on Pathologie) blanks the entire module's count to `undefined` instead of failing gracefully to a partial sum.

**Why it happens:** Without per-type `.catch(() => 0)`, `Promise.all` rejects on the first failure, propagating to `useMiiExtensionCounts`'s outer `.then`, which never resolves the count.

**How to avoid:** Mirror `MiiModuleTab.tsx:78-95` — each `fetchOne` has its own `.catch(() => 0)` returning numeric zero. Then `Promise.all([...]).then(arr => arr.reduce((a,b)=>a+b,0))`. Optional `.catch` on the OUTER promise too (defense in depth).

**Warning signs:** Count is `undefined` indefinitely on certain modules in dev with Blaze partially down; Phase 34 toggle stays out-of-sync.

### Pitfall 4: Race condition on rapid patient navigation

**What goes wrong:** User clicks Patient A → Patient B before A's counts resolve. A's stale counts overwrite B's after B mounts.

**Why it happens:** Without `cancelled`-flag in cleanup, the in-flight `.then` for Patient A still fires `setState` after the hook has been re-keyed for Patient B.

**How to avoid:** Standard `cancelled`-flag pattern — `let cancelled = false; ... return () => { cancelled = true; };` in `useEffect` cleanup. Verified working at `PatientRelatedResources.tsx:37,57` and `MiiModuleTab.tsx:66,108`.

**Warning signs:** Tab pills show counts for the wrong patient on rapid back-and-forth navigation; intermittent in dev tools.

### Pitfall 5: D-06 dim wrapper hides the active-tab indicator

**What goes wrong:** Setting `style={{ opacity: 0.55 }}` on the `<Tabs.Tab>` itself dims the active-state indicator (Mantine pill background fill) when the user has clicked into a 0-count tab. UI "feels broken" — active tab looks inactive.

**Why it happens:** Mantine 8's `<Tabs.Tab>` active-state styling is rendered inside the same DOM node that receives the `style` prop; opacity stacks on top of the active pill background.

**How to avoid:** Two viable options — pick one and document:
- **(A)** Apply opacity to the inner `TabPillLabel` content, not the outer `<Tabs.Tab>`. Active-state indicator stays full-opacity.
- **(B)** Compute opacity as `count === 0 && !isActive ? 0.55 : 1` so the active 0-count tab returns to full opacity once clicked.

Verify via the existing `MiiModuleTab.tsx:143` precedent: the panel-content empty-state wrapper applies `opacity: 0.55` AROUND the empty-state content (not on the tab pill itself), so the active-tab pill stays full-opacity by construction. Phase 42 should use the SAME structural separation — opacity on the LABEL CONTENT, not on the `<Tabs.Tab>`.

**Warning signs:** Manual UAT shows the dimmed-pill UX feels "stuck" when user clicks into it.

### Pitfall 6: Mantine inline-style serialization not grep-friendly

**What goes wrong:** Tests written as `expect(getByText('Onkologie').closest('[style*="opacity: 0.55"]'))` fail on jsdom because Mantine 8 normalizes inline styles to a format the attribute selector doesn't match.

**Why it happens:** Documented at `MiiModuleTab.tsx:138-145` — "Mantine 8's inline-style serialization is not stable enough for `[style*="opacity: 0.55"]` attribute selectors".

**How to avoid:** Use `data-testid="extension-tab-pill"` + `data-empty={count === 0}` + `getByTestId('extension-tab-pill').getAttribute('data-empty') === 'true'` AND `getComputedStyle(node).opacity === '0.55'`. Mirrors the `data-testid="empty-state-wrapper"` precedent at `MiiModuleTab.tsx:144`.

**Warning signs:** Regression test passes locally but fails in CI; `[style*="..."]` selectors return `null`.

## Code Examples

### Example 1: The `useMiiExtensionCounts` hook (concrete sketch grounded in precedent)

```typescript
// File: src/hooks/useMiiExtensionCounts.tsx
// Source: derived from src/components/explorer/PatientRelatedResources.tsx:36-58
//   + src/components/patients/MiiModuleTab.tsx:78-95 (per-type fan-out)
//   + src/hooks/useEmptyExtensionsCoordinator.tsx:104-109 (idempotent reportEmptiness)
import { useEffect, useRef, useState } from 'react';
import { useMedplum } from '@medplum/react-hooks';
import type { Bundle } from '@medplum/fhirtypes';
import {
  MII_MODULES,
  fhirResourceTypesOf,
  getPatientSearchParamForType,
  getExtraQueryForType,
  type MiiModule,
} from '../utils/mii-modules';
import { useEmptyExtensionsCoordinator } from './useEmptyExtensionsCoordinator';

/** Returns map keyed by MiiModule.key; value is undefined while fetching, number once resolved. */
export function useMiiExtensionCounts(
  patientId: string,
): Record<string, number | undefined> {
  const client = useMedplum();
  const { reportEmptiness } = useEmptyExtensionsCoordinator();
  const [counts, setCounts] = useState<Record<string, number | undefined>>({});
  const cacheRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    let cancelled = false;
    const extensionModules = MII_MODULES.filter((m) => m.category === 'extension');

    // Reset to undefined for every extension module on patientId change.
    // Per D-03: no placeholder, no '(…)' — but internally we model 'fetching'
    // as `undefined` so render sites can fall back to the no-count label.
    const initial: Record<string, number | undefined> = {};
    for (const mod of extensionModules) initial[mod.key] = undefined;
    setCounts(initial);

    for (const mod of extensionModules) {
      const cacheKey = `${patientId}:${mod.key}`;
      const cached = cacheRef.current.get(cacheKey);
      if (cached !== undefined) {
        setCounts((prev) => ({ ...prev, [mod.key]: cached }));
        reportEmptiness(mod.key, cached === 0);
        continue;
      }

      const types = fhirResourceTypesOf(mod);
      const fetchOneCount = (type: string): Promise<number> => {
        const param = getPatientSearchParamForType(mod, type);
        const extra = getExtraQueryForType(mod, type);
        let url = `${type}?${param}=Patient/${patientId}&_summary=count&_count=0`;
        if (extra) url += `&${extra}`;
        return client
          .get(client.fhirUrl(url).toString())
          .then((raw) => {
            const bundle: Bundle = typeof raw === 'string' ? JSON.parse(raw) : raw;
            return bundle.total ?? 0;
          })
          .catch(() => 0); // D-06: per-type failure → 0 (sums to 0 if all fail)
      };

      Promise.all(types.map(fetchOneCount))
        .then((perType) => {
          if (cancelled) return;
          const total = perType.reduce((a, b) => a + b, 0); // D-02
          cacheRef.current.set(cacheKey, total);
          setCounts((prev) => ({ ...prev, [mod.key]: total }));
          reportEmptiness(mod.key, total === 0); // D-05
        });
    }

    return () => {
      cancelled = true;
    };
  }, [client, patientId, reportEmptiness]);

  return counts;
}
```

### Example 2: `MiiModuleTabs.tsx` render-site changes (D-01 + D-06)

**Hook call site (in `MiiModuleTabsInner`, INSIDE the provider, around line 123 right after `useEmptyExtensionsCoordinator`):**
```typescript
// Phase 42 MII-EXT-15: pre-probe extension-module counts.
const extensionCounts = useMiiExtensionCounts(patientId);
```

**`TabPillLabel` modification (lines 64-100) — accept optional `count` and `isEmpty`:**
```typescript
function TabPillLabel({
  primary,
  secondary,
  active,
  iconKey,
  count,        // NEW (Phase 42)
  isEmpty,      // NEW (Phase 42) — count === 0 after resolve
}: {
  primary: string;
  secondary: string;
  active: boolean;
  iconKey?: string;
  count?: number;
  isEmpty?: boolean;
}) {
  const Icon = resolveMiiIcon(iconKey);
  // D-01: append count to primary line ONLY when defined (D-03 no-placeholder).
  const primaryWithCount =
    count !== undefined ? `${primary} (${count})` : primary;
  return (
    <div
      data-testid={count !== undefined ? 'extension-tab-pill' : undefined}
      data-empty={isEmpty ? 'true' : 'false'}
      // D-06: dim only after count resolves to 0. Apply opacity to the LABEL
      // CONTENT (not the outer <Tabs.Tab>) so the active-tab pill background
      // stays full-opacity. Mirrors MiiModuleTab.tsx:143 idiom.
      style={isEmpty ? { opacity: 0.55 } : undefined}
    >
      <Group gap="xs" wrap="nowrap" align="center">
        {Icon ? <Icon size={14} /> : null}
        <Text fw={600} size="sm">{primaryWithCount}</Text>
      </Group>
      <Text size="xs" c={active ? 'inherit' : 'dimmed'} style={active ? { opacity: 0.85 } : undefined}>
        {secondary}
      </Text>
    </div>
  );
}
```

**Extension `<Tabs.Tab>` render site (lines 245-254) — pass count + isEmpty:**
```typescript
{visibleExtensionModules.map((mod) => {
  const count = extensionCounts[mod.key];           // number | undefined
  const isEmpty = count === 0;                       // false while fetching (count is undefined)
  return (
    <Tabs.Tab key={mod.key} value={mod.key}>
      <TabPillLabel
        primary={mod.germanLabel}
        secondary={fhirResourceTypesOf(mod).join(' / ')}
        active={activeTab === mod.key}
        iconKey={mod.icon}
        count={count}                                {/* NEW */}
        isEmpty={isEmpty}                            {/* NEW */}
      />
    </Tabs.Tab>
  );
})}
```

**Base 7 `<Tabs.Tab>` render site (lines 178-187) — UNCHANGED.** D-04 base exemption: do NOT pass `count` or `isEmpty` to base modules' `TabPillLabel`. (Default `undefined` → no append, no dim, no testid — exactly Phase 33 behavior.)

### Example 3: Test seam pattern (mocked `client.get` with varied bundle.total)

```typescript
// Source: derived from src/components/patients/__tests__/MiiModuleTabs.test.tsx:66-73 [VERIFIED]
function makeCountClient(perTypeCount: Record<string, number>) {
  return {
    get: vi.fn((url: string) => {
      // Parse the FHIR URL to find which type + search param this is.
      const m = url.match(/\/([A-Z][a-zA-Z]+)\?/);
      const type = m?.[1] ?? '';
      const total = perTypeCount[type] ?? 0;
      return Promise.resolve({
        resourceType: 'Bundle',
        type: 'searchset',
        total,
        entry: [],
      });
    }),
    fhirUrl: (s: string) => ({ toString: () => s }),
  };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Counts only after click (Phase 34 visited-and-empty model) | Pre-probe on patient mount (Phase 42) | This phase | Phase 34 "Hide N empty modules" toggle becomes accurate on mount; one fewer click to discover empty tabs. |
| Base + extension treated symmetrically | Base 7 unchanged; extension 14 only get pre-probe (D-04) | This phase | Mirrors Phase 34 D-21 base exemption; smaller blast radius. |
| `_summary=count` only used in `PatientRelatedResources` | Generalized via `useMiiExtensionCounts` hook | This phase | Hook is reusable; if Phase 999.X wants Dashboard MII tile counts, drop this hook in. |

**Deprecated/outdated:** Nothing in the Phase 42 surface area is deprecated. Phase 31 (`AbortController`) is current and remains the right tool for chained-tier validators; Phase 42 just doesn't need that complexity.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `vitest` (transitive via `vitest/config`) `[VERIFIED: vitest.config.ts]` |
| Config file | `/Users/kohlbach/Claude/Exploder/vitest.config.ts` `[VERIFIED]` — `globals: true`, `environment: 'jsdom'`, includes `src/**/*.test.ts(x)` |
| Quick run command | `npm test -- src/components/patients/__tests__/MiiModuleTabs.test.tsx` |
| Full suite command | `npm test` (must show 1064+ passing / 0 failing per ROADMAP cross-cutting verification) |

**Test infrastructure verified present:**
- `src/components/patients/__tests__/MiiModuleTabs.test.tsx` `[VERIFIED]` — Phase 34 tests; Phase 42 extends.
- `src/components/patients/__tests__/MiiModuleTab.test.tsx` `[VERIFIED]` — fixture pattern source.
- `MantineProvider` wrapping pattern + `ResizeObserver` / `matchMedia` polyfills `[VERIFIED: MiiModuleTabs.test.tsx:14-36]`.
- Mocked `client.get` returning `Promise.resolve({ resourceType: 'Bundle', entry: [] })` `[VERIFIED: MiiModuleTabs.test.tsx:67-72]`.
- `vi.mock('@medplum/react-hooks', () => ({ useMedplum: () => mocks.client }))` pattern `[VERIFIED: line 52-54]`.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MII-EXT-15-A (D-01 count append) | Tab pill renders `Onkologie (12)` after count resolves | unit (component) | `npm test -- src/components/patients/__tests__/MiiModuleTabs.test.tsx -t "count appends"` | ✅ extends existing test file |
| MII-EXT-15-B (D-02 sum across types) | Multi-type module shows sum (Onkologie 4 types → sum) | unit | `npm test -- src/components/patients/__tests__/MiiModuleTabs.test.tsx -t "multi-type sum"` | ✅ extends existing |
| MII-EXT-15-C (D-03 no placeholder) | While fetching, label shows just `Onkologie` (no `(…)`, no Loader) | unit | `npm test -- src/components/patients/__tests__/MiiModuleTabs.test.tsx -t "no placeholder"` | ✅ extends existing |
| MII-EXT-15-D (D-04 base exemption) | Base 7 modules' `TabPillLabel` receives no `count` prop; no `(N)` suffix; no `data-testid="extension-tab-pill"` | unit | `npm test -- src/components/patients/__tests__/MiiModuleTabs.test.tsx -t "base exemption"` | ✅ extends existing |
| MII-EXT-15-E (D-05 coordinator integration) | After pre-probe resolves with all-zero counts, `screen.getByText(/Hide \d+ empty modules/)` shows "Hide 14 empty modules" WITHOUT user clicking any tab | integration | `npm test -- src/components/patients/__tests__/MiiModuleTabs.test.tsx -t "pre-probe feeds toggle"` | ✅ extends existing — replaces "Click an extension tab to trigger fan-out" with "wait for pre-probe to resolve" |
| MII-EXT-15-F (D-05 idempotency) | Pre-probe + post-visit publisher both fire `reportEmptiness('onkologie', true)` — render count stays bounded (no infinite loop, no duplicate emptyCount increment) | integration | `npm test -- src/components/patients/__tests__/MiiModuleTabs.test.tsx -t "idempotency"` | ✅ extends existing |
| MII-EXT-15-G (D-06 dim opacity 0.55) | After pre-probe, `getByTestId('extension-tab-pill')` for a 0-count module has `data-empty="true"` AND `getComputedStyle(...).opacity === '0.55'` | unit | `npm test -- src/components/patients/__tests__/MiiModuleTabs.test.tsx -t "dim on zero"` | ✅ extends existing |
| MII-EXT-15-H (cancelled-flag) | Rapid patient-id change does not race-overwrite counts (mock client with delayed `get` resolution; switch patientId before resolution) | unit | `npm test -- src/components/patients/__tests__/MiiModuleTabs.test.tsx -t "cancellation"` | ✅ extends existing |
| MII-EXT-15-UAT (live Blaze) | On a real Synthea Onkologie patient, ≥3 extension tabs show non-zero counts | manual-only (live Blaze required) | recorded in `42-HUMAN-UAT.md` | Wave 0 file (UAT scaffolding) |

### Sampling Rate
- **Per task commit:** `npm test -- src/components/patients/__tests__/MiiModuleTabs.test.tsx`
- **Per wave merge:** `npm test` (full 1064+ baseline)
- **Phase gate:** Full suite green + `npm run build` clean before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `42-HUMAN-UAT.md` — covers MII-EXT-15-UAT (live-Blaze smoke test, ≥3 extension tabs with non-zero counts on a Synthea Onkologie patient). Recorded per ROADMAP §Phase 42 success criterion #4.
- [ ] (No framework install needed — Vitest + Mantine + Testing Library already wired and proven by 1064 passing tests at v1.6 baseline.)
- [ ] (No new fixtures needed — extends existing `MiiModuleTabs.test.tsx` infrastructure with a `makeCountClient(perTypeCount)` helper.)

### ROADMAP Success Criterion Coverage

| ROADMAP §42 Success Criterion | Covered By |
|-------------------------------|------------|
| 1. Hook fires `_summary=count` per extension module on mount, parallel via `Promise.all`, per-type `.catch(() => 0)`, cached per `(patientId, moduleId)` | MII-EXT-15-A, MII-EXT-15-B, MII-EXT-15-H + visual code review of cache key construction |
| 2. Tab labels render `{germanLabel} ({count})`; zero-count tabs at opacity 0.55 | MII-EXT-15-A + MII-EXT-15-G |
| 3. AbortController threading on patient nav (D-20 unmount-safe) | MII-EXT-15-H — note the planner-recommended cancelled-flag is functionally equivalent for the `setState` guard requirement; ROADMAP wording mentions AbortController but the success criterion is *unmount-safe behavior*, which the cancelled-flag delivers. (See Phase 31 reference below if planner picks AbortController.) |
| 4. Live-Blaze UAT on ≥3 extension tabs with real Synthea Onkologie patient | MII-EXT-15-UAT (manual; recorded in `42-HUMAN-UAT.md`) |

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Phase 42 makes anonymous read-only FHIR GETs against the same Blaze endpoint Phase 33/34 already hits. CLAUDE.md "Out of scope: User authentication". |
| V3 Session Management | no | No sessions; no cookies; no JWT. |
| V4 Access Control | no | Read-only explorer; no privilege boundary. |
| V5 Input Validation | yes (low risk) | `patientId` is a route param consumed inside `client.fhirUrl(...)`. Medplum's `fhirUrl` already escapes path segments — no manual concat outside of `client.fhirUrl`. Verified pattern at `PatientRelatedResources.tsx:43-45`. |
| V6 Cryptography | no | No crypto. |

### Known Threat Patterns for {React + Medplum + parallel fetch}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| URL injection via `patientId` | Tampering | `client.fhirUrl()` escapes path components; never concat `${patientId}` into the query string outside `fhirUrl`. |
| Stale `setState` after unmount (memory leak warning, race) | Repudiation (data integrity, not security per se) | `cancelled`-flag in `useEffect` cleanup. Verified working at `PatientRelatedResources.tsx:37,57`. |
| Concurrent fetch DoS-via-self (14 simultaneous GETs degrade local Blaze) | DoS | Defer per CONTEXT.md unless UAT shows lag. ~14 GETs against localhost Blaze is well within budget per Phase 38 UAT precedent. |
| Cross-patient data leak via cache | Information disclosure | Hook-internal `useRef<Map>` keyed by `${patientId}:${moduleId}` — no global state; cache dies with hook unmount when `EmptyExtensionsProvider` re-keys on patient nav. |

## Phase 31 AbortSignal Reference (only if planner chooses AbortController)

If the planner picks AbortController instead of the recommended cancelled-flag, the canonical reference in this codebase is:

- `src/quality/cascadingValidator.ts:131-183` `[VERIFIED]` — full pattern: `new AbortController()` + `addEventListener('abort', chainListener, { once: true })` + `signal: timeoutController.signal` threaded into fetch + `removeEventListener('abort', chainListener)` on cleanup.

**Phase 42 adaptation if going this route:** Each `client.get(...)` call would need a `{ signal }` second parameter — but Medplum's `client.get()` signature in v5.1.7 takes URL only (no fetch options). The planner would need to use `fetch(url, { signal })` directly INSTEAD of `client.get(...)`, losing Medplum's auth/middleware. **This is one strong reason to stick with the cancelled-flag.** Document the choice and rationale in the plan.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| (none) | All claims in this research were verified against the working codebase, package.json, vitest.config.ts, or quoted from CONTEXT.md verbatim. The closest "assumption" is that the planner will pick the cancelled-flag over AbortController; that is presented as a recommendation, not a fact. | n/a | n/a |

**Empty Assumptions Log:** Phase 42 research is grounded entirely in:
1. **CONTEXT.md** (locked decisions D-01..D-06) — verbatim quoted, treated as authoritative.
2. **Source files in this repo** — `PatientRelatedResources.tsx`, `MiiModuleTabs.tsx`, `MiiModuleTab.tsx`, `mii-modules.ts`, `useEmptyExtensionsCoordinator.tsx`, `cascadingValidator.ts`, `MiiModuleTabs.test.tsx`. All marked `[VERIFIED]`.
3. **`package.json` + `vitest.config.ts` + `CLAUDE.md`** — for dependency versions and constraints. All marked `[VERIFIED]` or `[CITED]`.

No external doc lookups were necessary because the precedent is local and battle-tested.

## Open Questions

1. **Module count: 14 or 15?**
   - What we know: `src/utils/mii-modules.ts` ships exactly 14 entries with `category: 'extension'` (verified `bildgebung, biobank, dokument, intensivmedizin, kardiologie, mikrobiologie, molekulargenetik, mtb, onkologie, pathologie, pro, seltene, studie, symptom`). Phase 33/34 docs all say "14 extension modules + 7 base = 21 total".
   - What's unclear: CONTEXT.md says "15 of them" once. ROADMAP §Phase 42 implies pre-probing all extension modules without committing to a count.
   - Recommendation: Plan to pre-probe **all** extension modules via `MII_MODULES.filter(m => m.category === 'extension')` (14 today). Don't hardcode "14" or "15" anywhere. If a future Phase adds a 15th extension module, the hook adapts with no change. **Treat the "15 of them" mention as a typo, not a plan-affecting fact.**

2. **Cleanup primitive choice (Claude's discretion per CONTEXT.md):**
   - What we know: cancelled-flag works, matches the closest precedent (`PatientRelatedResources.tsx`), and `client.get()` doesn't accept a `signal` option in Medplum v5.1.7.
   - What's unclear: ROADMAP §42 success criterion #3 mentions "AbortController threading … mirroring Phase 31's AbortSignal threading". This is descriptive, not prescriptive — the underlying requirement is "unmount-safe behavior", which cancelled-flag delivers.
   - Recommendation: Use cancelled-flag. Explicitly document the choice + rationale in the plan ("ROADMAP wording is descriptive; cancelled-flag delivers the unmount-safe contract; AbortController would require dropping `client.get()` for raw `fetch()` and is overkill for 14 independent equally-weighted requests"). This pre-empts a verifier nitpick.

3. **Cache survival across patient nav:**
   - What we know: Hook-internal `useRef<Map>` is per-`MiiModuleTabsInner`-mount. The provider re-keys on patientId change (line 109 `<EmptyExtensionsProvider key={patientId}>`), forcing a full subtree remount and cache wipe. ROADMAP §42 success criterion #1 says "cached per `(patientId, moduleId)` for the session".
   - What's unclear: "Session" in ROADMAP could mean (a) browser tab session or (b) patient-detail mount lifetime. CONTEXT.md says the latter is fine ("isn't a hard requirement").
   - Recommendation: Hook-internal `useRef<Map>` keyed on composite `${patientId}:${moduleId}`. Document the lifetime explicitly in the plan as "cache survives re-renders within the same patient mount; cleared on patient navigation by the natural React lifecycle". Move on.

4. **D-06 dim wrapper placement (label content vs `<Tabs.Tab>`):**
   - What we know: Mantine 8 `<Tabs.Tab>` active-pill background may interact awkwardly with outer `style={{ opacity }}`. The `MiiModuleTab.tsx:143` precedent applies opacity to the empty-state CONTENT, not to the parent component.
   - What's unclear: Whether visual UAT will show the active-tab indicator dimming on a clicked-into 0-count tab.
   - Recommendation: Apply opacity to `TabPillLabel`'s outer `<div>`, NOT to `<Tabs.Tab>`. (Pitfall 5 spelled out above.) UAT should explicitly test "click into a 0-count tab → active indicator stays visible".

## Sources

### Primary (HIGH confidence — local source files)
- `/Users/kohlbach/Claude/Exploder/.planning/phases/42-pre-probe-extension-module-counts-mii-ext-15/42-CONTEXT.md` — D-01..D-06, Claude's discretion items, canonical refs
- `/Users/kohlbach/Claude/Exploder/.planning/REQUIREMENTS.md` — MII-EXT-15 full text + traceability
- `/Users/kohlbach/Claude/Exploder/.planning/ROADMAP.md` — Phase 42 §goal, dependencies, 4 success criteria
- `/Users/kohlbach/Claude/Exploder/.planning/STATE.md` — v1.6 progress + position
- `/Users/kohlbach/Claude/Exploder/src/components/explorer/PatientRelatedResources.tsx` — closest functional precedent (lines 36-58)
- `/Users/kohlbach/Claude/Exploder/src/components/patients/MiiModuleTabs.tsx` — render-site target (lines 64-100, 109, 115, 121, 159-161, 178-187, 245-254)
- `/Users/kohlbach/Claude/Exploder/src/components/patients/MiiModuleTab.tsx` — per-type fan-out + cancelled-flag + `data-testid="empty-state-wrapper"` (lines 65-109, 143-144)
- `/Users/kohlbach/Claude/Exploder/src/utils/mii-modules.ts` — `MII_MODULES`, `fhirResourceTypesOf`, `getPatientSearchParamForType`, `getExtraQueryForType`
- `/Users/kohlbach/Claude/Exploder/src/hooks/useEmptyExtensionsCoordinator.tsx` — D-05 idempotency-VERIFIED at line 106
- `/Users/kohlbach/Claude/Exploder/src/components/patients/__tests__/MiiModuleTabs.test.tsx` — test infrastructure baseline
- `/Users/kohlbach/Claude/Exploder/src/quality/cascadingValidator.ts` — Phase 31 AbortController reference (lines 131-183)
- `/Users/kohlbach/Claude/Exploder/package.json` — dependency versions
- `/Users/kohlbach/Claude/Exploder/vitest.config.ts` — test framework config
- `/Users/kohlbach/Claude/Exploder/CLAUDE.md` — project tech-stack constraints
- `/Users/kohlbach/Claude/Exploder/.planning/config.json` — `nyquist_validation: true` confirmed

### Secondary (MEDIUM confidence)
- (none — all critical claims are grounded in local files)

### Tertiary (LOW confidence — flagged for validation)
- (none)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every package version verified in `package.json`; no new deps needed.
- Architecture: HIGH — every pattern grounded in existing committed code with line numbers.
- Pitfalls: HIGH — each pitfall traced to a specific source line, including the active-pill-opacity gotcha (Pitfall 5) traced to the `MiiModuleTab.tsx:143` precedent and the Mantine inline-style serialization gotcha (Pitfall 6) traced to the same file's comment block.
- D-05 risk-check: HIGH — `useEmptyExtensionsCoordinator.tsx:106` directly inspected; idempotency guard already present; **no extra task needed**.

**Research date:** 2026-04-29
**Valid until:** 2026-05-29 (stable surface; only invalidates if Mantine 8 → 9 migration in Phase 45 lands first, which is the LAST v1.6 phase and explicitly gated)
