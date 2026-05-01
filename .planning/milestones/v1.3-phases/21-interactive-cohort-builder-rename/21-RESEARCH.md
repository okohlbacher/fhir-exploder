# Phase 21: Interactive Cohort Builder + Rename - Research

**Researched:** 2026-04-15
**Domain:** React 18 + Mantine 8 + Medplum 5 + Blaze FHIR R4 — client-side cohort definition, persistence, and patient-scoped search
**Confidence:** HIGH (all key claims verified against installed source, FHIR spec, or live registry)

## Summary

Phase 21 is tightly constrained: (1) rename the existing resource-type MultiSelect, (2) stand up a `/quality/cohorts` page that clones `ThresholdsPage`, (3) persist a named-cohort list to `localStorage`, (4) add an "Active cohort" `Select` to the dashboard toolbar, and (5) thread the active-cohort patient ID set through the 7 existing panels. Every prescriptive recommendation below is grounded in existing code (file + line), the FHIR R4 spec, or verified Mantine/Medplum API surface.

Key structural finding: **all 7 panels funnel through `sampleResources(client, resourceType, sampleSize)` in `src/quality/sampling.ts:10-18`** [VERIFIED: grep]. That single 8-line function is the cleanest point to inject cohort scoping. Two of the seven hooks (`useCompletenessReport`, `useCodingCoverage`) use it; five hooks call it directly. Adding an optional `patientIds?: string[]` parameter there and threading it upward is lower blast-radius than changing 7 panel prop signatures.

Key integration finding: **MedplumClient exposes `post(url, body, contentType)`** [VERIFIED: `node_modules/@medplum/core/dist/cjs/index.d.ts:3678`] which is the sanctioned FHIR escape hatch for `POST [base]/[type]/_search` with `application/x-www-form-urlencoded` body [CITED: https://hl7.org/fhir/R4/search.html]. This lets us support arbitrarily-large patient-ID cohorts without URL length concerns.

**Primary recommendation:** Clone the `useThresholds`/`thresholds.ts` split verbatim as `useCohorts`/`cohorts.ts`. Store a `{ cohorts: CohortDefinition[], activeCohortId: string | null }` record under `quality.cohorts.v1`. Resolve cohorts → patient ID sets once at activation via three-criterion-typed queries (`Condition?code=...`, `Encounter?date=...`, explicit reference list). Cache the resolved patient set per cohort. Inject into `sampleResources` via an optional third argument. Use `client.search(resourceType, 'patient=id1,id2,...')` for cohorts ≤ ~40 IDs; flip to `client.post('<Type>/_search', formBody, 'application/x-www-form-urlencoded')` for larger cohorts.

## Project Constraints (from CLAUDE.md)

These directives are non-negotiable; research recommendations below must not contradict them.

- **Tech stack locked:** React ^18.3.1 + TypeScript ^5.7.0 + Vite 8 + Medplum 5.1.7 + Mantine ^8.3.18 — no alternatives permitted.
- **Do NOT use:** Mantine 9.x (requires React 19), `@tanstack/react-query` (competes with MedplumClient caching), Tailwind, SMART-on-FHIR libs, GraphQL FHIR, Next.js/Remix.
- **CSS:** Mantine is the design system; custom CSS modules only. Never Tailwind or CSS-in-JS competitors.
- **State management:** React context + hooks. No Redux/Zustand — MedplumClient + hooks handle caching.
- **GSD workflow enforcement:** edits must go through a GSD command; file changes outside that flow are forbidden unless the user explicitly bypasses.
- **License:** MIT; `package.json` and `LICENSE` stay in sync.

## User Constraints (from 21-CONTEXT.md)

### Locked Decisions
- **D-01:** Builder lives at dedicated page `/quality/cohorts`, mirroring `ThresholdsPage`. Not inline, not modal, not drawer.
- **D-02:** Active cohort surfaced on `/quality` as a dropdown in the toolbar row at `QualityOverviewPage.tsx:209-213`, peer to the renamed "Resource types" control.
- **D-03:** Active-cohort switching is done via the dropdown directly (saved names + "No cohort — all patients"). Builder page is source of truth for *definitions*; toolbar dropdown is source of truth for *activation*.
- **D-04:** Cohort is opt-in. No active cohort = analyze all patients (zero regression). Dropdown shows "No cohort" when nothing selected.

### Claude's Discretion (directional guidance)
- **Save & activation model:** Recommend **named cohort list** (explicit "Save as…" name prompt). Phase 22 adds edit/duplicate/delete, which requires stable IDs. Implementing as a list now avoids a migration. Storage shape: `{ cohorts: CohortDefinition[], activeCohortId: string | null }`.
- **Criterion semantics:**
  - **Composition = AND** (intersection). OR/mixed is not in the requirements and adds UI complexity.
  - **Patient-level scoping** — a cohort is a set of Patient resources. All three criterion types resolve to "which patients qualify."
  - **Date range:** applied to the patient's clinical activity window (encounter period, observation date, condition onset). Researcher to recommend the specific field set.
  - **Condition code:** "patients with a `Condition` matching this code/system" — not "resources with this code."
- **Rename strategy (CHRT-04):** Label rename from "Cohort" → "Resource types"; localStorage key migration from `quality.cohort.v1` → `quality.resourceTypes.v1` with one-time read-side migration; optional component file rename `CohortSelector.tsx` → `ResourceTypeSelector.tsx`; helper `Text size="xs" c="dimmed"` lines to reinforce distinct purposes.
- **Scoping mechanism:** Preferred approach — **resolve cohort → patient ID set once at activation** (cached, recomputed on recompute), then pass `patientIds?: string[]` down each panel. Alternative is server-side `_has`/chained search per panel.

### Deferred Ideas (OUT OF SCOPE for Phase 21)
- **Phase 22 scope:** FHIRPath query expressions as cohort definitions (CHRT-05), MII FDPG JSON import/export (CHRT-06), management view with edit/duplicate/delete (CHRT-07).
- **Out of milestone scope (per REQUIREMENTS.md):** server-side cohort evaluation / federated queries, phenotype builder (multi-criteria boolean), cross-user sharing, cohort versioning/audit history, live cohort updates.
- **Condition-code autocomplete** via MII Terminology Server — deferred unless criterion input UX proves awkward. **Phase 21 ships freeform code + system `TextInput` pair.** (Existing `valueSetCache.ts` can be reused in Phase 22/later if autocomplete is demanded.)

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CHRT-01 | User can define a patient cohort with date range + condition code + reference list | §Criterion Resolution Queries; §Criterion Input UX Components |
| CHRT-02 | Cohort definitions persist in `localStorage` under `quality.cohorts.v1`, reusable across sessions | §Storage Shape; §Hydration Gate Pattern |
| CHRT-03 | Dashboard analyses can be scoped to a saved cohort, composing with the existing resource-type filter | §Scoping Injection Point (`sampleResources`); §Patient-scoped Search Mechanics |
| CHRT-04 | Rename "Cohort" → "Resource types"; visually distinct; compose orthogonally | §Rename Strategy; §localStorage Migration Recipe |

## Standard Stack

### Core (all already installed — verified `package.json`)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@mantine/core` | ^8.3.18 | `Select`, `MultiSelect`, `TextInput`, `Textarea`, `Button`, `Paper`, `Modal`, `Badge` | Locked by @medplum/react 5.x peer dep |
| `@mantine/hooks` | ^8.3.18 | `useLocalStorage`, `useDisclosure` | Hydration pattern already used in `useThresholds` / `useTrendsHistory` |
| `@mantine/notifications` | ^8.3.18 | "Cohort saved" / "No patients match" toasts | Used throughout dashboard |
| `@medplum/core` | ^5.1.7 | `MedplumClient.search()`, `.searchResources()`, `.post()` | Existing client; `.post()` is the POST `_search` escape hatch |
| `react-router-dom` | ^7.14.0 | `Link` + new `<Route path="cohorts">` registration | Used by ThresholdsPage |
| `@tabler/icons-react` | ^3.41.1 | Toolbar icon for the Active cohort dropdown (optional) | Used throughout |

### Supporting — **ONE new dependency required**

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@mantine/dates` | ^8.3.18 | `DatePickerInput` + `DatesProvider` for the date-range criterion | NEW — not currently installed. Confirmed required peer: `@mantine/core@8.3.18` + `@mantine/hooks@8.3.18` + `dayjs>=1.0.0` [VERIFIED: `npm view @mantine/dates@8.3.18 peerDependencies`] |
| `dayjs` | ^1.11.20 | Date formatting/manipulation peer of `@mantine/dates` | NEW — required peer of `@mantine/dates` [VERIFIED: `npm view dayjs version` → `1.11.20`] |

**Verified install (run exactly, pinned to Mantine 8 train):**

```bash
npm install @mantine/dates@^8.3.18 dayjs@^1.11.20
```

`@mantine/dates@9.x` MUST be rejected — same React-19-only constraint that bans `@mantine/core@9.x` [CITED: CLAUDE.md §"Do NOT Use"]. `8.3.18` is the newest `8.x` release [VERIFIED: `npm view @mantine/dates@8 versions` — `8.3.18` is the final 8.x tag before 9.0.0 alphas].

**Version verification — all dependencies audited 2026-04-15:**
- `@mantine/dates@8.3.18` peer deps: `{ dayjs: '>=1.0.0', react: '^18.x || ^19.x', 'react-dom': '^18.x || ^19.x', '@mantine/core': '8.3.18', '@mantine/hooks': '8.3.18' }` [VERIFIED: npm registry]
- `dayjs@1.11.20` (current stable) [VERIFIED: npm registry]
- `@medplum/core@5.1.7` installed (5.1.8 is current but installed 5.1.7 is fine — pinned via `^5.1.7`). No MedplumClient API changes required for this phase [VERIFIED: reading installed `dist/cjs/index.d.ts`]

### Setup: wrapping the app with `DatesProvider`

[VERIFIED: https://mantine.dev/dates/getting-started/] `DatesProvider` configures locale / firstDayOfWeek / weekendDays for all child `DatePickerInput` instances. For this phase, a **local** `DatesProvider` wrapping only the `CohortsPage` is sufficient — we do NOT need to wrap the entire app. The locale default ("en") is fine; the user base is German (MII) but the date range criterion uses ISO dates internally so localization is a UX nicety, not a correctness concern.

Required CSS import (add to `src/main.tsx` or the `CohortsPage` entry point, **after** `@mantine/core/styles.css`):
```ts
import '@mantine/dates/styles.css';
```

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@mantine/dates.DatePickerInput` | Native `<input type="date">` | Zero deps, but ugly + no consistent Mantine theming. 2-dep cost for a dramatically better UX is justified. |
| `@mantine/dates.DatePickerInput` (range mode) | Two separate `DatePickerInput` components | Range mode is cleaner UX; one component produces `[Date, Date]`. Use `type="range"`. |
| `MultiSelect` from mantine for the reference list | `Textarea` + paste-parse | `MultiSelect` requires the full patient list upfront (heavy server fetch); `Textarea` lets the user paste pre-known IDs. Paste-parse is the right pattern. |
| Server-side `_has`/chained search per panel for scoping | Resolve cohort → patient ID set once, pass IDs to panels | `_has` complicates every panel independently and relies on Blaze's chained-search completeness [CITED: samply/blaze does support chained search per performance docs, but per-panel complexity is high]. Pre-resolving to ID set is the simpler contract. |
| FHIRPath cohort definitions in Phase 21 | Defer to Phase 22 | Out of scope per CONTEXT D-01 and REQUIREMENTS CHRT-05. |
| `TextInput` for condition code | `Autocomplete` backed by `valueSetCache.ts` | Autocomplete requires a bound ValueSet + loading state + debounced typing. Freeform system+code is CONTEXT-discretion-approved fallback and ships in the time budget. |

## Architecture Patterns

### Recommended File Structure

```
src/
├── components/quality/
│   ├── CohortSelector.tsx            # RENAMED → ResourceTypeSelector.tsx (label = "Resource types")
│   ├── ResourceTypeSelector.tsx      # NEW filename if rename is cheap (it is)
│   ├── ActiveCohortSelect.tsx        # NEW — Mantine `Select` for toolbar row
│   ├── CohortsPage.tsx               # NEW — clones ThresholdsPage structure; /quality/cohorts
│   ├── CohortBuilderForm.tsx         # NEW — the three-criterion form inside CohortsPage
│   ├── CohortReferenceListInput.tsx  # NEW — Textarea + paste-parse UI (extracted if reused)
│   └── QualityOverviewPage.tsx       # EDIT — swap CohortSelector; add ActiveCohortSelect; pass patientIds to panels
├── hooks/
│   └── useCohorts.ts                 # NEW — mirrors useThresholds exactly (hydration gate + setter API)
├── quality/
│   ├── cohorts.ts                    # NEW — types, STORAGE_KEY, pure resolver fns (mirrors thresholds.ts)
│   ├── cohortResolver.ts             # NEW — async: CohortDefinition → patient ID set (3 criterion types intersected)
│   └── sampling.ts                   # EDIT — accept optional `patientIds?: string[]`; inject `patient=id,...` or POST _search
└── App.tsx                           # EDIT — register <Route path="cohorts" element={<CohortsPage />}>
```

### Pattern 1: Pure module + stateful hook split (mirror `thresholds.ts` / `useThresholds.ts`)

**What:** All data-shape types, `STORAGE_KEY`, and pure I/O helpers live in `src/quality/cohorts.ts`. The `@mantine/hooks.useLocalStorage` binding + hydration gate live in `src/hooks/useCohorts.ts`. This split is enforced by `src/quality/thresholds.ts` and `src/hooks/useThresholds.ts` today and is a **Key Decision** in PROJECT.md ("Pure-function quality engines + state-machine hooks").
**When to use:** ALWAYS for any localStorage-backed quality feature.
**Example:**
```ts
// src/quality/cohorts.ts — pure module (no React, no Mantine)
import type { MetricKey } from './thresholds'; // (unrelated, just an import style reference)

export const COHORTS_STORAGE_KEY = 'quality.cohorts.v1';
export const RESOURCE_TYPES_STORAGE_KEY = 'quality.resourceTypes.v1';
export const LEGACY_COHORT_KEY = 'quality.cohort.v1'; // ← pre-rename; read once, migrate, delete.

export interface DateRangeCriterion {
  type: 'date-range';
  start: string | null; // ISO date (YYYY-MM-DD) or null for open-ended
  end: string | null;
}
export interface ConditionCodeCriterion {
  type: 'condition-code';
  system: string; // e.g. 'http://snomed.info/sct'
  code: string;   // e.g. '44054006' (diabetes)
}
export interface ReferenceListCriterion {
  type: 'reference-list';
  patientIds: string[]; // normalized: each entry is a bare ID (no 'Patient/' prefix)
}
export type CohortCriterion = DateRangeCriterion | ConditionCodeCriterion | ReferenceListCriterion;

export interface CohortDefinition {
  id: string;               // crypto.randomUUID() — stable for Phase 22 edit/duplicate/delete
  name: string;             // user-supplied, unique per storage
  criteria: CohortCriterion[]; // AND-composed
  createdAt: string;        // ISO timestamp
  updatedAt: string;
}

export interface CohortsStorage {
  cohorts: CohortDefinition[];
  activeCohortId: string | null;
}

export const DEFAULT_COHORTS_STORAGE: CohortsStorage = { cohorts: [], activeCohortId: null };

export function findActiveCohort(s: CohortsStorage): CohortDefinition | null {
  if (!s.activeCohortId) return null;
  return s.cohorts.find((c) => c.id === s.activeCohortId) ?? null;
}

export function parsePatientRefs(raw: string): string[] {
  // Accepts lines or comma-separated. Strips 'Patient/' prefix. Dedupes.
  // Trim + filter empty. Max 10,000 IDs (defense-in-depth).
  const tokens = raw.split(/[\s,;]+/).map((t) => t.trim()).filter(Boolean);
  const ids = tokens.map((t) => t.replace(/^Patient\//, ''));
  return Array.from(new Set(ids)).slice(0, 10_000);
}
```

```ts
// src/hooks/useCohorts.ts — mirrors useThresholds.ts EXACTLY
import { useLocalStorage } from '@mantine/hooks';
import { useCallback, useEffect, useState } from 'react';
import {
  COHORTS_STORAGE_KEY,
  DEFAULT_COHORTS_STORAGE,
  LEGACY_COHORT_KEY,
  RESOURCE_TYPES_STORAGE_KEY,
  type CohortDefinition,
  type CohortsStorage,
} from '../quality/cohorts';

// One-time migration: read legacy key, if present write to new `quality.resourceTypes.v1`,
// then delete the legacy key. Runs in useEffect so it's a mount-side effect (safe w/ SSR never).
function migrateLegacyResourceTypeKey(): void {
  try {
    const legacy = window.localStorage.getItem(LEGACY_COHORT_KEY);
    if (legacy === null) return;
    const existing = window.localStorage.getItem(RESOURCE_TYPES_STORAGE_KEY);
    if (existing === null) {
      // Preserve user's selection — legacy value is JSON-stringified string[]
      window.localStorage.setItem(RESOURCE_TYPES_STORAGE_KEY, legacy);
    }
    window.localStorage.removeItem(LEGACY_COHORT_KEY);
  } catch {
    // localStorage unavailable / quota — fail closed; user keeps old key.
  }
}

export function useCohorts() {
  const [stored, setStored] = useLocalStorage<CohortsStorage>({
    key: COHORTS_STORAGE_KEY,
    defaultValue: DEFAULT_COHORTS_STORAGE,
  });
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    migrateLegacyResourceTypeKey();
    setHydrated(true);
  }, []);
  // ... setters (addCohort, activateCohort, deactivate, ...)
}
```

**Source:** mirrors `src/hooks/useThresholds.ts:49-110` and `src/quality/thresholds.ts:1-75` line-for-line.

### Pattern 2: Hydration gate for Mantine `useLocalStorage` (MANDATORY)

**What:** `@mantine/hooks.useLocalStorage` returns `defaultValue` on the first render and only hydrates from storage after a microtask [CITED: https://help.mantine.dev/q/local-storage-effect]. Reading `stored.activeCohortId` directly on the first render will show "No cohort" for one frame every page load — the same class of bug as REVIEW-FIX WR-04 in `useThresholds.ts:12-22`.
**When:** ALWAYS when persisted state drives visible UI (the active-cohort dropdown value absolutely does).
**Example:**
```ts
const [stored, setStored] = useLocalStorage<CohortsStorage>({
  key: COHORTS_STORAGE_KEY,
  defaultValue: DEFAULT_COHORTS_STORAGE,
});
const [hydrated, setHydrated] = useState(false);
useEffect(() => { setHydrated(true); }, []);

// Consumer renders a Skeleton until hydrated:
return hydrated
  ? <ActiveCohortSelect value={stored.activeCohortId} ... />
  : <Skeleton height={36} width={240} />;
```

**Source:** `src/hooks/useThresholds.ts:49-93` (`hydrated` flag + its gating of `isBreached`), `src/hooks/useTrendsHistory.ts:45-65` (same pattern applied to `quality.trends.v1`).

### Pattern 3: localStorage rename migration (read-side, one-shot)

**What:** On first mount, copy legacy key into new key (if new key is absent), then delete legacy key. Runs in a `useEffect` so it happens exactly once per tab session.
**When:** Whenever a localStorage key is renamed (our case: `quality.cohort.v1` → `quality.resourceTypes.v1`).
**Why read-side:** A write-side migration (write to both keys) would poison existing users for 1 release. Read-side is idempotent and self-cleaning.
**Example:** see `migrateLegacyResourceTypeKey` above. This function is **the entire migration** — no "dual read" fallback required because the legacy key is deleted after copy.

### Pattern 4: Scoping injection at `sampleResources` (NOT per-panel)

**What:** All 7 panel hooks funnel through `sampleResources(client, resourceType, sampleSize)` in `src/quality/sampling.ts:10-18` [VERIFIED: grep across `src/hooks/` and `src/quality/`]. Extend that one function with an optional `patientIds?: string[]` parameter. Panels keep their existing `types / client / sampleSize` signatures; the hook layer above them (e.g., `useCompletenessReport`) gets `patientIds` threaded through.
**When:** Preferred over per-panel prop changes because the prop-signature surface is currently locked by Plan 05-02 (quoted in `CodingCoveragePanel.tsx:8-10`) — changing it would ripple through UI specs, tests, and trend-history documentation.
**Example:**
```ts
// src/quality/sampling.ts — evolved signature
export async function sampleResources(
  client: MedplumClient,
  resourceType: string,
  sampleSize: number,
  patientIds?: string[],  // NEW — optional; undefined = no scoping (back-compat)
): Promise<Resource[]> {
  const params: Record<string, string> = { _count: String(sampleSize) };
  if (!patientIds || patientIds.length === 0) {
    return client.searchResources(resourceType as ResourceType, params);
  }
  // Many panels target resources that have `patient` OR `subject`. The `patient`
  // parameter exists on most patient-bound types (Observation, Condition,
  // Encounter, Procedure, MedicationRequest, DiagnosticReport, AllergyIntolerance,
  // etc.) and is Patient-only (safer than `subject` which also matches Group).
  const SHORT_QUERY_THRESHOLD = 40; // ~40 IDs × (8 + 'Patient/'.length ≈ 16) = ~640 chars — well under 2048
  if (patientIds.length <= SHORT_QUERY_THRESHOLD) {
    params['patient'] = patientIds.map((id) => `Patient/${id}`).join(',');
    return client.searchResources(resourceType as ResourceType, params);
  }
  // Large cohort: fall back to POST _search with form-urlencoded body.
  const body = new URLSearchParams({
    _count: String(sampleSize),
    patient: patientIds.map((id) => `Patient/${id}`).join(','),
  }).toString();
  const bundle = await client.post(
    client.fhirUrl(resourceType, '_search').toString(),
    body,
    'application/x-www-form-urlencoded',
  ) as Bundle<Resource>;
  return (bundle.entry ?? []).map((e) => e.resource!).filter(Boolean);
}
```
**Special case:** `Patient` itself has no `patient=` parameter — when `resourceType === 'Patient'`, scope with `_id=` instead. Add that branch. `patientDuplicateDetector` in `DuplicatesPanel` already scopes against Patient, so this branch is load-bearing.

**Source:** `src/quality/sampling.ts:10-18` (current signature); `client.fhirUrl()` at `dist/cjs/index.d.ts:3834`; `client.post()` at `dist/cjs/index.d.ts:3678`.

### Pattern 5: Named-cohort storage shape + stable IDs

**What:** Store a list, not a single active cohort. Phase 22 requires edit/duplicate/delete (CHRT-07) which demands stable IDs. Implementing a single-cohort model now would force a migration in Phase 22.
**When:** Always.
**Example shape:**
```json
{
  "cohorts": [
    {
      "id": "018f2a6e-...-...",
      "name": "Diabetic adults 2024",
      "criteria": [
        { "type": "condition-code", "system": "http://snomed.info/sct", "code": "44054006" },
        { "type": "date-range", "start": "2024-01-01", "end": "2024-12-31" }
      ],
      "createdAt": "2026-04-15T10:00:00Z",
      "updatedAt": "2026-04-15T10:00:00Z"
    }
  ],
  "activeCohortId": "018f2a6e-...-..."
}
```

### Anti-Patterns to Avoid

- **Passing the entire `CohortDefinition` to panels.** Panels don't need to know HOW the patient set was computed. Pass `patientIds: string[]` only.
- **Recomputing the patient set on every render.** Resolve once at activation (and on "Recompute metrics"). Cache in a `useMemo` keyed by `activeCohortId` + a "recomputeToken" state.
- **Storing cohort name as a primary key.** Use `crypto.randomUUID()` for stability across rename; name is a display attribute, not a key.
- **Blocking panel render on cohort resolution.** Resolve asynchronously; show a Skeleton/Alert "Resolving cohort…"; render panels unscoped (current behavior) until resolution completes. Zero-regression default matches D-04.
- **Using `subject=` instead of `patient=`.** `subject` can match Group references too [CITED: FHIR R4 §Condition.subject]; `patient` is Patient-only and semantically correct.

## Scoping Mechanism Decision (Discretion Point 1 + 6)

**Decision:** Resolve cohort → patient ID set **once** at cohort activation or on "Recompute metrics." Inject via `sampleResources(client, type, size, patientIds?)`.

**Rationale:**

1. **Chokepoint exists:** All 7 panels funnel through `sampleResources` [VERIFIED: grep confirms 7/7 hooks call it]. One injection point vs. 7 means lower blast radius.
2. **Panel prop signatures are locked:** `CodingCoveragePanel.tsx:8-10` explicitly documents the 3-prop contract as locked by Plan 05-02. Panels keep `{ types, client, sampleSize }` — the hook layer consumes cohort scope.
3. **Server-side `_has` alternative is weaker:** Blaze supports chained search [CITED: https://samply.github.io/blaze/performance/fhir-search.html — "Token and Forward Chaining Search"], but each panel would need its own `_has=` query tailored to its resource type, adding 7 implementation surfaces. The pre-resolved-ID-set approach has one query per criterion type (executed once at activation), not 7 queries per panel.
4. **URL length is solvable:** FHIR spec sanctions `POST [base]/[type]/_search` with `application/x-www-form-urlencoded` body for long queries [CITED: https://hl7.org/fhir/R4/search.html]. MedplumClient exposes `.post(url, body, contentType)` [VERIFIED: `dist/cjs/index.d.ts:3678`]. 40-ID GET threshold keeps 95%+ of real-world cohorts on the simpler GET path.
5. **Caching is cheap:** `Map<cohortId, string[]>` module-scoped cache mirrors `QualityMetricsCache` pattern in `useCompletenessReport.ts:43-51`.

**Counter-alternative rejected:** Sending full `CohortDefinition` into each panel and letting panels build their own `_has`. Violates the "panels unaware of HOW the set was derived" contract from CONTEXT.md. Would also require per-panel Blaze-capability checks.

## Criterion Resolution Queries (Discretion Point 2)

All three criterion types resolve to a set of Patient IDs. The resolver runs each criterion independently, then intersects.

### Date range → patient IDs

**Recommendation:** Apply the date range to `Encounter.period` as the **primary** signal. Encounter is the standard clinical-activity window (covers admissions, visits, inpatient stays), and the MII Kerndatensatz has `Fall` (Encounter) as a first-class module [CITED: PROJECT.md §Context — "MII Kerndatensatz modules: ... Fall (Encounter)..."].

**Why Encounter.period over Observation.effectiveDateTime or Condition.onset:**
- **Encounter** is the canonical "did this patient have clinical activity in the window?" signal. Single resource type, one query, de-duplicable to patient IDs.
- **Observation/Condition** would multiply queries across resource types. The user intent "patients active in 2024" maps to Encounter; finer-grained filters are out of scope for Phase 21.
- **Patient.birthDate** conflates "born in range" with "active in range" — semantically wrong for a clinical cohort filter.

**Query:**
```
GET Encounter?date=ge2024-01-01&date=le2024-12-31&_elements=subject&_count=1000
```
Follow pagination (`bundle.link[rel='next']`) via `client.searchResourcePages()` [VERIFIED: CLAUDE.md lists this method]. Extract `entry[].resource.subject.reference` → strip `Patient/` prefix → dedupe into a `Set<string>`.

**Edge case:** Open-ended ranges — `date=ge2024-01-01` alone (no end) is valid FHIR [CITED: https://hl7.org/fhir/R4/search.html#date]. Use prefixes `ge` / `le` for inclusive bounds; omit the param when the bound is null.

### Condition code → patient IDs

**Recommendation:** `Condition?code=<system>|<code>&_elements=subject&_count=1000`, paginate, extract `subject.reference`.

**Why `code=system|code` (the "pipe form") over `code=code`:**
- FHIR token search accepts `system|code` to disambiguate identical codes across systems [CITED: https://hl7.org/fhir/R4/search.html#token]. Freeform code-only is allowed but ambiguous — a code like `44054006` could mean different things in SNOMED vs. ICD-10.
- MII data is multi-system (ICD-10-GM, SNOMED, LOINC). Forcing explicit system ensures the user knows what they're filtering on.

**Why `_elements=subject`:** Reduces bandwidth — we only need the patient reference, not full Condition resources. [CITED: https://hl7.org/fhir/R4/search.html#elements]. Blaze performance docs emphasize "token search at 6M resources/sec" [CITED: https://samply.github.io/blaze/performance/fhir-search.html] so even large datasets should resolve quickly.

**Alternative rejected:** `Condition?code=...&_include=Condition:subject`. Fetches Patient resources alongside — wasteful since we only need IDs.

**Edge case (documented as a known limitation for Phase 21):** If the Condition search returns >10,000 unique patients, the resolver truncates to 10,000 (same cap as `parsePatientRefs`). Phase 22's FHIRPath flow can address larger cohorts server-side.

### Reference list → patient IDs

**Recommendation:** `Textarea` input → `parsePatientRefs(raw)` (accepts `Patient/abc`, `abc`, comma-separated or line-separated) → return the deduped ID array directly. **Do NOT verify existence in Blaze up-front** — defer that to query time. The panels will naturally return empty results for non-existent patients.

**Why not verify:**
- Existence check requires a round-trip `Patient?_id=id1,id2,...` — duplicates server load for no strong benefit (user gets the same "no results" outcome).
- Paste-and-go is the UX expectation for this input mode.
- **UX compromise:** Show a `Text size="xs" c="dimmed"` counter under the Textarea ("{N} Patient IDs parsed") so the user can sanity-check their paste.

### AND composition

Intersection of the three sets. If any criterion is "empty" (no dates, no code, no reference list), it contributes no constraint (skip; do not intersect). If all three are empty, the cohort is invalid — disable the Save button.

```ts
export async function resolveCohort(
  client: MedplumClient,
  cohort: CohortDefinition,
): Promise<string[]> {
  const sets: Set<string>[] = [];
  for (const c of cohort.criteria) {
    if (c.type === 'date-range')        sets.push(await resolveDateRange(client, c));
    else if (c.type === 'condition-code') sets.push(await resolveConditionCode(client, c));
    else if (c.type === 'reference-list') sets.push(new Set(c.patientIds));
  }
  if (sets.length === 0) return [];
  // Intersect — start with smallest for best-case short-circuit.
  sets.sort((a, b) => a.size - b.size);
  const result = new Set<string>();
  for (const id of sets[0]) {
    if (sets.every((s) => s.has(id))) result.add(id);
  }
  return Array.from(result);
}
```

## Criterion Input UX Components (Discretion Point 5)

| Criterion | Component(s) | Notes |
|-----------|--------------|-------|
| **Date range** | `DatePickerInput` from `@mantine/dates` in **range mode** (`type="range"`) | Returns `[Date \| null, Date \| null]`. Serialize to ISO date strings (`YYYY-MM-DD`) before storing. Requires `<DatesProvider>` wrapper on the `CohortsPage`. [CITED: https://mantine.dev/dates/date-picker-input/] |
| **Condition code** | Two `TextInput` components in a `Group`: one for `system` (placeholder: `http://snomed.info/sct`), one for `code` (placeholder: `44054006`) | Freeform for Phase 21 per CONTEXT.md discretion. Autocomplete via `valueSetCache.ts` deferred to later phase. Validate both are non-empty before enabling Save. |
| **Reference list** | `Textarea` with `autosize minRows={4} maxRows={12}`, `placeholder="Patient/abc, Patient/xyz\nor bare IDs, one per line"` | Paste-parse via `parsePatientRefs()`. Show parsed-count helper `Text size="xs" c="dimmed"`. |
| **Save button** | Mantine `Button variant="filled"` + `Modal` for "Save as…" name prompt | Disable when all criteria empty OR name missing. Uses same `useDisclosure` pattern as ThresholdsPage reset modal (`ThresholdsPage.tsx:144`). |

**Form layout pattern:**
```
<Stack gap="lg" p="xl">
  <Anchor component={Link} to="/quality">← Back to Data Quality</Anchor>
  <Title order={2}>Cohorts</Title>
  <Paper withBorder p="md">
    {/* Saved cohorts table — Phase 22 adds edit/dup/delete; Phase 21 can be read-only list */}
  </Paper>
  <Paper withBorder p="md">
    <Title order={4}>New cohort</Title>
    <DatesProvider settings={{ locale: 'en' }}>
      <Stack gap="md">
        <DatePickerInput type="range" label="Date range" ... />
        <Group>
          <TextInput label="Code system" ... />
          <TextInput label="Condition code" ... />
        </Group>
        <Textarea label="Patient references" autosize minRows={4} ... />
        <Group justify="flex-end">
          <Button onClick={openSaveModal}>Save cohort…</Button>
        </Group>
      </Stack>
    </DatesProvider>
  </Paper>
</Stack>
```

## Toolbar Integration (QualityOverviewPage)

Replace the single `<Group>` with a two-control pattern at `QualityOverviewPage.tsx:210-213`:

```tsx
<Group gap="md" align="flex-end">
  <ResourceTypeSelector types={types} value={resourceTypes} onChange={setResourceTypes} />
  <ActiveCohortSelect /* reads from useCohorts() */ />
  <SampleSizeControl value={sampleSize} onChange={setSampleSize} />
</Group>
```

**ActiveCohortSelect shape:**
```tsx
<Select
  label="Active cohort"
  placeholder="No cohort — all patients"
  data={[
    { value: '', label: 'No cohort — all patients' },
    ...cohorts.map((c) => ({ value: c.id, label: c.name })),
  ]}
  value={activeCohortId ?? ''}
  onChange={(v) => activateCohort(v || null)}
  style={{ maxWidth: 320 }}
  size="sm"
/>
<Text size="xs" c="dimmed" mt={4}>
  {activeCohort ? `${resolvedPatientCount} patients` : 'Analyze all patients'}
</Text>
```

Helper text `Text size="xs" c="dimmed"` reinforces distinct purposes: "resource types" filters TYPES, "active cohort" filters PATIENTS. Matches the `CohortSelector.tsx:29-33` existing helper-text pattern.

## localStorage Migration Recipe (CHRT-04)

**Three keys in play:**

| Key | Role | Action |
|-----|------|--------|
| `quality.cohort.v1` (legacy, current) | Pre-rename: stored resource-type `string[]` | **DELETE after migration** |
| `quality.resourceTypes.v1` (new) | Post-rename: stores resource-type `string[]` | **CREATE via migration (copy legacy value if present)** |
| `quality.cohorts.v1` (new) | The REAL cohorts: `CohortsStorage` object | **CREATE fresh (never coexisted with legacy)** |

**Migration runs once per mount, in `useCohorts`:**
```ts
useEffect(() => {
  try {
    const legacy = localStorage.getItem('quality.cohort.v1');
    if (legacy !== null) {
      const existing = localStorage.getItem('quality.resourceTypes.v1');
      if (existing === null) {
        localStorage.setItem('quality.resourceTypes.v1', legacy);
      }
      localStorage.removeItem('quality.cohort.v1');
    }
  } catch {
    // Fail-closed: keep legacy key rather than crash.
  }
  setHydrated(true);
}, []);
```

**CRITICAL ordering:** run migration BEFORE the `useLocalStorage` consumer in the same file reads from `quality.resourceTypes.v1`. Since `useLocalStorage` hydrates asynchronously on first effect tick, and our migration also runs on first effect tick, ordering matters:
- **Option A (recommended):** Centralize the migration in a top-level `QualityLayout.tsx:50` `useEffect` BEFORE any child renders. Guaranteed to run before the dashboard's `useLocalStorage('quality.resourceTypes.v1', …)` reads. Lowest risk.
- **Option B:** Run migration in `useCohorts` and rely on React's effect ordering guarantees (parent effects run after child effects on first mount). This is fragile — ordering is stable but non-obvious.

Recommendation: **Option A** — single useEffect in `QualityLayout` that runs on first mount.

**Source of ordering risk:** `QualityOverviewPage.tsx:79-82` currently does `useLocalStorage({ key: 'quality.cohort.v1', ... })`. After the rename that becomes `{ key: 'quality.resourceTypes.v1', ... }`. If Mantine reads from storage before migration copies the value, the user sees "no selection" for one frame.

## Trend History + PDF Impact (Discretion Point 7)

### QualitySnapshot evolution

Current shape (`src/quality/trendsHistory.ts:43-51`):
```ts
interface QualitySnapshot {
  ...
  cohort: string[];  // resource-type list
  ...
}
```

**Proposed evolved shape (Phase 21):**
```ts
interface QualitySnapshot {
  ...
  resourceTypes: string[];             // RENAMED from cohort
  cohortId: string | null;             // NEW — which cohort was active (null = all patients)
  cohortName?: string;                 // NEW — denormalized for historical display (names can be edited/deleted in Phase 22)
  cohortPatientCount?: number;         // NEW — denormalized "N patients at capture time"
  ...
}
```

**Backward compat for historical snapshots:**
- Runtime reader: if `resourceTypes` is absent but `cohort` is present, treat `cohort` as `resourceTypes` and synthesize `cohortId: null`, `cohortName: undefined`. Pure function `migrateSnapshot(legacy): QualitySnapshot`.
- No write-side rewrite — existing snapshots stay legacy-shaped in localStorage. Reader migrates on read.
- **Denormalization of cohortName:** necessary because in Phase 22 cohorts become editable/deletable. A historical snapshot must still display what cohort it was captured under, even after the cohort is renamed or deleted. Cost: ~40 bytes per snapshot × 500 soft limit = ~20KB — negligible against `TRENDS_SOFT_LIMIT` in `trendsHistory.ts:28`.

### PDF export (`pdfExport.ts:46`)

Current signature has `cohort: string[]` — rename to `resourceTypes: string[]` + add `cohort: { id: string | null; name: string | null; patientCount: number | null }`. PDF surface (see `PdfReportLayout`) renders **BOTH** lines:
```
Resource types: Observation, Condition, Encounter
Cohort:         "Diabetic adults 2024" (1,247 patients)
```
This is the clear audit trail for phase 21+ reports.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Range date picker | Custom two-`DateInput` + validation | `@mantine/dates.DatePickerInput type="range"` | Full keyboard nav, a11y, locale, min/max constraint already in the component. |
| UUID generation | `Math.random()` or custom | `crypto.randomUUID()` | Already the codebase pattern (`trendsHistory.ts:110`). [CITED: MDN — widely supported in all modern browsers] |
| URL encoding for long `patient=` lists | String concat + `encodeURIComponent` | `URLSearchParams` + MedplumClient `.post(url, body, 'application/x-www-form-urlencoded')` | `URLSearchParams` handles edge chars; POST `_search` is the FHIR-spec-sanctioned escape hatch. |
| Pagination through large Bundles | Manual `bundle.link[rel=next]` walk | `client.searchResourcePages()` (async generator) | Already in the Medplum API surface [CITED: CLAUDE.md §"Connecting MedplumClient to Blaze"]. |
| localStorage hydration | Direct `JSON.parse(localStorage.getItem(...))` in render | `@mantine/hooks.useLocalStorage` + hydration-gate pattern | Already the codebase pattern; handles SSR-safety + event sync. |
| Set intersection | Manual loops | `Set` + `Array.from(s).every(s2.has)` | Standard JS pattern used throughout the codebase (`referenceChecker.ts:127`). |
| Paste parser for Patient IDs | Regex + per-char iteration | `String.split(/[\s,;]+/)` + filter | Handles commas, newlines, semicolons, arbitrary whitespace in one expression. |

**Key insight:** Every primitive this phase needs already exists either in the codebase (`useLocalStorage` hydration gate, `ThresholdsPage` page structure, `sampleResources` chokepoint, `crypto.randomUUID`) or in Mantine/Medplum/FHIR spec (`DatePickerInput` range, `client.post` for `_search`, `URLSearchParams`). The phase is **assembly**, not invention.

## Common Pitfalls

### Pitfall 1: One-frame "No cohort" flicker on every page load

**What goes wrong:** `useLocalStorage` returns `defaultValue` (an empty `CohortsStorage`) on first render. The active-cohort dropdown shows "No cohort — all patients" for one frame even when a cohort was previously activated. Panels run UNSCOPED for that one frame, briefly fetching all-patient data.
**Why it happens:** Mantine hydrates asynchronously [CITED: https://help.mantine.dev/q/local-storage-effect].
**How to avoid:** Implement the hydration gate pattern from `useThresholds.ts:57-60`. The cohort Select renders a `Skeleton height={36} width={240}` until `hydrated === true`. The panels skip data fetching entirely until hydration (add a guard in `useCompletenessReport` etc. to early-return `{}` when `!hydrated`).
**Warning sign:** User reports "my panels flash all-patient data then switch to cohort data" OR DevTools Network tab shows an unscoped query before the cohort-scoped query.

### Pitfall 2: URL length overflow with large `patient=` lists

**What goes wrong:** Cohort of 1,000 Patient IDs → `patient=Patient/id1,Patient/id2,...` produces a ~25KB URL. Browsers cap at 2,048 (IE legacy) to 65,536 (Firefox) chars; Blaze (Jetty/servlet) likely caps at 8,192 [CITED: standard Jetty default]. The server returns a `414 Request-URI Too Large` or silently truncates.
**Why it happens:** Default HTTP GET. No Blaze-specific docs found on this limit [ATTEMPTED: `samply/blaze/docs/api.md` — not documented].
**How to avoid:** Threshold at 40 IDs in `sampleResources`. Above that, switch to `POST <Type>/_search` with `application/x-www-form-urlencoded` body [CITED: https://hl7.org/fhir/R4/search.html §"search via POST"]. `MedplumClient.post(url, body, 'application/x-www-form-urlencoded')` is the supported entry point [VERIFIED: `dist/cjs/index.d.ts:3678`].
**Warning sign:** 414 status, truncated JSON response, or `bundle.total === 0` when >40 patient IDs are in the cohort.

### Pitfall 3: Cohort resolution runs on every tab switch

**What goes wrong:** User activates a cohort. Switches from Completeness tab → Coding Coverage tab. The cohort resolver runs again. Two `Encounter?date=...` queries hit Blaze for the same cohort.
**Why it happens:** Without caching, the `useEffect` that computes `patientIds` re-runs on every render where dependencies change.
**How to avoid:** Cache `Map<cohortId, string[]>` module-scoped in `cohortResolver.ts`, mirroring the `QualityMetricsCache` pattern in `useCompletenessReport.ts:43-51`. Invalidate only on "Recompute metrics" click or when `cohort.updatedAt` changes.
**Warning sign:** Network tab shows 4+ Encounter/Condition queries on a single cohort activation.

### Pitfall 4: Patient-type search uses `patient=` (doesn't exist)

**What goes wrong:** When `resourceType === 'Patient'` (used by `DuplicatesPanel` for patient-duplicate detection), the `patient=` search parameter doesn't exist on Patient itself.
**Why it happens:** `patient=` is a common-to-all-clinical-resources param but Patient is the *target*, not a bearer. [CITED: https://hl7.org/fhir/R4/patient.html — Patient has no `patient` search param.]
**How to avoid:** Special-case `resourceType === 'Patient'` in `sampleResources` — use `_id=id1,id2,...` instead. Apply the same 40-ID threshold + POST fallback.
**Warning sign:** `DuplicatesPanel` returns 0 patients when a cohort is active (search silently ignored the unknown param on some servers; may return ALL patients on others).

### Pitfall 5: localStorage migration double-runs / loses data

**What goes wrong:** Two tabs open. Tab A runs migration (copies legacy → new, deletes legacy). Tab B runs the same migration one ms later; legacy is already gone; the `existing` check passes (new key is populated); no-op. But if migration is run in `useCohorts` and `useCohorts` mounts multiple times (e.g., route change), the second mount's migration sees legacy is gone — correct no-op.
**Why it's tricky:** The race doesn't lose data IF the `if (existing === null)` check is performed BEFORE overwriting. If migration is refactored to unconditionally copy, it WILL clobber the new key with the legacy value.
**How to avoid:** Keep the `if (existing === null) setItem(...)` guard. Single-place migration (recommended: `QualityLayout.tsx` top-level effect). Don't put migration in `useCohorts` — the page may mount/unmount multiple times.
**Warning sign:** After upgrade, user reports losing the resource-type selection they had JUST changed post-upgrade.

### Pitfall 6: Trend snapshot schema break

**What goes wrong:** User captures a snapshot pre-Phase-21 (has `cohort: string[]`). Upgrades. New code reads `snapshot.resourceTypes` — undefined. UI shows empty resource-type list on historical snapshots.
**Why it happens:** Renaming `cohort → resourceTypes` in the captured snapshot schema without a reader-side migration.
**How to avoid:** Add a pure `migrateSnapshot(legacy): QualitySnapshot` in `trendsHistory.ts` that reads `legacy.cohort ?? legacy.resourceTypes ?? []`. Apply in `useTrendsHistory.ts` after the corrupt-payload check (line 58-65).
**Warning sign:** Trends tab shows "Resource types: (empty)" for snapshots captured before the upgrade.

### Pitfall 7: `subject=` vs `patient=` semantics confusion

**What goes wrong:** Some FHIR resources have a `subject` param (Observation, Condition) that accepts both Patient and Group references. Using `subject=Patient/id1` works; using `subject=id1` does not (subject is non-Patient-constrained). Using `patient=` is Patient-only and semantically tighter.
**Why it happens:** Copy-paste a URL from a `subject` example to a `patient`-param use.
**How to avoid:** Always use `patient=` for Patient-scoped filtering. It's narrower and semantically correct. `patient=Patient/id` and `patient=id` both work (server normalizes).
**Warning sign:** Occasional extra results that look like "orphan" matches — actually `subject=Group/xyz` matches sneaking in.

### Pitfall 8: "No patients match" silent UX

**What goes wrong:** A cohort resolves to 0 patients (e.g., the condition code doesn't exist in this Blaze). Panels run with `patient=` (empty) — which in FHIR is typically a syntax error or returns all resources.
**Why it happens:** Empty-string `patient=` is ill-defined across servers.
**How to avoid:** In `sampleResources`, treat `patientIds` as length-0 identically to undefined (return unscoped result). AT THE UI LEVEL, detect a cohort with 0 resolved patients and show a yellow `Alert` "Active cohort matches 0 patients. Panels run unscoped." so the user doesn't silently see full-dataset results.
**Warning sign:** User says "I set a cohort but the numbers didn't change."

## Code Examples

### `src/quality/cohorts.ts` — pure module

```ts
// Source: mirrors src/quality/thresholds.ts:1-75 structure verbatim
export type CohortCriterion =
  | { type: 'date-range'; start: string | null; end: string | null }
  | { type: 'condition-code'; system: string; code: string }
  | { type: 'reference-list'; patientIds: string[] };

export interface CohortDefinition {
  id: string;
  name: string;
  criteria: CohortCriterion[];
  createdAt: string;
  updatedAt: string;
}

export interface CohortsStorage {
  cohorts: CohortDefinition[];
  activeCohortId: string | null;
}

export const COHORTS_STORAGE_KEY = 'quality.cohorts.v1';
export const RESOURCE_TYPES_STORAGE_KEY = 'quality.resourceTypes.v1';
export const LEGACY_COHORT_KEY = 'quality.cohort.v1';

export const DEFAULT_COHORTS_STORAGE: CohortsStorage = {
  cohorts: [],
  activeCohortId: null,
};

export function findActiveCohort(s: CohortsStorage): CohortDefinition | null {
  if (!s.activeCohortId) return null;
  return s.cohorts.find((c) => c.id === s.activeCohortId) ?? null;
}

export function parsePatientRefs(raw: string): string[] {
  const tokens = raw.split(/[\s,;]+/).map((t) => t.trim()).filter(Boolean);
  const ids = tokens.map((t) => t.replace(/^Patient\//, ''));
  return Array.from(new Set(ids)).slice(0, 10_000);
}
```

### `src/quality/cohortResolver.ts` — async criterion → patient IDs

```ts
// Source: uses client.searchResources signature from
// node_modules/@medplum/core/dist/cjs/index.d.ts:3940
import type { MedplumClient } from '@medplum/core';
import type { CohortDefinition, CohortCriterion } from './cohorts';

const resolvedCache = new Map<string, { updatedAt: string; ids: string[] }>();

export async function resolveCohort(
  client: MedplumClient,
  cohort: CohortDefinition,
): Promise<string[]> {
  const cached = resolvedCache.get(cohort.id);
  if (cached && cached.updatedAt === cohort.updatedAt) return cached.ids;

  const sets: Set<string>[] = [];
  for (const c of cohort.criteria) {
    const set = await resolveCriterion(client, c);
    if (set.size === 0 && c.type !== 'reference-list') {
      // Hard-empty criterion → empty cohort
      resolvedCache.set(cohort.id, { updatedAt: cohort.updatedAt, ids: [] });
      return [];
    }
    sets.push(set);
  }
  if (sets.length === 0) return [];

  sets.sort((a, b) => a.size - b.size);
  const result: string[] = [];
  for (const id of sets[0]) {
    if (sets.every((s) => s.has(id))) result.push(id);
  }

  resolvedCache.set(cohort.id, { updatedAt: cohort.updatedAt, ids: result });
  return result;
}

async function resolveCriterion(
  client: MedplumClient,
  c: CohortCriterion,
): Promise<Set<string>> {
  if (c.type === 'reference-list') return new Set(c.patientIds);

  const params: Record<string, string | string[]> = {
    _elements: 'subject',
    _count: '1000',
  };
  let resourceType: 'Encounter' | 'Condition';

  if (c.type === 'date-range') {
    resourceType = 'Encounter';
    const dates: string[] = [];
    if (c.start) dates.push(`ge${c.start}`);
    if (c.end) dates.push(`le${c.end}`);
    if (dates.length === 0) return new Set(); // No bounds → empty
    params.date = dates; // Array → Medplum emits multiple date= params (AND)
  } else {
    // condition-code
    resourceType = 'Condition';
    params.code = `${c.system}|${c.code}`;
  }

  const ids = new Set<string>();
  // Paginate fully — a cohort query is one-shot; worth doing right.
  for await (const entry of client.searchResourcePages(resourceType, params)) {
    for (const r of entry) {
      const ref = (r as { subject?: { reference?: string } }).subject?.reference;
      if (typeof ref === 'string') {
        const [type, id] = ref.split('/');
        if (type === 'Patient' && id) ids.add(id);
      }
    }
    if (ids.size >= 10_000) break; // Safety cap
  }
  return ids;
}
```

### `src/quality/sampling.ts` — evolved for cohort scoping

```ts
// Source: extends current src/quality/sampling.ts:10-18
import type { MedplumClient } from '@medplum/core';
import type { Bundle, Resource, ResourceType } from '@medplum/fhirtypes';

const SHORT_QUERY_THRESHOLD = 40;

export async function sampleResources(
  client: MedplumClient,
  resourceType: string,
  sampleSize: number,
  patientIds?: string[],
): Promise<Resource[]> {
  const hasCohort = patientIds && patientIds.length > 0;
  if (!hasCohort) {
    return client.searchResources(resourceType as ResourceType, {
      _count: String(sampleSize),
    });
  }

  const isPatientType = resourceType === 'Patient';
  const scopeParam = isPatientType ? '_id' : 'patient';
  const scopeValue = isPatientType
    ? patientIds!.join(',')
    : patientIds!.map((id) => `Patient/${id}`).join(',');

  if (patientIds!.length <= SHORT_QUERY_THRESHOLD) {
    return client.searchResources(resourceType as ResourceType, {
      _count: String(sampleSize),
      [scopeParam]: scopeValue,
    });
  }

  // POST _search for large cohorts
  const body = new URLSearchParams({
    _count: String(sampleSize),
    [scopeParam]: scopeValue,
  }).toString();
  const bundle = (await client.post(
    client.fhirUrl(resourceType, '_search').toString(),
    body,
    'application/x-www-form-urlencoded',
  )) as Bundle<Resource>;
  return (bundle.entry ?? []).map((e) => e.resource!).filter(Boolean);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Resource-type list mislabeled as "Cohort" | Rename to "Resource types"; add real patient-cohort feature beside it | Phase 21 (v1.3) | Fixes UX mismatch that has confused users since Phase 16. |
| Single-cohort implicit model (just the active one) | Named list of cohorts with stable UUIDs | Phase 21 | Supports Phase 22 edit/duplicate/delete without migration. |
| URL GET only for FHIR search | GET for small parameters, POST `_search` for large | Phase 21 (in `sampleResources`) | Removes hidden 8KB URL ceiling. |

**Deprecated/outdated:**
- `quality.cohort.v1` localStorage key — deleted by read-side migration after one mount.
- `QualitySnapshot.cohort: string[]` field — superseded by `resourceTypes` + `cohortId` + denormalized name/count. Reader migrates legacy snapshots on load.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `@mantine/core` | Everything | ✓ | 8.3.18 | — |
| `@mantine/hooks` | `useLocalStorage` | ✓ | 8.3.18 | — |
| `@mantine/notifications` | Save/activate toasts | ✓ | 8.3.18 | — |
| `@mantine/dates` | `DatePickerInput` | ✗ | — | Must install `^8.3.18` |
| `dayjs` | Peer of `@mantine/dates` | ✗ | — | Must install `^1.11.20` |
| `@medplum/core` | `MedplumClient.post`, `.searchResources`, `.searchResourcePages`, `.fhirUrl` | ✓ | 5.1.7 | — |
| `react-router-dom` | `<Route>` registration | ✓ | 7.14.0 | — |
| `crypto.randomUUID` | Stable cohort IDs | ✓ | Native browser API | — (already used in `trendsHistory.ts:110`) |
| Vitest + jsdom | Unit tests | ✓ | 4.1.4 / 29.0.2 | — |
| Blaze FHIR server | Cohort resolution queries (Condition/Encounter search) | ✓ (assumed running at localhost:8080 per PROJECT.md) | — | Graceful fallback: on query error, surface Alert "Cohort resolution failed — check Blaze connection"; don't crash panels. |

**Missing dependencies with no fallback:**
- None — `@mantine/dates` + `dayjs` install is a 2-package add with zero code impact beyond the CohortsPage.

**Missing dependencies with fallback:**
- None.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 + @testing-library/react 16.3.2 + jsdom 29.0.2 |
| Config file | `vitest.config.ts` (include: `src/**/*.test.ts`, `src/**/*.test.tsx`; environment: jsdom; globals: true) |
| Quick run command | `npx vitest run src/quality/cohorts.test.ts src/quality/cohortResolver.test.ts src/hooks/useCohorts.test.ts` |
| Full suite command | `npm test` (runs `vitest run` per `package.json`) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CHRT-01 | Builder accepts date-range + condition-code + reference-list criterion inputs | integration (RTL) | `npx vitest run src/components/quality/CohortBuilderForm.test.tsx` | ❌ Wave 0 |
| CHRT-01 | `parsePatientRefs` parses lines, commas, mixed whitespace; strips `Patient/` prefix; dedupes; caps at 10K | unit | `npx vitest run src/quality/cohorts.test.ts -t "parsePatientRefs"` | ❌ Wave 0 |
| CHRT-01 | `resolveCohort` intersects three criterion sets; returns shortest-first ordering | unit | `npx vitest run src/quality/cohortResolver.test.ts -t "intersects"` | ❌ Wave 0 |
| CHRT-01 | Date-range criterion queries `Encounter?date=ge...&date=le...&_elements=subject` | unit (mock MedplumClient) | `npx vitest run src/quality/cohortResolver.test.ts -t "date range"` | ❌ Wave 0 |
| CHRT-01 | Condition-code criterion queries `Condition?code=system\|code&_elements=subject` | unit (mock MedplumClient) | `npx vitest run src/quality/cohortResolver.test.ts -t "condition code"` | ❌ Wave 0 |
| CHRT-02 | `useCohorts` persists to `quality.cohorts.v1`; survives reload | integration (RTL + localStorage) | `npx vitest run src/hooks/useCohorts.test.ts -t "persists"` | ❌ Wave 0 |
| CHRT-02 | Hydration gate: first render returns defaults, effect flips to stored | unit | `npx vitest run src/hooks/useCohorts.test.ts -t "hydration"` | ❌ Wave 0 |
| CHRT-02 | `CohortDefinition.id` is `crypto.randomUUID()`-shaped | unit | `npx vitest run src/hooks/useCohorts.test.ts -t "uuid"` | ❌ Wave 0 |
| CHRT-03 | `sampleResources` with `patientIds` ≤ 40 uses GET `?patient=...` | unit (mock client) | `npx vitest run src/quality/sampling.test.ts -t "short GET"` | ❌ Wave 0 (new file) |
| CHRT-03 | `sampleResources` with `patientIds` > 40 uses POST `/_search` | unit (mock client) | `npx vitest run src/quality/sampling.test.ts -t "long POST"` | ❌ Wave 0 |
| CHRT-03 | `sampleResources` for `Patient` type uses `_id=` not `patient=` | unit | `npx vitest run src/quality/sampling.test.ts -t "Patient uses _id"` | ❌ Wave 0 |
| CHRT-03 | `sampleResources` with empty `patientIds` is equivalent to no scoping | unit | `npx vitest run src/quality/sampling.test.ts -t "empty array"` | ❌ Wave 0 |
| CHRT-03 | Active-cohort Select in toolbar scopes all 7 panels — unscoped fallback on resolution failure | manual (human UAT via dashboard) | Manual test recipe in HUMAN-UAT | ❌ Wave 0 |
| CHRT-04 | `ResourceTypeSelector` renders label "Resource types" | unit (RTL) | `npx vitest run src/components/quality/ResourceTypeSelector.test.tsx` | ❌ Wave 0 |
| CHRT-04 | Legacy `quality.cohort.v1` migrates to `quality.resourceTypes.v1` on mount | integration (RTL + localStorage seed) | `npx vitest run src/hooks/useCohorts.test.ts -t "legacy migration"` | ❌ Wave 0 |
| CHRT-04 | Migration doesn't clobber existing `quality.resourceTypes.v1` value | unit | `npx vitest run src/hooks/useCohorts.test.ts -t "migration idempotent"` | ❌ Wave 0 |
| CHRT-04 | Trend snapshot reader handles legacy `cohort` field (treats as `resourceTypes`) | unit | `npx vitest run src/quality/__tests__/trendsHistory.test.ts -t "legacy snapshot"` | ⚠️ exists (extend) |

### Sampling Rate
- **Per task commit:** `npx vitest run <changed-files>` (sub-30-sec feedback)
- **Per wave merge:** `npm test` (full Vitest suite)
- **Phase gate:** `npm test` green + `npm run build` exits 0 before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/quality/cohorts.test.ts` — covers CHRT-01, CHRT-02 (pure functions)
- [ ] `src/quality/cohortResolver.test.ts` — covers CHRT-01 (criterion queries + intersection); needs mocked MedplumClient
- [ ] `src/quality/sampling.test.ts` — NEW (currently no test for `sampling.ts`); covers CHRT-03
- [ ] `src/hooks/useCohorts.test.ts` — covers CHRT-02, CHRT-04 migration
- [ ] `src/components/quality/CohortBuilderForm.test.tsx` — covers CHRT-01 form interactions
- [ ] `src/components/quality/ResourceTypeSelector.test.tsx` — covers CHRT-04 label + behavior
- [ ] Extend `src/quality/__tests__/trendsHistory.test.ts` (existing) for legacy-snapshot migration

No framework install needed. No `conftest`/global fixture file needed — Mantine 8 Testing Library integration works out-of-the-box with the existing `vitest.config.ts`. Mock `MedplumClient` via `vi.mocked` / `{ searchResources: vi.fn(), ... }` — existing pattern in `src/quality/__tests__/pdfExport.test.ts`.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Local-first tool; no user auth per PROJECT.md |
| V3 Session Management | no | No sessions; settings.yaml + localStorage only |
| V4 Access Control | no | No user roles |
| V5 Input Validation | **yes** | See threats below — Textarea paste, condition code freeform, criterion serialization |
| V6 Cryptography | no | No secrets stored |
| V7 Error Handling | yes | Fail-closed on migration, query errors → unscoped fallback with Alert |
| V8 Data Protection | yes | localStorage stores patient IDs — document in UI that cohort data stays browser-local |
| V11 Business Logic | yes | Criterion composition (AND) must be enforced; don't allow empty cohorts to be saved |

### Known Threat Patterns for Phase 21 stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malicious Textarea paste (XSS via cohort name/patient IDs) | Tampering | Mantine components escape by default; never `dangerouslySetInnerHTML`; `parsePatientRefs` allows only `[A-Za-z0-9-]` after strip (implicit via split regex) — add explicit `/^[\w.-]+$/` filter |
| Overflow paste (100MB into Textarea) | DoS | 10,000-ID cap in `parsePatientRefs`; cap raw input length at 1MB in the Textarea via `maxLength` prop |
| Malformed criterion in localStorage (external tampering) | Tampering | `resolveCohort` must validate criterion shape before issuing search; invalid criteria → skip with console.warn (mirrors `useTrendsHistory.ts:58-65` corrupt-payload handling) |
| URL injection via condition code (`code=foo&_has=...`) | Injection | Use `URLSearchParams` / Medplum's `searchResources` params object — never concatenate into query string |
| Patient ID leak to wrong server on server URL switch | Info disclosure | Resolved cohort cache is module-scoped; clear on server URL change (hook into existing `useCompletenessReport.ts:44-51` cache-reset-on-server-change pattern) |
| Quota exceeded writing cohort to localStorage | DoS | Mirror `useTrendsHistory.ts:78-93` QuotaExceededError handler — red notification + no crash |
| Unbounded cohort resolution (10M patients) | DoS | 10K patient cap in resolver loop; show warning if cap hit ("Cohort exceeded 10K patients — truncating") |

**Note on PHI:** Cohort resolution queries send patient IDs back to the SAME Blaze server that returned them — no PHI egresses to external services. (Distinct from `ValidationPanel`'s PHI-ack gate which covers external validator POSTs.) No new PHI-ack flow needed for Phase 21.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Blaze accepts FHIR-spec-compliant POST `_search` with `application/x-www-form-urlencoded` body | Pattern 4; Pitfall 2 | If Blaze rejects POST `_search`, large cohorts (>40 IDs) fail. Mitigation: chunk into multiple GETs and merge results client-side. Very low risk — Blaze conforms to FHIR R4 REST spec per its own docs. [ASSUMED — recommend verifying against Blaze's CapabilityStatement before Task 1] |
| A2 | 40-ID GET threshold keeps URLs comfortably under 2KB | Pattern 4; Pitfall 2 | `Patient/` + 36-char UUID = 44 chars per ID; 40 IDs × 44 + overhead ≈ 1900 chars. If server uses longer IDs (> 60 chars), threshold should drop to ~30. Low risk. [ASSUMED — defensive threshold is safe] |
| A3 | `Encounter.period` is the correct field for "patient activity in date range" (vs. Observation.effectiveDateTime) | Criterion Resolution Queries → Date range | If user intent is "any resource with a date in range", date-range becomes cross-resource union — much more complex. Medium risk: this is a product decision masquerading as a technical one. [ASSUMED — flag to discuss-phase for user confirmation] |
| A4 | Jetty/Blaze default URL cap is 8KB | Pitfall 2 | Not documented in Blaze's API docs [ATTEMPTED: https://github.com/samply/blaze/blob/main/docs/api.md — no mention]. If cap is lower (4KB), threshold needs tightening. Low risk — 40-ID threshold is well below 4KB. [ASSUMED] |
| A5 | `_elements=subject` is honored by Blaze on Encounter/Condition queries | Criterion Resolution Queries | If `_elements` is ignored, queries return full resources (wasteful but functional). Very low risk — `_elements` is FHIR R4 core. [ASSUMED] |
| A6 | User's existing `quality.cohort.v1` value is a valid JSON string array | localStorage Migration Recipe | If somehow malformed, the migration copies garbage to the new key; `useLocalStorage` on the new key will fall back to default on first parse. Low risk — the current code only writes string[] to this key. [ASSUMED] |
| A7 | 10,000-patient cohort resolution cap is acceptable for Phase 21 | Pitfall 8; Security V11 | Medical research cohorts can exceed 10K in large MII biobanks. If user hits the cap, they see truncated results. Phase 22 FHIRPath can handle this server-side. Medium risk — worth calling out in the Builder UI. [ASSUMED — flag to discuss-phase] |

**If this table is not empty (it isn't):** discuss-phase should surface A3 and A7 to the user. A1, A2, A4, A5, A6 are low risk and can be treated as provisional during Phase 21 with verification tasks if needed.

## Open Questions

1. **Should "condition-code" support multiple codes in a single criterion (OR)?**
   - What we know: FHIR `code=sys1|code1,sys2|code2` is valid OR-semantics token search [CITED: https://hl7.org/fhir/R4/search.html#token].
   - What's unclear: Phase 21 shows one `TextInput` pair. Adding a repeatable list is a UI complexity bump.
   - Recommendation: **Ship single-code for Phase 21.** Multi-code within a single criterion is a natural Phase 22 extension (or a product decision for this milestone if the user pushes back).

2. **Should we validate reference-list patient IDs exist before save?**
   - What we know: Textarea paste-parse doesn't verify. Spec-compliant FHIR `Patient?_id=id1,id2,...` would verify.
   - What's unclear: UX tradeoff — validation adds a pre-save round-trip and a "2 of 50 IDs not found" warning.
   - Recommendation: **Don't validate at save. DO show a live parsed-count helper** ("50 unique IDs"). Users can manually sanity-check. If Phase 22 user feedback demands it, add the round-trip then.

3. **How should the Active Cohort dropdown handle cohort deletion (Phase 22)?**
   - What we know: Phase 22 adds delete. If activeCohortId → deleted cohort, `findActiveCohort` returns null.
   - What's unclear: Should we auto-deactivate on delete or keep the stale ID?
   - Recommendation: **Phase 21 already handles this correctly** — `findActiveCohort` returns null when not found; the Select defaults to "No cohort." Phase 22 delete handler must also `setStored({ ...s, activeCohortId: null })` if the deleted cohort was active. Document this as a Phase 22 requirement, not a Phase 21 blocker.

4. **Is Medplum's `searchResourcePages` fully implemented by Blaze's paginated Bundle links?**
   - What we know: Blaze returns `bundle.link[rel='next']` per FHIR spec.
   - What's unclear: Corner cases (empty pages, 0-total short-circuit) may differ from Medplum's test suite expectations.
   - Recommendation: Add an integration test with a real Blaze (or a mock that returns multi-page Bundles) for the cohort resolver. Low risk in practice.

## Sources

### Primary (HIGH confidence) — verified this session
- `node_modules/@medplum/core/dist/cjs/index.d.ts:3678, 3834, 3894, 3940, 5222` — MedplumClient `.post`, `.fhirUrl`, `.search`, `.searchResources`, `fhirUrlPath` option [VERIFIED: direct Read]
- `package.json` dependencies — confirms Mantine 8.3.18, Medplum 5.1.7, React 18.3.1, Vitest 4.1.4 installed [VERIFIED: direct Read]
- `npm view @mantine/dates@8.3.18 peerDependencies` → `{ dayjs: '>=1.0.0', react: '^18.x || ^19.x', '@mantine/core': '8.3.18', '@mantine/hooks': '8.3.18' }` [VERIFIED: live registry]
- `npm view @mantine/dates@8 versions` → `8.3.18` is the final 8.x [VERIFIED: live registry]
- `npm view dayjs version` → `1.11.20` [VERIFIED: live registry]
- `src/quality/thresholds.ts:1-75`, `src/hooks/useThresholds.ts:1-112` — the pure/hook split pattern being mirrored [VERIFIED: direct Read]
- `src/hooks/useTrendsHistory.ts:1-103` — corrupt-payload + quota handling patterns [VERIFIED]
- `src/components/quality/QualityOverviewPage.tsx:79-82, 211, 272-298` — exact rename/integration sites [VERIFIED]
- `src/quality/sampling.ts:1-18` — the 7-panel chokepoint [VERIFIED: grep across `src/`]
- `src/components/quality/ThresholdsPage.tsx:1-231` — CohortsPage blueprint [VERIFIED]
- `src/App.tsx:72-81` — quality route registration, site for new `/quality/cohorts` route [VERIFIED]
- `.planning/config.json` — `nyquist_validation: true` [VERIFIED]
- FHIR R4 spec — search token syntax, date prefixes, `_elements`, POST `_search` [CITED: https://hl7.org/fhir/R4/search.html]
- Mantine docs — `@mantine/dates` install + peer deps [CITED: https://mantine.dev/dates/getting-started/]
- Mantine hydration note [CITED: https://help.mantine.dev/q/local-storage-effect]

### Secondary (MEDIUM confidence)
- Blaze FHIR search performance — chained search support inferred from page but no `_has` explicit mention [CITED: https://samply.github.io/blaze/performance/fhir-search.html]
- HTTP URL length practical limits (2-8KB common) [CITED: WebSearch consensus across MS, IIS, Lineserve blog]
- FHIR R4 Condition.subject vs .patient semantics [CITED: https://hl7.org/fhir/R4/search.html reference params]

### Tertiary (LOW confidence)
- Blaze-specific URL length cap — not documented in `samply/blaze/docs/api.md` [ATTEMPTED: WebFetch — not found]. Assumed 8KB Jetty default; defensive 40-ID threshold keeps queries far under this.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all library versions verified via npm registry + installed `node_modules`
- Architecture patterns: HIGH — all patterns cloned verbatim from existing `useThresholds` / `ThresholdsPage` / `useTrendsHistory` code
- Scoping mechanism: HIGH — chokepoint verified via grep across 7 hooks
- URL length / POST fallback: MEDIUM-HIGH — FHIR spec confirms; Blaze-specific cap undocumented (defensive threshold mitigates)
- Criterion semantics: HIGH for FHIR spec correctness; MEDIUM for product-level "is Encounter.period the right field" (flagged as A3)
- Pitfalls: HIGH — pitfalls 1, 3, 4, 5, 6, 7, 8 all have direct codebase precedent; pitfall 2 is spec-grounded
- Security: HIGH — standard web-app defensive controls; no novel threat surfaces

**Research date:** 2026-04-15
**Valid until:** 2026-05-15 (30 days — Mantine/Medplum/Blaze stack is stable; re-check if phase work slips past this)
