# Requirements: FHIR Exploder v1.4 — Hardening & Tech-Debt Sweep

**Defined:** 2026-04-16
**Status:** Active (v1.3 shipped 2026-04-16; v1.4 now the current milestone)
**Core Value:** Close v1.3 cleanly (warnings + UAT) and fix the architectural drift flagged by the cross-AI code review (2026-04-16) before it compounds in v1.4+ feature work. End state: a hardened, deduplicated codebase with two small backlog UX improvements landed.

## Background

Three inputs drive this milestone:

1. **`.planning/CODE-REVIEW-2026-04-16.md`** — cross-AI review (Claude + Codex + partial Gemini) surfacing 15 findings (R1-R15) across inconsistencies, duplication, efficiency, and style. Consensus HIGH-severity items: duplicated hooks (R1), no cross-mount count cache (R2), 5 near-identical drill-down shells (R3), eager sampling under `keepMounted` (R4), duplicated sample fetch (R5).
2. **v1.3 tech-debt carry-forward** (`.planning/milestones/v1.3-MILESTONE-AUDIT.md`) — 3 code review warnings (W1-W3), 2 cosmetic integration notes (I1-I2), 8 human UAT items (U1-U8), 1 audit flip (N1).
3. **`.planning/todos/pending/`** — 2 UX backlog items: external FHIR `$validate` integration (T1), OverviewStrip tile reduction 9→7 (T2).

The research phase (SUMMARY.md at `research/SUMMARY.md`) locked three safety invariants for the refactor: closure-scoped `let cancelled` in `useAsyncRun` (NOT `cancelledRef`), 2-entry LRU eviction on `Map<serverUrl, QualityMetricsCache>`, and routing T1's external validator through the existing Phase 7 PHI acknowledgment gate. R14 (`QualityMetricsContext` re-render split) is deferred to v1.5 on risk/reward grounds; the alternative if attempted is per-metric context split (Option A), NOT `useSyncExternalStore`.

## v1.4 Requirements

### Phase 23 — v1.3 Close-Out

- [ ] **CLOSE-01**: Export on a non-current cohort row in `CohortsPage` serializes the correct cohort (W1 closure-capture warning resolved; failing test written first to verify whether `SavedCohortRow` extraction already isolates the closure).
- [ ] **CLOSE-02**: `activateCohort` in `useCohorts` probes localStorage quota before persist and surfaces the error consistently with `addCohort` — localStorage and React state stay in sync (W2 silent data-loss on quota exhaustion).
- [ ] **CLOSE-03**: `parsePatientRefs` returns `{ refs, truncated, originalCount }` so `PATIENT_REF_CAP` truncation is reported based on input-vs-cap, not post-dedupe length (W3 false-positive fixed with 5-case test matrix).
- [ ] **CLOSE-04**: `FhirpathLike` alias removed from `fdpgCodec.ts` (I1 cosmetic redundancy).
- [ ] **CLOSE-05**: `EditCohortModal` "Cohort updated" toast captures the cohort name at toast time, not save time (I2 stale-text on rename).
- [ ] **CLOSE-06**: 8 human UAT items (U1-U8 from v1.3 audit) executed against a live Blaze server, results recorded in `21-UAT.md` / `22-HUMAN-UAT.md`; ANY blockers escalated as follow-up warnings.
- [ ] **CLOSE-07**: `nyquist_compliant: true` flipped in both Phase 21 and Phase 22 VALIDATION.md once CLOSE-06 UAT is green (N1 audit sign-off).

### Phase 24 — Data-Fetching Foundation

- [ ] **FOUND-01**: `useResourceCounts` reads through a module-scoped `Map<serverUrl+type, count>` cache so the dashboard, explorer, and quality pages do not re-run per-type count sweeps on mount. Also absorbs the line-75 `resourceTypes.join(',')` `useMemo` fix (from Phase 27 scope).
- [ ] **FOUND-02**: `metricsCache.ts` exposes a `Map<serverUrl, QualityMetricsCache>` registry with **2-entry LRU eviction** on insert, replacing the rotating `cacheInstance` in `useCompletenessReport` and `useCodingCoverage`. Current-server cache is cleared when `settings.yaml` changes (even if `serverUrl` is unchanged).
- [ ] **FOUND-03**: `useAsyncRun` hook owns `{status, progress, errorMessage, cancel, run}` orchestration — uses **closure-scoped `let cancelled`**, NOT `cancelledRef` — and the 4 report hooks (`usePlausibilityReport`, `useLabRangesReport`, `useDuplicateReport`, `useReferenceReport`) each refactor to use it while retaining their own typed `useState` for metric-specific payload. No new `as` casts in consumer panels.
- [ ] **FOUND-04**: `useResourceCounts.ts:29` `cancelledRef` latent bug converted to the `let cancelled` pattern (pre-fix while the file is already being touched for FOUND-01).

### Phase 25 — Quality Module Dedup

- [ ] **QDDEP-01**: `PerTypeCoverageReport` carries `perPathExamples: Record<string, CodeableConcept>` populated inside `codingCoverageWalker`; `useExamplesByPath` hook deleted. Coding drill-down server calls halved. (Must land before QDDEP-02.)
- [ ] **QDDEP-02**: `<DrillDownShell>` component (`{ status, progress, issues, errorMessage, title, backHref }`, props interface ≤ 6 fields) collapses the 5 drill-down shells (`PlausibilityDrillDown`, `LabRangesDrillDown`, `DuplicatesDrillDown`, `ReferencesDrillDown`, `CompletenessDrillDown`, partial `CodingDrillDown`). ≥ 400 duplicated lines removed.
- [ ] **QDDEP-03**: `useSampleWalker<T>` replaces the worker-pool + seeding loop + rollup effect duplicated between `useCompletenessReport` and `useCodingCoverage`. Per-metric rollup stays in the wrapper hooks.
- [ ] **QDDEP-04**: `keepMounted` dropped on Completeness + Coding tabs (or the hooks are gated on `isActive`) so opening `/quality?tab=counts` no longer fires background sampling.
- [ ] **QDDEP-05**: `SortableTh` extracted to `src/components/quality/SortableTh.tsx` — the two identical definitions in `CompletenessPanel` and `CodingCoveragePanel` both import from here.
- [ ] **QDDEP-06**: `<RunProgress run={run} label="..." />` component replaces the 9 inlined `pct = total > 0 ? Math.round(...) : 0` sites.

### Phase 26 — App-Shell Dedup

- [ ] **SHELL-01**: `<ConnectionGatedOutlet>` (render-prop shape — shares only the "Not connected" alert, NOT the `MedplumProvider` wrapping) replaces the triplication in `ExplorerLayout`, `PatientsLayout`, `QualityLayout`. Existing `quality-layout.test.tsx` legacy-migration test passes unchanged.
- [ ] **SHELL-02**: `searchByIdentifierPrefix(client, type, prefix, { limit, pageSize })` helper replaces the wildcard identifier-search copy in `SearchResultsPage.tsx` and `PatientListPage.tsx`.
- [ ] **SHELL-03**: Sidebar uses `RouterNavLink`'s native `isActive` so `/patients/123`, `/explorer/Patient/1`, `/quality/plausibility/Observation` highlight their section root.
- [ ] **SHELL-04**: Internal links across `CompletenessPanel`, `SearchResultsPage`, `PatientListPage`, `ResourceCountsPanel`, `CodingCoveragePanel` all use `Anchor component={Link}` with Mantine theme colors — no inline `style={{ color: 'var(--mantine-color-blue-6)' }}`.
- [ ] **SHELL-05**: `setSettings` in `SettingsContext` wrapped in `useCallback`; the `eslint-disable-next-line react-hooks/exhaustive-deps` at `SettingsContext.tsx:32` is removed.

### Phase 27 — Efficiency Polish

- [ ] **EFF-01**: `ResourceIssueTable.tsx:92-94` — `filtered.slice(...)` moved into the pagination `useMemo`.
- [ ] **EFF-02**: App routes to `/quality/completeness/:type`, `/quality/coding/:type`, `/quality/plausibility/:type`, `/quality/lab-ranges/:type`, `/quality/duplicates/:type`, `/quality/references/:type`, and `/quality/thresholds` load via `React.lazy()` with a global Suspense fallback (`data-testid="route-loading"`) and chunk-load retry (`retry(() => import(...), 3)`). All `render(<App />)` tests audited and converted `getBy*` → `findBy*` where they assert lazy-loaded content.
- [ ] **EFF-03**: `rollup-plugin-visualizer@^7.0.1` added as devDependency; `npm run analyze` script emits a `bundle-stats.html` treemap behind an `ANALYZE=1` env gate confirming the lazy drill-down chunks are separated.

### Phase 28 — Micro-Consistency Sweep

- [ ] **SWEEP-01**: Repo-wide grep `as unknown as Record<string, unknown>` returns 0 results — all 13+ sites refactored to use the existing `toRecord` helper from `src/utils/fhir-helpers.ts`.
- [ ] **SWEEP-02**: En-dash vs em-dash unified across `PlausibilityDrillDown.tsx:68`, `ResourceIssueTable.tsx:158`, and any siblings — single convention (`—` for separators, `–` for numeric ranges).
- [ ] **SWEEP-03**: The 4 `eslint-disable-next-line react-hooks/exhaustive-deps` on drill-down auto-start effects (`PlausibilityDrillDown.tsx:52`, `LabRangesDrillDown.tsx:50`, `DuplicatesDrillDown.tsx:49`, `ReferencesDrillDown.tsx:49`) are removed because the `useAsyncRun` refactor (FOUND-03) has absorbed the concern.
- [ ] **SWEEP-04**: `useRef<HTMLAnchorElement | null>` fixed to `useRef<HTMLButtonElement | null>` (or `HTMLElement`) in `CompletenessDrillDown.tsx:44` and `CodingDrillDown.tsx:101`; `QualityLayout` legacy-migration essay moved into `migrateLegacyResourceTypeKey` body; `useState(() => …)` replaces the inline `eslint-disable-line` for `initialFromUrl` snapshot in `PatientListPage.tsx:70`.

### Phase 29 — Backlog UX

- [ ] **UX-01**: `settings.yaml` accepts a `validation.externalValidator: { url, enabled, timeoutMs }` block. `ValidationPanel` surfaces an "Active strategy: external / server / local" status line per resource and cascades external → server `$validate` → local checker, routing every `fetch` to the external URL through the **existing Phase 7 PHI acknowledgment gate** (regression-tested). Each external call is wrapped in `AbortController` with a configurable timeout (default 15s) and falls back to local on timeout. `OperationOutcome` issues are normalized via a unit-tested `normalizeOperationOutcomeIssue` mapper into the existing `NormalizedIssue` type.
- [ ] **UX-02**: `OverviewStrip` drops the Total resources + Resource types tiles (9 → 7 rings). A new status line above reads `N resources · M types · Last computed {relative-time}`. `18-UI-SPEC.md` updated. PDF export reflects the new tile layout. Cardinality entries remain non-clickable (deliberate UI-SPEC decision preserved).

## Future Requirements (v1.5+)

- [ ] **EFF-R14** (deferred from Phase 27): Split `QualityMetricsContext` so any single metric update re-renders only its own tile. Recommended approach: per-metric context providers (Option A), NOT `useSyncExternalStore`. Deferred because actual user-visible re-render cost is low (≤8 panels) while refactor blast radius touches ~20 files.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Mantine 9 / React 19 migration | Strict peer-dep compatibility ceiling — not addressing in a hardening milestone |
| Local full-featured FHIR validator | T1 (UX-01) is configure + cascade + surface status only; a full local validator duplicates HAPI/IG Publisher work and is explicitly non-goal per the pending-todo note |
| FHIR Validator Wrapper `/validate` path shape | HAPI/IG/Aidbox share the `{Type}/$validate?profile=...` shape that existing `remoteValidator.ts` handles; Wrapper support deferred to v1.5 if a user requests it |
| Bundle/$validate batch mode | Per-resource `$validate` is the table-stakes scope; bulk validation deferred |
| R5/R6 FHIR version support | R4-only per project constraint |
| SMART on FHIR OAuth flows | Project scope explicitly excludes; local-only tool |
| Server-side bulk export (`$export`) | Out of scope — FHIR Exploder is a browser, not an ETL tool |
| Patient-chart narrative views | Not a v1.4 theme |
| Federated cohort queries (server-side CQL) | Deferred past v1.3; not re-opened in v1.4 |
| Cohort versioning / audit history | Deferred past v1.3; not re-opened in v1.4 |
| New FHIR resource-type deep-dives (Practitioner, Medication, etc.) | v1.4 is a hardening milestone — no new resource features |
| Context-split via `useSyncExternalStore` | Rejected in research (PITFALLS Pitfall 7 + ARCHITECTURE Q4): incompatible with the app's existing `createContext` idiom, and `getSnapshot` footgun risks infinite render loops. If R14 is ever attempted, per-metric context split only |

## Research References

- `.planning/research/SUMMARY.md` — synthesis of STACK / FEATURES / ARCHITECTURE / PITFALLS
- `.planning/research/STACK.md` — no new runtime deps; 1 devDep (rollup-plugin-visualizer)
- `.planning/research/ARCHITECTURE.md` — 6 integration questions answered with file:line references
- `.planning/research/FEATURES.md` — T1/T2 feature landscape with table-stakes / differentiators / anti-features
- `.planning/research/PITFALLS.md` — 11 critical pitfalls with Warning Signs / Prevention Strategy / Phase mapping

## Traceability

Populated by `gsd-roadmapper` (2026-04-16). All 34 v1.4 requirements mapped to exactly one phase.

| REQ-ID | Phase | Status | Notes |
|--------|-------|--------|-------|
| CLOSE-01 | Phase 23 | Pending | W1 handleExport closure-capture |
| CLOSE-02 | Phase 23 | Pending | W2 activateCohort quota probe |
| CLOSE-03 | Phase 23 | Pending | W3 PATIENT_REF_CAP truncation (5-case test matrix) |
| CLOSE-04 | Phase 23 | Pending | I1 FhirpathLike alias removal |
| CLOSE-05 | Phase 23 | Pending | I2 EditCohortModal stale toast |
| CLOSE-06 | Phase 23 | Pending | U1-U8 human UAT against live Blaze |
| CLOSE-07 | Phase 23 | Pending | N1 nyquist audit sign-off (Phase 21 + 22) |
| FOUND-01 | Phase 24 | Pending | useResourceCounts Map cache + line-75 memo |
| FOUND-02 | Phase 24 | Pending | metricsCache.ts Map<serverUrl> registry, 2-entry LRU |
| FOUND-03 | Phase 24 | Pending | useAsyncRun (closure-scoped `let cancelled`) |
| FOUND-04 | Phase 24 | Pending | useResourceCounts.ts:29 cancellation pre-fix |
| QDDEP-01 | Phase 25 | Pending | perPathExamples in PerTypeCoverageReport (FIRST in phase) |
| QDDEP-02 | Phase 25 | Pending | `<DrillDownShell>` — 5 drill-downs collapse (SECOND) |
| QDDEP-03 | Phase 25 | Pending | useSampleWalker<T> replaces duplicated worker pool |
| QDDEP-04 | Phase 25 | Pending | Drop keepMounted on Completeness + Coding |
| QDDEP-05 | Phase 25 | Pending | SortableTh extracted |
| QDDEP-06 | Phase 25 | Pending | `<RunProgress>` replaces inline pct math |
| SHELL-01 | Phase 26 | Pending | `<ConnectionGatedOutlet>` for 3 layouts |
| SHELL-02 | Phase 26 | Pending | searchByIdentifierPrefix helper |
| SHELL-03 | Phase 26 | Pending | Sidebar nested-route activation (RouterNavLink isActive) |
| SHELL-04 | Phase 26 | Pending | `Anchor component={Link}` standardization |
| SHELL-05 | Phase 26 | Pending | setSettings useCallback (drop eslint-disable) |
| EFF-01 | Phase 27 | Pending | ResourceIssueTable pagination memo |
| EFF-02 | Phase 27 | Pending | React.lazy() drill-down routes + chunk-load retry |
| EFF-03 | Phase 27 | Pending | rollup-plugin-visualizer + ANALYZE=1 treemap |
| SWEEP-01 | Phase 28 | Pending | toRecord helper sweep (0 `as unknown as Record`) |
| SWEEP-02 | Phase 28 | Pending | En/em-dash unification |
| SWEEP-03 | Phase 28 | Pending | Drop 4 drill-down eslint-disables |
| SWEEP-04 | Phase 28 | Pending | Ref-type fixes + micro-cleanup |
| UX-01 | Phase 29 | Pending | External validator (SECOND in phase — L-task) |
| UX-02 | Phase 29 | Pending | OverviewStrip 9→7 + status line (FIRST — warm-up) |

**Coverage:** 31/31 v1.4 requirements mapped (CLOSE 7 + FOUND 4 + QDDEP 6 + SHELL 5 + EFF 3 + SWEEP 4 + UX 2). EFF-R14 is explicitly deferred to v1.5+ (Future Requirements section above) and NOT counted in v1.4 coverage. No orphans. No duplicates.
