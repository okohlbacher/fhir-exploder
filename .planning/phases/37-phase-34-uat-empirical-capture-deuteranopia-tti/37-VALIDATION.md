---
phase: 37
slug: phase-34-uat-empirical-capture-deuteranopia-tti
status: complete
nyquist_compliant: false
wave_0_complete: partial
created: 2026-04-26
re_audited: 2026-04-29
re_audited_by: phase-39
pending: DEUT-01 in Phase 40
notes: |
  Phase 37 retroactively reviewed 2026-04-29 under Phase 39 NYQ-01.
  `nyquist_compliant` REMAINS `false` per CONTEXT D-05: the deuteranopia
  leg of UAT-FU-CC was deferred at the human-verify gate by user
  2026-04-28 (3 PNG screenshots not captured; 21 paper-vs-empirical pair
  reconciliations remain qualitative-only — see 37-EMPIRICAL.md §1+§2
  [deferred] cells, including HIGH-risk pair #7 mikrobiologie ↔
  molekulargenetik and MEDIUM-HIGH pair #12 pro ↔ seltene). The TTI leg
  shipped fully (single regression test against React.Profiler);
  structural EMPIRICAL.md and per-pair tables exist. Closure path:
  DEUT-01 in v1.6 Phase 40 (headless Brettel/Machado JS matrix in
  Vitest, asserting per-pair discriminability for all 21 adjacent
  module pairs without manual Chrome DevTools capture). Phase 40's
  plan-close MUST flip this frontmatter to `nyquist_compliant: true`
  and remove the `pending:` key. status flipped draft → complete
  (Phase 37 shipped 2026-04-28 with the deuteranopia carry-over
  acknowledged); wave_0_complete: partial reflects TTI-only Wave-0
  closure.
---

# Phase 37 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
>
> **Phase character:** Measurement + reconciliation, not new code. Most verifications
> are artifact-existence + content-shape checks (`test -s file.png`, JSON-schema
> validation, grep for required sections in `37-EMPIRICAL.md`). No new unit tests
> introduced unless a contingency icon swap fires (then a single `MII_MODULES`
> reference test would update).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x (existing — `vitest run`) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run --reporter=dot --no-coverage --bail=1` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~25 seconds full suite (1060 tests) |
| **Artifact-shape checks** | `test -s {path}` + `node -e "JSON.parse(...)"` for JSON; `grep -q "^## §N"` for Markdown |

---

## Sampling Rate

- **After every task commit:** Artifact-existence check (`test -s` on the artifact the task produced) — runs in <1 second.
- **After every plan wave:** Run `npx vitest run --reporter=dot --no-coverage` — confirms no test regressions from icon swap (if any) or accidental import touch.
- **Before phase completion:** Full `npm test` MUST pass; full structural validation of `37-EMPIRICAL.md` (all 6 sections present, 7 within-family rows, 14 cross-family rows, TTI section populated, contradictions section non-empty or "0 contradictions" stamp).
- **Max feedback latency:** 25 seconds (unchanged from Phase 36 baseline; this phase adds no new tests).

---

## Per-Task Verification Map

> Plan-by-plan verification commands. Each `[BLOCKING] human-verify` task carries a `test -s` post-checkpoint gate so `--auto` mode cannot silently skip the capture (Pitfall 1 from RESEARCH).

### Plan 37-01: Deuteranopia Capture + Reconciliation (Wave 1)

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 37-01-01 | 01 | 1 | MII-EXT-11 | T-34-16 (synthetic PHI in screenshots — Phase 34 accepted disposition) | Capture against Synthea synthetic patient only | artifact-exists | `test -s .planning/phases/37-phase-34-uat-empirical-capture-deuteranopia-tti/deuteranopia-dashboard.png` | ❌ W0 | ⬜ pending |
| 37-01-02 | 01 | 1 | MII-EXT-11 | T-34-16 | Capture against Synthea synthetic patient only | artifact-exists | `test -s .planning/phases/37-phase-34-uat-empirical-capture-deuteranopia-tti/deuteranopia-tab-row.png` | ❌ W0 | ⬜ pending |
| 37-01-03 | 01 | 1 | MII-EXT-11 | T-34-16 | Capture against Synthea synthetic patient only | artifact-exists | `test -s .planning/phases/37-phase-34-uat-empirical-capture-deuteranopia-tti/deuteranopia-timeline.png` | ❌ W0 | ⬜ pending |
| 37-01-04 | 01 | 1 | MII-EXT-11 | — | Reconciliation table mirrors §4b/§4c with empirical column | content-shape | `grep -q "^## §1 Within-family pairs" 37-EMPIRICAL.md && grep -q "^## §2 Cross-family pairs" 37-EMPIRICAL.md` | ❌ W0 | ⬜ pending |
| 37-01-05 | 01 | 1 | MII-EXT-11 | — | All 7 within-family + 14 cross-family rows present | row-count | `awk '/^## §1/,/^## §2/' 37-EMPIRICAL.md \| grep -c "^\| " — expect ≥ 8 (7 data rows + header)` | ❌ W0 | ⬜ pending |

### Plan 37-02: TTI Before/After Capture (Wave 1, parallel)

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 37-02-01 | 02 | 1 | D-22 (TTI override) | T-34-17 (TTI tampering — Phase 34 accepted) | TTI capture documented (commits, throttling) | artifact-exists | `test -s .planning/phases/37-phase-34-uat-empirical-capture-deuteranopia-tti/tti-snapshot.json` | ❌ W0 | ⬜ pending |
| 37-02-02 | 02 | 1 | D-22 | — | JSON parses + has required fields | json-shape | `node -e "const j=require('./.planning/phases/37-phase-34-uat-empirical-capture-deuteranopia-tti/tti-snapshot.json'); for (const k of ['baseline_ms','post_phase_ms','delta_ms','delta_pct','patient_id','throttling','commits','runs_per_checkout','verdict']) if (!(k in j)) throw new Error('Missing: '+k)"` | ❌ W0 | ⬜ pending |
| 37-02-03 | 02 | 1 | D-22 | — | Dual-gate verdict applied (delta_ms ≤ 100 AND delta_pct ≤ 10) | computed-check | `node -e "const j=require('./.planning/phases/37-phase-34-uat-empirical-capture-deuteranopia-tti/tti-snapshot.json'); const ok = j.delta_ms <= 100 && j.delta_pct <= 10; if (j.verdict !== (ok ? 'PASS' : 'FAIL')) throw new Error('Verdict inconsistent with thresholds')"` | ❌ W0 | ⬜ pending |
| 37-02-04 | 02 | 1 | D-22 | — | Worktree cleanup confirmed | side-effect | `git worktree list \| grep -v "exploder-tti-baseline\|exploder-tti-postphase" \| wc -l — must equal pre-phase worktree count` | ❌ W0 | ⬜ pending |

### Plan 37-03: Contingency + Phase 34 Closure (Wave 2)

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 37-03-01 | 03 | 2 | MII-EXT-11 | — | Contradictions section populated (or "0 contradictions" stamp) | content-shape | `grep -E "^## §4 Contradictions" 37-EMPIRICAL.md && (grep -q "0 contradictions" 37-EMPIRICAL.md \|\| grep -q "^\| " 37-EMPIRICAL.md)` | ❌ W0 | ⬜ pending |
| 37-03-02 | 03 | 2 | MII-EXT-11 | — | If contingency triggered: §4d revision note added to color-design-audit.md | conditional-check | `if grep -q "swap triggered" 37-EMPIRICAL.md; then grep -q "## Revision (2026-04-26, Phase 37)" .planning/research/color-design-audit.md; else true; fi` | ❌ W0 | ⬜ pending |
| 37-03-03 | 03 | 2 | MII-EXT-11 | — | If icon swap fired: existing tests still pass | regression | `npm test -- --run` | ✅ existing | ⬜ pending |
| 37-03-04 | 03 | 2 | D-22, MII-EXT-11 | — | 34-06-UAT.md §1d filled (no `pending` placeholder) | content-shape | `! grep -E "^\\| \\[1d\\] \\| ⏳ pending" .planning/phases/34-14-mii-extension-modules-palette-bundled-profiles/34-06-UAT.md` | ❌ W0 | ⬜ pending |
| 37-03-05 | 03 | 2 | D-22 | — | 34-06-UAT.md §2 TTI table filled (no `pending` cells) | content-shape | `! grep -E "⏳ pending" .planning/phases/34-14-mii-extension-modules-palette-bundled-profiles/34-06-UAT.md` | ❌ W0 | ⬜ pending |
| 37-03-06 | 03 | 2 | D-22, MII-EXT-11 | — | 34-06-UAT.md §6 closure: items 1+2 marked done | content-shape | `awk '/Closure checklist/,EOF' .planning/phases/34-14-mii-extension-modules-palette-bundled-profiles/34-06-UAT.md \| grep -E "^- \\[x\\] Deuteranopia" && awk '/Closure checklist/,EOF' .planning/phases/34-14-mii-extension-modules-palette-bundled-profiles/34-06-UAT.md \| grep -E "^- \\[x\\] TTI"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

This phase has **no Wave 0 setup tasks**. All artifacts are produced as outputs of Wave 1/Wave 2 tasks; the verifier at each task gate confirms the artifact exists, parses correctly, or contains the required sections. No new test files or fixtures are introduced.

The single exception: if Plan 37-03 fires a contingency icon swap, an existing icon-rendering test in `MiiModuleTabs.test.tsx` (or sibling) MAY need a snapshot/fixture update. The planner identifies which file owns the icon registry (`src/utils/mii-icons.ts` per RESEARCH §6 / §3) and lists it in Plan 37-03's `files_modified` so executors know to re-run the suite.

*"Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Deuteranopia screenshot capture | MII-EXT-11 | Chrome DevTools Rendering panel UI is human-driven — no headless equivalent for the "Emulate vision deficiencies → deuteranopia" toggle in v3.41 (puppeteer can simulate via Brettel/Machado matrices but the audit predictions are anchored to Chrome's specific simulation; using a different simulator would break the paper-vs-empirical comparison) | (1) `npm run dev` → open `localhost:5173/dashboard`. (2) Cmd+Shift+P → "Show Rendering" → Emulate vision deficiencies → deuteranopia. (3) Cmd+Shift+P → "Capture full size screenshot". (4) Save as `deuteranopia-dashboard.png`. Repeat for `/patients/<patientId>` (tab row + ClinicalTimeline). |
| TTI capture (Performance panel) | D-22 | Chrome DevTools Performance panel TTI marker is human-read from a flame chart — no Performance API equivalent that returns the same value as Lighthouse's TTI metric | (1) Twin worktrees per RESEARCH §3. (2) Per checkout: `npm run preview --strictPort`, open Performance panel, Reload, wait for "Interactive" marker, record value. (3) Three runs per checkout, take median. (4) Write to `tti-snapshot.json` per schema. |
| HIGH/MEDIUM-HIGH pair empirical assessment | MII-EXT-11 | Visual judgment of icon distinctiveness under deuteranopia is human-perceptual; downstream contingency-swap decision flows from this judgment | Inspect `deuteranopia-tab-row.png` + `deuteranopia-timeline.png`. For each HIGH/MEDIUM-HIGH pair (mikrobiologie↔molekulargenetik; pro↔seltene): rate as PASS (visually distinct) or FAIL (cannot disambiguate). Record in `37-EMPIRICAL.md` §1/§2 empirical column. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or are documented in Manual-Only Verifications
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify (artifact-existence checks count)
- [ ] Wave 0 covers all MISSING references (N/A — no Wave 0 in this phase)
- [ ] No watch-mode flags (use `vitest run`, not `vitest`)
- [ ] Feedback latency < 30 seconds
- [ ] `nyquist_compliant: true` set in frontmatter (after planner emits plans + checker passes)

**Approval:** pending
