---
phase: 48-theme-c-reverse-references-incoming-references-panel
verified: 2026-05-01T22:42:00Z
status: human_needed
score: 5/5 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 4/5
  gaps_closed:
    - "RelatedResourcesPanel keys counts state by entry.type alone (WR-01 state-key collision)"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "UAT-01 — Panel renders BELOW Tabs on Patient + non-Patient detail pages (and silent null on Provenance)"
    expected: "Patient detail: 'Related Resources' panel below Tabs with 11 emoji-bearing cards. Encounter detail: 'Referenced By' panel below Tabs with at least one populated card (no emoji). Provenance detail: no panel rendered."
    why_human: "Spatial / visual regression that snapshot tests miss (vertical position relative to the Tabs container is not asserted by RTL DOM snapshots)."
  - test: "UAT-02 — Card click navigates to filtered explorer view on live data"
    expected: "From `/explorer/Encounter/{id}`, clicking an Observation card sets browser URL to `/explorer/Observation?encounter=Encounter/{id}` and the result list contains only Observations linked to that Encounter."
    why_human: "Real Blaze server is required to confirm the `?{param}={ref}` query string filters the destination correctly — RTL mocks resolve before navigation completes."
  - test: "UAT-03 — Loading skeletons appear on slow network"
    expected: "Chrome DevTools → Network → Slow 3G; opening any non-Patient resource detail shows up to 4 placeholder cards with `<Loader>` spinners during in-flight queries; populated cards replace loaders as counts resolve; once all settle, only count > 0 cards remain (or panel returns null)."
    why_human: "Network-throttling visualization not exercised by RTL fast mocks."
---

# Phase 48: Theme C — Reverse References / Incoming-References Panel — Verification Report (Re-verification)

**Phase Goal:** Surface incoming references at the bottom of every non-Patient resource detail, generalize the existing PatientRelatedResources idiom into a single component, and ship the curated reverse-reference catalog that drives both this panel and the Phase 49 graph.
**Verified:** 2026-05-01T22:42:00Z
**Status:** human_needed
**Re-verification:** Yes — after gap closure (Plan 48-04 executed; WR-01 closed)

## Re-Verification Summary

| Field                    | Previous (initial)                   | Current                              |
| ------------------------ | ------------------------------------ | ------------------------------------ |
| Status                   | `gaps_found`                         | `human_needed`                       |
| Score                    | 4/5                                  | 5/5                                  |
| Truth #5 (test coverage) | FAILED (partial)                     | VERIFIED                             |
| WR-01 state-key collision| Open (real correctness bug)          | CLOSED (composite-key fix shipped)   |
| Phase-48 test count      | 24/24                                | 25/25                                |
| Full-suite count         | 1370 pass + 1 deuteranopia carry-over| 1371 pass + 1 deuteranopia carry-over|
| HUMAN-UAT items          | 3 pending                            | 3 pending (unchanged)                |

**Single gap from initial verification (`WR-01 state-key collision`) is closed.** Truth #5 flips from FAILED to VERIFIED. No regressions detected. Status flips from `gaps_found` to `human_needed` because all automated checks pass but the 3 live-Blaze HUMAN-UAT items remain pending — the user still needs to walk UAT-01/02/03 against a running Blaze server to fully close the phase.

## Goal Achievement

### Observable Truths

| #   | Truth (ROADMAP success criterion)                                                                                                                                         | Status     | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Curated catalog file exists at `src/utils/reverseReferenceCatalog.ts` with 8–12 source-type keys; coverage matches/exceeds PatientRelatedResources scope.                  | VERIFIED   | File present (89 LOC). `as const satisfies ReverseReferenceCatalog`. 9 source-type keys: Patient (11 entries byte-identical to old RELATED_TYPES), Observation, Condition, Encounter, MedicationStatement, Procedure, DiagnosticReport, AllergyIntolerance, Practitioner. D-03 corrections in place.                                                                                                                                |
| 2   | Non-Patient resource detail pages render `<IncomingReferencesPanel>` at the bottom with parallel `_summary=count` fetched cards mirroring PatientRelatedResources card grid UI. | VERIFIED   | `IncomingReferencesPanel.tsx` exports the wrapper; `ResourceDetailPage.tsx:193–197` mounts the below-Tabs ternary. `RelatedResourcesPanel.tsx:49` constructs `${e.type}?${e.param}=${refValue}&_summary=count&_count=0`. Card grid uses the same Mantine SimpleGrid/Card/Badge chrome.                                                                                                                                                |
| 3   | Card click navigates to filtered explorer view (`/explorer/{type}?{param}={ref}`).                                                                                          | VERIFIED   | `RelatedResourcesPanel.tsx:95` calls `navigate(onCardNavigate(e))`. Both wrappers compose URLs via `(e) => `/explorer/${e.type}?${e.param}=${refValue}``. RTL test "card click navigation" green; live-data variant deferred to UAT-02 (human verification).                                                                                                                                                                          |
| 4   | PatientRelatedResources + IncomingReferencesPanel share single render component (RelatedResourcesPanel) with two prop paths; existing Patient detail UX shows ZERO regression. | VERIFIED   | `PatientRelatedResources.tsx` is 28 LOC, delegates to `<RelatedResourcesPanel>` with `reverseReferenceCatalog.Patient`. Cross-wrapper structural-equivalence test green. Pre-refactor DOM snapshot (`__snapshots__/PatientRelatedResources.test.tsx.snap`, 484 lines) preserved unchanged through both Plan 48-03 refactor AND Plan 48-04 fix — `git diff eb1a67c~3..HEAD` returns empty. D-19 byte-identical invariant proven twice. |
| 5   | Tests cover catalog shape (REVR-01), parallel count fetch + card render (REVR-02), shared-component invariant (REVR-03); full suite passes (modulo pre-existing Phase 40 deuteranopia); `npm run build` clean. | VERIFIED   | 25/25 phase-48 tests green (was 24/24 before 48-04). New WR-01 regression test `duplicate-target-type entries: both render distinct cards (WR-01 regression)` covers the previously-uncovered multi-entry-same-type collision case. Full suite 1371 pass + 1 fail (pre-existing Phase 40 deuteranopia carry-over, expected per VALIDATION.md). `npx tsc -b --noEmit` exit 0. `npm run build` exit 0 (built in 537ms).             |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact                                                                | Expected                                                | Status   | Details                                                                                                                                                                                                                                                                                                                                          |
| ----------------------------------------------------------------------- | ------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `src/utils/reverseReferenceCatalog.ts`                                  | Typed catalog, 9 source keys, D-03 corrections, ≥70 LOC | VERIFIED | 89 LOC; all 9 keys present; `as const satisfies` typed; D-03 corrections in place. WIRED into RelatedResourcesPanel via wrappers.                                                                                                                                                                                                                |
| `src/components/explorer/RelatedResourcesPanel.tsx`                     | Shared render with composite-keyed counts, ≥95 LOC      | VERIFIED | 111 LOC (was 102 before WR-01 fix). `entryKey` helper at line 22; 7 `entryKey(e)` call sites (state seed line 45, fetch resolve 55, fetch reject 59, populated filter 67 — 2 reads, skeleton React key 82, populated React key 91, badge value read 103). 0 `counts[e.type]` lookups. 2 visible `>{e.type}<` labels preserved (lines 84 + 100).   |
| `src/components/explorer/IncomingReferencesPanel.tsx`                   | Wrapper, ≥20 LOC                                        | VERIFIED | 29 LOC. Catalog lookup, two early-null guards, delegates with `title="Referenced By"` and D-13 URL pattern. WIRED into ResourceDetailPage.                                                                                                                                                                                                       |
| `src/components/explorer/PatientRelatedResources.tsx`                   | Thin wrapper, ≤30 LOC, deletes RELATED_TYPES            | VERIFIED | 28 LOC. Imports catalog + RelatedResourcesPanel. RELATED_TYPES deleted. D-19 export name + prop signature preserved.                                                                                                                                                                                                                             |
| `src/components/explorer/ResourceDetailPage.tsx`                        | Below-Tabs ternary mount; old above-Tabs block removed  | VERIFIED | Line 12 imports IncomingReferencesPanel; lines 193–197 mount the ternary AFTER `</Tabs>`; old above-Tabs block gone.                                                                                                                                                                                                                              |
| `src/utils/__tests__/reverseReferenceCatalog.test.ts`                   | REVR-01 D-14 tests, ≥60 LOC                             | VERIFIED | 7 tests green; locks 9-key shape, Patient=11 baseline, RESEARCH §1 corrections.                                                                                                                                                                                                                                                                  |
| `src/components/explorer/__tests__/RelatedResourcesPanel.test.tsx`      | REVR-02 D-15 tests + WR-01 regression, ≥240 LOC         | VERIFIED | 268 LOC, 7 tests green (was 6 before 48-04). New WR-01 regression test at line 225 with literal name `duplicate-target-type entries: both render distinct cards (WR-01 regression)`. Module-scoped `COLLIDING_ENTRIES` const at lines 86–89.                                                                                                      |
| `src/components/explorer/__tests__/IncomingReferencesPanel.test.tsx`    | REVR-02 + REVR-03 cross-wrapper tests, ≥90 LOC          | VERIFIED | 5 tests green including "structural equivalence" (D-16 partial).                                                                                                                                                                                                                                                                                 |
| `src/components/explorer/__tests__/PatientRelatedResources.test.tsx`    | REVR-03 regression snapshot, ≥100 LOC                   | VERIFIED | 6 tests green incl. snapshot. Snapshot file (484 LOC) byte-identical pre-48-04 vs post-48-04 (`git diff eb1a67c~3..HEAD --` returns 0 lines). REVR-03 byte-identical invariant preserved through both 48-03 refactor and 48-04 fix.                                                                                                                |
| `48-HUMAN-UAT.md`                                                        | Manual UAT scaffold, ≥30 LOC                            | VERIFIED | 113 LOC, 3 UAT items, frontmatter `status: pending`, `requires_live_blaze: true`. Status unchanged since initial verification — user has not yet walked the live-Blaze tests.                                                                                                                                                                    |

### Key Link Verification

| From                           | To                                          | Via                                                  | Status |
| ------------------------------ | ------------------------------------------- | ---------------------------------------------------- | ------ |
| `reverseReferenceCatalog.ts`   | `@medplum/fhirtypes`                        | `import type { ResourceType }`                       | WIRED  |
| `RelatedResourcesPanel.tsx`    | `@medplum/react-hooks`                      | `useMedplum()` (line 38)                             | WIRED  |
| `RelatedResourcesPanel.tsx`    | `react-router-dom`                          | `useNavigate()` (line 39)                            | WIRED  |
| `RelatedResourcesPanel.tsx`    | `reverseReferenceCatalog.ts`                | `import type { ReverseReferenceEntry }` (line 6)     | WIRED  |
| `RelatedResourcesPanel.tsx`    | `entryKey` helper → composite-key fix       | `entryKey(e: ReverseReferenceEntry)` (line 22)       | WIRED  |
| `IncomingReferencesPanel.tsx`  | `reverseReferenceCatalog`                   | `reverseReferenceCatalog[resource.resourceType]`     | WIRED  |
| `IncomingReferencesPanel.tsx`  | `RelatedResourcesPanel`                     | direct delegation                                    | WIRED  |
| `PatientRelatedResources.tsx`  | `RelatedResourcesPanel`                     | direct delegation                                    | WIRED  |
| `PatientRelatedResources.tsx`  | `reverseReferenceCatalog`                   | `reverseReferenceCatalog.Patient` (line 18)          | WIRED  |
| `ResourceDetailPage.tsx`       | `IncomingReferencesPanel`                   | below-Tabs ternary mount (lines 193–197)             | WIRED  |
| `ResourceDetailPage.tsx`       | `PatientRelatedResources`                   | below-Tabs ternary mount Patient branch              | WIRED  |
| `RelatedResourcesPanel.test.tsx` | colliding-entries fixture (WR-01 regression) | `{ type: 'Observation', param: 'has-member' }` + `derived-from` (lines 87–88) | WIRED |

(Note: The gsd-tools `verify key-links` JSON output reported false negatives on several patterns due to over-escaped regex strings in the PLAN frontmatter YAML. Manual grep confirms every key link is present in source.)

### Data-Flow Trace (Level 4)

| Artifact                  | Data Variable | Source                                                                       | Real Data | Status     |
| ------------------------- | ------------- | ---------------------------------------------------------------------------- | --------- | ---------- |
| `RelatedResourcesPanel`   | `counts`      | `client.get(client.fhirUrl(...).toString())` resolves to FHIR `Bundle.total` | YES       | FLOWING    |
| `IncomingReferencesPanel` | `entries`     | `reverseReferenceCatalog[resource.resourceType]`                             | YES       | FLOWING    |
| `PatientRelatedResources` | `entries`     | `reverseReferenceCatalog.Patient`                                            | YES       | FLOWING    |
| `ResourceDetailPage`      | `resource`    | `client.readResource(resourceType, id)`                                      | YES       | FLOWING    |

All wired data sources produce real FHIR data. Critically, the WR-01 fix preserves data flow: the URL composition at line 49 still uses `e.type` (the FHIR ResourceType for the GET path) and only the **internal** `counts` Record key uses the composite — no FHIR query semantics changed.

### Behavioral Spot-Checks

| Behavior                                                                              | Command                                                                                                       | Result                                  | Status |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ------ |
| Composite-key fix complete (no e.type collision sites remain)                          | `grep -c "counts\[e\.type\]" src/components/explorer/RelatedResourcesPanel.tsx`                               | 0                                       | PASS   |
| entryKey helper + call sites                                                           | `grep -c "entryKey" src/components/explorer/RelatedResourcesPanel.tsx`                                        | 8                                       | PASS   |
| Visible labels still use `e.type` (user sees `Observation`, not `Observation:has-member`) | `grep -c ">{e.type}<" src/components/explorer/RelatedResourcesPanel.tsx`                                      | 2                                       | PASS   |
| React keys use composite                                                               | `grep -c "key={entryKey(e)}" src/components/explorer/RelatedResourcesPanel.tsx`                               | 2                                       | PASS   |
| No old `key={e.type}` remaining                                                        | `grep -c "key={e.type}" src/components/explorer/RelatedResourcesPanel.tsx`                                    | 0                                       | PASS   |
| FHIR query URL still uses `e.type` (composite is internal-only)                        | `grep -n "const url" src/components/explorer/RelatedResourcesPanel.tsx`                                       | line 49: `${e.type}?${e.param}=...`     | PASS   |
| WR-01 regression test exists                                                           | `grep -c "duplicate-target-type entries" src/components/explorer/__tests__/RelatedResourcesPanel.test.tsx`    | 1                                       | PASS   |
| RelatedResourcesPanel suite                                                            | `npx vitest run src/components/explorer/__tests__/RelatedResourcesPanel.test.tsx`                             | 7/7 tests passed in 716ms               | PASS   |
| Phase-48 4-file suite                                                                  | `npx vitest run` (4 phase-48 test files)                                                                      | 4 files / 25 tests passed in 799ms      | PASS   |
| TypeScript                                                                             | `npx tsc -b --noEmit`                                                                                         | exit 0                                  | PASS   |
| Production build                                                                       | `npm run build`                                                                                               | exit 0; built in 537ms                  | PASS   |
| Full test suite                                                                        | `npm test`                                                                                                    | 1371 passed / 1 failed (Phase 40 carry-over) | PASS (baseline preserved; +1 over previous 1370 from new WR-01 regression) |
| Patient snapshot byte-identical to pre-48-04                                           | `git diff eb1a67c~3..HEAD -- src/components/explorer/__tests__/__snapshots__/PatientRelatedResources.test.tsx.snap` | 0 lines (empty diff)                | PASS   |
| Catalog: D-03 correction (no MedicationStatement.reason-reference code entry)          | `grep "MedicationStatement.*reason-reference" src/utils/reverseReferenceCatalog.ts`                           | only doc-comment line                   | PASS   |
| Catalog: Encounter retains MedicationStatement.context                                 | `grep "MedicationStatement.*context"`                                                                         | 1 code entry under Encounter            | PASS   |
| Mount: ternary sits after `</Tabs>`                                                    | `awk '/<\/Tabs>/{f=1; next} f && /resource.resourceType === .Patient./{print "FOUND"; exit}'`                  | "FOUND"                                 | PASS   |

### Requirements Coverage

| Requirement | Source Plan(s)              | Description                                                                                                                                | Status                | Evidence                                                                                                                                                                                                                                          |
| ----------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REVR-01     | 48-01                       | Curated reverse-reference catalog with 8–12 source keys mirroring PatientRelatedResources scope                                            | SATISFIED             | Catalog file exists, 9 keys, Patient byte-identical to old RELATED_TYPES, D-03 corrections in place. 7 unit tests green.                                                                                                                          |
| REVR-02     | 48-02, 48-04                | `<IncomingReferencesPanel resource={r}>` mounted at bottom of ResourceDetailPage for non-Patient resources, parallel `_summary=count` cards | SATISFIED             | IncomingReferencesPanel + RelatedResourcesPanel implemented; below-Tabs ternary mount; 12 RTL tests green (6 RelatedResourcesPanel + 5 IncomingReferencesPanel + WR-01 regression). WR-01 collision closed via composite-key fix in 48-04.        |
| REVR-03     | 48-02, 48-03, 48-04         | PatientRelatedResources + IncomingReferencesPanel share a single render component; no regression in existing Patient detail UX            | SATISFIED             | Both wrappers delegate to RelatedResourcesPanel; pre-refactor snapshot preserved byte-identical through both 48-03 refactor AND 48-04 fix; cross-wrapper structural-equivalence test green; D-19 invariant proven.                                |

No orphaned requirements — all three REVR-* IDs from REQUIREMENTS.md are claimed by phase-48 plans.

### Anti-Patterns Found

| File                                                       | Line                            | Pattern                                                                            | Severity     | Impact                                                                                       |
| ---------------------------------------------------------- | ------------------------------- | ---------------------------------------------------------------------------------- | ------------ | -------------------------------------------------------------------------------------------- |
| `RelatedResourcesPanel.tsx`                                | 81                              | `entries.slice(0, 4)` — magic skeleton count must track `cols.md`                  | Info (IN-01) | Out of phase scope; track as cleanup. Carries forward from initial verification.              |
| `__tests__/*.test.tsx` (3 files)                           | top-of-file polyfill blocks     | Duplicated jsdom polyfill block byte-for-byte                                      | Info (IN-02) | Out of phase scope; track as cleanup.                                                         |
| `src/__tests__/resource-detail.test.tsx`, `reference-navigation.test.tsx` | "legacy scaffold" describe blocks | Tautological assertions like `expect(true).toBe(true)`                              | Info (IN-03) | Pre-existing tests touched by Phase 48 mock additions; not introduced by this phase.          |

**Resolved since initial verification:**

| File                          | Lines                         | Pattern                                                          | Severity (was)                | Status |
| ----------------------------- | ----------------------------- | ---------------------------------------------------------------- | ----------------------------- | ------ |
| `RelatedResourcesPanel.tsx`   | 31, 36, 46, 50, 58, 73, 82, 94 | State-key collision: `counts[e.type]` overwritten on multi-entry-same-type | Warning (real correctness bug — WR-01) | CLOSED |

No blocker-severity anti-patterns. WR-01 fixed. No new anti-patterns introduced by 48-04.

### Human Verification Required

See `human_verification:` block in frontmatter. Three items in `48-HUMAN-UAT.md` require live Blaze and remain `status: pending`:

1. **UAT-01** — Panel renders BELOW Tabs on Patient + non-Patient detail pages, and silent null on Provenance.
2. **UAT-02** — Card click navigates to filtered explorer view on live data.
3. **UAT-03** — Loading skeletons appear on Slow 3G.

The HUMAN-UAT.md scaffold is committed; tester walks the 3 verifications post-merge and fills in the sign-off block. Once UAT items are signed off, status flips from `human_needed` to `passed`.

### Gaps Summary

**No automated gaps remain.** The single gap from the initial verification (WR-01 state-key collision in `RelatedResourcesPanel.tsx`) is closed by Plan 48-04:

- **Composite-key helper introduced.** `entryKey(e: ReverseReferenceEntry) => `${e.type}:${e.param}`` at line 22 routes all 7 internal map read/write sites through the composite, so two catalog entries sharing the same target ResourceType (e.g. Observation source-type's `has-member` + `derived-from`) no longer race into the same map slot.
- **Visible behavior preserved.** Card labels still display `{e.type}` (user sees `Observation`, not `Observation:has-member`). FHIR query URL composition at line 49 still uses `e.type`. Click-navigate URL still uses `e.type` and `e.param` separately.
- **Regression test added.** New `it('duplicate-target-type entries: both render distinct cards (WR-01 regression)')` at line 225 of `RelatedResourcesPanel.test.tsx` feeds `[{type:'Observation',param:'has-member'},{type:'Observation',param:'derived-from'}]`, mocks distinct totals (5 + 8), and asserts BOTH cards render with their independent counts AND `console.error` is NOT called with the React duplicate-key warning. Test was RED before the fix (commit `453bd2b`) and GREEN after the fix (commit `090c38d`).
- **Patient snapshot byte-identical.** `__snapshots__/PatientRelatedResources.test.tsx.snap` is byte-identical to its pre-48-04 baseline (`git diff eb1a67c~3..HEAD -- ...snap` returns 0 lines). REVR-03 byte-identical invariant preserved through 48-04.
- **Phase-48 suite went 24/24 → 25/25 green.** Full suite went 1370/1394 → 1371/1394, with the same 1 pre-existing Phase 40 deuteranopia carry-over as the only red.

**Why status is `human_needed`, not `passed`:** All five must-haves and all automated checks pass, but `48-HUMAN-UAT.md` still has 3 live-Blaze items at `status: pending`. Per the gsd-verifier rules, human-verification items take priority over a clean automated-pass — the user must walk UAT-01/02/03 against a running Blaze server before the phase can flip to `passed`.

---

_Verified: 2026-05-01T22:42:00Z_
_Verifier: Claude (gsd-verifier)_
_Re-verification mode: GAP CLOSURE_
