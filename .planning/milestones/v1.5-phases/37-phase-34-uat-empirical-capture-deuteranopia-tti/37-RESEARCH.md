# Phase 37: Phase 34 empirical UAT capture (deuteranopia + TTI) — Research

**Researched:** 2026-04-26
**Domain:** Browser-driven UAT capture (Chrome DevTools), color-vision empirical reconciliation, TTI measurement methodology, git worktree mechanics for split-checkout perf measurement
**Confidence:** HIGH on capture mechanics and contingency-swap state; MEDIUM on Chrome DevTools simulation algorithm specifics; HIGH on environment availability

## Summary

Phase 37 closes two `checkpoint:human-verify` gates that Plan 34-06 explicitly carried forward: (1) three deuteranopia screenshots reconciled against `color-design-audit.md` §4b/§4c paper predictions (7 within-family + 14 cross-family pairs), and (2) before/after TTI snapshots at commit `048e99c` (Phase 33 tail) versus Phase 34 HEAD on `/patients/:id`, written to `tti-snapshot.json`. The work is human-execution-bound — Chrome DevTools' Rendering panel (vision-deficiency emulation) and Performance panel (TTI metric read) have no CLI/API surface this project uses, so plans must structure each capture step as a hard pause where the executor stops, the user operates Chrome, and the executor resumes only after artifact files exist on disk.

A critical empirical reality discovered during research: the §4d contingency icon swaps that CONTEXT D-09 names as "fire only if empirical fails" are **already shipped in the Phase 34 baseline**. `IconBacteria` and `IconQuestionnaire` (and `IconFileSignature` for the consent base module) are NOT exported by `@tabler/icons-react@3.41.1`; Plan 34-04 already applied the UI-SPEC fallbacks (`IconVirus`, `IconListCheck`, `IconFileCertificate`) unconditionally. This means the §4d contingency-swap path described in CONTEXT D-09 cannot fire as written — the alleged "primary" icons do not exist as targets to swap to, and the alleged "fallback" targets are what's already rendered. Phase 37 must surface this in `37-EMPIRICAL.md` §5 and treat any HIGH/MEDIUM-HIGH empirical failure as a NEW search for an alternative icon, not a swap to the audit's named fallback.

**Primary recommendation:** Plan 37-01 (deuteranopia) must execute against `npm run dev` on the current `main` branch with the live Blaze server (already up at localhost:8080, 975 Synthea patients). Plan 37-02 (TTI) requires a `git worktree add /tmp/exploder-tti-baseline 048e99c` plus a fresh `npm install` in that worktree (lockfile diverges — Phase 34 added `fhir-package-loader` devDep). For the post-phase TTI capture, the gate compares against **Phase 34 HEAD** (commit `a7e4544`), not current `main` HEAD — Phase 36 lazy-loaded the 225 KB profiles chunk after Phase 34 closed, so measuring current HEAD would conflate Phase 34's regression with Phase 36's mitigation. Use `git worktree add /tmp/exploder-tti-postphase a7e4544` for the post-phase TTI capture as well, which keeps both measurements on disjoint trees and the main working tree clean for Plan 37-03 contingency commits.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Artifact Locations
- **D-01:** All Phase 37 artifacts (3 deuteranopia PNGs, `tti-snapshot.json`, `37-EMPIRICAL.md`) commit to `.planning/phases/37-phase-34-uat-empirical-capture-deuteranopia-tti/`. ROADMAP §Phase 37 is authoritative; the older path in `34-06-UAT.md` (`.planning/phases/34-14-.../`) predated Phase 37 promotion and is superseded. Update `34-06-UAT.md` cross-references in the same commit set.
- **D-02:** Filenames are fixed (no slug variation): `deuteranopia-dashboard.png`, `deuteranopia-tab-row.png`, `deuteranopia-timeline.png`, `tti-snapshot.json`, `37-EMPIRICAL.md`.

#### Capture Methodology
- **D-03:** Deuteranopia capture follows `34-06-PLAN.md` Task 1 verbatim — Chrome DevTools Rendering panel → Emulate vision deficiencies → deuteranopia → full-viewport PNG via `Cmd+Shift+P` → "Capture full size screenshot". Run against `npm run dev` on the Phase 34 HEAD checkout (no production build needed for the visual capture).
- **D-04:** TTI capture follows `34-06-PLAN.md` Task 2 verbatim — `npm run build && npm run preview`, Chrome DevTools Performance panel, three consecutive recordings per checkout, **median** value goes into `tti-snapshot.json`. No CPU/network throttling (default = "No throttling", CPU 1×) so the gate measures real app behavior, not synthetic device profiles. Document the throttling explicitly in `tti-snapshot.json` so a future re-capture is reproducible.
- **D-05:** Patient ID for TTI capture is **deterministic** — pick the first Synthea patient alphabetically by `name[0].family` from the loaded bundle, record the chosen `Patient.id` in `tti-snapshot.json` under a `patient_id` field. This makes the run reproducible without hard-coding a magic ID.
- **D-06:** Baseline checkout (commit `048e99c`) runs in a temporary git worktree (`git worktree add /tmp/exploder-tti-baseline 048e99c`) so the main working tree is undisturbed. Run `npm install` in the worktree (lockfile may differ from current — confirm before measuring). Remove the worktree after capture.

#### Reconciliation & Gates
- **D-07:** `37-EMPIRICAL.md` structure mirrors `color-design-audit.md` §4b/§4c with an added `Empirical` column per row. Required sections:
  1. **§1 Within-family pairs** — 7 rows (matching §4b), columns: Family / Pair / Paper prediction / Empirical / Agree?
  2. **§2 Cross-family pairs** — 14 rows (matching §4c), same columns
  3. **§3 TTI** — baseline_ms, post_phase_ms, delta_ms, delta_pct, dual-gate verdict
  4. **§4 Contradictions** — list of pairs where Paper ≠ Empirical (or "0 contradictions — paper analysis confirmed empirically")
  5. **§5 Contingency commits triggered** — list of icon swap commits (or "None — no contingency triggered")
  6. **§6 34-06-UAT.md update** — cross-reference to the commit that closed items 1d + §2
- **D-08:** TTI dual gate — PASS only if `delta_ms ≤ 100` **AND** `delta_pct ≤ 10%`. Either threshold breach → FAIL → §3 must include a culprit-attribution paragraph (use `.planning/phases/36-.../36-visualizer-after.html` chunk treemap to identify which chunk grew, since that visualizer is post-Phase-34 plus lazy-load and represents the actual current state better than Phase 34's). Failure does not block phase completion if a waiver is justified per `34-06-PLAN.md` `<done>` waiver path.
- **D-09:** Contradiction handling — if a HIGH or MEDIUM-HIGH pair (`mikrobiologie ↔ molekulargenetik`, `pro ↔ seltene`) fails empirically, apply the §4d contingency swap **inline in this phase** as a separate commit:
  - `mikrobiologie` failure → swap `IconBacteria` → `IconVirus` in `MII_MODULES`
  - `pro` failure → swap `IconQuestionnaire` → `IconListCheck` in `MII_MODULES`
  - Update `color-design-audit.md` §4d with a `## Revision (2026-04-26, Phase 37)` note
  - Re-capture the affected screenshot(s) after the swap; both pre-swap and post-swap PNGs commit (pre-swap → `deuteranopia-{tab-row,timeline}-pre-swap.png`; post-swap takes the canonical filename)
- **D-10:** A LOW-risk pair failing empirically is informational only — log in §4 Contradictions, do **not** trigger a contingency swap. The §4d swap plan is reserved for HIGH and MEDIUM-HIGH pairs (see color-design-audit.md §4d narrative).

#### Phase 34 Closure
- **D-11:** This phase **updates** `34-06-UAT.md` (does not replace it):
  - §1d "Contradictions (pending empirical verification)" → fill with §4 of `37-EMPIRICAL.md`
  - §2 "TTI Regression Check" table → fill `pending` cells with empirical data
  - §6 closure checklist → mark items 1 + 2 as ✅ (or ❌ with override reference)
  - Phase 34's `34-VERIFICATION.md` status remains `passed` — the open items were `checkpoint:human-verify` gates explicitly carried forward, not gaps; Phase 37 closes the gates without re-opening Phase 34's verification.

#### Plans Shape (handed to planner)
- **D-12:** Three plans recommended by ROADMAP — Plan 37-01 deuteranopia capture + reconciliation (Wave 1), Plan 37-02 TTI capture (Wave 1, parallel with 37-01 — different artifacts, no file overlap), Plan 37-03 contingency commits + Phase 34 closure (Wave 2, depends on both 37-01 and 37-02 completing). If §4 Contradictions is empty after Wave 1, Plan 37-03 is a thin closure-only plan; otherwise it includes the icon-swap commits.
- **D-13:** Each capture plan has a `checkpoint:human-verify` gate at its capture step — the planner spawns the executor, the executor pauses at the capture step, the user runs Chrome DevTools manually and saves files, the orchestrator resumes the executor to commit. This is the standard pattern Plan 34-06 used.

### Claude's Discretion
- Exact phrasing of §4 Contradictions narrative (when present)
- Whether to include a §7 "Future hardening" section in `37-EMPIRICAL.md` (e.g., suggest a perceptual color-difference CI check, headless deuteranopia simulation in CI). Recommended: yes, brief, no commitment.
- The `tti-snapshot.json` schema beyond the required fields (`baseline_ms`, `post_phase_ms`, `delta_ms`, `delta_pct`, `patient_id`, `throttling`, `commits.{baseline,post_phase}`, `runs_per_checkout`, `verdict`) — planner may add additional metadata fields if useful.
- Whether to defer a "Future paper update" if empirical results substantively diverge — recommended: only if §4 Contradictions has ≥ 3 entries.

### Deferred Ideas (OUT OF SCOPE)
- **Headless deuteranopia simulation in CI** — A `puppeteer` + Brettel/Machado matrix script could capture the 3 PNGs automatically on every PR. Out of scope for Phase 37 (which is an empirical-vs-paper reconciliation, not a CI plumbing project). Note in `37-EMPIRICAL.md` §7 if §7 is included.
- **Perceptual ΔE2000 color-difference gate in CI** — A static lint that fails CI if any two adjacent tabs in `MII_MODULES` fall below a perceptual-distance threshold under deuteranopia simulation. Belongs in a future v1.6 hardening phase, not Phase 37.
- **Auto-update `color-design-audit.md`** — If Phase 37 finds substantive divergence (≥ 3 contradictions), a follow-up phase could rewrite §4b/§4c with empirical-anchored predictions. Not Phase 37's job; flag to backlog.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MII-EXT-11 (deferred clauses) | "Deuteranopia simulation pass confirms color + icon combination remains discriminable" — empirical capture deferred from Phase 34 (override 2 in `34-VERIFICATION.md`) | §Capture Procedure (deuteranopia) — exact Chrome DevTools steps; §Reconciliation Tables — paper predictions in §4b/§4c reproduced verbatim; §Contingency Mechanics — swap impossibility flagged |
| Phase 34 D-22 (TTI override) | "Patient-detail /patients/:id Time-to-Interactive unchanged from v1.4 baseline" — empirical capture deferred from Phase 34 (override 1) | §TTI Methodology — Performance panel TTI read; §Worktree Mechanics — twin-worktree pattern; §Pitfalls — preview port, fresh-tab cache, lockfile drift |

No new REQ-IDs introduced. ROADMAP §Phase 37 narrative is the scope-of-work source; CONTEXT.md D-XX decisions are the implementation contract.

</phase_requirements>

## Project Constraints (from CLAUDE.md)

These directives govern the entire phase and outrank any plan-level decision:

- **Tech stack:** React 18 + Vite 8 + TypeScript 5; Mantine 8 (peer of `@medplum/react`); `@tabler/icons-react@^3.41.1` already installed.
- **Runtime:** Local-only browser SPA against localhost or reachable FHIR server. No CI runners involved in Phase 37.
- **License:** MIT root + CC-BY-4.0 appendix for bundled MII profiles. Phase 37 touches neither (no new dependencies).
- **GSD workflow enforcement:** All edits must flow through a GSD command. Phase 37 plans are spawned via `/gsd-execute-phase`, not direct edits.
- **Do NOT use:** Tailwind, Mantine 9, `@tanstack/react-query`, SMART on FHIR libs (none of which are at risk in Phase 37).

## Standard Stack

### Core (already installed — Phase 37 introduces zero new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Chrome (browser) | 120+ on macOS (DevTools panel: Rendering "Emulate vision deficiencies" — Machado 2009 simulation matrix; Performance panel TTI marker) | Capture surface | Project already targets Chromium; DevTools Rendering panel ships the deuteranopia emulation natively [VERIFIED: Chromium docs] |
| Vite | ^8.0.4 | `npm run preview` for production-equivalent TTI capture | Already devDep; `preview` defaults to port 4173 [CITED: vite.dev/config/preview-options] |
| Git worktree | git 2.50+ | Twin-checkout for baseline (`048e99c`) + post-phase (`a7e4544`) measurement | Already used in Phase 36 for executor isolation; Phase 37 reuses the pattern [VERIFIED: project history] |
| @tabler/icons-react | ^3.41.1 | Icon registry; consulted in case of contingency swap | Already installed; verified `IconBacteria/IconQuestionnaire/IconFileSignature` are NOT exported in this version [VERIFIED: `node -e ...` probe at research time] |

### No New Packages

Phase 37 is a **measurement + reconciliation phase**. No runtime dependencies, no devDeps, no script additions. Contingency icon swaps (if any) edit existing files only (`src/utils/mii-modules.ts` + `src/utils/mii-icons.ts`).

**Version verification:**
```bash
npm view @tabler/icons-react version  # → 3.41.1 confirmed (same as installed)
```

## Architecture Patterns

### Pattern 1: Twin-Worktree TTI Capture

**What:** Capture baseline TTI in `git worktree add /tmp/exploder-tti-baseline 048e99c` and post-phase TTI in `git worktree add /tmp/exploder-tti-postphase a7e4544`. Each worktree gets its own `npm install` (lockfiles diverge). Main working tree (`/Users/kohlbach/Claude/Exploder` on `main`) stays clean for Plan 37-03 closure commits.

**When to use:** Any cross-commit performance measurement where lockfile drift, build cache, or dependency graph changes between commits could pollute the comparison.

**Example:**
```bash
# Baseline capture (Phase 33 tail)
git worktree add /tmp/exploder-tti-baseline 048e99c
cd /tmp/exploder-tti-baseline && npm install
npm run build && npm run preview -- --port 4173 --strictPort
# → Open http://localhost:4173/patients/<deterministic-id> in Chrome
# → DevTools > Performance > Record > reload > stop
# → Read TTI metric (ms) — repeat 3 times, take median
# → Record baseline_ms

# Post-phase capture (Phase 34 HEAD — NOT current main)
git worktree add /tmp/exploder-tti-postphase a7e4544
cd /tmp/exploder-tti-postphase && npm install
npm run build && npm run preview -- --port 4174 --strictPort
# → Same patient, same DevTools recording method
# → Record post_phase_ms

# Cleanup after capture (mandatory — these worktrees should NOT linger)
git worktree remove /tmp/exploder-tti-baseline
git worktree remove /tmp/exploder-tti-postphase
```

**Why two worktrees not one switched-back-and-forth:** A single worktree switching between `048e99c` and `a7e4544` would require `npm install` twice (delete + reinstall ~470 packages each direction; ~3 minutes of dead time per switch) AND would mix vite dist cache between checkouts. Twin worktrees parallelize the dependency installs and keep `dist/` builds isolated.

**Source:** Pattern locked by Phase 36 (executor worktrees in `.claude/worktrees/`); CONTEXT D-06 names `/tmp/exploder-tti-baseline` explicitly. [VERIFIED: project history + git worktree probe]

### Pattern 2: Hard-Pause `checkpoint:human-verify` with File-Existence Gate

**What:** Each capture step is a `<task type="checkpoint:human-verify" gate="blocking">` whose `<verify>` block checks that the artifact files exist on disk before allowing auto-resume. Under `--auto` mode, `human-verify` checkpoints auto-approve — but with a file-existence gate, auto-approval succeeds only when the user has actually saved the PNG/JSON.

**When to use:** Pre-planned manual browser actions under `--auto` mode where Plan 34-06's prior failure mode (gates auto-approved without artifacts existing → shelved to Phase 999.2 → became Phase 37) must not repeat.

**Example:**
```xml
<task type="checkpoint:human-verify" gate="blocking">
  <name>Task: Capture deuteranopia screenshots (Dashboard / tab-row / timeline)</name>
  <files>
    .planning/phases/37-.../deuteranopia-dashboard.png
    .planning/phases/37-.../deuteranopia-tab-row.png
    .planning/phases/37-.../deuteranopia-timeline.png
  </files>
  <how-to-verify>
    Step-by-step Chrome DevTools instructions (see §Capture Procedure below)
  </how-to-verify>
  <verify>
    <automated>
      test -s .planning/phases/37-.../deuteranopia-dashboard.png \
        && test -s .planning/phases/37-.../deuteranopia-tab-row.png \
        && test -s .planning/phases/37-.../deuteranopia-timeline.png
    </automated>
  </verify>
  <resume-signal>Type "approved" once all 3 PNGs exist on disk and reconciled against §4b/§4c.</resume-signal>
</task>
```

**Why `test -s` not `test -f`:** `test -f` returns true for empty files (zero-byte placeholder), which would auto-approve the checkpoint without real captures. `test -s` requires the file to exist AND be non-empty — mirrors Plan 34-06's `> 10000` byte sentinel for visualizer HTML.

**Source:** [VERIFIED: $HOME/.claude/get-shit-done/references/checkpoints.md lines 11, 282 + Plan 34-06's `<automated>` gate pattern]

### Pattern 3: Mirror-the-Paper Reconciliation Table

**What:** `37-EMPIRICAL.md` §1 + §2 reproduces the row structure of `color-design-audit.md` §4b (7 within-family rows) and §4c (14 cross-family rows) verbatim, adding only one column: `Empirical (PASS / FAIL)`. The Agree? column is computed: `Agree = (Paper prediction == Empirical result)`.

**When to use:** Paper-vs-empirical reconciliation. Mirroring the structure makes the audit trail one-to-one — a reviewer reading the paper alongside the empirical doc can scan rows in lockstep.

**Example layout:**

```markdown
## §1 Within-family adjacent pairs (mirrors color-design-audit.md §4b)

| Pair | Palette family | Icon A | Icon B | Paper | Empirical | Agree? |
|------|----------------|--------|--------|-------|-----------|--------|
| onkologie + mtb | oncology (red) | IconRadioactive | IconUsersGroup | ✅ | ✅ / ❌ | yes / no |
| ... 6 more rows | | | | | | |
```

**Source:** CONTEXT D-07 + audit doc §4b/§4c structure. [CITED: .planning/research/color-design-audit.md §4b lines 175-184, §4c lines 191-208]

### Anti-Patterns to Avoid

- **Single-run TTI:** TTI noise floor is 10-30 ms on a quiet macOS dev box; a single recording can be off by 25%+. Always 3 runs, take median. [CITED: 34-06-UAT.md §6b "noise floor"]
- **Measuring TTI on `main`, not Phase 34 HEAD:** Phase 36 lazy-loaded the 225 KB profiles chunk; current `main` TTI ≠ Phase 34 HEAD TTI. The gate question is "did Phase 34 regress vs Phase 33," and the only fair comparison is `048e99c` vs `a7e4544`. [VERIFIED: git log analysis 2026-04-26]
- **Sorting Patient by `family` via FHIR `_sort`:** Blaze rejects `_sort=family` and `_sort=name` with `OperationOutcome` "Unknown search-param ... in sort clause." The deterministic-first patient must be computed client-side over a fetched bundle. [VERIFIED: live curl probe against localhost:8080 at research time]
- **Capturing post-swap PNG over the canonical filename without preserving the pre-swap PNG:** The audit trail requires both. Pre-swap renames to `*-pre-swap.png`, post-swap takes the canonical filename. [LOCKED: CONTEXT D-09]
- **Editing `34-06-UAT.md` outside its existing structure:** The UAT doc has explicit "MUST be filled by human verifier" cells (§1d, §2 pending rows, §6 sign-off boxes). Phase 37's update fills cells; it does not restructure. [LOCKED: CONTEXT D-11]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Deuteranopia color simulation | A custom canvas pixel-shader applying Brettel/Machado matrices | Chrome DevTools Rendering panel native simulation (Machado 2009 model) | The audit doc explicitly bases its reasoning on Brettel 1997 / Machado 2009; Chrome's native rendering pipeline applies the simulation across the entire viewport including SVG icons, which a JS-only solution would have to walk the DOM to apply [VERIFIED: developer.chrome.com Chromium CVD doc] |
| TTI metric calculation | A custom long-task-observer measuring "interactive" via PerformanceObserver | Chrome DevTools Performance panel "TTI" marker in the Timings lane | Lighthouse's TTI definition has well-known edge cases (5-second quiet window, 50ms long-task threshold); the DevTools panel is the canonical reading for this gate [CITED: developer.chrome.com/docs/devtools/performance/reference] |
| Median-of-3 TTI calculation | Custom statistics in `tti-snapshot.json` | Just record `runs[]` + `median_ms` as numbers; Math.median = sort + middle of 3 | One-liner; the JSON serves as audit input, not as a stats library |
| Patient deterministic-first selection | Custom search-param-aware sort | Fetch `Patient?_count=1000&_summary=true`, sort client-side by `name[0].family || ''` (lexicographic), pick first non-empty | Blaze does NOT support FHIR `_sort=family` (verified at research time); 975 patients × ~2 KB summary = ~2 MB fetch — acceptable for a one-time deterministic pick |
| Bundle-size attribution narrative if TTI fails | Re-running rollup-plugin-visualizer fresh | Read `.planning/phases/36-.../36-visualizer-after.html` chunk treemap (already exists, 3.2 MB committed) | CONTEXT D-08 already names this artifact as authoritative for culprit attribution |

**Key insight:** Phase 37 is a measurement-and-reconciliation phase, not an engineering phase. The right answer for every "should we build this" question is "no — read the existing artifact."

## Runtime State Inventory

> Phase 37 is a measurement + (conditional) icon-swap phase. The icon-swap path is the only state-mutation surface; sections below address that case.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — `tti-snapshot.json` is a fresh artifact, not a rename. No existing records to migrate. | None |
| Live service config | None — Phase 37 does not touch external service configuration. Blaze server URL stays at `http://localhost:8080/fhir` (settings.yaml). | None |
| OS-registered state | None — Phase 37 does not register OS services. The `/tmp/exploder-tti-baseline` and `/tmp/exploder-tti-postphase` worktrees are explicitly ephemeral (CONTEXT D-06: "Remove the worktree after capture"). | Plan 37-02 must include explicit `git worktree remove` cleanup steps |
| Secrets/env vars | None — `vite preview` is a static-asset server; no env vars consumed beyond `ANALYZE` (irrelevant to Phase 37, that's a Phase-34 build-time flag). | None |
| Build artifacts | `dist/` directory in each worktree carries `npm run build` output; ephemeral, deleted with worktree removal. The `node_modules/` per worktree (~ 500 MB each via `npm install`) similarly. | Plan 37-02 cleanup step removes worktrees → indirectly removes dist + node_modules |

**Contingency-swap state surface (D-09 path, fires only if HIGH/MEDIUM-HIGH pair fails empirically):** edits to `src/utils/mii-modules.ts` + `src/utils/mii-icons.ts` only. Three test files would update if the swap fires (`mii-modules.test.ts` table row, `mii-icons.test.ts` ICON_MAP coverage, possibly a snapshot). No localStorage keys, no profile JSONs, no fetch script.

**Critical inventory finding:** the contingency-swap targets in CONTEXT D-09 (`IconBacteria → IconVirus`, `IconQuestionnaire → IconListCheck`) reference icons that **already are the rendered icons**. CONTEXT D-09 was written from the audit doc (which assumed `IconBacteria` was the primary), but Plan 34-04 already swapped to `IconVirus` because `IconBacteria` does not exist as an export in `@tabler/icons-react@3.41.1`. See §Common Pitfalls Pitfall 5 below for full detail.

## Common Pitfalls

### Pitfall 1: `--auto` mode auto-approves `checkpoint:human-verify` without artifacts existing
**What goes wrong:** Plan 34-06 used `checkpoint:human-verify` for both deuteranopia and TTI capture. Under `_auto_chain_active: true`, the orchestrator auto-approved the checkpoint, the executor moved on, and the artifacts were never produced — the work was shelved to Phase 999.2 and ultimately became Phase 37.
**Why it happens:** `$HOME/.claude/get-shit-done/references/checkpoints.md` line 11: "Auto-mode bypasses verification/decision checkpoints — When `workflow._auto_chain_active` or `workflow.auto_advance` is true in config: human-verify auto-approves." [VERIFIED: file read 2026-04-26]
**How to avoid:** Each capture checkpoint MUST carry an `<automated>` `<verify>` block that exits non-zero when files are missing or empty. `test -s <path>` (file exists AND non-empty) is the right primitive — `test -f` is too lax. The verify block runs DURING auto-approval; non-zero exit blocks the checkpoint despite auto-mode.
**Warning signs:** Plan PASS without the `.png` / `.json` files appearing on disk. Diff a fresh `git status` immediately after a "passed" checkpoint to detect this.

### Pitfall 2: Vite preview port collision (default 4173 not strict)
**What goes wrong:** `npm run preview` defaults to port 4173 but auto-increments if 4173 is occupied. If two worktrees try to run preview simultaneously (or the user has another vite preview instance lingering), the second run binds 4174 silently — and the user navigates to 4173, gets a stale build, and reads the wrong TTI.
**Why it happens:** Vite's preview server is non-strict on port by default. [CITED: vite.dev/config/preview-options — "If the port is already being used, Vite will automatically try the next available port"]
**How to avoid:** Each preview invocation uses an explicit different port AND `--strictPort` so a collision errors loudly: `npm run preview -- --port 4173 --strictPort` for baseline; `npm run preview -- --port 4174 --strictPort` for post-phase. If the user sees `Error: Port 4173 is in use`, kill the stale process before retrying.
**Warning signs:** TTI numbers that look identical between baseline and post-phase, OR a curl probe to 4173 returns content from the wrong commit.

### Pitfall 3: Chrome page cache pollutes second TTI run
**What goes wrong:** Chrome aggressively caches static assets between page reloads. The first reload after build measures cold-cache TTI; subsequent reloads measure warm-cache TTI. 3-run median is noise-suppression, NOT cold-cache enforcement.
**Why it happens:** DevTools' "Disable cache" checkbox in the Network panel is OFF by default; even with it on, ServiceWorker / memory cache effects can persist across reloads.
**How to avoid:** Two layers of defense: (1) DevTools > Network > "Disable cache" enabled while DevTools is open; (2) Use a "Hard Reload" (Cmd+Shift+R) for each of the 3 runs, or open a fresh Incognito window per checkout. The user's existing browser profile may have other tabs / extensions affecting CPU baseline — Incognito + no extensions removes that variance.
**Warning signs:** Run 1 = 1850 ms, Run 2 = 420 ms, Run 3 = 410 ms. The cliff between R1 and R2-3 is the cache effect. If observed, restart the browser tab and re-capture.

### Pitfall 4: Lockfile divergence between baseline and post-phase
**What goes wrong:** `git diff 048e99c HEAD -- package-lock.json` shows that Phase 34 added `fhir-package-loader@^2.2.4` devDep + transitively `@colors/colors`, `@dabh/diagnostics`, etc. The baseline worktree at `048e99c` has the OLD lockfile; running `npm install` produces a smaller `node_modules/` graph. This is correct (it matches the baseline reality), but it means `npm install` cannot be skipped — running `npm run build` against a `node_modules/` from the post-Phase-34 install would fail or produce a wrong build.
**Why it happens:** Each worktree's `node_modules/` is its own; git does not link them. CONTEXT D-06 explicitly notes "Run `npm install` in the worktree (lockfile may differ from current — confirm before measuring)."
**How to avoid:** Always run `npm install` (or `npm ci` if lockfile pre-pinning is desired) in each worktree before `npm run build`. Verify by spot-checking `node_modules/fhir-package-loader/` exists in `/tmp/exploder-tti-postphase` and does NOT exist in `/tmp/exploder-tti-baseline`.
**Warning signs:** Build errors complaining about missing modules; or worse, a silent build that uses a stale dependency tree.

### Pitfall 5: §4d contingency swap targets are already shipped — D-09 is unfireable as written
**What goes wrong:** CONTEXT D-09 reads "if `mikrobiologie` fails empirically → swap `IconBacteria` → `IconVirus` in `MII_MODULES`." But `IconBacteria` is NOT the currently-rendered icon for `mikrobiologie` — `IconVirus` is. The Plan 34-04 commit (`ab927d0`) swapped `IconBacteria → IconVirus` unconditionally because `IconBacteria` is not exported by `@tabler/icons-react@3.41.1`. Same applies to `IconQuestionnaire → IconListCheck` (`pro` module). See `34-06-UAT.md` §1c which documents this clearly.
**Why it happens:** The audit doc (`color-design-audit.md` §4d) was authored before Plan 34-04 discovered the package-availability gap. CONTEXT D-09 reproduces the audit's pre-swap-language verbatim without reflecting the post-swap reality.
**How to avoid:** If a HIGH/MEDIUM-HIGH pair empirically fails, the §4d contingency cannot fire as written. The plan must either (a) pick a NEW alternative icon (e.g., `mikrobiologie` → `IconBiohazard` or `IconParasite` if those exist; verify via `node -e "const i = require('@tabler/icons-react'); console.log(i.IconBiohazard, i.IconParasite)"`) or (b) document the empirical failure and accept it (icon-shape distinct already; no further automation possible). Plan 37-03 must surface this in `37-EMPIRICAL.md` §5 explicitly. Recommendation: discover the actual failure first, then choose between (a) and (b).
**Warning signs:** Empirical FAIL on `pathologie ↔ mikrobiologie` or `pro ↔ seltene` and the planner attempting to swap to icons that are already rendered.
**Verification at research time:**
```
node -e "const i = require('@tabler/icons-react'); ['IconBacteria','IconVirus','IconQuestionnaire','IconListCheck','IconFileSignature','IconFileCertificate'].forEach(n => console.log(n, '=>', typeof i[n]))"
# IconBacteria => undefined
# IconVirus => object
# IconQuestionnaire => undefined
# IconListCheck => object
# IconFileSignature => undefined
# IconFileCertificate => object
```

### Pitfall 6: TTI gate ambiguity — Phase 34 HEAD vs current main
**What goes wrong:** ROADMAP §Phase 37 SC2 says "post_phase_ms (at Phase 34 HEAD)." Phase 36 (which landed AFTER Phase 34) lazy-loaded the 225 KB profiles chunk — i.e., post-Phase-34's 225 KB regression was largely undone by Phase 36. If the planner captures post-phase TTI on current `main` HEAD instead of Phase 34 HEAD (`a7e4544`), the gate would conflate Phase 34's regression with Phase 36's mitigation, and the original D-22 question ("did Phase 34 regress vs Phase 33") becomes unanswerable.
**Why it happens:** "Phase 34 HEAD" is ambiguous in casual reading — `main` carries everything Phase 34 shipped plus Phase 35 + Phase 36. The git-precise meaning is the last commit of Phase 34, which is `a7e4544` "docs(phase-34): complete + evolve PROJECT.md."
**How to avoid:** Plan 37-02 hard-codes `a7e4544` as the post-phase commit ref. The worktree command is `git worktree add /tmp/exploder-tti-postphase a7e4544`. The `tti-snapshot.json` schema includes `commits.{baseline: "048e99c", post_phase: "a7e4544"}` to lock the audit trail.
**Warning signs:** `tti-snapshot.json` records `commits.post_phase` matching current main (`4554ea9` at research time) — that's wrong, must be `a7e4544`.

### Pitfall 7: Live Blaze sample-data drift between baseline and post-phase TTI
**What goes wrong:** Both worktrees connect to the same Blaze instance at `http://localhost:8080/fhir`. If a quality run / data import touches Blaze between the two captures, the same patient's resource counts could differ — but TTI of `/patients/:id` depends on initial fetch counts (which Phase 33 D-11 keepMounted invariant explicitly bounds to base-7-only on mount, so this is mostly mitigated for extension panels).
**Why it happens:** Patient-detail TTI is sensitive to base-module fetch latency (the 7 base panels fetch on mount due to keepMounted preserving them). If a synthetic data load fires between captures, fetch counts may shift.
**How to avoid:** Run baseline + post-phase captures back-to-back on the same Blaze state. Don't run a quality refresh between them. As a sanity check, both captures should observe the same `Patient?_count=1` summary (resource version IDs stable).
**Warning signs:** Baseline TTI = 1.8 s; post-phase TTI = 0.4 s — implausibly large delta in the wrong direction. Suggests Blaze state changed; restart and re-capture.

### Pitfall 8: Chrome DevTools deuteranopia simulation = Machado 2009, not Brettel 1997
**What goes wrong:** The audit doc §4a says "the Brettel 1997 and Machado 2009 simulation matrices project sRGB into an LMS cone-response space" — implying both models inform the paper analysis. But Chrome DevTools' native simulation uses Machado 2009 only, per the Chromium docs. If the audit's HIGH-risk prediction for `mikrobiologie ↔ molekulargenetik` (violet vs grape) was derived from Brettel-style reasoning (which collapses red-green more aggressively), Chrome's Machado-based render may show the pair as more discriminable than predicted, OR less — the two models produce slightly different mappings.
**Why it happens:** The audit's "qualitative reasoning" approach (§4a) doesn't bind to either model exactly; the empirical capture binds to whatever Chrome renders.
**How to avoid:** `37-EMPIRICAL.md` §3 (or §7 future-hardening) notes that the empirical capture is Machado-based per Chrome's implementation. If a paper-vs-empirical disagreement exists on the two HIGH/MEDIUM-HIGH pairs, the §4 Contradictions narrative can attribute (in part) to model mismatch — without invalidating either side. [CITED: developer.chrome.com Chromium CVD blog post]
**Warning signs:** Disagreement specifically on the HIGH-risk pair where the audit reasoned conservatively. Read disagreement as "Chrome shows more discrimination than expected" → no swap needed. Read agreement as "Chrome confirms paper" → no swap needed. Read disagreement-the-other-way as "Chrome shows less discrimination than paper expected" → contingency-swap candidate (but see Pitfall 5 — swap targets unfireable).

## Code Examples

Verified patterns. Where applicable, file:line references point to current `main` HEAD (commit `4554ea9`).

### Capture Procedure (deuteranopia)

```bash
# Source: 34-06-UAT.md §6a + 34-06-PLAN.md Task 1 <how-to-verify>
# Run from repo root (current main HEAD)
npm run dev
# → opens vite dev server on port 5173
# → in Chrome: open http://localhost:5173
```

Then in Chrome:
1. `Cmd+Option+I` (macOS) → DevTools opens.
2. Three-dot menu (top-right of DevTools) → **More tools** → **Rendering**.
3. In the Rendering panel, scroll to **Emulate vision deficiencies** → select **deuteranopia** from the dropdown. The viewport color shifts immediately.
4. Navigate to `http://localhost:5173/dashboard` → wait for the 21-tile MII tile grid to render (7 base + 14 extension under the "Show extension modules" partition).
5. `Cmd+Shift+P` to open the Command Menu → type "screenshot" → select **Capture full size screenshot** (NOT "Capture screenshot" — full-size includes content below the fold).
6. Save dialog appears → save as `.planning/phases/37-phase-34-uat-empirical-capture-deuteranopia-tti/deuteranopia-dashboard.png`.
7. Navigate to `http://localhost:5173/patients/<deterministic-patient-id>` → click "Show extension modules (14)" toggle → wait for all 21 tab pills (7 base + 14 extension) to render.
8. Repeat `Cmd+Shift+P` → "Capture full size screenshot" → save as `deuteranopia-tab-row.png`.
9. With the patient detail page still open, click the "Zeitleiste" (Timeline) tab → wait for at least 5-10 timeline entries to render.
10. `Cmd+Shift+P` → "Capture full size screenshot" → save as `deuteranopia-timeline.png`.
11. Reset DevTools: in Rendering panel, set "Emulate vision deficiencies" back to "No emulation" so subsequent work isn't tinted.

### Capture Procedure (TTI)

```bash
# Source: 34-06-PLAN.md Task 2 <how-to-verify> with Phase 37 D-04/D-06 refinements

# 1. Set up baseline worktree
git worktree add /tmp/exploder-tti-baseline 048e99c
cd /tmp/exploder-tti-baseline
npm install
npm run build
npm run preview -- --port 4173 --strictPort &
# → preview server on http://localhost:4173

# 2. In Chrome (Incognito, no extensions, ideally a fresh profile):
#    a. Open http://localhost:4173/patients/<deterministic-patient-id>
#    b. Cmd+Option+I → DevTools → Network tab → check "Disable cache"
#    c. Performance tab → click Record (●) → Cmd+Shift+R (hard reload)
#    d. Wait for the page to settle (timeline visible, no spinners)
#    e. Click Stop on Performance tab
#    f. Read TTI value from Timings lane (look for "Time to Interactive" marker)
#    g. Note the ms value
#    h. Repeat steps c-g two more times (total 3 runs)
# → Record runs[0..2], compute median → baseline_ms

# 3. Tear down baseline preview
kill %1   # or pkill -f "vite preview --port 4173"
cd /Users/kohlbach/Claude/Exploder

# 4. Set up post-phase worktree (Phase 34 HEAD)
git worktree add /tmp/exploder-tti-postphase a7e4544
cd /tmp/exploder-tti-postphase
npm install
npm run build
npm run preview -- --port 4174 --strictPort &

# 5. In the SAME Chrome Incognito window (cache state preserved consistent):
#    Repeat the 3-run measurement on http://localhost:4174/patients/<same-deterministic-patient-id>
# → Record runs[0..2], compute median → post_phase_ms

# 6. Compute deltas
# delta_ms = post_phase_ms - baseline_ms
# delta_pct = (delta_ms / baseline_ms) * 100

# 7. Cleanup
kill %1
cd /Users/kohlbach/Claude/Exploder
git worktree remove /tmp/exploder-tti-baseline
git worktree remove /tmp/exploder-tti-postphase
```

### Deterministic-First Patient Selection (client-side, since Blaze rejects `_sort=family`)

```bash
# Source: research-time probe (2026-04-26) confirmed _sort=family/_sort=name → OperationOutcome error
# Approach: fetch all patients (or first page), sort client-side, pick first non-empty family
curl -s "http://localhost:8080/fhir/Patient?_summary=true&_count=1000&_elements=id,name" \
  | python3 -c "
import json, sys
data = json.load(sys.stdin)
def famof(p):
    n = p.get('name') or [{}]
    return n[0].get('family') or ''
items = [(famof(e['resource']), e['resource'].get('id'))
         for e in data.get('entry', [])]
items_with_family = [t for t in items if t[0]]
items_with_family.sort(key=lambda t: t[0].lower())
fam, pid = items_with_family[0]
print(f'patient_id={pid} family={fam}')
"
# At research time: patient_id=DHNTYCOOT4UENOKH family=Abbott
```

Record the resulting `patient_id` in `tti-snapshot.json` under the `patient_id` field per CONTEXT D-05. Note: this ID is **stable across Blaze restarts only if the bundle isn't re-imported**. If Blaze data is re-loaded, re-run the selection — same family wins (alphabetical), but the Blaze-assigned `id` may differ.

### `tti-snapshot.json` Schema (suggested — planner finalises per D-13 discretion)

```json
{
  "schema_version": 1,
  "captured_on": "2026-04-26",
  "captured_by": "<human verifier name or 'oliver'>",
  "method": "Chrome DevTools Performance panel — TTI metric in Timings lane (Machado 2009 simulation NOT applied during TTI)",
  "throttling": {
    "cpu": "1x (off — no throttling)",
    "network": "no throttling"
  },
  "patient_id": "DHNTYCOOT4UENOKH",
  "patient_family_name": "Abbott",
  "route": "/patients/DHNTYCOOT4UENOKH",
  "commits": {
    "baseline": "048e99c",
    "post_phase": "a7e4544"
  },
  "preview_ports": {
    "baseline": 4173,
    "post_phase": 4174
  },
  "runs_per_checkout": 3,
  "baseline_runs_ms": [1234, 1218, 1247],
  "baseline_ms": 1234,
  "post_phase_runs_ms": [1289, 1295, 1280],
  "post_phase_ms": 1289,
  "delta_ms": 55,
  "delta_pct": 4.46,
  "gate": {
    "delta_ms_threshold": 100,
    "delta_pct_threshold": 10,
    "verdict": "PASS"
  },
  "notes": "Baseline at Phase 33 tail; post_phase at Phase 34 HEAD (NOT current main, which includes Phase 36 lazy-load mitigation). Phase 33 D-11 keepMounted invariant + Plan 34-05 Tabs root keepMounted=false combine to keep extension panels lazy."
}
```

### Reconciliation Table Skeleton for `37-EMPIRICAL.md`

```markdown
## §1 Within-family adjacent pairs (mirrors color-design-audit.md §4b)

7 rows (one per palette family). Paper predicted 7/7 PASS via icon-shape distinctness alone.

| Pair | Palette family | Icon A | Icon B | Paper | Empirical | Agree? |
|------|----------------|--------|--------|-------|-----------|--------|
| onkologie + mtb | oncology (red) | IconRadioactive | IconUsersGroup | ✅ | TBD | TBD |
| bildgebung + studie | imaging (cyan) | IconPhoto | IconClipboardData | ✅ | TBD | TBD |
| molekulargenetik + seltene | genetics (grape) | IconDna | IconPuzzle | ✅ | TBD | TBD |
| pathologie + mikrobiologie | pathology (violet) | IconMicroscope | IconVirus | ✅ | TBD | TBD |
| biobank + intensivmedizin | bioanalysis (teal) | IconTestPipe | IconBedFilled | ✅ | TBD | TBD |
| kardiologie + dokument | administration (indigo) | IconHeartbeat | IconFileDescription | ✅ | TBD | TBD |
| symptom + pro | patient-reported (pink) | IconMoodSmile | IconListCheck | ✅ | TBD | TBD |

## §2 Cross-family adjacent tabs (mirrors color-design-audit.md §4c)

14 rows. Paper predicted 14/14 PASS. Two flagged borderline:
- `mikrobiologie ↔ molekulargenetik` — HIGH color-collapse risk
- `pro ↔ seltene` — MEDIUM-HIGH color-collapse risk

| Left module | Right module | Palette pair | Color-collapse risk | Paper | Empirical | Agree? |
|-------------|--------------|--------------|---------------------|-------|-----------|--------|
| medikation | bildgebung | orange vs imaging-cyan | LOW | ✅ | TBD | TBD |
| ... 13 more rows from §4c ... | | | | | | |
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Lighthouse standalone CLI for TTI | Chrome DevTools Performance panel built-in TTI marker | Chrome 96+ | DevTools panel is the recommended interactive read; Lighthouse remains valid for CI but is not how Phase 37 captures (no CI involved) |
| Brettel 1997 simulation in CVD tools | Machado 2009 (Chromium) | Chrome 83+ | Chrome's deuteranopia emulation uses Machado 2009 matrix; the audit doc's reasoning is qualitative, so the model difference is acceptable but should be noted as a possible source of any disagreement [CITED: Chromium CVD blog] |
| `_sort=family` on FHIR R4 servers | Client-side sort over fetched bundle (Blaze does not implement `family` as a Patient `_sort` parameter) | n/a — Blaze design choice | Phase 37 must compute deterministic-first patient client-side (see Code Examples) |
| Single-run TTI | 3-run median TTI | Plan 34-05 narrative locked the noise-floor analysis | Required by CONTEXT D-04 |

**Deprecated / outdated:**
- The `IconBacteria` / `IconQuestionnaire` / `IconFileSignature` icon names referenced in `color-design-audit.md` §2b — these icons do NOT exist in `@tabler/icons-react@3.41.1`. Plan 34-04 swapped to UI-SPEC fallbacks (`IconVirus`, `IconListCheck`, `IconFileCertificate`) unconditionally. CONTEXT D-09's contingency-swap language reads as if the originals are still in play; planner must read this in context of `34-06-UAT.md` §1c.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Chrome DevTools Performance panel still surfaces an explicit "Time to Interactive" marker in the Timings lane on Chrome 120+ | §Capture Procedure (TTI) | LOW — the underlying Long-Tasks API is stable; if the visual marker label moved, the user can still read the equivalent metric (page becomes responsive after no long task in 5-second quiet window) [VERIFIED via web search 2026-04-26: developer.chrome.com/docs/devtools/performance/reference still references "Time to Interactive" but Core Web Vitals (LCP/CLS/INP) is now the emphasis — TTI marker is still present but less prominent] |
| A2 | The deterministic-first patient (`name[0].family` lexicographic ascending, non-empty filter) is `Abbott` family in the current Blaze fixture and resolves to a Patient.id with at least 5-10 timeline entries (sufficient for a meaningful timeline screenshot) | §Code Examples (Deterministic-First Patient) | MEDIUM — the patient may have sparse data; if the Timeline screenshot is unhelpfully empty, planner picks the next non-empty option (still alphabetical) and documents the bypass in `37-EMPIRICAL.md`. The deterministic-pick rule is alphabetical; "with at least N entries" is a separate orthogonal filter the user may apply. |
| A3 | Phase 34 HEAD is `a7e4544` (commit "docs(phase-34): complete + evolve PROJECT.md") | §Architecture Patterns (Twin-Worktree) + §Pitfalls (Pitfall 6) | HIGH — if the planner reads "Phase 34 HEAD" as `0e7dfe4` (last 34-06 code commit) instead, the post-phase TTI would miss the SUMMARY commits. In practice the SUMMARY commits don't change the bundle, so either resolution converges, but the audit trail in `tti-snapshot.json` should pick one and document it. Recommendation: `a7e4544` because it's the last commit explicitly labeled `phase-34`. |

**Risk note on A3:** If Phase 34 HEAD is interpreted differently (e.g., the last code-changing commit), the build output is identical because all post-Plan-34-05 commits are docs-only. So any of `0e7dfe4`, `15dfc1e`, `8532aa4`, `a7e4544` produce the same `dist/` and the same TTI. The audit-trail value is in pinning ONE.

If this table is empty: All claims in this research were verified or cited — no user confirmation needed. **Three assumptions logged** — none are blocking; A3 only needs the planner to commit to one interpretation.

## Open Questions (RESOLVED)

1. **Should the planner re-derive whether `IconBiohazard` / `IconParasite` / similar exist in Tabler 3.41.1, in case the §4d swap path needs to fire?**
   - What we know: `IconBacteria` / `IconQuestionnaire` are unavailable; `IconVirus` / `IconListCheck` are already shipped.
   - What's unclear: whether ALTERNATE swaps (away from current shipped icons) toward something MORE shape-distinct exist in 3.41.1.
   - **RESOLVED:** Plan 37-03 Task 2 Step 1 runs a `node -e ...` probe step BEFORE attempting any swap. If `IconBiohazard` (etc.) exist, swap candidates are open; if not, the path is "document as failure, no swap fires." Either way, surfaced in `37-EMPIRICAL.md` §5.

2. **Does the current Blaze fixture have any Synthea patient with all 14 extension modules populated, or are most extensions empty for every patient?**
   - What we know: `34-06-UAT.md` §6a says "should show at least 5-10 module entries if synthetic fixture has data; even 1 entry per module is acceptable." Phase 33-01 INVESTIGATION found "~zero MII-extension data on the Synthea fixtures."
   - What's unclear: the deuteranopia-timeline screenshot might show only base-module entries (which still demonstrates discriminability for the 7 base modules but not for extensions). This is acceptable — the audit's pair tests are about pairwise discriminability, not about every module being present in one screenshot.
   - **RESOLVED:** Plan 37-01 explicitly accepts "Timeline shows whatever the patient has" — no requirement that all 21 modules appear in one screenshot. The Dashboard tile grid + tab row screenshots already show all 21 (those are static UI structures). Documented in `37-EMPIRICAL.md` §1 narrative per Plan 37-01 Task 2.

3. **Should `37-EMPIRICAL.md` § "Future hardening" (§7) include a concrete recommendation, or is "noted as deferred" sufficient?**
   - What we know: CONTEXT marks this as Claude's discretion, recommends "yes, brief, no commitment."
   - What's unclear: granularity of recommendation.
   - **RESOLVED:** A 4-line §7 section noting two follow-up candidates: (a) headless deuteranopia simulation in Vitest using a Brettel/Machado JS implementation against rendered DOM colors; (b) ΔE2000 perceptual-distance lint over `MII_MODULES` palette adjacency. Both flagged v1.6+ candidates, no commitment. Implemented in Plan 37-01 Task 2 action and Plan 37-03 Task 1 Step 4.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Chrome browser | Both deuteranopia + TTI capture (DevTools Rendering + Performance panels) | ✓ | `/Applications/Google Chrome.app` exists [VERIFIED] | Firefox accessibility inspector has a similar emulation panel, but Performance-panel TTI semantics differ; not a drop-in fallback |
| Node.js | All `npm` commands | ✓ | v22.22.0 | — |
| npm | Build, install, preview | ✓ | 11.13.0 | — |
| git | Worktree setup | ✓ | 2.50.1 (Apple) | — |
| Live Blaze FHIR server | Both deuteranopia (dev server data) + TTI (preview build patient route) | ✓ | localhost:8080, responds 200, 975 Synthea patients [VERIFIED via curl] | If Blaze stops, neither capture is meaningful — both depend on real patient data rendering. Restart via existing project fixture |
| `@tabler/icons-react` for any contingency-swap probe | Plan 37-03 (only if §4 contradictions exist) | ✓ | 3.41.1 (installed); 3.41.1 (npm registry) | — |
| Vitest | Re-run tests after any contingency swap | ✓ | 4.1.4 (devDep) | — |
| Disk space for two worktrees + node_modules | Plan 37-02 TTI capture | ✓ | `/tmp` has space; each worktree adds ~600 MB (source + node_modules + dist) | Worktrees explicitly cleaned up post-capture per CONTEXT D-06 |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None.

**Special note on `vite preview` strict-port behavior:** by default, Vite preview will auto-increment if 4173 is in use — Plan 37-02 must use `--strictPort` to make collisions loud. [CITED: vite.dev/config/preview-options]

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 (already devDep) |
| Config file | `vitest.config.ts` (exists in repo root) |
| Quick run command | `npm test -- src/__tests__/mii-icons.test.ts` (only if contingency swap fires) |
| Full suite command | `npm test` (998 tests at Phase 34 close — must remain green) |

### Phase Requirements → Test Map

Phase 37 is fundamentally a **measurement/reconciliation phase, not an engineering phase**. Most "tests" are artifact-existence checks (covered by `<verify>` blocks on plan tasks), NOT vitest specs. The validation architecture is therefore largely structural assertions over the `.planning/phases/37-.../` directory rather than runtime test cases.

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MII-EXT-11 (deferred) | 3 deuteranopia PNGs exist + non-empty | artifact-existence | `test -s .planning/phases/37-.../deuteranopia-dashboard.png && test -s .planning/phases/37-.../deuteranopia-tab-row.png && test -s .planning/phases/37-.../deuteranopia-timeline.png` | ❌ (Wave 1 produces) |
| MII-EXT-11 (deferred) | `37-EMPIRICAL.md` §1+§2 contains 7 + 14 reconciliation rows with non-pending Empirical column | structural assertion | `grep -c "✅\|❌" .planning/phases/37-.../37-EMPIRICAL.md` returns ≥ 21 | ❌ (Wave 1 produces) |
| Phase 34 D-22 (TTI) | `tti-snapshot.json` parses + has numeric baseline_ms + post_phase_ms + delta_ms + delta_pct + verdict | schema assertion | `node -e 'const j = JSON.parse(require("fs").readFileSync(".planning/phases/37-.../tti-snapshot.json")); ["baseline_ms","post_phase_ms","delta_ms","delta_pct","patient_id","commits"].forEach(k => { if (j[k] === undefined) { console.error("missing:", k); process.exit(1); }}); if (typeof j.baseline_ms !== "number" || typeof j.post_phase_ms !== "number") { console.error("non-numeric"); process.exit(2); }'` | ❌ (Wave 1 produces) |
| Phase 34 D-22 (TTI) | TTI dual-gate verdict computed correctly | schema assertion | `node -e 'const j = require("./.planning/phases/37-.../tti-snapshot.json"); const passes = j.delta_ms <= 100 && j.delta_pct <= 10; if (j.gate.verdict === "PASS" && !passes) { console.error("verdict mismatch"); process.exit(1); }'` | ❌ (Wave 1 produces) |
| Phase 34 closure (D-11) | `34-06-UAT.md` §1d empty-result-set has been filled OR populated with contradictions | structural assertion | `! grep -q "(This subsection is populated by the human verifier" .planning/phases/34-.../34-06-UAT.md` | ❌ (Wave 2 produces) |
| Phase 34 closure (D-11) | `34-06-UAT.md` §2 TTI table no longer carries "⏳ pending" entries | structural assertion | `! grep -q "⏳ pending" .planning/phases/34-.../34-06-UAT.md` (in §2 specifically) | ❌ (Wave 2 produces) |
| Contingency swap (D-09, conditional) | If swap fires, `npm test` remains green (998+ tests) | runtime | `npm test` | ✅ existing infrastructure |
| Contingency swap (D-09, conditional) | If swap fires, `mii-icons.test.ts` still asserts ICON_MAP coverage | runtime | `npm test -- src/__tests__/mii-icons.test.ts` | ✅ existing test file |

### Sampling Rate
- **Per task commit:** `test -s <artifact>` for the artifacts the task produces (in `<verify>` block of the task itself).
- **Per wave merge:** All Wave 1 artifact-existence checks; if Wave 2 contingency swap fires, `npm test -- src/__tests__/mii-icons.test.ts` AND `npm test -- src/__tests__/mii-modules.test.ts`.
- **Phase gate:** Full `npm test` green (must end at 998+ passing / 0 failing — the Phase 34 D-24 baseline). Per `/gsd-verify-work` later.

### Wave 0 Gaps

None — existing test infrastructure covers all Phase 37 conditional paths. No new test files need to be created.

If contingency swap fires:
- `src/__tests__/mii-icons.test.ts` already covers ICON_MAP (28 tests at Phase 34 close).
- `src/__tests__/mii-modules.test.ts` already covers MII_MODULES rows (per-module D-17 contract test).
- Either swap edits `icon: 'IconVirus' → 'IconBiohazard'` (or wherever) which would require updating ONE assertion in mii-modules.test.ts (the row-table for that module) AND a new import + map entry in mii-icons.ts (which mii-icons.test.ts coverage will catch).

The "Wave 0 Gaps" tracking infrastructure expects test-file scaffolding gaps. Phase 37 has none — the tests already exist, the only question is whether existing assertions need updates for a swap. That's an in-task edit, not a Wave 0 scaffolding gap.

## Security Domain

> Phase 37 is a measurement + reconciliation phase. No new code paths, no new data ingress, no new authentication or authorization surface, no new validation/sanitization logic. ASVS analysis below is intentionally minimal.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | n/a — no auth surface introduced |
| V3 Session Management | no | n/a |
| V4 Access Control | no | n/a — Phase 37 reads data already exposed by `/patients/:id` (which already has the project's existing access model) |
| V5 Input Validation | no | n/a — no new inputs |
| V6 Cryptography | no | n/a |

### Known Threat Patterns for Capture Phase

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Synthetic PHI in screenshots committed to git | Information Disclosure | Captures use Synthea synthetic patients only (verified — Blaze instance loads `https://github.com/synthetichealth/synthea` data per identifier system observed at research time). Not real PHI. Plan 34-06 already accepted this trust boundary in `<threat_model>` T-34-16. [CITED: 34-06-PLAN.md threat_model] |
| TTI snapshot tampering | Tampering | Accepted per Plan 34-06 T-34-17: "TTI JSON could be hand-edited to fake a pass — accept (gate is human-judgment anyway; UAT reviewer re-runs if figures look suspicious)." Phase 37 inherits this disposition. |
| Worktree pollution leaking secrets | Information Disclosure | The worktrees use `/tmp/exploder-tti-baseline` and `/tmp/exploder-tti-postphase` — both ephemeral. The repo carries no secrets at rest (see `gsd-quick` history, `npx detect-secrets` patterns elsewhere in the project). `/tmp` cleanup is automatic on macOS reboot; explicit `git worktree remove` per CONTEXT D-06 is the standard belt-and-suspenders. |

No new threats unique to Phase 37 beyond Phase 34's already-accepted dispositions.

## Sources

### Primary (HIGH confidence)
- `.planning/phases/37-phase-34-uat-empirical-capture-deuteranopia-tti/37-CONTEXT.md` — locked decisions D-01..D-13
- `.planning/phases/34-14-mii-extension-modules-palette-bundled-profiles/34-06-PLAN.md` — verbatim capture procedures (Tasks 1, 2)
- `.planning/phases/34-14-mii-extension-modules-palette-bundled-profiles/34-06-UAT.md` — current UAT state (§1c contingency-swap fait-accompli; §2/§6 pending placeholders)
- `.planning/research/color-design-audit.md` §4a-§4e — paper predictions, contingency rationale
- `src/utils/mii-icons.ts` lines 22-85 — the actual icon imports + ICON_MAP shipped (verified `IconVirus`/`IconListCheck`/`IconFileCertificate` are post-swap targets, not swap candidates)
- Live `node -e "const i = require('@tabler/icons-react'); ..."` probe at research time — verified `IconBacteria`/`IconQuestionnaire`/`IconFileSignature` are NOT exported
- Live `curl http://localhost:8080/fhir/Patient` probe at research time — verified Blaze rejects `_sort=family`/`_sort=name`; verified 975 Synthea patients exist
- `git log` / `git worktree list` / `git diff 048e99c HEAD` probes at research time
- `package.json` lines 17, 50 — `@tabler/icons-react@^3.41.1` + `vitest@^4.1.4` confirmed
- `vite.config.ts` lines 1-46 — confirmed visualizer is `ANALYZE=1` gated; no preview-port override

### Secondary (MEDIUM confidence — official docs)
- [Vite Preview Options](https://vite.dev/config/preview-options) — preview port default 4173, auto-increments without `--strictPort`
- [Chrome DevTools Performance Reference](https://developer.chrome.com/docs/devtools/performance/reference) — TTI marker availability and reading
- [Chromium Color Vision Deficiency simulation blog post](https://developer.chrome.com/docs/chromium/cvd) — Chrome uses Machado 2009 algorithm
- [Tabler Icons](https://tabler.io/icons) — public icon catalogue (referenced by audit doc §2b for fallback verification)

### Tertiary (LOW confidence — for cross-reference)
- WebSearch on "Chrome DevTools deuteranopia algorithm 2026" — multiple sources confirm Machado 2009; one secondary source (DaltonLens) compares both Brettel and Machado approaches

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all tools already installed and version-verified
- Architecture (twin-worktree TTI capture, hard-pause checkpoint pattern, mirror-the-paper reconciliation): HIGH — patterns already used in Phase 34/36
- Pitfalls: HIGH on Pitfalls 1, 4, 5, 6 (verified via probes); MEDIUM on Pitfalls 2, 3, 7, 8 (cited from docs / general TTI noise knowledge)
- Contingency-swap impossibility (Pitfall 5): HIGH — verified at research time that `IconBacteria`/`IconQuestionnaire` are not in `@tabler/icons-react@3.41.1`
- Validation architecture: HIGH — measurement-and-reconciliation phase with artifact-existence gates
- Security: HIGH — mirrors Phase 34's already-accepted threat dispositions

**Research date:** 2026-04-26
**Valid until:** 2026-05-26 (30 days — stable measurement phase; Chrome version updates could shift the TTI metric label, but the underlying primitive is years-stable)
