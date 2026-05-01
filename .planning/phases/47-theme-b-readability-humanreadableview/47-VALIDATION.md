---
phase: 47
slug: theme-b-readability-humanreadableview
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-01
---

# Phase 47 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 3.x (already installed; mirrors Phase 46 baseline) |
| **Config file** | `vitest.config.ts` (already exists, no Wave 0 changes) |
| **Quick run command** | `npx vitest run <test-file-path>` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~25–30 seconds (1292 tests + Phase 47 additions) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run <task's test file>`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 47-01-* | 01 | 1 | READ-01 | T-47-01 (reference href injection) | normalizeReference rejects non-FHIR/JS URL schemes; failed lookups silently render raw href | unit | `npx vitest run src/hooks/__tests__/useReferenceResolver.test.ts` | ❌ W0 (new file) | ⬜ pending |
| 47-01-* | 01 | 1 | READ-01 | — | reference cache hit/miss/null distinguished; in-flight dedupe; StrictMode safe | unit | `npx vitest run src/components/explorer/__tests__/ReferenceLink.test.tsx` | ❌ W0 (new file) | ⬜ pending |
| 47-02-* | 02 | 2 | READ-02 | — | extension chip surfaces hidden `_propertyName` keys without breaking the `_`-prefix filter on the main key list | unit | `npx vitest run src/components/explorer/__tests__/ExtensionChip.test.tsx` | ❌ W0 (new file) | ⬜ pending |
| 47-02-* | 02 | 2 | READ-03 | — | contained-resource accordion renders `summarizeResource(c).primary` headers; expand reveals ResourcePropertyTable; no JSON modal fall-through | unit | `npx vitest run src/components/explorer/__tests__/ContainedResourcesAccordion.test.tsx` | ❌ W0 (new file) | ⬜ pending |
| 47-02-* | 02 | 2 | READ-01/02/03 | — | Integration: HumanReadableView renders all three behaviors together for a fixture resource with refs + extensions + contained | integration | `npx vitest run src/components/explorer/__tests__/HumanReadableView.read-phase.test.tsx` | ❌ W0 (new file) | ⬜ pending |
| 47-final | — | post | READ-01/02/03 | — | Full suite + build clean | suite + build | `npm test && npm run build` | ✅ existing | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/hooks/__tests__/useReferenceResolver.test.ts` — covers cache hit, cache miss → resolve, cache miss → 404 fallback (null cached), cache miss → network-error fallback, in-flight dedupe, StrictMode-safe cleanup, normalizeReference behavior (relative `Type/id`, absolute URL, fragment `#id`)
- [ ] `src/components/explorer/__tests__/ReferenceLink.test.tsx` — covers Skeleton on pending, summarizeResource(target).primary on resolved, raw href fallback on failed, Tooltip presence with full ref, router-link click target
- [ ] `src/components/explorer/__tests__/ExtensionChip.test.tsx` — covers single extension expand, multi-extension `[+N extensions]` label, nested extension recursion, keyboard focus
- [ ] `src/components/explorer/__tests__/ContainedResourcesAccordion.test.tsx` — covers single contained, multiple contained, accordion expand → ResourcePropertyTable, header text from summarizeResource
- [ ] `src/components/explorer/__tests__/HumanReadableView.read-phase.test.tsx` — integration covering a resource with all three new affordances simultaneously

*Wave 0 = test stubs MUST exist before implementation tasks run; TDD red→green flow per Phase 46 convention.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Tooltip hover behavior on reference link (mouse pointer hover, full ref appears, dismisses on blur) | READ-01 | Mantine Tooltip uses real DOM hover events; jsdom does not fire genuine pointer hover | Open `/explorer/Patient/<id>` in dev server, hover any reference field — full URL appears; click navigates |
| Accordion expand animation smoothness + visual layering with Mantine 8 styling | READ-03 | Visual transition timing cannot be verified programmatically | Open a resource with `contained[]` (e.g. a fixture Bundle), click each accordion entry, confirm smooth expand and child ResourcePropertyTable renders in-place |
| Inline `[+N extensions]` chip visual placement next to property row (not breaking layout) | READ-02 | Layout regression risk; visual inspection only | Open a Patient resource with property-level extensions (e.g. `_birthDate.extension`), confirm chip appears inline, click expands without shifting surrounding rows |

These items are tracked in a HUMAN-UAT.md scaffold at phase verification time (mirrors Phase 46 pattern).

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
