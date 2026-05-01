---
phase: 49
slug: theme-d-graph-view-reference-graph
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-01
---

# Phase 49 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Drawn from `49-RESEARCH.md` §"Validation Architecture".

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (existing project framework) + @testing-library/react (RTL) |
| **Config file** | `vitest.config.ts` (existing, no changes) |
| **Quick run command** | `npx vitest run src/components/explorer/__tests__/ResourceGraphView.test.tsx src/components/explorer/__tests__/useGraphBfs.test.ts` |
| **Full suite command** | `npm test` (full vitest run) |
| **Estimated runtime** | ~3 seconds quick / ~25 seconds full |
| **Build-time gate** | `npm run build` + bundle analyzer (rollup-plugin-visualizer dist/stats.html) for initial-load gz delta verification |

---

## Sampling Rate

- **After every task commit:** Run quick command (≤3s feedback)
- **After every plan wave:** Run full suite (≤25s feedback)
- **Before `/gsd-verify-work`:** Full suite green + bundle-budget gate green
- **Max feedback latency:** 25 seconds for code; 60 seconds for build-time bundle gate

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 49-01-01 | 01 | 1 | GRPH-01 | T-49-01-01 (Tampering: lazy-chunk integrity) | dep installed at exact version, no peer-dep conflict | unit | `npm ls @xyflow/react @dagrejs/dagre 2>&1 \| grep -E "@xyflow/react@12\\.\|@dagrejs/dagre@3\\."` exit 0 | ✅ W0 | ⬜ pending |
| 49-01-02 | 01 | 1 | GRPH-01 | — | lazy chunk code-split correctly | build | `npm run build && grep -l "xyflow" dist/assets/*.js \| head -1` returns chunk filename, NOT main `index-*.js` | ✅ W0 | ⬜ pending |
| 49-01-03 | 01 | 1 | GRPH-01 | — | "Graph" button mounts in ResourceDetailPage toolbar | RTL | `npx vitest run -t "Graph button mount"` exit 0 | ✅ W0 | ⬜ pending |
| 49-02-01 | 02 | 2 | GRPH-02 | T-49-02-01 (DoS: BFS explosion) | depth cap = 3, node cap = 150 enforced | unit | `npx vitest run -t "BFS depth cap"` exit 0 | ✅ W0 | ⬜ pending |
| 49-02-02 | 02 | 2 | GRPH-02 | T-49-02-01 (DoS: node explosion) | hard cap stops at 150 with truncation flag | unit | `npx vitest run -t "BFS node count cap"` exit 0 | ✅ W0 | ⬜ pending |
| 49-02-03 | 02 | 2 | GRPH-02 | — | parallel fetch fanout via Promise.all | RTL | `npx vitest run -t "parallel fetch fanout"` exit 0 | ✅ W0 | ⬜ pending |
| 49-02-04 | 02 | 2 | GRPH-03 | — | node click navigates to /explorer/{type}/{id} | RTL | `npx vitest run -t "node click navigation"` exit 0 | ✅ W0 | ⬜ pending |
| 49-02-05 | 02 | 2 | GRPH-03 | — | node label = summarizeResource(target).primary | RTL | `npx vitest run -t "node label renders summarizeResource"` exit 0 | ✅ W0 | ⬜ pending |
| 49-02-06 | 02 | 2 | GRPH-03 | — | edge label = FHIR reference field name | RTL | `npx vitest run -t "edge label field name"` exit 0 | ✅ W0 | ⬜ pending |
| 49-03-01 | 03 | 3 | GRPH-04 | T-49-03-01 (theme-leak: light styles in dark mode) | CSS-variable theme switch propagates without remount | RTL | `npx vitest run -t "theme switch invariant"` exit 0; assertion: `expect(refAfter).toBe(refBefore)` (DOM identity) | ✅ W0 | ⬜ pending |
| 49-03-02 | 03 | 3 | GRPH-04 | — | dagre TB layout produces non-overlapping positions | unit | `npx vitest run -t "dagre layout positions"` exit 0 | ✅ W0 | ⬜ pending |
| 49-03-03 | 03 | 3 | GRPH-01 | — | initial-load gz delta ≤ +5 KB | build | `node scripts/check-bundle-delta.cjs --max-delta-kb 5` exit 0 | ❌ W0 (script needs creation) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/components/explorer/__tests__/useGraphBfs.test.ts` — unit tests for BFS algorithm (depth cap, node count cap, parallel fanout, error recovery)
- [ ] `src/components/explorer/__tests__/ResourceGraphView.test.tsx` — RTL render tests (mount, node click, label render, theme switch invariant, edge labels)
- [ ] `src/components/explorer/__tests__/ResourceGraphNode.test.tsx` — RTL test for the node component (summary text, tooltip on secondary, root-node accent)
- [ ] `scripts/check-bundle-delta.cjs` — Node script that reads `dist/stats.html` (rollup-plugin-visualizer output) or runs gzip-size on the main chunk + lazy chunk; compares against a stored baseline (`scripts/.bundle-baseline.json`); exits 1 if main-chunk gz delta > maxDeltaKB
- [ ] `npm install @xyflow/react@12.10.2 @dagrejs/dagre@3.0.0` — pinned exact versions per RESEARCH.md §"Library Versions Pinned"
- [ ] `npm install --save-dev rollup-plugin-visualizer` — for bundle analysis (or use `vite-bundle-visualizer` package)
- [ ] `vitest.config.ts` — verify existing config supports React Flow's CSS module + ESM patterns (no expected changes; document in 49-01-PLAN.md if needed)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Pan / zoom feel on real Synthea data | GRPH-04 | Tactile UX (drag inertia, zoom snap) cannot be RTL-asserted; needs human eye | Open `/explorer/Patient/{id}/graph` against local Blaze, drag canvas, verify smooth pan; scroll-zoom in/out, verify zoom-to-cursor centering |
| Minimap interaction (drag minimap to navigate) | GRPH-04 | Spatial coordination test; RTL doesn't simulate canvas-drag well | In the same view, click-drag the minimap viewport rectangle, confirm main canvas pans to match; click in minimap, confirm canvas centers on click point |
| Dark-mode visual fidelity | GRPH-04 | Color contrast, edge stroke, label readability in dark mode is a perceptual judgment | Toggle Mantine color scheme to dark; visually inspect: nodes have readable text, edges are visible (gray-6 stroke), minimap mini-nodes are themed, controls are themed |
| Slow-3G loading skeleton appearance | GRPH-01 / D-12 | Network-throttling visualization not exercised by RTL fast mocks | Chrome DevTools → Network → Slow 3G; navigate to graph; confirm Mantine Skeleton placeholders appear during BFS fetch; populated graph fades in once resolved |
| Empty-graph alert message readability | D-13 | Layout / wording assessment | Navigate to a Provenance resource (likely 0 incoming references); confirm root node renders alone with Alert below |
| Truncation alert at 150 nodes | D-08 | Requires a real fan-out scenario; synthetic test asserts the flag, not the user-facing UI | On a Patient with >150 referencing resources, confirm the Alert appears: "Showing 150 nodes (graph truncated). Reduce depth or navigate to a child resource to explore further." |
| Browser back/forward respects history | D-16 | Routing test that's awkward in RTL (jsdom URL handling) | From `/explorer/Patient/abc/graph` click a child node, navigate to `/explorer/Encounter/xyz/graph`, press browser-back, confirm return to Patient graph (NOT to Patient detail page) |

---

## Threat Mitigation Verification

Three threats from the planner's `<threat_model>` block (Phase 49 has user-controlled depth + automated BFS over server data):

| Threat ID | Severity | STRIDE | Mitigation | Verified By |
|-----------|----------|--------|------------|-------------|
| T-49-01-01 | low | T (Tampering) | Lazy-chunk integrity — Vite build hash covers; SRI N/A for self-hosted | Build inspection |
| T-49-02-01 | medium | D (DoS) | Depth cap = 3 + node cap = 150 enforced in BFS code; cannot be bypassed via URL parameter | Unit test 49-02-01 + 49-02-02 |
| T-49-03-01 | low | I (Information Disclosure) | CSS theme variables route through Mantine; no PHI / token content in CSS layer | Theme-switch invariant test 49-03-01 + visual UAT |

No high-severity threats. Security gate (block on `high`) → PASS by absence.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (test files + bundle script + dep install)
- [ ] No watch-mode flags (use `vitest run` not `vitest`)
- [ ] Feedback latency < 25s for unit/RTL; < 60s for build-time bundle gate
- [ ] `nyquist_compliant: true` set in frontmatter after planner reviews and confirms test inventory complete

**Approval:** pending
