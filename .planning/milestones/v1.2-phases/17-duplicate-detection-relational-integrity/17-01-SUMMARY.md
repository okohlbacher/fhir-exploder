---
phase: 17-duplicate-detection-relational-integrity
plan: 01
subsystem: quality

tags: [duplicate-detection, content-hash, reference-integrity, orphan-detection, sha-256, batched-search, concurrency-limit]

# Dependency graph
requires:
  - phase: 05-data-quality-dashboard
    provides: sampleResources helper, NormalizedIssue contract, getProfileForType registry
  - phase: 16-conformance-plausibility-checks
    provides: usePlausibilityReport state-machine pattern that hooks mirror (idle/running/complete/cancelled/error)
provides:
  - findPatientDuplicates pure function with skippedCount tracking (DQ-07)
  - canonicalize + hashResource + findContentHashDuplicates for content dedup (DQ-08)
  - extractReferences that normalizes relative/absolute/skips contained+URN (DQ-09)
  - checkReferencesExist with concurrency-limited _id batching (DQ-09)
  - detectOrphans reading min>=1 Reference paths from MII profiles (DQ-10)
  - useDuplicateReport and useReferenceReport orchestrating hooks
affects: [17-02-quality-dashboard-ui, 18-alerting]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure-engine + orchestrating-hook separation: engine functions in src/quality/ stay sync-testable; hooks own sampling, progress, cancellation"
    - "Mirrors usePlausibilityReport cancelledRef state-machine shape for cross-phase consistency"
    - "Concurrency-limited worker pool for batched server reads (T-17-01 mitigation)"

key-files:
  created:
    - src/quality/patientDuplicateDetector.ts
    - src/quality/contentHasher.ts
    - src/quality/referenceWalker.ts
    - src/quality/referenceChecker.ts
    - src/quality/orphanDetector.ts
    - src/hooks/useDuplicateReport.ts
    - src/hooks/useReferenceReport.ts
    - src/__tests__/patient-duplicate-detector.test.ts
    - src/__tests__/content-hasher.test.ts
    - src/__tests__/reference-checker.test.ts
    - src/__tests__/orphan-detector.test.ts
  modified: []

key-decisions:
  - "Canonicalization strips id/meta/text (transient/server-provenance fields) before hashing so identical clinical content hashes the same regardless of server assignment"
  - "Reference normalization collapses absolute URLs to Type/id by parsing the URL path after the host, rejecting host-only URLs like 'http://server' as malformed"
  - "Orphan detector only inspects top-level required fields (path depth == 2); nested sliced cardinality is out of scope for v1"
  - "useDuplicateReport treats Patient sampling as unconditional because DQ-07 is the headline patient-match check; resource-type cohort drives only the content-hash pass"
  - "checkReferencesExist de-duplicates target ids (Set per type) before batching so multiple sources pointing to the same Patient/123 count as one server query"

patterns-established:
  - "SHA-256 dedup pattern: shallow-strip provenance fields, deep-sort remaining keys, JSON.stringify, Web Crypto digest, hex-encode"
  - "Bounded worker pool: `runWithConcurrency` opens N lanes, each lane pulls the next batch index when idle — simpler than semaphore-based implementations"
  - "Graceful server-capability fallback: try `_elements=id` first, catch any error, retry without that param"

requirements-completed:
  - DQ-07
  - DQ-08
  - DQ-09
  - DQ-10

# Metrics
duration: 7min
completed: 2026-04-14
---

# Phase 17 Plan 01: Duplicate Detection & Relational Integrity Engine Summary

**Five pure-function quality modules (patient duplicate detection, content hashing, reference walking, reference existence checking, orphan detection) plus two state-machine hooks (useDuplicateReport, useReferenceReport), with 62 unit tests all green.**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-04-14T08:26:15Z
- **Completed:** 2026-04-14T08:33:14Z
- **Tasks:** 2
- **Files created:** 11
- **Files modified:** 0
- **Tests added:** 62 (all passing)

## Accomplishments

- **DQ-07 Patient duplicate detection**: exact-match clustering on normalized family|given|birthDate with skippedCount tracking for patients missing usable keys
- **DQ-08 Content hash dedup**: deep-sort-then-SHA-256 canonicalization that ignores id/meta/text, clustered by (type, hash)
- **DQ-09 Broken reference detection**: JSON-tree walker that normalizes relative/absolute references and skips contained (#) and URN (urn:) targets, combined with batched `_id` existence checks (default batch 50, concurrency 5)
- **DQ-10 Orphan detection**: profile-driven required Reference field extraction from bundled MII profiles, with an R4 FALLBACK map for types not covered
- **Two orchestrating hooks**: `useDuplicateReport` (Patient pass + content-hash per-type) and `useReferenceReport` (batched broken-ref + orphan) with cancelledRef cancellation and progress reporting

## Task Commits

Each task was committed atomically:

1. **Task 1: Pure functions for duplicate detection (DQ-07, DQ-08)** — `1b85aca` (feat, TDD RED+GREEN combined)
2. **Task 2: Pure functions for reference integrity (DQ-09, DQ-10)** — `18db72b` (feat, TDD RED+GREEN combined)

## Files Created

- `src/quality/patientDuplicateDetector.ts` — `findPatientDuplicates`, `normalizePatientDuplicateIssues`, `PatientDuplicateCluster`
- `src/quality/contentHasher.ts` — `sortKeys`, `canonicalize`, `hashResource`, `findContentHashDuplicates`, `normalizeContentHashIssues`, `ContentHashCluster`
- `src/quality/referenceWalker.ts` — `extractReferences`, `ExtractedReference`
- `src/quality/referenceChecker.ts` — `checkReferencesExist`, `normalizeBrokenRefIssues`
- `src/quality/orphanDetector.ts` — `getRequiredReferenceFields`, `detectOrphans`
- `src/hooks/useDuplicateReport.ts` — `useDuplicateReport`, `DuplicateRunState`, `DuplicateRunStatus`
- `src/hooks/useReferenceReport.ts` — `useReferenceReport`, `ReferenceRunState`, `ReferenceRunStatus`
- `src/__tests__/patient-duplicate-detector.test.ts` — 13 tests
- `src/__tests__/content-hasher.test.ts` — 19 tests
- `src/__tests__/reference-checker.test.ts` — 17 tests (extractReferences + checkReferencesExist + normalizeBrokenRefIssues)
- `src/__tests__/orphan-detector.test.ts` — 13 tests

## Decisions Made

- **Pure engine + orchestrating hook split**: keeps every engine piece testable without mocking React or the MedplumClient; hooks hold state transitions, cancellation, and progress accounting so the engine stays trivial.
- **SHA-256 via Web Crypto** (not Node `crypto`) so the same code runs in the browser and under jsdom in tests. `bufferToHex` does the hex conversion inline — no third-party dependency added.
- **De-dup target ids before server queries** in `checkReferencesExist`: a single sample may contain 100 references to `Patient/123`, but we only need to ask the server once. This is free correctness and a real throughput win for typical data.
- **Reject host-only absolute URLs** (e.g., `http://server`) in the reference walker. The previous behaviour (`split('/').filter(Boolean)`) would produce garbage references like `http:/server` — we now parse the URL path explicitly.
- **Top-level path filter** in `getRequiredReferenceFields`: only `Type.field` paths (exactly one dot) are returned. This matches how we check for missing references via direct property access and avoids trying to navigate nested sliced elements.

## Deviations from Plan

None — plan executed exactly as written.

Two minor implementation choices surfaced during TDD that are consistent with the plan's intent:

1. **Absolute URL parsing** — plan said "split by `/`, take last two segments". Literal implementation would accept `http://server` as `http:/server`. We strip the `scheme://host/` prefix first, then take the last two path segments. This matches the plan's pitfall note (T-17-03: "skip malformed references gracefully, no throw").
2. **Top-level-only required fields in orphanDetector** — plan said "Observation.subject… Condition.subject"; profile-driven extraction could in principle surface `Condition.code.coding` (min=1) but that element has code CodeableConcept/Coding, not Reference, so it is correctly filtered out by the `code === 'Reference'` check. The top-level depth filter (`path.split('.').length === 2`) is a belt-and-braces guard against deeper Reference fields from future profiles that we aren't ready to walk yet.

## Issues Encountered

- One test case ("skips malformed absolute URLs that have no Type/id tail") caught a bug in the initial `normalizeReference` implementation where `http://server`.split('/') returned `["http:", "server"]`, which passed the `length >= 2` check and produced a nonsense reference. Fixed by parsing the URL path after `://host/` rather than splitting the whole string.
- Full test suite reports 21 pre-existing failures (patient list/detail, terminology health, sidebar terminology row, etc.) — these pre-date this plan, are in unrelated modules, and are out of scope per deviation rule scope boundary. Full suite went from 333 passing to 395 passing (+62, exactly matching the tests added here).

## Known Stubs

None. Every exported function has a complete implementation.

## User Setup Required

None — no external service configuration required. Engine functions and hooks run entirely client-side against the already-configured MedplumClient.

## Self-Check: PASSED

Verified:

- `src/quality/patientDuplicateDetector.ts` FOUND
- `src/quality/contentHasher.ts` FOUND
- `src/quality/referenceWalker.ts` FOUND
- `src/quality/referenceChecker.ts` FOUND
- `src/quality/orphanDetector.ts` FOUND
- `src/hooks/useDuplicateReport.ts` FOUND
- `src/hooks/useReferenceReport.ts` FOUND
- `src/__tests__/patient-duplicate-detector.test.ts` FOUND
- `src/__tests__/content-hasher.test.ts` FOUND
- `src/__tests__/reference-checker.test.ts` FOUND
- `src/__tests__/orphan-detector.test.ts` FOUND
- Commit `1b85aca` FOUND
- Commit `18db72b` FOUND
- `npx vitest run` on the four new test files — 62/62 passing
- `npx tsc --noEmit` — zero errors

## Next Phase Readiness

- Engine layer complete. Wave 2 (UI) can import `useDuplicateReport`, `useReferenceReport`, and the cluster types to wire up drill-down panels.
- Both hooks expose both raw clusters (`duplicateClusters`, `contentHashClusters`) and normalized issues, so UI can render either a cluster-oriented view or a flat issue table.
- Progress counters and cancellation are already production-grade — no changes needed before adding them to the quality dashboard.

---
*Phase: 17-duplicate-detection-relational-integrity*
*Completed: 2026-04-14*
