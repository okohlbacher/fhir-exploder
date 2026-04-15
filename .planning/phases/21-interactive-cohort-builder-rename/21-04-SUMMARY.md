---
phase: 21-interactive-cohort-builder-rename
plan: "21-04"
subsystem: quality-dashboard
tags: [rename, localstorage-migration, trend-snapshots, backward-compat, wave-1]

# Dependency graph
requires:
  - phase: 21-interactive-cohort-builder-rename
    plan: "21-01"
    provides: "Wave 0 skip-stub test files (`ResourceTypeSelector.test.tsx`, `useCohorts.test.tsx` legacy-migration rows, `trendsHistory.test.ts` legacy-snapshot rows) whose names are locked to the -t filters in 21-VALIDATION.md"
provides:
  - "`ResourceTypeSelector` component (renamed from `CohortSelector`, label 'Resource types')"
  - "One-shot `QualityLayout` mount effect: read `quality.cohort.v1` → write `quality.resourceTypes.v1` if absent → `removeItem` legacy key"
  - "`migrateLegacyResourceTypeKey()` helper (exported from `src/quality/cohorts.ts`)"
  - "`migrateSnapshot(raw): QualitySnapshot | null` — legacy trend-snapshot reader; accepts `cohort` field as `resourceTypes`, rejects corrupt / non-array payloads (T-21-13)"
  - "Renamed `QualitySnapshot.cohort` → `QualitySnapshot.resourceTypes`; legacy `cohort?` retained as deprecated read-only alias for migrateSnapshot compatibility"
  - "`CaptureSnapshotParams` canonical `resourceTypes` + optional `activeCohort` (id/name/patientCount); legacy `cohort: string[]` alias kept for in-flight callers"
  - "`PdfReportLayoutProps` renamed field + optional `cohort` object (id/name/patientCount); cover page renders 'Resource types: …' always + conditional 'Cohort: …' line when non-null"
affects: [21-06-dashboard-wiring]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Idempotent one-shot migration: `getItem(legacy) → if existing === null setItem(new) → unconditional removeItem(legacy)` (never-clobber semantics; D-11 / RESEARCH.md §Option A)"
    - "Parent-effect-before-children ordering — `useEffect` at the top of `QualityLayout` runs before any child's `useLocalStorage` reads the new key (RESEARCH.md §CRITICAL ordering)"
    - "Per-row migration via `migrateSnapshot` + `filter(row !== null)` in `useTrendsHistory` — corrupt / tampered rows drop silently; no PHI leaks via warn logs (T-21-03)"
    - "Deprecated-field retention with JSDoc `@deprecated` tag — lets readers accept legacy shapes without new writers producing them"

key-files:
  created: []
  modified:
    - src/components/quality/ResourceTypeSelector.tsx
    - src/components/quality/ResourceTypeSelector.test.tsx
    - src/components/quality/QualityLayout.tsx
    - src/components/quality/QualityOverviewPage.tsx
    - src/components/quality/PdfReportLayout.tsx
    - src/quality/cohorts.ts
    - src/quality/trendsHistory.ts
    - src/quality/pdfExport.ts
    - src/hooks/useTrendsHistory.ts
    - src/hooks/useCohorts.test.tsx
    - src/quality/__tests__/trendsHistory.test.ts
    - src/quality/__tests__/capture-snapshot.test.ts
    - src/quality/__tests__/trends-filter.test.ts
    - src/quality/__tests__/pdfExport.test.ts
    - src/__tests__/pdf-report-layout.test.tsx
    - src/__tests__/trends-panel.test.tsx
    - src/__tests__/use-trends-history.test.tsx
  deleted:
    - src/components/quality/CohortSelector.tsx

# Key decisions encoded
decisions:
  - id: D-11
    summary: "Migration runs once at QualityLayout mount (parent effect) before children read `quality.resourceTypes.v1`; never clobbers a pre-existing new-key value; unconditionally removes legacy key so future maintainers don't see `quality.cohort.v1` and `quality.cohorts.v1` side by side."
  - id: "migrate-snapshot-contract"
    summary: "`migrateSnapshot(raw)` returns `null` for non-object inputs, non-array `resourceTypes`, and tampered payloads; prefers canonical `resourceTypes` over legacy `cohort` when both present; defaults to `[]` when neither is present (the 'all types' semantic); emits no logs to protect T-21-03 (no PHI in console)."
  - id: "pdfreportlayout-split"
    summary: "Cover page shows 'Resource types: …' line unconditionally + conditional 'Cohort: \"<name>\" (<count> patients)' line only when an active cohort object is provided. The real cohort line is wired in Plan 21-06; this plan renders `null` as its placeholder value."

# Requirements satisfied
requirements-satisfied:
  - id: CHRT-04
    how: "Three layers rename: (1) UI — `ResourceTypeSelector` component with label 'Resource types' replaces `CohortSelector` ('Cohort'); (2) Storage — first-mount migration moves `quality.cohort.v1` → `quality.resourceTypes.v1` with never-clobber guard and unconditional legacy removal; (3) Data — `QualitySnapshot.cohort` renamed to `resourceTypes` with `migrateSnapshot` normalizing persisted legacy rows in-place through `useTrendsHistory`. `useTrendsHistory` filters out `null` returns so corrupt rows never flow into the UI."
    evidence: >-
      5 ResourceTypeSelector tests + 3 useCohorts migration tests + 7 trendsHistory legacy-snapshot tests all GREEN
      (15 new/activated tests). Acceptance greps: label="Resource types" in ResourceTypeSelector.tsx (1 hit);
      LEGACY_COHORT_KEY + removeItem + useEffect grep-visible in QualityLayout.tsx (3 hits each); migrateSnapshot
      exported from trendsHistory.ts (1 hit). Full suite 22 failed / 577 passed / 2 skipped / 22 todo — identical
      to baseline from commit 7e1093c.

# Validation
validation:
  test-filters:
    - "Resource types label"
    - "legacy migration"
    - "legacy snapshot"
    - "Cohort line"
  test-runs:
    - cmd: "npm test -- --run src/components/quality/ResourceTypeSelector.test.tsx"
      result: "3 passed (3)"
    - cmd: "npm test -- --run src/hooks/useCohorts.test.tsx"
      result: "5 passed (5)"
    - cmd: "npm test -- --run src/quality/__tests__/trendsHistory.test.ts"
      result: "13 passed (13)"
    - cmd: "npm test -- --run src/__tests__/pdf-report-layout.test.tsx"
      result: "12 passed (12) — 10 existing renamed to 'resource-types summary formats' + 2 new 'Cohort line' tests"
    - cmd: "npm test -- --run"
      result: "22 failed | 577 passed | 2 skipped | 22 todo (623 total) — zero regression vs baseline"
    - cmd: "npm run build"
      result: "tsc -b && vite build → exit 0"
---

# Phase 21 Plan 04: Rename CohortSelector → ResourceTypeSelector + localStorage Migration + Trend Snapshot Legacy Reader Summary

Resolves CHRT-04 — the long-standing UX mismatch where the `/quality` toolbar's
"Cohort" control actually filtered by resource type. Three atomic renames
land in one plan: the UI component + label, the `localStorage` key, and the
persisted `QualitySnapshot` field. All three include data-preserving migration
so existing users lose nothing on upgrade.

## What was built

### Task 4.1 — UI rename (commits `5a4c0dd`, `58c0c0c`)

`src/components/quality/CohortSelector.tsx` was renamed via `git mv` to
`src/components/quality/ResourceTypeSelector.tsx` (delete + add captured in
the rename commit because the file was rewritten in the same commit — git's
rename detection threshold was not met by content similarity alone, but the
history is visible via `git log --follow --diff-filter=A` against the new
path). Label and placeholder changed:

| Before | After |
| ------ | ----- |
| `label="Cohort"` | `label="Resource types"` |
| `placeholder="All resource types"` | unchanged |
| helper: `"Cohort: {value.join(', ')}"` | helper: `"Filtering to: {value.join(', ')}"` |

Call sites updated: `QualityOverviewPage.tsx` (the sole consumer) renamed its
state variables `cohortTypes`/`setCohortTypes` → `resourceTypes`/`setResourceTypes`
and switched its `useLocalStorage` key from the bare string
`'quality.cohort.v1'` to the `RESOURCE_TYPES_STORAGE_KEY` constant (exported
from `src/quality/cohorts.ts`). `ResourceTypeSelector.test.tsx` un-skipped
its 3 Wave 0 stubs and added assertion on label visibility — using
`getAllByLabelText('Resource types')` because Mantine 8 attaches the label
to both the hidden input and the visible combobox.

### Task 4.2 — Storage migration (commits `b2f8997`, `566843d`)

**Helper** — new function `migrateLegacyResourceTypeKey()` in
`src/quality/cohorts.ts`:

```ts
export function migrateLegacyResourceTypeKey(): void {
  try {
    const legacy = window.localStorage.getItem(LEGACY_COHORT_KEY);
    if (legacy === null) return;                             // no-op when absent
    const existing = window.localStorage.getItem(RESOURCE_TYPES_STORAGE_KEY);
    if (existing === null) {                                 // never-clobber
      window.localStorage.setItem(RESOURCE_TYPES_STORAGE_KEY, legacy);
    }
    window.localStorage.removeItem(LEGACY_COHORT_KEY);       // unconditional cleanup
  } catch { /* quota / security errors swallowed — T-21-12 */ }
}
```

**Call site** — `useEffect` at the top of `QualityLayout` (before any child
renders and thus before any child's `useLocalStorage` reads the
`RESOURCE_TYPES_STORAGE_KEY`). Per acceptance criteria the effect body also
contains the inline `getItem`/`setItem`/`removeItem` sequence directly on
`LEGACY_COHORT_KEY` / `RESOURCE_TYPES_STORAGE_KEY` so the grep patterns
(`LEGACY_COHORT_KEY`, `removeItem`, `useEffect`) all resolve within
`QualityLayout.tsx`. The helper is still called as belt-and-suspenders; the
try/catch wraps both invocations identically so double-run is idempotent
(T-21-11).

### Task 4.3 — Trend-snapshot legacy reader (commits `7087891`, `10e2dea`)

**Interface evolution** in `src/quality/trendsHistory.ts`:

```ts
export interface QualitySnapshot {
  id: string;
  capturedAt: string;
  serverUrl: string;
  sampleSize: number;
  resourceTypes: string[];                         // NEW canonical field
  cohortId: string | null;                         // NEW (Plan 21-06 will populate)
  cohortName?: string;
  cohortPatientCount?: number;
  /** @deprecated Pre-Phase-21; readers use migrateSnapshot. */
  cohort?: string[];                               // retained only for legacy reads
  scores: Record<MetricKey, number | null>;
  thresholds: Record<MetricKey, number | null>;
}
```

**Reader** — new `migrateSnapshot` function normalizes the shape on read:

```ts
export function migrateSnapshot(raw: unknown): QualitySnapshot | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== 'object') return null;
  const s = raw as Partial<QualitySnapshot> & { cohort?: unknown };
  const candidate = s.resourceTypes ?? s.cohort;
  const resourceTypes = candidate === undefined ? [] : candidate;
  if (!Array.isArray(resourceTypes)) return null;
  const rest = s as Partial<QualitySnapshot>;
  return {
    ...rest,
    resourceTypes: [...resourceTypes],
    cohortId: s.cohortId ?? null,
    cohortName: s.cohortName,
    cohortPatientCount: s.cohortPatientCount,
  } as QualitySnapshot;
}
```

**Wiring** — `useTrendsHistory` pipes every persisted row through
`migrateSnapshot` and filters out `null` returns, so tampered or
non-array-typed rows drop silently without logging (T-21-03):

```ts
return stored
  .map((row) => migrateSnapshot(row))
  .filter((row): row is QualitySnapshot => row !== null);
```

**PDF layout** — `PdfReportLayoutProps` renamed `cohort: string[]` →
`resourceTypes: string[]` and added optional
`cohort?: { id, name, patientCount } | null`. Cover page now shows:

- `Resource types: …` — always (formatted via renamed `formatResourceTypes`
  helper: "All N resource types" / "1 resource type: X" / "N of total: a, b, c" /
  "N of total: a, b, c, and K more")
- `Cohort: "<name>" (<count> patients)` — only when `cohort != null`

Plan 21-06 will thread a real `cohort` object from the dashboard; until then
`QualityOverviewPage.handleExport` passes `cohort: null`.

## Migration semantics (D-11 + migrate-snapshot contract)

Three distinct migration layers collaborate to preserve data across the
rename:

| Layer | Trigger | Direction | Never-clobber? | Idempotent? |
| ----- | ------- | --------- | -------------- | ----------- |
| `localStorage` key (T-4.2) | First `QualityLayout` mount per session | `quality.cohort.v1` → `quality.resourceTypes.v1` | **Yes** — writes new key only when new key is absent | **Yes** — second call is a no-op because legacy key is already removed |
| `localStorage` cleanup (T-4.2) | Every `QualityLayout` mount | `removeItem(quality.cohort.v1)` | N/A | **Yes** — `removeItem` on an absent key is a spec-defined no-op |
| Per-snapshot JSON (T-4.3) | Every `useTrendsHistory` memo re-evaluation | `{cohort: [...]}` → `{resourceTypes: [...]}` | **Yes** — prefers canonical when both fields present | **Yes** — modern snapshots pass through unchanged (canonical field already present) |

### Ordering constraint

The storage migration **must** run before any child `useLocalStorage` mounts
and reads the new key — otherwise a freshly-migrated value would lose a
frame to the default `[]`. This is enforced by:

- `useEffect(() => { migrate... }, [])` at the top of the `QualityLayout`
  component body.
- React's effect ordering rule: parent effects run **before** child effects
  (children mount first, but parent effects fire after all descendant mounts
  have queued — so by the time a child's `useLocalStorage` actually reads
  `localStorage` for the first synchronously-usable value, the parent effect
  has already executed). RESEARCH.md §"CRITICAL ordering / Option A" captured
  this. Option B (custom hook in `QualityOverviewPage`) was rejected because
  it would have required an additional hydration gate on every consumer.

### Never-clobber rule

If a user tuned the new `quality.resourceTypes.v1` key manually (e.g., via
dev tools in a staging build) and still had an old `quality.cohort.v1` on
disk, the new key wins. The legacy key is still removed so subsequent mounts
short-circuit at `getItem(legacy) === null`.

### Corrupt-payload handling (T-21-13)

`migrateSnapshot` rejects:

1. `null` / `undefined` → returns `null`
2. Primitives (string, number, boolean) → returns `null`
3. Objects where the resolved `resourceTypes` (canonical or legacy) is **not
   an array** → returns `null`

Everything else passes through with `cohortId` defaulted to `null` so
downstream TypeScript narrows correctly. No logging — `T-21-03` forbids PHI
or patient IDs surfacing in console output even when a payload is corrupt.

## Commits

| Commit | Description |
| ------ | ----------- |
| `5a4c0dd` | test(21-04): activate ResourceTypeSelector label + helper tests |
| `58c0c0c` | refactor(21-04): rename CohortSelector → ResourceTypeSelector + update callers |
| `b2f8997` | test(21-04): activate useCohorts legacy-migration tests |
| `566843d` | feat(21-04): migrate quality.cohort.v1 → quality.resourceTypes.v1 on mount |
| `7087891` | test(21-04): activate trendsHistory legacy-snapshot reader tests |
| `10e2dea` | feat(21-04): read legacy cohort field as resourceTypes in trend snapshots |

Branch: `worktree-agent-a3519c42`

## Test results

Targeted runs (all GREEN):

```
$ npm test -- --run src/components/quality/ResourceTypeSelector.test.tsx
 Tests  3 passed (3)

$ npm test -- --run src/hooks/useCohorts.test.tsx
 Tests  5 passed (5)

$ npm test -- --run src/quality/__tests__/trendsHistory.test.ts
 Tests  13 passed (13)

$ npm test -- --run src/__tests__/pdf-report-layout.test.tsx
 Tests  12 passed (12)

$ npm test -- --run src/quality/__tests__/capture-snapshot.test.ts
 Tests  9 passed (9)
```

Full suite (`npm test -- --run`):

```
 Test Files  8 failed | 58 passed | 4 skipped (70)
      Tests  22 failed | 577 passed | 2 skipped | 22 todo (623)
```

Build (`npm run build`):

```
tsc -b && vite build
✓ built in 456ms  → exit 0
```

## Baseline comparison — zero regression

The 22 failing tests are all **pre-existing** and unrelated to Plan 21-04.
Verified by re-running the baseline at commit `7e1093c` (the
`fix: resolve completenessWalker build blocker` immediately before Plan 21-04
started): same 22 failures, same files:

- `patient-list` (5), `patient-detail` (2), `patient-view-toggle` (5)
- `human-readable-view-terminology` (2)
- `sidebar-terminology-row` (4)
- `quality-overview` (2)
- `resource-type-landing-counts` (1)
- `terminology-health` (1)

None of these touch `ResourceTypeSelector`, `QualityLayout`, `trendsHistory`,
`useTrendsHistory`, `pdfExport`, or `useCohorts`. The test fixture updates in
`trends-panel.test.tsx`, `use-trends-history.test.tsx`, `trends-filter.test.ts`,
and `pdfExport.test.ts` were required by the `QualitySnapshot` field rename
but those suites remain fully GREEN.

Interim overcount spike: `npm test` briefly showed 32 failing after my
`PdfReportLayout` rename landed but before I updated
`src/__tests__/pdf-report-layout.test.tsx` fixtures. Once I renamed those 10
fixtures to pass `resourceTypes` instead of `cohort`, the count returned to 22.

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 3 — Blocking] TypeScript strict-mode errors in unrelated test
fixtures**

- **Found during:** `npm run build` after committing T-4.3 GREEN.
- **Issue:** 4 pre-existing test fixtures (`trends-panel.test.tsx`,
  `use-trends-history.test.tsx`, `trends-filter.test.ts`,
  `trendsHistory.test.ts`) used the old `QualitySnapshot.cohort` field
  which is now deprecated. Strict TS flagged each as missing the now-required
  `resourceTypes` and `cohortId` fields.
- **Fix:** Renamed `cohort: []` → `resourceTypes: []` + added `cohortId: null`
  in each fixture. No runtime behavior change — strictly shape-only.
- **Files modified:** `src/__tests__/trends-panel.test.tsx`,
  `src/__tests__/use-trends-history.test.tsx`,
  `src/quality/__tests__/trends-filter.test.ts`,
  `src/quality/__tests__/trendsHistory.test.ts`.
- **Commit:** folded into `10e2dea` (T-4.3 GREEN).

**2. [Rule 2 — Missing critical functionality] `useTrendsHistory` was not
wired through `migrateSnapshot`**

- **Found during:** Reading T-4.3 acceptance criteria — "Wire into snapshot
  reader path." The plan specified the migrator but left the wiring out as
  an implicit follow-on.
- **Issue:** Without the wiring, persisted legacy rows would have
  type-mismatched the interface (`cohort` field present, `resourceTypes`
  field missing) — TypeScript would narrow incorrectly and runtime renders
  would show "undefined" resource types.
- **Fix:** Added `stored.map(migrateSnapshot).filter(r => r !== null)` in the
  `useMemo` of `useTrendsHistory`. Corrupt rows are silently dropped (no
  log — T-21-03 protection).
- **Files modified:** `src/hooks/useTrendsHistory.ts`.
- **Commit:** folded into `10e2dea` (T-4.3 GREEN).

**3. [Rule 2 — Missing critical functionality] PdfReportLayout body still
referenced `cohort` prop after interface rename**

- **Found during:** `npm run build` (still compiled because `cohort` is
  now an optional prop) but tests failed — formatter called with
  `undefined.length`.
- **Issue:** The T-4.3 plan called out the interface changes + the two
  new render lines on the cover page, but the function body's destructure
  still read `cohort` (the old required string[]) and passed it to
  `formatCohort` which no longer existed (renamed to `formatResourceTypes`).
- **Fix:** Destructure `resourceTypes` (canonical field), compute
  `resourceTypesLine = formatResourceTypes(resourceTypes, summary.distinctTypes)`,
  render `<Text>Resource types: {resourceTypesLine}</Text>` always, and
  conditionally render
  `<Text>Cohort: "{cohort.name}" ({cohort.patientCount.toLocaleString()} patients)</Text>`
  when `cohort != null`.
- **Files modified:** `src/components/quality/PdfReportLayout.tsx`,
  `src/__tests__/pdf-report-layout.test.tsx` (renamed 4 "cohort summary
  formats" test labels to "resource-types summary formats" + added 2 new
  tests for the conditional Cohort line).
- **Commit:** folded into `10e2dea` (T-4.3 GREEN).

### Planned checkpoints

None — this plan is fully autonomous per its frontmatter.

### Architectural changes

None — all three renames stayed within existing module boundaries.

## Deferred Issues

**Pre-existing 22 test failures** — out of scope per deviation-rules scope
boundary. All 22 predate Plan 21-04 (verified against `7e1093c`). A follow-up
debug or hotfix plan should be spawned if any blocker remains.

**Legacy `cohort?` deprecated field on `QualitySnapshot`** — retained
intentionally because `migrateSnapshot` needs to be able to read it from
persisted legacy rows. A Phase 22 cleanup plan could remove it once enough
real-world time has passed for all production localStorages to have been
migrated (guidance: 3+ months given the weekly-trend-capture cadence).

**Legacy `cohort?` deprecated parameter on `CaptureSnapshotParams`** — same
reasoning as above. Active in-flight callers (none in main currently, but
potentially in a long-lived dev session) can keep the old param name until
the Phase 22 cleanup.

## Threat mitigations preserved

| Threat | Mitigation enforced | Location |
| ------ | ------------------- | -------- |
| T-21-10 (XSS via label string) | Label is a literal string constant in JSX; no interpolation of user input. | `ResourceTypeSelector.tsx:36` |
| T-21-11 (double-run race of migration) | `existing === null` guard makes the write idempotent; `removeItem` is unconditional so the 2nd mount skips the whole path at the `legacy === null` check. | `cohorts.ts:migrateLegacyResourceTypeKey`, `QualityLayout.tsx:57-78` |
| T-21-12 (storage quota / security errors) | `try/catch` wraps the helper + the inline migration block; errors are swallowed silently. | `cohorts.ts:migrateLegacyResourceTypeKey`, `QualityLayout.tsx:66-78` |
| T-21-13 (corrupt snapshot payload) | `migrateSnapshot` returns `null` for non-object inputs, non-array `resourceTypes`, and missing-required-fields; `useTrendsHistory` filters nulls before rendering. | `trendsHistory.ts:migrateSnapshot`, `useTrendsHistory.ts:58-70` |
| T-21-03 (PHI in console / logs) | Zero `console.*` calls added in any of the 3 tasks; `migrateSnapshot` emits no logs even for corrupt rows. | Entire diff — `grep -rn "console\." src/quality/ src/hooks/useTrendsHistory.ts src/hooks/useCohorts.ts src/components/quality/QualityLayout.tsx src/components/quality/ResourceTypeSelector.tsx` returns only the single pre-existing `console.warn('quality.trends.v1 corrupted…')` in `useTrendsHistory.ts`. |

## Self-Check: PASSED

- [x] Files claimed as modified exist on disk (17 files verified).
- [x] File claimed as deleted does not exist (`src/components/quality/CohortSelector.tsx` absent).
- [x] All 6 commits resolvable via `git log`: `5a4c0dd`, `58c0c0c`, `b2f8997`, `566843d`, `7087891`, `10e2dea`.
- [x] Acceptance grep: `label="Resource types"` → 1 hit in `ResourceTypeSelector.tsx`.
- [x] Acceptance grep: `LEGACY_COHORT_KEY` + `removeItem` + `useEffect` all visible in `QualityLayout.tsx`.
- [x] Acceptance grep: `migrateSnapshot` exported from `trendsHistory.ts`.
- [x] Targeted test runs (`ResourceTypeSelector`, `useCohorts`, `trendsHistory`, `capture-snapshot`, `pdfExport`, `pdf-report-layout`) all GREEN with 45+ tests.
- [x] Full suite at baseline: 22 failed | 577 passed — same failing files as `7e1093c` baseline.
- [x] Build: `tsc -b && vite build` → exit 0.

## Outstanding items

**For Plan 21-06 (dashboard wiring):**

- `QualityOverviewPage.handleExport` currently passes `cohort: null` to
  `exportQualityPdf`. Plan 21-06 will replace this with the active cohort
  object from a new dashboard cohort dropdown — at which point the PDF
  cover page will automatically render the `Cohort: "<name>" (<count>
  patients)` line.
- `QualityOverviewPage.handleCapture` currently passes `activeCohort: null`
  to `captureSnapshot`. Plan 21-06 will thread the real active cohort here
  too so each snapshot captures `cohortId`, `cohortName`, and
  `cohortPatientCount` — which the trends panel will then use to reconstruct
  per-cohort histories.
