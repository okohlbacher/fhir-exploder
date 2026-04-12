---
phase: 4
slug: terminology-resolution
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-12
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: `.planning/phases/04-terminology-resolution/04-RESEARCH.md` §Validation Architecture

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.4 + jsdom 29 + @testing-library/react 16.3.2 |
| **Config file** | `vitest.config.ts` (existing) |
| **Quick run command** | `npm test -- src/__tests__/terminology-*.test.ts src/__tests__/resolved-resource.test.tsx src/__tests__/human-readable-view-terminology.test.tsx` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~5 seconds (quick) / ~25 seconds (full, projected with new files) |

---

## Sampling Rate

- **After every task commit:** Run quick command (<5s)
- **After every plan wave:** Run `npm test` (full suite)
- **Before `/gsd-verify-work`:** `npm test && npm run lint && npm run build` all green
- **Max feedback latency:** 5 seconds (quick), 30 seconds (full)

---

## Per-Task Verification Map

Plans will be numbered in the planning step; this map will be finalized once plan IDs are assigned. Projected coverage (from RESEARCH.md):

| # | Requirement | Behavior | Test Type | Automated Command | File | Status |
|---|-------------|----------|-----------|-------------------|------|--------|
| V-01 | TERM-01 | Resolver issues `CodeSystem/$lookup` with `system` + `code` | unit | `npm test src/__tests__/terminology-resolver.test.ts -- -t "issues lookup"` | ❌ W0 | ⬜ pending |
| V-02 | TERM-01 | Resolver extracts `display` from `Parameters` response | unit | `npm test src/__tests__/terminology-resolver.test.ts -- -t "extractDisplay"` | ❌ W0 | ⬜ pending |
| V-03 | TERM-01 | Resolver prefers German `designation` when `displayLanguage=de` | unit | `npm test src/__tests__/terminology-resolver.test.ts -- -t "prefers de designation"` | ❌ W0 | ⬜ pending |
| V-04 | TERM-01 | `useResolvedResource` enriches `Coding.display` in a real resource | integration | `npm test src/__tests__/resolved-resource.test.tsx -- -t "enriches display"` | ❌ W0 | ⬜ pending |
| V-05 | TERM-01 | `HumanReadableView` renders resolved German term via `ResourceTable` | component | `npm test src/__tests__/human-readable-view-terminology.test.tsx` | ❌ W0 | ⬜ pending |
| V-06 | TERM-02 | Second call to same `system\|code` hits cache (no second fetch) | unit | `npm test src/__tests__/terminology-cache.test.ts -- -t "cache hit dedup"` | ❌ W0 | ⬜ pending |
| V-07 | TERM-02 | Parallel calls to same code share one in-flight Promise | unit | `npm test src/__tests__/terminology-resolver.test.ts -- -t "dedups inflight"` | ❌ W0 | ⬜ pending |
| V-08 | TERM-02 | Cache persists to localStorage and re-hydrates on boot | unit | `npm test src/__tests__/terminology-cache.test.ts -- -t "localStorage roundtrip"` | ❌ W0 | ⬜ pending |
| V-09 | TERM-02 | "Clear terminology cache" removes all entries (memory + localStorage) | integration | `npm test src/__tests__/settings-clear-cache.test.tsx` | ❌ W0 | ⬜ pending |
| V-10 | TERM-02 | Cache namespaced by termserver URL prevents cross-server bleed | unit | `npm test src/__tests__/terminology-cache.test.ts -- -t "server url namespace"` | ❌ W0 | ⬜ pending |
| V-11 | TERM-03 | 404 / OperationOutcome → display remains unset, no throw | unit | `npm test src/__tests__/terminology-resolver.test.ts -- -t "silent on 404"` | ❌ W0 | ⬜ pending |
| V-12 | TERM-03 | Network error → negative cache entry with TTL, no throw | unit | `npm test src/__tests__/terminology-resolver.test.ts -- -t "silent on network error"` | ❌ W0 | ⬜ pending |
| V-13 | TERM-03 | Missing `system` or `code` → short-circuit, no fetch | unit | `npm test src/__tests__/terminology-resolver.test.ts -- -t "skips incomplete Coding"` | ❌ W0 | ⬜ pending |
| V-14 | TERM-03 | `HumanReadableView` with dead termserver still renders raw codes | component | `npm test src/__tests__/human-readable-view-terminology.test.tsx -- -t "fallback to code"` | ❌ W0 | ⬜ pending |
| V-15 | TERM-03 | `SettingsPage` shows "unreachable" indicator when probe fails | component | `npm test src/__tests__/terminology-health.test.ts -- -t "unreachable"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

All Phase 4 test files are new — no existing terminology test coverage:

- [ ] `src/__tests__/terminology-resolver.test.ts` — resolver core: lookup, extractDisplay, dedup, fallback (TERM-01, TERM-02, TERM-03)
- [ ] `src/__tests__/terminology-cache.test.ts` — cache Map, localStorage persistence, server URL namespacing, clear action (TERM-02)
- [ ] `src/__tests__/terminology-context.test.tsx` — `TerminologyProvider` constructs resolver from settings; `useTerminology` throws outside provider
- [ ] `src/__tests__/resolved-resource.test.tsx` — `useResolvedResource` integration with mocked MedplumClient; one fetch per unique code (TERM-01)
- [ ] `src/__tests__/human-readable-view-terminology.test.tsx` — e2e component: Condition + ICD-10 coding + mocked $lookup → German display; failed lookup → raw code (TERM-01, TERM-03)
- [ ] `src/__tests__/terminology-health.test.ts` — probe succeeds / fails / times out / not-configured (D-08)
- [ ] `src/__tests__/settings-clear-cache.test.tsx` — click "Clear terminology cache" empties Map and removes localStorage keys under prefix
- [ ] `src/__tests__/fixtures/terminology.ts` — shared `mockMedplumClientForTerminology()` returning canned `Parameters` responses keyed by URL regex

**Framework install:** None — Vitest 4 + jsdom 29 + testing-library already in `package.json`.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual German term rendering in live browser against real Ontoserver | TERM-01 | Requires real network; automated tests mock MedplumClient | 1. `npm run dev`  2. Connect to Blaze with a Condition resource containing ICD-10 `E11.9`  3. Open patient detail → Conditions tab  4. Verify "Diabetes mellitus Typ 2" appears in place of code |
| "Clear terminology cache" settings action end-to-end UX | TERM-02, D-06 | Settings UI behavior — confirm user flow | 1. Resolve a few codes (observe cache fills via devtools)  2. Click Clear in settings  3. Navigate back to resource — observe re-fetch |
| Connection status indicator shows termserver health | D-08 | Visual UX tied to Phase 1 indicator | 1. Start app with reachable termserver → green  2. Point settings to `http://127.0.0.1:9/fhir` → reload → red/unreachable  3. Point to Ontoserver → reload → green |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s (quick) / 30s (full)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
