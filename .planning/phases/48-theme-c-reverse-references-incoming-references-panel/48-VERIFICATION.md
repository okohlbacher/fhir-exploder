---
phase: 48-theme-c-reverse-references-incoming-references-panel
verified: 2026-05-01T20:35:00Z
status: gaps_found
score: 4/5 must-haves verified
overrides_applied: 0
gaps:
  - truth: "RelatedResourcesPanel keys counts state by entry.type alone; multi-entry-same-type catalog keys (Observation source — 3 entries with type='Observation' for has-member, derived-from, plus DiagnosticReport.result mapping; in practice the Observation source-type list has 2 self-Observation entries) race to write the same map key, so only the last-resolving fetch wins and the populated card grid hides the others."
    status: failed
    reason: "WR-01 from 48-REVIEW.md — real correctness bug. State-key collision causes silent count loss when a source type has multiple entries pointing at the same target ResourceType but via different SearchParameters. Affects Observation source-type detail pages (has-member vs derived-from); other source types are unaffected because each entry has a unique target ResourceType."
    artifacts:
      - path: "src/components/explorer/RelatedResourcesPanel.tsx"
        issue: "Lines 31, 36, 46, 50, 58, 73, 82, 94: counts Record keyed by `e.type` only. Should be `${e.type}:${e.param}` (composite key). React `key` prop on Cards also collides for the same reason."
    missing:
      - "Introduce composite key helper `const key = (e: ReverseReferenceEntry) => `${e.type}:${e.param}`` and route initial map seeding, fetch resolve/reject, populated filter, JSX key prop, and counts[...] reads through it."
      - "Test in RelatedResourcesPanel.test.tsx that proves the fix: feed entries `[{type:'Observation', param:'has-member'}, {type:'Observation', param:'derived-from'}]`, mock get to resolve `{total: 5}` for has-member URL and `{total: 8}` for derived-from URL, assert TWO Observation cards render with badges 5 and 8 respectively (currently fails — only the last-write-wins card renders)."
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

# Phase 48: Theme C — Reverse References / Incoming-References Panel — Verification Report

**Phase Goal:** Surface incoming references at the bottom of every non-Patient resource detail, generalize the existing PatientRelatedResources idiom into a single component, and ship the curated reverse-reference catalog that drives both this panel and the Phase 49 graph.
**Verified:** 2026-05-01T20:35:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth (ROADMAP success criterion) | Status | Evidence |
|---|-----------------------------------|--------|----------|
| 1 | Curated catalog file exists at `src/utils/reverseReferenceCatalog.ts` with 8–12 source-type keys; coverage matches/exceeds PatientRelatedResources scope. | VERIFIED | File present (89 LOC). `as const satisfies ReverseReferenceCatalog`. 9 source-type keys: Patient (11 entries byte-identical to old RELATED_TYPES), Observation, Condition, Encounter, MedicationStatement, Procedure, DiagnosticReport, AllergyIntolerance, Practitioner. D-03 corrections in place (grep `MedicationStatement.*reason-reference` returns 0 code matches; `MedicationStatement.*context` returns 1 entry under Encounter). |
| 2 | Non-Patient resource detail pages render `<IncomingReferencesPanel>` at the bottom with parallel `_summary=count` fetched cards mirroring PatientRelatedResources card grid UI. | VERIFIED | `IncomingReferencesPanel.tsx` exports the wrapper; `ResourceDetailPage.tsx` lines 193–197 mount the below-Tabs ternary. `RelatedResourcesPanel.tsx:40` constructs `?${param}=${refValue}&_summary=count&_count=0` and dispatches all queries before awaiting. Card grid uses the same Mantine SimpleGrid/Card/Badge chrome as the original. |
| 3 | Card click navigates to filtered explorer view (`/explorer/{type}?{param}={ref}`). | VERIFIED | `RelatedResourcesPanel.tsx:86` calls `navigate(onCardNavigate(e))`. Both wrappers compose URLs via `(e) => `/explorer/${e.type}?${e.param}=${refValue}``. RTL test "card click navigation" green; live-data variant deferred to UAT-02 (human verification). |
| 4 | PatientRelatedResources + IncomingReferencesPanel share single render component (RelatedResourcesPanel) with two prop paths; existing Patient detail UX shows ZERO regression. | VERIFIED | `PatientRelatedResources.tsx` is now 28 LOC, delegates to `<RelatedResourcesPanel>` with `reverseReferenceCatalog.Patient`. Cross-wrapper structural-equivalence test green (`IncomingReferencesPanel.test.tsx` "structural equivalence"). Pre-refactor DOM snapshot in `__snapshots__/PatientRelatedResources.test.tsx.snap` (484 lines) preserved unchanged through refactor — D-19 byte-identical invariant proven. |
| 5 | Tests cover catalog shape (REVR-01), parallel count fetch + card render (REVR-02), shared-component invariant (REVR-03); full suite passes (modulo pre-existing Phase 40 deuteranopia); `npm run build` clean. | FAILED (partial) | 24/24 phase-48 tests green; full suite 1370 pass, 1 fail (the pre-existing Phase 40 deuteranopia carry-over, expected per VALIDATION.md). `npx tsc -b --noEmit` exit 0. `npm run build` exit 0 (built in 540ms). HOWEVER — the existing tests do NOT cover the multi-entry-same-type collision case (WR-01); a regression test for this would have caught it. Marked partial because the tests pass but the coverage has a known gap that masks the WR-01 correctness bug. |

**Score:** 4/5 truths verified (truth 5 fails because test coverage misses the WR-01 edge case)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/utils/reverseReferenceCatalog.ts` | Typed catalog, 9 source keys, D-03 corrections, ≥70 LOC | VERIFIED | 89 LOC, all 9 keys present, `as const satisfies` typed, D-03 corrections in place. WIRED into RelatedResourcesPanel via wrappers. |
| `src/components/explorer/RelatedResourcesPanel.tsx` | Shared render, fetch + skeleton + populated grid + click, ≥80 LOC | PASSED with caveat | 102 LOC, all UI-SPEC locks present (Title order=5 mb=sm, cols={base:2,sm:3,md:4}, Badge size=sm variant=light color=blue, _summary=count&_count=0, cancellation flag, dual-shape parse, 4-card skeleton, null-when-empty). WIRED via 2 wrappers. CAVEAT: WR-01 state-key collision bug (see Gaps). |
| `src/components/explorer/IncomingReferencesPanel.tsx` | Wrapper, ≥20 LOC | VERIFIED | 29 LOC. Catalog lookup, two early-null guards, delegates with `title="Referenced By"` and D-13 URL pattern. WIRED into ResourceDetailPage. |
| `src/components/explorer/PatientRelatedResources.tsx` | Thin wrapper, ≤30 LOC, deletes RELATED_TYPES | VERIFIED | 28 LOC. Imports catalog + RelatedResourcesPanel. RELATED_TYPES deleted. D-19 export name + prop signature preserved. |
| `src/components/explorer/ResourceDetailPage.tsx` | Below-Tabs ternary mount; old above-Tabs block removed | VERIFIED | Line 12 imports IncomingReferencesPanel; lines 193–197 mount the ternary AFTER `</Tabs>`; old above-Tabs block gone. `awk` confirms ternary sits after `</Tabs>`. |
| `src/utils/__tests__/reverseReferenceCatalog.test.ts` | REVR-01 D-14 tests, ≥60 LOC | VERIFIED | 7 tests green; locks 9-key shape, Patient=11 baseline, RESEARCH §1 corrections. |
| `src/components/explorer/__tests__/RelatedResourcesPanel.test.tsx` | REVR-02 D-15 tests, ≥130 LOC | VERIFIED | 6 tests green (parallel fetch, all-zero null, silent failure, click-navigate, loading state, title prop). |
| `src/components/explorer/__tests__/IncomingReferencesPanel.test.tsx` | REVR-02 + REVR-03 cross-wrapper tests, ≥90 LOC | VERIFIED | 5 tests green including "structural equivalence" (D-16 partial). |
| `src/components/explorer/__tests__/PatientRelatedResources.test.tsx` | REVR-03 regression snapshot, ≥100 LOC | VERIFIED | 6 tests green incl. snapshot. Snapshot file (484 LOC) committed pre-refactor; preserved post-refactor — proves byte-identical DOM. |
| `48-HUMAN-UAT.md` | Manual UAT scaffold, ≥30 LOC | VERIFIED | 112 LOC, 3 UAT items, frontmatter `status: pending`, `requires_live_blaze: true`. |

### Key Link Verification

| From | To | Via | Status |
|------|-----|-----|--------|
| `reverseReferenceCatalog.ts` | `@medplum/fhirtypes` | `import type { ResourceType }` | WIRED |
| `RelatedResourcesPanel.tsx` | `@medplum/react-hooks` | `useMedplum()` | WIRED |
| `RelatedResourcesPanel.tsx` | `react-router-dom` | `useNavigate()` | WIRED |
| `IncomingReferencesPanel.tsx` | `reverseReferenceCatalog` | `reverseReferenceCatalog[resource.resourceType]` | WIRED |
| `IncomingReferencesPanel.tsx` | `RelatedResourcesPanel` | direct delegation | WIRED |
| `PatientRelatedResources.tsx` | `RelatedResourcesPanel` | direct delegation | WIRED |
| `PatientRelatedResources.tsx` | `reverseReferenceCatalog` | `reverseReferenceCatalog.Patient` | WIRED |
| `ResourceDetailPage.tsx` | `IncomingReferencesPanel` | below-Tabs ternary mount | WIRED |
| `ResourceDetailPage.tsx` | `PatientRelatedResources` | below-Tabs ternary mount (Patient branch) | WIRED |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Real Data | Status |
|----------|---------------|--------|-----------|--------|
| `RelatedResourcesPanel` | `counts` | `client.get(client.fhirUrl(...).toString())` resolves to FHIR `Bundle` with `total` | YES — live Blaze `_summary=count` query | FLOWING |
| `IncomingReferencesPanel` | `entries` | `reverseReferenceCatalog[resource.resourceType]` | YES — frozen const, real catalog data | FLOWING |
| `PatientRelatedResources` | `entries` | `reverseReferenceCatalog.Patient` | YES — 11 entries from frozen catalog | FLOWING |
| `ResourceDetailPage` | `resource` | `client.readResource(resourceType, id)` | YES — live Blaze read | FLOWING |

All wired data sources produce real FHIR data; no static returns or hardcoded empty props at the call sites.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Catalog: D-03 correction (no MedicationStatement.reason-reference) | `grep "MedicationStatement.*reason-reference" src/utils/reverseReferenceCatalog.ts` | Only the doc-comment line matches; no code entry | PASS |
| Catalog: Encounter retains MedicationStatement.context | `grep "MedicationStatement.*context"` | 1 code entry under Encounter source list | PASS |
| Mount: ternary sits after `</Tabs>` | `awk '/<\/Tabs>/{f=1; next} f && /resource.resourceType === .Patient./{print "FOUND"; exit}' ResourceDetailPage.tsx` | "FOUND" | PASS |
| Phase-48 test suite | `npx vitest run` (4 phase-48 test files) | 4 files / 24 tests passed in 817ms | PASS |
| Full test suite | `npm test` | 1370 passed, 1 failed (pre-existing Phase 40 deuteranopia per VALIDATION.md) | PASS (baseline preserved) |
| TypeScript | `npx tsc -b --noEmit` | exit 0 | PASS |
| Production build | `npm run build` | exit 0; built in 540ms | PASS |

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|----------------|-------------|--------|----------|
| REVR-01 | 48-01 | Curated reverse-reference catalog at `src/utils/reverseReferenceCatalog.ts` with 8–12 source keys mirroring PatientRelatedResources scope | SATISFIED | Catalog file exists, 9 keys, Patient byte-identical to old RELATED_TYPES, D-03 corrections in place. 7 unit tests green. |
| REVR-02 | 48-02 | `<IncomingReferencesPanel resource={r}>` mounted at the bottom of ResourceDetailPage for non-Patient resources, parallel `_summary=count` fetched cards | SATISFIED with caveat | IncomingReferencesPanel + RelatedResourcesPanel implemented; below-Tabs ternary mount in ResourceDetailPage; 11 RTL tests green. CAVEAT: WR-01 collision bug means some Observation source-type incoming counts will silently disappear in the populated grid; functional but not correct for this single edge case. |
| REVR-03 | 48-02, 48-03 | PatientRelatedResources + IncomingReferencesPanel share a single render component; no regression in existing Patient detail UX | SATISFIED | Both wrappers delegate to RelatedResourcesPanel; pre-refactor snapshot preserved unchanged through refactor; cross-wrapper structural-equivalence test green. |

No orphaned requirements — all three REVR-* IDs from REQUIREMENTS.md are claimed by phase-48 plans (REVR-01 by 48-01, REVR-02 by 48-02, REVR-03 by 48-02 + 48-03).

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `RelatedResourcesPanel.tsx` | 31, 36, 46, 50, 58, 73, 82, 94 | State-key collision: `counts[e.type]` overwritten when multiple entries share a target `type` | Warning (real correctness bug — see WR-01 in Gaps) | Affects Observation source-type detail (has-member vs derived-from race the Observation key); other source types each have unique target types and are currently unaffected. |
| `RelatedResourcesPanel.tsx` | 72 | `entries.slice(0, 4)` — magic skeleton count must track `cols.md` | Info (IN-01 in 48-REVIEW.md) | Out of phase scope; track as cleanup. |
| `__tests__/*.test.tsx` (3 files) | top-of-file polyfill blocks | Duplicated jsdom polyfill block byte-for-byte | Info (IN-02 in 48-REVIEW.md) | Out of phase scope; track as cleanup. |
| `src/__tests__/resource-detail.test.tsx`, `reference-navigation.test.tsx` | "legacy scaffold" describe blocks | Tautological assertions like `expect(true).toBe(true)` | Info (IN-03 in 48-REVIEW.md, pre-existing) | Pre-existing tests touched by Phase 48 mock additions; not introduced by this phase. |

No blocker-severity anti-patterns. The WR-01 finding is classified as a real correctness bug rather than a code smell, so it is reported as a gap (above) rather than a stub or anti-pattern.

### Human Verification Required

See `human_verification:` block in frontmatter. Three items scaffolded in `48-HUMAN-UAT.md` require live Blaze:

1. **UAT-01** — Panel renders BELOW Tabs on Patient + non-Patient detail pages, and silent null on Provenance.
2. **UAT-02** — Card click navigates to filtered explorer view on live data.
3. **UAT-03** — Loading skeletons appear on Slow 3G.

The HUMAN-UAT.md scaffold is committed; tester walks the 3 verifications post-merge and fills in the sign-off block.

### Gaps Summary

One real correctness gap surfaces from the code review (48-REVIEW.md WR-01) that the existing test suite does not catch:

- **State-key collision in `RelatedResourcesPanel`.** The `counts` Record is keyed by `e.type` only. The `Observation` source-type catalog contains two entries with `type: 'Observation'` (`has-member`, `derived-from`). All three of the `Observation` source-type's parallel fetches resolve into the same `Observation` map slot — last-write-wins. Consequence: when a user views an Observation detail page, the populated card grid will show at most ONE Observation card even when both has-member and derived-from queries return real counts. Other source types (Patient, Condition, Encounter, MedicationStatement, Procedure, DiagnosticReport, AllergyIntolerance, Practitioner) each have unique target ResourceTypes within their own list and are unaffected today — but the bug will resurface for any future catalog edit that adds multiple params for the same target type.

  **Fix sketch:** introduce `const key = (e: ReverseReferenceEntry) => `${e.type}:${e.param}`` and route initial map seeding (line 36), fetch resolve (line 46), fetch reject (line 50), populated filter (line 58), JSX `key` prop (lines 73, 82), and `counts[...]` reads (lines 73, 82, 94) through it. Add a regression test feeding two same-type entries with different params and asserting both cards render with the correct counts.

  **Phase-scope decision:** This bug only manifests in the Observation source-type detail and was flagged in 48-REVIEW.md but not patched. Per the phase-orchestrator note in `<verification_focus>`, recommend either (a) opening Phase 48.1 to fix or (b) accepting and tracking. The fix is small (~10 line edits + 1 test) but the verification cannot mark Phase 48 as `passed` while a known correctness bug ships in REVR-02-touched code.

All other phase-48 deliverables match the plan: catalog correct, components implemented, mount-point relocated, snapshot regression baseline preserved, 24/24 phase-48 tests green, TypeScript clean, build clean, full suite at the documented baseline (1370 pass + 1 pre-existing Phase 40 carry-over).

---

_Verified: 2026-05-01T20:35:00Z_
_Verifier: Claude (gsd-verifier)_
