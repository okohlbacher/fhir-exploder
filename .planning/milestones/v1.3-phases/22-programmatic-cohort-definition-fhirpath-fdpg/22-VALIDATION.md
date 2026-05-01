---
phase: 22
slug: programmatic-cohort-definition-fhirpath-fdpg
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-16
---

# Phase 22 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.4 (already installed via Phase 14+) |
| **Config file** | `vitest.config.ts` (project root, established Phase 21) |
| **Quick run command** | `npx vitest run <changed-test-file>` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | full ~45s; targeted ~3s |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run <changed-test-file>` (e.g. `npx vitest run src/quality/fhirpathTranslator.test.ts`)
- **After every plan wave:** Run `npm test` (full suite)
- **Before `/gsd-verify-work`:** Full suite must be green modulo the documented Phase 21 baseline of 22 pre-existing failures (terminology/health unrelated suites)
- **Max feedback latency:** 45 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 22-01-01 | 01 | 1 | CHRT-05 | T-22-01 | Translator rejects `and`/`or`/`exists()` with precise error pointing at offending atom | unit | `npx vitest run src/quality/fhirpathTranslator.test.ts -t "rejects unsupported syntax"` | ❌ W0 | ⬜ pending |
| 22-01-02 | 01 | 1 | CHRT-05 | T-22-02 | Translator emits FHIR search URL via `URLSearchParams`, never string concat (no injection) | unit | `npx vitest run src/quality/fhirpathTranslator.test.ts -t "uses URLSearchParams"` | ❌ W0 | ⬜ pending |
| 22-01-03 | 01 | 1 | CHRT-05 | — | Translator covers all 6 D-02 operators (`=`/`!=`/`<`/`<=`/`>`/`>=`) → correct prefix mapping | unit | `npx vitest run src/quality/fhirpathTranslator.test.ts -t "translates operator prefixes"` | ❌ W0 | ⬜ pending |
| 22-01-04 | 01 | 1 | CHRT-05 | — | Dry-run handler invokes `client.search` with `_count=0&_summary=count` and returns Bundle.total | unit (mock client) | `npx vitest run src/quality/fhirpathTranslator.test.ts -t "dry-run count"` | ❌ W0 | ⬜ pending |
| 22-01-05 | 01 | 1 | CHRT-05 | — | `cohortResolver` resolves a `fhirpath` criterion via translator + reuses `collectSubjectPatientIds` | unit | `npx vitest run src/quality/cohortResolver.test.ts -t "resolves fhirpath criterion"` | partial — extend | ⬜ pending |
| 22-01-06 | 01 | 1 | CHRT-05 | — | `FhirpathCriterion` discriminated union variant added to `CohortCriterion` | unit (type) | `npx vitest run src/quality/cohorts.test.ts -t "FhirpathCriterion type"` | ❌ W0 | ⬜ pending |
| 22-01-07 | 01 | 2 | CHRT-05 | T-22-03 | FhirpathCriterionCard renders Validate button + match count, Textarea has `maxLength={4096}` | component (RTL) | `npx vitest run src/components/quality/FhirpathCriterionCard.test.tsx` | ❌ W0 | ⬜ pending |
| 22-01-08 | 01 | 2 | CHRT-05 | — | CohortBuilderForm 4th card includes FhirpathCriterion in saved criteria array | component (RTL) | `npx vitest run src/components/quality/CohortBuilderForm.test.tsx -t "includes fhirpath criterion"` | partial — extend | ⬜ pending |
| 22-02-01 | 02 | 1 | CHRT-06 | T-22-04 | `fdpgTypes.ts` declares minimal v3 interfaces (StructuredQuery, Criterion, TermCode, ValueFilter) | unit (type) | `npx vitest run src/quality/fdpgTypes.test.ts` | ❌ W0 | ⬜ pending |
| 22-02-02 | 02 | 1 | CHRT-06 | — | Codec round-trips `date-range` + `condition-code` through SQ JSON without data loss | unit | `npx vitest run src/quality/fdpgCodec.test.ts -t "round-trips date-range + condition-code"` | ❌ W0 | ⬜ pending |
| 22-02-03 | 02 | 1 | CHRT-06 | — | Export rejects `FhirpathCriterion`-containing cohort with explicit error | unit | `npx vitest run src/quality/fdpgCodec.test.ts -t "rejects export of fhirpath"` | ❌ W0 | ⬜ pending |
| 22-02-04 | 02 | 1 | CHRT-06 | — | Export warns when cohort contains `reference-list` (no SQ analog, skip with notice) | unit | `npx vitest run src/quality/fdpgCodec.test.ts -t "warns on reference-list export"` | ❌ W0 | ⬜ pending |
| 22-02-05 | 02 | 1 | CHRT-06 | T-22-05 | Import rejects SQ with non-empty `exclusionCriteria` or unsupported `attributeFilters` | unit | `npx vitest run src/quality/fdpgCodec.test.ts -t "rejects unsupported SQ features"` | ❌ W0 | ⬜ pending |
| 22-02-06 | 02 | 1 | CHRT-06 | T-22-06 | Codec emits version pointing at `https://medizininformatik-initiative.de/fdpg/StructuredQuery/v3/schema` | unit | `npx vitest run src/quality/fdpgCodec.test.ts -t "emits v3 schema URL"` | ❌ W0 | ⬜ pending |
| 22-02-07 | 02 | 1 | CHRT-06 | T-22-07 | Codec field-by-field assigns parsed JSON (no `Object.assign` / no prototype pollution) | unit | `npx vitest run src/quality/fdpgCodec.test.ts -t "no prototype pollution"` | ❌ W0 | ⬜ pending |
| 22-02-08 | 02 | 2 | CHRT-06 | T-22-08 | CohortsPage Import button enforces 1 MB file-size cap before parse | component (RTL) | `npx vitest run src/components/quality/CohortsPage.test.tsx -t "enforces 1MB import cap"` | partial — extend | ⬜ pending |
| 22-02-09 | 02 | 2 | CHRT-06 | — | CohortsPage Export button downloads JSON file with cohort name as filename | component (RTL) | `npx vitest run src/components/quality/CohortsPage.test.tsx -t "exports SQ JSON"` | partial — extend | ⬜ pending |
| 22-03-01 | 03 | 1 | CHRT-07 | — | `useCohorts.updateCohort(id, patch)` bumps `updatedAt`, persists to localStorage | unit | `npx vitest run src/hooks/useCohorts.test.tsx -t "updateCohort bumps updatedAt"` | partial — extend | ⬜ pending |
| 22-03-02 | 03 | 1 | CHRT-07 | — | `useCohorts.deleteCohort(id)` removes from cohorts array; clears `activeCohortId` if matching | unit | `npx vitest run src/hooks/useCohorts.test.tsx -t "deleteCohort clears active"` | partial — extend | ⬜ pending |
| 22-03-03 | 03 | 1 | CHRT-07 | — | `useCohorts.duplicateCohort(id)` creates copy with new UUID, name "(copy)", same criteria | unit | `npx vitest run src/hooks/useCohorts.test.tsx -t "duplicateCohort"` | partial — extend | ⬜ pending |
| 22-03-04 | 03 | 1 | CHRT-07 | — | Resolver cache invalidates when `updatedAt` changes (per cohort.id+updatedAt key) | unit | `npx vitest run src/quality/cohortResolver.test.ts -t "cache invalidates on updatedAt"` | partial — extend | ⬜ pending |
| 22-03-05 | 03 | 2 | CHRT-07 | — | SavedCohortRow renders `IconDots` ActionIcon + Menu with Edit / Duplicate / Delete items | component (RTL) | `npx vitest run src/components/quality/CohortsPage.test.tsx -t "row menu has 3 items"` | partial — extend | ⬜ pending |
| 22-03-06 | 03 | 2 | CHRT-07 | — | EditCohortModal pre-fills CohortBuilderForm with cohort criteria; Save calls updateCohort | component (RTL) | `npx vitest run src/components/quality/EditCohortModal.test.tsx` | ❌ W0 | ⬜ pending |
| 22-03-07 | 03 | 2 | CHRT-07 | — | DeleteCohortModal confirms before invoking deleteCohort; Discard button cancels | component (RTL) | `npx vitest run src/components/quality/DeleteCohortModal.test.tsx` | ❌ W0 | ⬜ pending |
| 22-03-08 | 03 | 2 | CHRT-07 | — | Edit-while-active shows one-line note + recompute warning; saves still allowed | component (RTL) | `npx vitest run src/components/quality/EditCohortModal.test.tsx -t "active cohort warning"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Files needed before any wave can run automated verification:

- [ ] `src/quality/fhirpathTranslator.test.ts` — covers CHRT-05 (parse, translate, dry-run, rejection paths)
- [ ] `src/quality/fhirpathTranslator.ts` — implementation (translator + dry-run handler)
- [ ] `src/quality/fdpgTypes.ts` — TypeScript interfaces matching MII SQ v3 schema
- [ ] `src/quality/fdpgCodec.test.ts` — covers CHRT-06 round-trip + reject paths + security mitigations
- [ ] `src/quality/fdpgCodec.ts` — encode/decode implementation
- [ ] `src/components/quality/FhirpathCriterionCard.tsx` + matching `.test.tsx`
- [ ] `src/components/quality/EditCohortModal.tsx` + matching `.test.tsx`
- [ ] `src/components/quality/DeleteCohortModal.tsx` + matching `.test.tsx`
- [ ] Extend `src/hooks/useCohorts.test.tsx` for `updateCohort`, `deleteCohort`, `duplicateCohort`
- [ ] Extend `src/quality/cohortResolver.test.ts` for `fhirpath` branch + cache invalidation on `updatedAt` change
- [ ] Extend `src/components/quality/CohortBuilderForm.test.tsx` for Edit-mode prop + 4th-card fhirpath criterion
- [ ] Extend `src/components/quality/CohortsPage.test.tsx` for row menu (Edit/Duplicate/Delete) + Import/Export buttons + 1 MB import cap

*Framework install:* not needed — vitest 4.1.4 + @testing-library/react already present (Phase 14 onward).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Active cohort edit triggers dashboard recompute reflecting new criteria | CHRT-07 | Requires live Blaze server with seeded patients + visible panel-number deltas | 1) Activate cohort A on `/quality`. 2) Note panel numbers. 3) Open Cohorts page → Edit → narrow date range → Save. 4) Return to dashboard → confirm panel numbers recomputed and lower than baseline. |
| FDPG round-trip with FDPG Central Search portal | CHRT-06 | Requires authenticated FDPG portal access; we only test our codec deterministically | 1) Build a date-range + condition-code cohort. 2) Export → download SQ JSON. 3) Open FDPG portal, paste SQ JSON into Central Search. 4) Confirm portal accepts the file and returns a feasibility count. 5) Inverse: take a Central Search SQ export, Import here, confirm criteria render correctly. |
| FHIRPath helper section UX (supported-fields documentation) | CHRT-05 | Subjective UX assessment — does the helper section aid discoverability? | 1) Open Cohorts page → 4th FHIRPath card. 2) Click `<Collapse>` helper. 3) Confirm 4 resource types listed (Patient/Condition/Observation/Encounter) with 3-5 example expressions each. 4) Try one example via copy-paste → Validate → confirm green count. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags in commands
- [ ] Feedback latency < 45s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
