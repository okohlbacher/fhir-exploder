---
phase: 42
slug: 42-pre-probe-extension-module-counts-mii-ext-15
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-29
---

# Phase 42 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `42-RESEARCH.md` §Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (configured via `vitest.config.ts`, jsdom env, globals: true) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm test -- src/components/patients/__tests__/MiiModuleTabs.test.tsx` |
| **Full suite command** | `npm test` (1064+ existing baseline must remain green) |
| **Estimated runtime** | ~6 seconds quick run; ~45 seconds full suite |

**Existing scaffolding (no install needed):**
- `src/components/patients/__tests__/MiiModuleTabs.test.tsx` — Phase 34 baseline; Phase 42 extends with new `describe` blocks.
- `MantineProvider` wrap + `ResizeObserver` / `matchMedia` polyfills already in place at lines 14–36.
- `vi.mock('@medplum/react-hooks', () => ({ useMedplum: () => mocks.client }))` pattern at line 52–54.
- Mocked `client.get` returning `{ resourceType: 'Bundle', entry: [] }` at line 67–72.

---

## Sampling Rate

- **After every task commit:** Run `npm test -- src/components/patients/__tests__/MiiModuleTabs.test.tsx`
- **After every plan wave:** Run `npm test` (full suite)
- **Before `/gsd-verify-work`:** Full suite green + `npm run build` clean
- **Max feedback latency:** ~6s quick run; ~45s full suite

---

## Per-Task Verification Map

> Plan/Wave/Task IDs are placeholders that the planner finalises. Each row maps a Phase 42 behaviour (MII-EXT-15-X) to a verifiable test command.

| Sub-Req | Behavior | Test Type | Automated Command | File Exists | Status |
|---------|----------|-----------|-------------------|-------------|--------|
| MII-EXT-15-A | D-01 — Tab pill renders `Onkologie (12)` once count resolves | unit (component) | `npm test -- src/components/patients/__tests__/MiiModuleTabs.test.tsx -t "count appends"` | ✅ extends existing | ⬜ pending |
| MII-EXT-15-B | D-02 — Multi-type module shows summed count (Onkologie 4 types → sum) | unit | `npm test -- src/components/patients/__tests__/MiiModuleTabs.test.tsx -t "multi-type sum"` | ✅ extends existing | ⬜ pending |
| MII-EXT-15-C | D-03 — While fetching, label is just `Onkologie` (no `(…)`, no Loader, no skeleton) | unit | `npm test -- src/components/patients/__tests__/MiiModuleTabs.test.tsx -t "no placeholder"` | ✅ extends existing | ⬜ pending |
| MII-EXT-15-D | D-04 — Base 7 tabs receive no `count` prop, render no `(N)` suffix, no `data-testid="extension-tab-pill"` | unit | `npm test -- src/components/patients/__tests__/MiiModuleTabs.test.tsx -t "base exemption"` | ✅ extends existing | ⬜ pending |
| MII-EXT-15-E | D-05 — After all-zero pre-probe, `Hide N empty modules` toggle shows the correct N **without any tab click** | integration | `npm test -- src/components/patients/__tests__/MiiModuleTabs.test.tsx -t "pre-probe feeds toggle"` | ✅ extends existing | ⬜ pending |
| MII-EXT-15-F | D-05 — Idempotency: pre-probe + post-visit publisher both report `(moduleKey, true)` → no duplicate emptyCount; render count bounded | integration | `npm test -- src/components/patients/__tests__/MiiModuleTabs.test.tsx -t "idempotency"` | ✅ extends existing | ⬜ pending |
| MII-EXT-15-G | D-06 — `getByTestId('extension-tab-pill')` for a 0-count module has `data-empty="true"` AND `getComputedStyle(...).opacity === '0.55'` | unit | `npm test -- src/components/patients/__tests__/MiiModuleTabs.test.tsx -t "dim on zero"` | ✅ extends existing | ⬜ pending |
| MII-EXT-15-H | Cancelled-flag — rapid `patientId` change does not race-overwrite counts (delayed-resolve mock) | unit | `npm test -- src/components/patients/__tests__/MiiModuleTabs.test.tsx -t "cancellation"` | ✅ extends existing | ⬜ pending |
| MII-EXT-15-UAT | Live-Blaze — ≥3 extension tabs show non-zero counts on a real Synthea Onkologie patient | manual-only (live Blaze) | recorded in `42-HUMAN-UAT.md` | ❌ W0 (UAT scaffolding) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `42-HUMAN-UAT.md` — UAT scaffolding for MII-EXT-15-UAT (live-Blaze smoke against a Synthea Onkologie patient with ≥1 extension hit). Records pass/fail per ROADMAP §42 success criterion #4.
- [ ] (No new fixtures or framework installs needed — existing `MiiModuleTabs.test.tsx` infrastructure plus a small `makeCountClient(perTypeCount)` helper covers all unit/integration cases.)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| ≥3 extension tabs show non-zero counts on a real Onkologie patient | MII-EXT-15-UAT (ROADMAP §42 SC #4) | Requires running Blaze instance with Synthea data — not in CI | 1. Start Blaze + load Synthea Onkologie cohort. 2. `npm run dev`, navigate to a patient. 3. Confirm ≥3 extension tabs render `{germanLabel} (N)` with N>0. 4. Confirm ≥1 zero-count tab renders dimmed at 0.55 opacity. 5. Click into a 0-count tab → active-pill indicator remains visible (D-06 placement check). |
| `Hide N empty modules` toggle is accurate on patient mount | MII-EXT-15-E (visual confirmation) | Requires real data with mixed empty/non-empty extension modules | After patient mount completes, before any tab click, the toggle label N matches the visible dimmed-tab count. |

---

## ROADMAP §42 Success Criterion Coverage

| ROADMAP §42 Success Criterion | Covered By |
|-------------------------------|------------|
| 1. Hook fires `_summary=count` per extension module on mount, parallel via `Promise.all`, per-type `.catch(() => 0)`, cached per `(patientId, moduleId)` | MII-EXT-15-A, -B, -H + code review of cache key construction |
| 2. Tab labels render `{germanLabel} ({count})`; zero-count tabs at opacity 0.55 | MII-EXT-15-A + MII-EXT-15-G |
| 3. Unmount-safe behaviour on patient nav (ROADMAP wording: "AbortController threading" — research recommends cancelled-flag as functionally equivalent for the unmount-safe contract) | MII-EXT-15-H |
| 4. Live-Blaze UAT on ≥3 extension tabs with real Synthea Onkologie patient | MII-EXT-15-UAT (recorded in `42-HUMAN-UAT.md`) |

---

## Validation Sign-Off

- [ ] All tasks have an `<automated>` verify command, OR a Wave 0 dependency (UAT scaffolding) accounts for it
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers the only MISSING file (`42-HUMAN-UAT.md`)
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s for quick run, < 60s for full suite
- [ ] `nyquist_compliant: true` set in frontmatter once plans land and per-task IDs are wired

**Approval:** pending
