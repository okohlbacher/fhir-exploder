---
phase: 36
slug: phase-34-profile-lazy-load-bundle-size-waiver-follow-up
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-25
re_audited: 2026-04-29
re_audited_by: phase-39
notes: |
  Retroactively flipped from `nyquist_compliant: false` on 2026-04-29 under
  Phase 39 NYQ-01. Phase 36 shipped 1060 passing / 0 failing (per
  36-04-SUMMARY.md regression gate) AND its primary deliverable (lazy-load
  472 MII extension StructureDefinition JSONs into async-only chunks)
  shrank initial-load bundle by 320.57 KB gz (927.33 → 606.76 KB), which
  closed the orphan-export integration finding from the 2026-04-25 audit
  (`getExtensionProfileForUrl + BUNDLED_EXTENSION_PROFILE_URLS` consumer
  now lives in src/hooks/useConformanceRun.ts:29-30, 190, 200). Per-REQ
  coverage: src/quality/profiles/__tests__/extensionProfile.test.ts
  (5 tests covering the lazy-loader contract) + the full regression
  suite (1060 passing). Wave-0 + per-task table unchanged.
---

# Phase 36 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.4 + @testing-library/react 16.3.2 + jsdom 29.0.2 |
| **Config file** | `vite.config.ts` (Vitest reads Vite config) |
| **Quick run command** | `npx vitest run src/quality/profiles src/hooks/useConformanceRun src/__tests__/completeness-hook` |
| **Full suite command** | `npm test` (alias for `vitest run`) |
| **Estimated runtime** | Quick: ~5 s · Full: ~30–60 s |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/quality/profiles src/hooks/useConformanceRun`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green AND treemap delta committed
- **Max feedback latency:** ~5 s for per-task quick run; ~60 s for full-suite wave gate

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 36-01-01 | 01 | 0 | MII-EXT-12 (lazy-load) | — | static-string `import()` only (no path injection) | unit (Wave 0 stub) | `npx vitest run src/quality/profiles/__tests__/extensionProfile.test.ts` | ❌ W0 | ⬜ pending |
| 36-01-02 | 01 | 0 | MII-EXT-12 (consumer) | — | URL is Map-lookup key only (no eval/fetch) | integration (Wave 0 stub) | `npx vitest run src/__tests__/conformance-run-extension-profiles.test.tsx` | ❌ W0 | ⬜ pending |
| 36-02-01 | 02 | 1 | MII-EXT-12 (lazy-load) | — | N/A | unit | `npx vitest run src/quality/profiles/__tests__/extensionProfile.test.ts` | ❌ W0 | ⬜ pending |
| 36-02-02 | 02 | 1 | MII-EXT-12 (lazy-load) | — | N/A | type-check | `npx tsc -b --noEmit` | ✅ | ⬜ pending |
| 36-03-01 | 03 | 2 | MII-EXT-12 (consumer) | — | N/A | integration | `npx vitest run src/__tests__/conformance-run-extension-profiles.test.tsx` | ❌ W0 | ⬜ pending |
| 36-04-01 | 04 | 3 | MII-EXT-12 (bundle-size) | — | N/A | manual diff | `ANALYZE=1 npm run build && find dist/assets -type f \( -name "*.js" -o -name "*.css" \) -exec gzip -9c {} \; \| wc -c` | ✅ (script) | ⬜ pending |
| 36-04-02 | 04 | 3 | MII-EXT-12 (regression) | — | N/A | suite | `npm test` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*Task IDs are placeholder shapes; planner finalizes counts/IDs in PLAN.md.*

---

## Wave 0 Requirements

- [ ] `src/quality/profiles/__tests__/extensionProfile.test.ts` — stubs for MII-EXT-12 lazy-load clause (async API, memoization, dedup, null-on-unknown-URL)
- [ ] `src/__tests__/conformance-run-extension-profiles.test.tsx` — stubs for MII-EXT-12 consumer clause (mocks `meta.profile[]`; asserts `getExtensionProfileForUrl` invoked + extension SD reaches `validateConformance`)
- [ ] `.planning/phases/36-.../36-visualizer-before.html` — copy of post-Phase-35 baseline treemap (run `ANALYZE=1 npm run build` on current `main`, copy `dist/bundle-stats.html`)

*Framework already installed (Vitest, @testing-library/react, jsdom polyfill, MantineProvider wrappers all present).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Bundle-delta ≤ 100 KB gz | MII-EXT-12 (bundle-size clause) | Treemap diff is a one-shot measurement, not a unit-testable assertion | 1. Run `ANALYZE=1 npm run build` on Phase 35 HEAD; copy `dist/bundle-stats.html` → `36-visualizer-before.html`. 2. After all code tasks land, run `ANALYZE=1 npm run build` again; copy → `36-visualizer-after.html`. 3. Measure both with `find dist/assets -type f \( -name "*.js" -o -name "*.css" \) -exec gzip -9c {} \; \| wc -c`. 4. Assert (after − before) ≤ 100 KB gz initial-load delta (i.e. excluding async-only chunks). |
| Treemap shows extension JSONs in async-only chunks | MII-EXT-12 (lazy-load clause structural proof) | Visual inspection of treemap | Open `36-visualizer-after.html` in a browser; confirm `extensions-*.js` appears under "async chunks" section, NOT in the initial-load bar. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (extensionProfile.test.ts + conformance-run-extension-profiles.test.tsx + 36-visualizer-before.html)
- [ ] No watch-mode flags (`vitest run`, not `vitest`)
- [ ] Feedback latency < 60 s (full suite); < 5 s (quick run)
- [ ] `nyquist_compliant: true` set in frontmatter (after planner finalizes task IDs and Wave 0 file list)

**Approval:** pending
