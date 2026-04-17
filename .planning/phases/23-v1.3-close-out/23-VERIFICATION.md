---
phase: 23-v1.3-close-out
verified: 2026-04-17T12:00:00Z
status: human_needed
score: 6/7 must-haves verified (CLOSE-06 partial — 2 UAT items environmental-deferred)
overrides_applied: 0
human_verification:
  - test: "Confirm T-6.3 A panel scoping against a Blaze instance with matching patients"
    expected: "With a cohort active, panel numbers (Completeness, Coding Coverage, Plausibility) are strictly lower than the unscoped baseline. Network tab shows FHIR requests with patient= or _id= params."
    why_human: "Requires a Blaze instance with test data that matches cohort criteria (MII Synthea seed). The two UAT sessions used http://localhost:8080/fhir which had no matching patients. D-10 classified as environmental; user accepted accept-and-defer — but no live-Blaze pass was ever recorded for this item."
  - test: "Confirm T-6.3 B snapshot/PDF cohort metadata"
    expected: "After clicking Capture snapshot with an active cohort, Local Storage quality.trends.v1 contains cohortId/cohortName/cohortPatientCount. PDF cover page shows both Resource types: and Cohort: lines."
    why_human: "Depends on T-6.3 A having matching patients. Same environmental blocker — no live-Blaze pass recorded."
---

# Phase 23: v1.3 Close-Out Verification Report

**Phase Goal:** Close all outstanding v1.3 audit items (CLOSE-01 through CLOSE-07) so the v1.3 milestone can flip from tech_debt to shipped-clean.
**Verified:** 2026-04-17T12:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | CLOSE-01: Non-current row Export regression test exists and passes | VERIFIED | `CohortsPage.test.tsx:555` — `'serializes the correct cohort when Export is clicked on a non-current row'`. Commit 5a7303b. Already-resolved by Phase 22 SavedCohortRow extraction; test passed immediately on first run. |
| 2 | CLOSE-02: activateCohort surfaces red toast with exact WR-02 message on QuotaExceededError | VERIFIED | `useCohorts.ts:154-174` — inline try/catch probes `window.localStorage.setItem` before `setStored`. `title: 'Activation failed'`, `message: 'Browser storage is full. Delete unused cohorts to make room.'`. Test `'activateCohort surfaces red toast on QuotaExceededError'` at `useCohorts.test.tsx:251`. Commit 518f3e9. |
| 3 | CLOSE-03: parsePatientRefs returns { refs, truncated, originalCount } with correct boundary semantics | VERIFIED | `cohorts.ts:185-238` — `ParsedPatientRefs` interface exported; `truncated: deduped.length > 10_000` (eliminates false-positive at exactly 10k); `originalCount: deduped.length` (POST-dedupe, Option A). All 5 case matrix tests present at `cohorts.test.ts:94-152`. Commit f8b9c26. |
| 4 | CLOSE-03: CohortBuilderForm reads parsed.truncated not parsedRefs.length === PATIENT_REF_CAP | VERIFIED | `CohortBuilderForm.tsx:174-179` — `const parsed = useMemo(() => parsePatientRefs(debouncedRef), ...); const parsedRefs = parsed.refs; const truncated = parsed.truncated;`. No `PATIENT_REF_CAP` constant remains in file. |
| 5 | CLOSE-04: FhirpathLike alias removed from fdpgCodec.ts; no FhirpathLike or CodecCriterion remains | VERIFIED | Repo-wide grep for `FhirpathLike` and `CodecCriterion` returns 0 results. `fdpgCodec.ts:59` — `for (const raw of cohort.criteria)` (uncasted). Forward-compat JSDoc replaced with 2-line comment. Commit 8dbd76c. |
| 6 | CLOSE-05: EditCohortModal toast reads updated.name at toast-dispatch time, not cohort.name closure | VERIFIED | `EditCohortModal.tsx:57-62` — `const updated = updateCohort(cohort.id, input); notifications.show({ message: '"${updated.name}" updated. ...' })`. Old `cohort.name` pattern gone. Test `'Cohort updated toast reflects the renamed cohort name (CLOSE-05)'` at `EditCohortModal.test.tsx:321`. Commit b3a8860. |
| 7 | CLOSE-06: 8 UAT items executed against live Blaze, results recorded, D-10 policy applied | PARTIAL | T-5.3, T-6.3 C, T-6.3 D, all 7 Phase 22 items: pass (6 pass + 1 code-bug-fixed). T-6.3 A and T-6.3 B: environmental-deferred (no matching test data on the Blaze instance used). D-10 applied correctly; user accepted-and-deferred. Code bug CLOSE-08 was discovered and fixed inline (commit 39d9000). PHI grep matches on both UAT files are false-positives (planning slugs and schema URLs, not PHI). |
| 8 | CLOSE-07: nyquist_compliant: true and wave_0_complete: true flipped on both Phase 21 + 22 VALIDATION.md | VERIFIED | `21-VALIDATION.md:5` — `nyquist_compliant: true`, `wave_0_complete: true`. `22-VALIDATION.md:5` — same. Commit e1b9a93 touches exactly 2 files, 4 insertions + 4 deletions. |

**Score:** 6/7 truths verified (CLOSE-06 partial — 2 of 8 UAT items environmental-deferred, never live-Blaze confirmed)

### Deferred Items

Items not yet met but explicitly addressed in later milestone phases.

| # | Item | Addressed In | Evidence |
|---|------|-------------|---------|
| 1 | T-6.3 A panel scoping (environmental — no matching test data) | Not a later phase; user decision: accept-and-defer | Documented in 23-03-SUMMARY.md and 21-UAT.md ## Gaps as environmental; MII Synthea seed todo filed |
| 2 | T-6.3 B snapshot/PDF cohort metadata (environmental — depends on T-6.3 A) | Not a later phase; user decision: accept-and-defer | Documented in 23-03-SUMMARY.md as environmental; resolves when T-6.3 A resolved |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/components/quality/CohortsPage.test.tsx` | Non-current-row Export regression test | VERIFIED | Contains `'serializes the correct cohort when Export is clicked on a non-current row'` at line 555 |
| `src/hooks/useCohorts.test.tsx` | activateCohort QuotaExceededError test | VERIFIED | Contains `'activateCohort surfaces red toast on QuotaExceededError'` at line 251 |
| `src/quality/cohorts.test.ts` | 5-case parsePatientRefs truncation matrix | VERIFIED | All 5 cases present at lines 94-152 with `post-dedupe` in each description |
| `src/quality/cohorts.ts` | parsePatientRefs returning { refs, truncated, originalCount } | VERIFIED | `ParsedPatientRefs` interface at line 185; return shape at lines 233-237 |
| `src/hooks/useCohorts.ts` | activateCohort with quota probe | VERIFIED | try/catch with `window.localStorage.setItem` at lines 157-169; `'Activation failed'` at line 163 |
| `src/components/quality/CohortBuilderForm.tsx` | Caller updated for new parsePatientRefs signature | VERIFIED | `parsed.truncated` at line 179; no `PATIENT_REF_CAP` constant |
| `src/quality/fdpgCodec.ts` | FhirpathLike alias removed | VERIFIED | No `FhirpathLike` or `CodecCriterion` anywhere in repo |
| `src/components/quality/EditCohortModal.tsx` | Toast reads updated.name | VERIFIED | `const updated = updateCohort(cohort.id, input)` at line 57; `updated.name` at line 62 |
| `src/components/quality/EditCohortModal.test.tsx` | Rename-then-assert-new-name-in-toast test | VERIFIED | `'Cohort updated toast reflects the renamed cohort name (CLOSE-05)'` at line 321 |
| `.planning/phases/21-interactive-cohort-builder-rename/21-VALIDATION.md` | nyquist_compliant: true, wave_0_complete: true | VERIFIED | Lines 5-6 both true; commit e1b9a93 |
| `.planning/phases/22-programmatic-cohort-definition-fhirpath-fdpg/22-VALIDATION.md` | nyquist_compliant: true, wave_0_complete: true | VERIFIED | Lines 5-6 both true; commit e1b9a93 |
| `.planning/phases/21-interactive-cohort-builder-rename/21-UAT.md` | T-5.3 + T-6.3 live-Blaze results recorded | PARTIAL | T-5.3 PASS recorded. T-6.3 C + D PASS. T-6.3 A + B environmental (no matching patients). |
| `.planning/phases/22-programmatic-cohort-definition-fhirpath-fdpg/22-HUMAN-UAT.md` | All 6 items flipped from pending | VERIFIED | No `result: [pending]` remains; `pending: 0` in Summary block |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `useCohorts.ts::activateCohort` | `window.localStorage.setItem` | try/catch with QuotaExceededError notification | WIRED | Lines 157-170 confirm probe + throw pattern |
| `CohortBuilderForm.tsx` | `parsePatientRefs` return shape | `parsed.truncated` from useMemo | WIRED | Line 174: `const parsed = useMemo(...)`, line 179: `const truncated = parsed.truncated` |
| `CohortsPage.test.tsx` | SavedCohortRow export callback | render 2 cohorts, click Export on second, assert filename | WIRED | Line 555 test confirmed present |
| `EditCohortModal.tsx::handleSave` | `updateCohort` return value | `const updated = updateCohort(...)` returns CohortDefinition, `.name` used for toast | WIRED | Lines 57-62 |
| `fdpgCodec.ts` | `CohortCriterion` union (from ./cohorts) | direct use after FhirpathLike removal | WIRED | Line 59: `for (const raw of cohort.criteria)` — uncasted, typed as CohortCriterion[] |
| Plans 23-01/02/03 green | Nyquist flip preconditions | depends_on: [1, 2, 3] enforced, all SUMMARY files present | WIRED | All SUMMARY files verified; commits 5a7303b, 518f3e9, f8b9c26, 8dbd76c, b3a8860, 39d9000 |

### Data-Flow Trace (Level 4)

All modified artifacts are business-logic/state files (parsers, hooks, modals) rather than pure data-rendering components. The key data flows are:

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `CohortBuilderForm.tsx` | `parsed.truncated` | `parsePatientRefs(debouncedRef)` | Yes — computed from real user input | FLOWING |
| `useCohorts.ts::activateCohort` | `next` (CohortsStorage) | `{ ...stored, activeCohortId: id }` passed to `window.localStorage.setItem` | Yes — derived from live React state | FLOWING |
| `EditCohortModal.tsx` | `updated.name` | `updateCohort(cohort.id, input)` return value | Yes — returned from hook mutation that writes to localStorage | FLOWING |

### Behavioral Spot-Checks

Step 7b: SKIPPED for test files (unit tests are runnable via vitest but require the test runner with mocked environment). SKIPPED for planning artifact changes (21-VALIDATION.md, 22-VALIDATION.md — no runnable entry points). The SUMMARY files for Plans 23-01 and 23-02 both document that `npm test` exited with 22 failures (all pre-existing), 714-717 passing.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| CLOSE-01 | 23-01 | W1: handleExport closure capture — regression guard | SATISFIED | Commit 5a7303b; test at CohortsPage.test.tsx:555; already-resolved by Phase 22 refactor |
| CLOSE-02 | 23-01 | W2: activateCohort quota probe — QuotaExceededError red toast | SATISFIED | Commit 518f3e9; implementation at useCohorts.ts:154-174; test at useCohorts.test.tsx:251 |
| CLOSE-03 | 23-01 | W3: parsePatientRefs returns { refs, truncated, originalCount }; 5-case matrix | SATISFIED | Commit f8b9c26; cohorts.ts:185-238; cohorts.test.ts:94-152; CohortBuilderForm.tsx:174-179 |
| CLOSE-04 | 23-02 | I1: FhirpathLike/CodecCriterion inert aliases removed | SATISFIED | Commit 8dbd76c; 0 repo hits for FhirpathLike or CodecCriterion |
| CLOSE-05 | 23-02 | I2: EditCohortModal stale toast — reads updated.name | SATISFIED | Commit b3a8860; EditCohortModal.tsx:57-62; test at EditCohortModal.test.tsx:321 |
| CLOSE-06 | 23-03 | U1-U8: human UAT against live Blaze; blockers escalated | PARTIALLY SATISFIED | 6/8 items confirmed pass on live Blaze; 2 items environmental-deferred per D-10 + user accept-and-defer decision. CLOSE-08 discovered and fixed inline. |
| CLOSE-07 | 23-04 | N1: nyquist_compliant: true flipped on Phase 21 + 22 VALIDATION.md | SATISFIED | Commit e1b9a93; both VALIDATION.md files confirmed; 2-file stat verified |
| CLOSE-08 | 23-03 (inline) | CohortBuilderForm in edit mode renders pre-populated name TextInput | SATISFIED | Commit 39d9000; CohortBuilderForm.tsx:196-341 (isEdit branch with TextInput); REQUIREMENTS.md line 28 |

**Note on CLOSE-08:** CLOSE-08 was discovered during live-Blaze UAT (item 4 fail), filed as a requirement in REQUIREMENTS.md, and fixed inline in commit 39d9000. The PLAN files only declared CLOSE-01 through CLOSE-07, but CLOSE-08 is fully satisfied.

**Orphaned requirements check:** REQUIREMENTS.md Phase 23 section lists CLOSE-01 through CLOSE-08. Plans 23-01 through 23-04 claim CLOSE-01/02/03, CLOSE-04/05, CLOSE-06, CLOSE-07 respectively. CLOSE-08 is not declared in any plan frontmatter (it was filed inline during UAT execution). However, the fix commit exists and the requirement is satisfied — no orphaned requirement is blocking.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/quality/cohorts.ts` | 21 | Threat-model comment says `parsePatientRefs produces plain string[]` — slightly outdated but updated in same file to add `inside 'refs'` | Info | Comment at line 21-22 reads `parsePatientRefs produces plain string[] inside 'refs'` — correctly updated per CLOSE-03 Task 4 Step E. No impact. |

No stubs, no TODO/FIXME blockers, no placeholder returns, no hardcoded empty data found in any Phase 23 modified files.

### Human Verification Required

#### 1. T-6.3 A — Panel scoping against live Blaze with matching patients

**Test:** With a cohort active (date-range or condition-code that resolves to a real patient subset on a Blaze instance with MII Synthea data), verify that panel numbers on the /quality dashboard (Completeness, Coding Coverage, Plausibility, etc.) are strictly lower than the unscoped baseline. Use Network DevTools to confirm outgoing FHIR requests carry `patient=Patient/...` (non-Patient types) or `_id=...` (Patient type) query params for cohorts of ≤40 patients, or POST /_search for larger cohorts.

**Expected:** All quality panels recompute with lower numbers than baseline; no spinner hangs; no 400/500 errors from Blaze; network requests visibly scoped.

**Why human:** Requires a Blaze instance seeded with test data (e.g. MII Synthea) where at least one saved cohort resolves to a non-zero patient subset. The two UAT sessions ran against http://localhost:8080/fhir which had insufficient test data for this item. D-10 classified as environmental; user decision was accept-and-defer, but the code path has never received a green live-Blaze confirmation.

#### 2. T-6.3 B — Snapshot capture and PDF metadata with active cohort

**Test:** With a cohort active (must be confirmed working per T-6.3 A first), click "Capture snapshot". Open DevTools → Application → Local Storage → quality.trends.v1 and verify the latest snapshot entry contains `cohortId`, `cohortName`, and `cohortPatientCount` fields populated. Click "Export PDF" and open the PDF — the cover page must show both a `Resource types:` line AND a `Cohort: "{name}" (N patients)` line. Then deactivate the cohort, export again — only the `Resource types:` line appears.

**Expected:** Snapshot and PDF metadata correctly reflect the active cohort; deactivation removes cohort metadata from PDF.

**Why human:** Depends on T-6.3 A passing (need matching patients). Same environmental dependency; same accept-and-defer decision. Cannot verify in jsdom (PDF export uses browser APIs; snapshot storage path is a live-app-only flow).

### Gaps Summary

No blocking code-level gaps were found. All 7 CLOSE-0X requirements have implementation evidence in the codebase. The two human verification items (T-6.3 A and T-6.3 B) are environmental gaps that were explicitly accepted-and-deferred by the user during Plan 23-03. They represent live-Blaze confirmation that is still outstanding — not regressions or missing code.

The status is `human_needed` because T-6.3 A and T-6.3 B require a Blaze instance with MII Synthea test data to confirm, and no such confirmation has been recorded. Once those two items are verified on a properly seeded Blaze instance, Phase 23 can be considered fully complete.

**PHI sanitization note:** The canonical PHI grep pattern returns non-zero counts on both UAT files, but all matches are false-positives:
- `21-UAT.md`: matches `21-interactive-cohort-builder-rename` (a planning slug, 30+ chars)
- `22-HUMAN-UAT.md`: matches `22-programmatic-cohort-definition-fhirpath-fdpg` (slug) and `https://medizininformatik-initiative.de/fdpg/StructuredQuery/v3/schema` (public schema URL)

None of these contain patient IDs, tokens, or auth headers. The actual server URL recorded (`http://localhost:8080/fhir`) is localhost-only and contains no PHI.

---

_Verified: 2026-04-17T12:00:00Z_
_Verifier: Claude (gsd-verifier)_
