---
phase: 48
slug: theme-c-reverse-references-incoming-references-panel
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-01
---

# Phase 48 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Sourced from RESEARCH.md §"Validation Architecture" (researcher's authoritative test plan).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.x (existing — `npm test`) |
| **Config file** | `vitest.config.ts` (project root, existing) |
| **Quick run command** | `npx vitest run src/utils/__tests__/reverseReferenceCatalog.test.ts src/components/explorer/__tests__/RelatedResourcesPanel.test.tsx src/components/explorer/__tests__/IncomingReferencesPanel.test.tsx src/components/explorer/__tests__/PatientRelatedResources.test.tsx` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30s quick, ~90s full |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run <new test files only>` (≤ 30s)
- **After every plan wave:** Run `npm test` (full suite; pre-existing Phase 40 deuteranopia failure carries over)
- **Before `/gsd-verify-work`:** `npm test && npx tsc -b --noEmit && npm run build` all green
- **Max feedback latency:** 30 seconds per task

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 48-01-01 | 01 | 1 | REVR-01 | — | Catalog exports typed const with 9 source-type keys | unit | `npx vitest run src/utils/__tests__/reverseReferenceCatalog.test.ts -t "exports 9 source-type keys"` | ❌ W0 | ⬜ pending |
| 48-01-02 | 01 | 1 | REVR-01 | — | Patient key has exactly 11 entries (regression baseline) | unit | `npx vitest run src/utils/__tests__/reverseReferenceCatalog.test.ts -t "Patient entry has 11 entries"` | ❌ W0 | ⬜ pending |
| 48-01-03 | 01 | 1 | REVR-01 | — | Each non-Patient key has ≥1 entry with valid `ResourceType` | unit | `npx vitest run src/utils/__tests__/reverseReferenceCatalog.test.ts -t "every non-Patient key"` | ❌ W0 | ⬜ pending |
| 48-02-01 | 02 | 1 | REVR-02 | — | RelatedResourcesPanel fetches counts in parallel, renders only count > 0 cards | unit (RTL) | `npx vitest run src/components/explorer/__tests__/RelatedResourcesPanel.test.tsx -t "parallel fetch"` | ❌ W0 | ⬜ pending |
| 48-02-02 | 02 | 1 | REVR-02 | — | All-zero counts → component returns null | unit (RTL) | `npx vitest run src/components/explorer/__tests__/RelatedResourcesPanel.test.tsx -t "all zero counts"` | ❌ W0 | ⬜ pending |
| 48-02-03 | 02 | 1 | REVR-02 | — | One fetch throws → others still render, no console.error | unit (RTL) | `npx vitest run src/components/explorer/__tests__/RelatedResourcesPanel.test.tsx -t "silent failure"` | ❌ W0 | ⬜ pending |
| 48-02-04 | 02 | 1 | REVR-02 | — | Card click → `useNavigate` called with `/explorer/{type}?{param}={ref}` | unit (RTL) | `npx vitest run src/components/explorer/__tests__/RelatedResourcesPanel.test.tsx -t "card click navigation"` | ❌ W0 | ⬜ pending |
| 48-02-05 | 02 | 1 | REVR-02 | — | `<IncomingReferencesPanel resource={type-not-in-catalog}/>` returns null silently | unit (RTL) | `npx vitest run src/components/explorer/__tests__/IncomingReferencesPanel.test.tsx -t "type not in catalog"` | ❌ W0 | ⬜ pending |
| 48-02-06 | 02 | 1 | REVR-02 | — | `<IncomingReferencesPanel resource={Observation}/>` renders cards from catalog | unit (RTL) | `npx vitest run src/components/explorer/__tests__/IncomingReferencesPanel.test.tsx -t "Observation renders"` | ❌ W0 | ⬜ pending |
| 48-03-01 | 03 | 2 | REVR-03 | — | Refactored `<PatientRelatedResources>` produces byte-identical DOM to pre-refactor (regression snapshot) | unit (RTL) | `npx vitest run src/components/explorer/__tests__/PatientRelatedResources.test.tsx -t "byte-identical to baseline"` | ❌ W0 | ⬜ pending |
| 48-03-02 | 03 | 2 | REVR-03 | — | Both wrappers with identical entries+refValues produce structurally equivalent DOM | unit (RTL) | `npx vitest run src/components/explorer/__tests__/IncomingReferencesPanel.test.tsx -t "structural equivalence"` | ❌ W0 | ⬜ pending |
| 48-03-03 | 03 | 2 | REVR-03 | — | `ResourceDetailPage` mounts panel below Tabs (single ternary based on `resourceType === 'Patient'`) | unit (RTL) + grep | `grep -E "Patient' && id" src/components/explorer/ResourceDetailPage.tsx` AND test render | ❌ W0 | ⬜ pending |
| 48-gate | — | gate | All | — | Full suite green; tsc clean; build clean | suite + lint + build | `npm test && npx tsc -b --noEmit && npm run build` | ✅ existing infra | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/utils/__tests__/reverseReferenceCatalog.test.ts` — REVR-01 stubs (D-14)
- [ ] `src/components/explorer/__tests__/RelatedResourcesPanel.test.tsx` — REVR-02 stubs (D-15)
- [ ] `src/components/explorer/__tests__/IncomingReferencesPanel.test.tsx` — REVR-02 + REVR-03 cross-wrapper stubs
- [ ] `src/components/explorer/__tests__/PatientRelatedResources.test.tsx` — REVR-03 regression baseline (D-16); NO existing test, must snapshot pre-refactor DOM as the regression baseline BEFORE the refactor lands
- [ ] `48-HUMAN-UAT.md` scaffold — verify panel mount position below Tabs on live Blaze

*Vitest + RTL + MantineProvider patterns established in 6 existing test files; no framework install needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Panel renders below Tabs visually on live Blaze (Patient + non-Patient resource types) | REVR-02, REVR-03 | Spatial / visual regression that snapshot tests miss (vertical position relative to Tabs container) | 1. `npm run dev` → connect to local Blaze. 2. Navigate `/explorer/Patient/{id}` — verify Related Resources panel appears BELOW Tabs (was above pre-Phase-48). 3. Navigate `/explorer/Encounter/{id}` — verify IncomingReferencesPanel appears below Tabs with cards. 4. Navigate `/explorer/Provenance/{id}` — verify panel returns null (Provenance not a catalog key → no panel). |
| Card click navigation hits filtered explorer view on live data | REVR-02 SC#3 | Real Blaze server confirms `?{param}={ref}` query string filters the destination correctly | 1. From `/explorer/Encounter/{id}`, click an Observation card. 2. Verify URL = `/explorer/Observation?encounter=Encounter/{id}`. 3. Verify result list contains only Observations linked to that Encounter. |
| Loading skeletons appear on slow network | REVR-02 | Network-throttling visualization not exercised by RTL fast mocks | 1. Chrome DevTools → Network → Slow 3G. 2. Open any non-Patient detail. 3. Verify skeleton cards visible during in-flight queries. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
