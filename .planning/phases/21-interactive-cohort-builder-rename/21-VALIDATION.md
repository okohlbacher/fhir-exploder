---
phase: 21
slug: interactive-cohort-builder-rename
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-15
---

# Phase 21 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `21-RESEARCH.md` §Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.4 + @testing-library/react 16.3.2 + jsdom 29.0.2 |
| **Config file** | `vitest.config.ts` (include: `src/**/*.test.ts`, `src/**/*.test.tsx`; environment: jsdom; globals: true) |
| **Quick run command** | `npx vitest run src/quality/cohorts.test.ts src/quality/cohortResolver.test.ts src/hooks/useCohorts.test.ts` |
| **Full suite command** | `npm test` (runs `vitest run` per package.json) |
| **Estimated runtime** | ~30 seconds quick · ~2 minutes full |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run <changed-files>` (sub-30-second feedback)
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green AND `npm run build` must exit 0
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

> Task IDs are placeholders — will be refined once PLAN.md files are generated (each task's `automated` field cites one of these commands).

| Req | Behavior | Test Type | Automated Command | File Exists | Status |
|-----|----------|-----------|-------------------|-------------|--------|
| CHRT-01 | Builder accepts date-range + condition-code + reference-list inputs | integration (RTL) | `npx vitest run src/components/quality/CohortBuilderForm.test.tsx` | ❌ Wave 0 | ⬜ pending |
| CHRT-01 | `parsePatientRefs` parses lines/commas, strips `Patient/`, dedupes, 10K cap | unit | `npx vitest run src/quality/cohorts.test.ts -t "parsePatientRefs"` | ❌ Wave 0 | ⬜ pending |
| CHRT-01 | `resolveCohort` intersects three criterion sets | unit | `npx vitest run src/quality/cohortResolver.test.ts -t "intersects"` | ❌ Wave 0 | ⬜ pending |
| CHRT-01 | Date-range criterion queries `Encounter?date=ge…&date=le…&_elements=subject` | unit (mock MedplumClient) | `npx vitest run src/quality/cohortResolver.test.ts -t "date range"` | ❌ Wave 0 | ⬜ pending |
| CHRT-01 | Condition-code criterion queries `Condition?code=system\|code&_elements=subject` | unit (mock MedplumClient) | `npx vitest run src/quality/cohortResolver.test.ts -t "condition code"` | ❌ Wave 0 | ⬜ pending |
| CHRT-02 | `useCohorts` persists to `quality.cohorts.v1`; survives reload | integration (RTL + localStorage) | `npx vitest run src/hooks/useCohorts.test.ts -t "persists"` | ❌ Wave 0 | ⬜ pending |
| CHRT-02 | Hydration gate: first render returns defaults, effect flips to stored | unit | `npx vitest run src/hooks/useCohorts.test.ts -t "hydration"` | ❌ Wave 0 | ⬜ pending |
| CHRT-02 | `CohortDefinition.id` is `crypto.randomUUID()`-shaped | unit | `npx vitest run src/hooks/useCohorts.test.ts -t "uuid"` | ❌ Wave 0 | ⬜ pending |
| CHRT-03 | `sampleResources` with ≤40 patient IDs uses GET `?patient=…` | unit (mock client) | `npx vitest run src/quality/sampling.test.ts -t "short GET"` | ❌ Wave 0 | ⬜ pending |
| CHRT-03 | `sampleResources` with >40 patient IDs uses POST `/_search` | unit (mock client) | `npx vitest run src/quality/sampling.test.ts -t "long POST"` | ❌ Wave 0 | ⬜ pending |
| CHRT-03 | `sampleResources` for `Patient` uses `_id=` not `patient=` | unit | `npx vitest run src/quality/sampling.test.ts -t "Patient uses _id"` | ❌ Wave 0 | ⬜ pending |
| CHRT-03 | `sampleResources` with empty `patientIds` === no scoping | unit | `npx vitest run src/quality/sampling.test.ts -t "empty array"` | ❌ Wave 0 | ⬜ pending |
| CHRT-03 | Active-cohort Select scopes all 7 panels; falls back on resolution failure | manual UAT | HUMAN-UAT.md recipe | ❌ Wave 0 | ⬜ pending |
| CHRT-04 | `ResourceTypeSelector` renders label "Resource types" | unit (RTL) | `npx vitest run src/components/quality/ResourceTypeSelector.test.tsx` | ❌ Wave 0 | ⬜ pending |
| CHRT-04 | Legacy `quality.cohort.v1` migrates to `quality.resourceTypes.v1` on mount | integration (RTL + localStorage seed) | `npx vitest run src/hooks/useCohorts.test.ts -t "legacy migration"` | ❌ Wave 0 | ⬜ pending |
| CHRT-04 | Migration doesn't clobber existing `quality.resourceTypes.v1` | unit | `npx vitest run src/hooks/useCohorts.test.ts -t "migration idempotent"` | ❌ Wave 0 | ⬜ pending |
| CHRT-04 | Trend snapshot reader handles legacy `cohort` field (treats as `resourceTypes`) | unit | `npx vitest run src/quality/__tests__/trendsHistory.test.ts -t "legacy snapshot"` | ⚠️ exists (extend) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/quality/cohorts.test.ts` — stubs for CHRT-01, CHRT-02 (pure functions: `parsePatientRefs`, `CohortDefinition` shape, storage I/O)
- [ ] `src/quality/cohortResolver.test.ts` — stubs for CHRT-01 (criterion queries + intersection); mocks `MedplumClient` via the pattern in `src/quality/__tests__/pdfExport.test.ts`
- [ ] `src/hooks/useCohorts.test.ts` — stubs for CHRT-02, CHRT-04 (persistence, hydration, UUID ids, legacy-key migration)
- [ ] `src/components/quality/CohortBuilderForm.test.tsx` — stubs for CHRT-01 (RTL integration on the builder form)
- [ ] `src/components/quality/ResourceTypeSelector.test.tsx` — stub for CHRT-04 (label rename assertion)
- [ ] `src/quality/sampling.test.ts` — new file, stubs for CHRT-03 (GET/POST cutover, Patient vs others, empty-array)
- [ ] Extend `src/quality/__tests__/trendsHistory.test.ts` (existing) for legacy-snapshot migration

No framework install needed. No shared fixture file needed — Mantine 8 + React Testing Library works with the existing `vitest.config.ts`.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Active-cohort Select visibly scopes all 7 quality panels end-to-end | CHRT-03 | Cross-component integration with real Blaze server; stubbing all 7 panel hooks would defeat the purpose | Load `/quality` → verify default shows all patients → open `/quality/cohorts` → build a date-range cohort (2023-01-01 to 2023-12-31) → save as "2023 Encounters" → back on `/quality`, pick "2023 Encounters" from the Active cohort Select → verify each of the 9 tabs (Counts, Completeness, Coverage, Validation, Plausibility, Lab Ranges, Duplicates, References, Trends) recomputes and shows fewer patients |
| Cohort truncation warning (>10K patients) is visible and actionable | CHRT-01 (D-06) | Requires a real large dataset to trigger naturally; hard to integration-test | On a Blaze instance with >10K patients, build a date-range cohort that resolves beyond cap → verify the builder page shows the warning text "Cohort truncated to 10,000 patients…" with a prominent color |
| Rename is user-visible: "Cohort" → "Resource types" on `/quality` toolbar, and legacy localStorage migrates silently | CHRT-04 | Visual + localStorage state; one-shot migration | Seed `quality.cohort.v1` with `["Patient","Observation"]` → load `/quality` → verify the MultiSelect is labeled "Resource types" AND shows Patient + Observation selected → DevTools: `quality.resourceTypes.v1` exists with same value, `quality.cohort.v1` removed |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify command or Wave 0 dependency cited
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all 7 MISSING test-file references
- [ ] No watch-mode flags in commands (`vitest run`, not `vitest`)
- [ ] Feedback latency < 30s on quick-run command
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
