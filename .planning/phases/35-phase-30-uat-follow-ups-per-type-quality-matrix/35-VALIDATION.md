---
phase: 35
slug: phase-30-uat-follow-ups-per-type-quality-matrix
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-25
---

# Phase 35 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.4 + @testing-library/react 16 + jsdom (existing) |
| **Config file** | `vitest.config.ts` (existing) |
| **Quick run command** | `npx vitest run src/components/explorer/__tests__ src/components/quality/__tests__` |
| **Full suite command** | `npx vitest run && npx tsc -b --noEmit` |
| **Estimated runtime** | ~10 s (quick) / ~30 s (full — 998+ tests + tsc) |

---

## Sampling Rate

- **After every task commit:** Run quick command (targeted files for that plan)
- **After every plan wave:** Run full suite command
- **Before `/gsd-verify-work`:** Full suite green, `tsc -b --noEmit` exit 0
- **Max feedback latency:** 30 s

---

## Per-Task Verification Map

(Filled after `gsd-planner` produces task IDs.)

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | … | … | UAT-FU-01..05 | — | N/A (read-projection + UI cleanup) | unit + snapshot + integration | per-plan `<acceptance_criteria>` | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/components/explorer/__tests__/SearchResultsPage.dateStatus.test.tsx` — RED tests for 6 resource types' Date/Status extraction (UAT-FU-01 — Plan 35-02)
- [ ] `src/components/explorer/__tests__/HumanReadableView.extensions.test.tsx` — Tooltip render + Modal open/close + bottom-Extensions section (UAT-FU-02 — Plan 35-03)
- [ ] `src/components/explorer/__tests__/ResourceDetailPage.modes.test.tsx` — Tabs.Tab count === 2 + Developer→JSON rename + ClinicalRawView grep === 0 (UAT-FU-03 — Plan 35-01)
- [ ] `src/components/quality/__tests__/PerTypeMatrix.test.tsx` — byType setter contract + row-count-matches-types + threshold breach + chevron click + default sort (UAT-FU-05 — Plan 35-04)
- [ ] `src/quality/metrics/__tests__/byType.test.tsx` — per-metric `setByType` setter contract for all 7 (one shared parameterized test ok)

---

## Validation Dimensions (Nyquist)

### 1. Input Validation
- `SearchResultsPage` per-type extractor handles missing fields (e.g., `Patient.birthDate === undefined`) → renders `''` not `'undefined'`
- `Encounter.period.start` access guards against `period === undefined` (FHIR optional element)
- `Condition.clinicalStatus.coding[0].code` access guards against missing coding (defensive optional chaining)
- `MedicationStatement.effectiveDateTime` access uses FLAT shape (not nested `.effective.dateTime`) per FHIR R4 + Medplum types

### 2. Output Validation
- SegmentedControl/Tabs render exactly the post-cleanup count (UAT-FU-03 → 2 Tabs.Tab elements per RESEARCH.md correction)
- `ClinicalRawView` deletion is total — `grep -rn "ClinicalRawView" src/` returns 0 hits (production + tests)
- HumanReadableView identifier-system URL renders inside `<Tooltip>`, not in main row text
- HumanReadableView address-extension: NO inline JSON; `[View]` button presence asserted
- Bottom Extensions section: one row per unique URL, render verified via `getAllByRole('row')` count
- PerTypeMatrix: 7 columns rendered (no 6, no 8); column headers match D-17 list verbatim
- Empty cells render em-dash for sparse byType data (RESEARCH.md Pitfall P-05) — NOT 0% which would mislead

### 3. State Management
- Per-metric `byType` setter triggers consumer re-render in matrix card only (Phase 32 isolation invariant preserved)
- DuplicatesContext `byType` derives from existing `breakdown.hashByType` (no new state, no migration)
- ValidationPanel + ReferencesPanel sparse-population: matrix shows em-dash on first mount (no breach color until cell populated)
- chevron click navigation: `useNavigate('/quality?tab=<metric>&type=<resourceType>')` correctly parses on target panel mount

### 4. Error Handling
- Missing FHIR field → empty string in extractor, never `undefined`/`null` in DOM
- Missing per-metric `byType` data → matrix renders em-dash, never `NaN%` or `0%` (false signal)
- `useThresholds().isBreached(...)` curried hook returns `false` if thresholds not hydrated yet (existing behavior preserved per WR-04)

### 5. Integration Points
- `src/components/explorer/SearchResultsPage.tsx` — gains per-type extractor map (UAT-FU-01)
- `src/components/explorer/HumanReadableView.tsx` + `ResourcePropertyTable.tsx` — Tooltip + Modal patterns (UAT-FU-02)
- `src/components/explorer/ResourceDetailPage.tsx` — `<Tabs>` 3→2 (NOT SegmentedControl 4→3 per RESEARCH.md correction)
- `src/components/explorer/ClinicalRawView.tsx` — DELETE (UAT-FU-03)
- `src/components/quality/ResourceCountsPanel.tsx` — sibling matrix card mounts below (UAT-FU-05)
- `src/quality/metrics/{Completeness,Coverage,Validation,References,Plausibility,LabRanges,Duplicates}Context.tsx` — extend with `byType` slot + `setByType` (or derive for Duplicates) (UAT-FU-05 prep)
- `src/hooks/useCompletenessReport.ts` + `useCodingCoverage.ts` + `ValidationPanel.tsx` + `ReferencesPanel.tsx` — producer migration to call `setByType` (UAT-FU-05 prep)
- NEW: `validationIssuesByType: Record<string, number>` slot in ValidationContext for D-17 Issues column (RESEARCH.md Q-01 resolution)

### 6. Performance
- Matrix is a pure read-projection over already-fetched per-metric `byType` maps + `useResourceCounts` output — zero new FHIR fetches
- `byType` map identity stable across renders via `useMemo` in producer (else matrix re-renders thrash)
- Phase 32 per-metric isolation guarantee preserved: Completeness setByType triggers ONLY Completeness-cell re-renders in the matrix

### 7. Security
- Zero new attack surface: read-projection over existing data
- No new dependencies, no new network endpoints, no PHI changes
- localStorage keys unchanged (no new key from Phase 35; D-13 confirmed no-op per RESEARCH)

### 8. Acceptance Artifacts
- TDD baseline-drift commit pair for UAT-FU-01: RED commit + GREEN+flips commit (D-26 mandate; reviewer sees deliberate baseline shift in diff)
- Snapshot test for ResourceDetailPage Tabs.Tab count
- grep test for `ClinicalRawView` zero hits across `src/`
- Integration test for matrix card render with mocked byType maps + Provider stack (Phase 32 + new byType extension)

---

## Owner

- Planner: fills per-task rows in the Verification Map after PLAN.md files are produced.
- Executor: updates Status column as each task commits.
- Verifier: confirms all rows ✅ before `/gsd-verify-work` can pass Phase 35.
