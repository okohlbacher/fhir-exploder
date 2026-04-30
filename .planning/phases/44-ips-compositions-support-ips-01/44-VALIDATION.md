---
phase: 44
slug: ips-compositions-support-ips-01
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-30
---

# Phase 44 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 1.x (no new deps) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run --no-coverage src/quality/__tests__/ipsBundleValidator.test.ts src/components/quality/__tests__/IPSPanel.test.tsx src/__tests__/license-ips.test.ts` |
| **Full suite command** | `npm test` (wraps `vitest run`) |
| **Estimated runtime** | quick ~3 s, full ~10 s |

---

## Sampling Rate

- **After every task commit:** Run quick command (per-file targeted on touched test family)
- **After every plan wave:** Run full suite (`npm test`)
- **Before `/gsd-verify-work`:** Full suite must be green; ≥1207 passing (Phase 43 baseline) + ~12 new tests projected by RESEARCH.md → target ≥1219 passing
- **Max feedback latency:** 10 s

---

## Per-Task Verification Map

> The planner fills the exact Task IDs and acceptance criteria; this map enumerates the test family per requirement so the planner has Nyquist coverage by construction.

| Task family | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| Trim function preserves required SD fields (path, sliceName, min, max, mustSupport) | 44-01 | 0 | IPS-01 | T-44-01 (profile shape integrity) | Trimmed JSON contains all 5 fields the walker reads; no field accidentally dropped | unit | `npx vitest run --no-coverage scripts/__tests__/trim-profile.test.mjs` (or `.ts` per planner) | ❌ W0 | ⬜ pending |
| Walker handles missing Composition gracefully (no crash, returns malformed-bundle issue) | 44-02 | 1 | IPS-01 | T-44-02 (malformed bundle defense) | `bundle.entry[0].resource.resourceType !== 'Composition'` → returns issue with severity `error`, code `structure`; no thrown exception | unit | `npx vitest run --no-coverage src/quality/__tests__/ipsBundleValidator.test.ts -t handles-missing-composition` | ❌ W0 | ⬜ pending |
| Walker resolves bundle.entry references; flags unresolvable refs with severity information | 44-02 | 1 | IPS-01 | T-44-03 (reference integrity) | Walker reads `Composition.section[].entry[].reference`; resolves against `bundle.entry[].fullUrl`; unresolved → issue severity `information` per D-09 | unit | `npx vitest run --no-coverage src/quality/__tests__/ipsBundleValidator.test.ts -t resolves-references` | ❌ W0 | ⬜ pending |
| Three-fixture regression (complete: 0 issues; incomplete: ≥2 issues; malformed: ≥2 issues) | 44-02 | 1 | IPS-01 | T-44-04 (regression coverage) | `complete` fixture → 0 issues. `incomplete` fixture (missing AllergyIntolerance section + empty Medications) → ≥2 issues with section path expression. `malformed` fixture → ≥2 issues including missing-Composition + bundle-type-not-document | unit (fixture) | `npx vitest run --no-coverage src/quality/__tests__/ipsBundleValidator.test.ts -t three-fixtures` | ❌ W0 (fixtures + walker test) | ⬜ pending |
| Severity classification (error/warning/information) per D-09 | 44-02 | 1 | IPS-01 | — | Walker assigns: section absent (min ≥1 slice missing) → `error`; section present + `entry` empty → `warning`; entry references unresolvable resource → `information` | unit | `npx vitest run --no-coverage src/quality/__tests__/ipsBundleValidator.test.ts -t severity-classification` | ❌ W0 | ⬜ pending |
| Section path expression format (`Composition.section[N].title`) per D-11 | 44-02 | 1 | IPS-01 | — | All issues carry `expression: ['Composition.section[<idx>].title']` so the issue table can sort/group by section | unit | `npx vitest run --no-coverage src/quality/__tests__/ipsBundleValidator.test.ts -t expression-path-format` | ❌ W0 | ⬜ pending |
| IPS_REGISTRY lazy-load: first call triggers dynamic import; second call hits cache | 44-01 | 1 | IPS-01 | — | `getIPSProfileForUrl(url)` returns the same StructureDefinition object on second call (cached); concurrent calls share the in-flight Promise | unit | `npx vitest run --no-coverage src/quality/profiles/ips/__tests__/index.test.ts` | ❌ W0 | ⬜ pending |
| `prepare` hook fetches IPS package without crashing on offline install | 44-01 | 1 | IPS-01 | — | `node scripts/fetch-ips-profiles.mjs` exits 0 when packages.fhir.org is unreachable (warn-and-continue per Phase 34 D-13 idiom); committed JSON in repo is authoritative | unit (mocked fetch) | `npx vitest run --no-coverage scripts/__tests__/fetch-ips-profiles.test.mjs` (or `.ts`) | ❌ W0 | ⬜ pending |
| LICENSE/ATTRIBUTION linkage to upstream IPS package | 44-01 | 1 | IPS-01 | T-44-05 (license compliance) | LICENSE file at repo root contains substring `hl7.fhir.uv.ips` AND `CC0-1.0`; `src/quality/profiles/ips/ATTRIBUTION.md` exists with package version pin (e.g. `2.0.0`) | grep test | `npx vitest run --no-coverage src/__tests__/license-ips.test.ts` | ❌ W0 | ⬜ pending |
| IPSPanel mounts, paste fixture, click Validate, ResourceIssueTable shows ≥2 rows | 44-02 | 2 | IPS-01 | T-44-06 (panel-walker integration) | Component test: `render(<IPSPanel />)`; paste `ips-bundle-incomplete.json` content into JsonInput; fireEvent.click(Validate); wait for `<ResourceIssueTable>` rows; assert ≥2 rows visible | component | `npx vitest run --no-coverage src/components/quality/__tests__/IPSPanel.test.tsx` | ❌ W0 | ⬜ pending |
| Default-off when profile not loaded (graceful fallback) | 44-02 | 2 | IPS-01 | — | If `getIPSProfileForUrl()` returns null (offline + no committed JSON), IPSPanel shows neutral "Profile not available" message; no crash, no console error | component | `npx vitest run --no-coverage src/components/quality/__tests__/IPSPanel.test.tsx -t profile-not-loaded` | ❌ W0 | ⬜ pending |
| Routing: `/quality/ips` reachable from sidebar | 44-02 | 2 | IPS-01 | — | App router has `/quality/ips` → IPSPanel; sidebar nav shows "IPS Validator" entry under Quality cluster | component (router-aware) | `npx vitest run --no-coverage src/__tests__/routing.test.tsx -t quality-ips` | ✅ existing routing test extends | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/quality/__tests__/ipsBundleValidator.test.ts` — stub file with ≥6 `describe.skip` blocks (T-44-02..T-44-04 + severity + expression-path + profile-not-loaded). Replaced with real assertions in Wave 1.
- [ ] `src/components/quality/__tests__/IPSPanel.test.tsx` — stub for component test (T-44-06). Replaced in Wave 2.
- [ ] `scripts/__tests__/trim-profile.test.mjs` (or `.ts` if vitest config doesn't include `scripts/`) — stub for T-44-01.
- [ ] `src/__tests__/license-ips.test.ts` — stub for T-44-05 (grep assertions).
- [ ] `src/quality/__tests__/fixtures/ips/` directory creation
- [ ] `src/quality/__tests__/fixtures/ips/ips-bundle-complete.json` — hand-crafted (or sourced from IPS package `package/example/` if planner decides per RESEARCH Q3)
- [ ] `src/quality/__tests__/fixtures/ips/ips-bundle-incomplete.json` — hand-crafted (deliberately missing AllergyIntolerance section + empty Medications)
- [ ] `src/quality/__tests__/fixtures/ips/ips-bundle-malformed.json` — hand-crafted (missing Composition entry, wrong bundle.type)
- [ ] No new framework install — vitest 1.x already covers all test types

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live-Blaze server picker mode resolves a real Composition resource and feeds it to walker | IPS-01 | Server-search round-trip needs a real connected Blaze with at least one Composition resource; mock server tests cover the wire shape but not Blaze-specific quirks (search param syntax, paging, AbortSignal handling) | Connect to a Blaze instance with ≥1 IPS-tagged Composition; open `/quality/ips`; switch to "Select from Server" tab; pick the Composition; click Validate; confirm walker output renders. Recorded in `44-HUMAN-UAT.md` Case A. |
| Large-bundle (≥500 KB) walker performance | IPS-01 | Synchronous walker may show UI lag on very large bundles; only observable with real-world bundle sizes | Paste a ≥500 KB IPS bundle into JsonInput; click Validate; observe whether UI freezes >250 ms. If yes, RESEARCH Pitfall recommends `requestIdleCallback` wrapper — escalate to deferred. Recorded in `44-HUMAN-UAT.md` Case B. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify (manual gates are limited to live-Blaze + perf — gated behind unit-tested foundations)
- [ ] Wave 0 covers all MISSING references (4 new test files + 1 new fixture directory + 3 fixtures)
- [ ] No watch-mode flags (every command uses `--run` via `vitest run`)
- [ ] Feedback latency < 10 s (quick command targets the IPS test family + license check; full suite ~10 s)
- [ ] `nyquist_compliant: true` set in frontmatter (planner flips this once all tasks have automated verifies + Wave 0 stubs are scheduled)

**Approval:** pending
