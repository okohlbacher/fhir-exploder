# Phase 45: Mantine 9 Upgrade (STACK-01) - Context

**Gathered:** 2026-04-30
**Status:** WAIVE-AND-DEFER (pre-flight gate failed — defer to v1.7)
**Mode:** `--auto` (gate-driven outcome; no decisions to discuss)

<domain>
## Phase Boundary

Bump Mantine 8 → 9 (and React 18 → 19 if required) to track the upstream stack — **conditional on `@medplum/react` peer-dep range allowing it**.

**The pre-flight gate determines whether this phase runs at all** (per ROADMAP SC #1).

</domain>

<preflight_gate>
## Pre-Flight Gate Result: FAIL

Per ROADMAP §Phase 45 SC #1: this gate runs before any plan or implementation work.

### Live probe (executed 2026-04-30)

```
$ npm view @medplum/react peerDependencies
{
  '@mantine/core': '^8.0.0',           ← BLOCKS Mantine 9
  '@mantine/hooks': '^8.0.0',          ← BLOCKS Mantine 9
  '@mantine/notifications': '^8.0.0',  ← BLOCKS Mantine 9
  '@mantine/spotlight': '^8.0.0',      ← BLOCKS Mantine 9
  react: '^18.0.0 || ^19.0.0',         ← OK (React 19 allowed)
  'react-dom': '^18.0.0 || ^19.0.0',   ← OK
  ...
}

$ npm view @medplum/react version
5.1.9
```

### Verdict

**FAIL** — `@medplum/react@5.1.9` peer-deps Mantine `^8.0.0`, which does not allow `9.x`. Upgrading Mantine 8 → 9 in this codebase would either:

1. Require forking / patching `@medplum/react` (out of scope; defeats the point of using the library) — OR
2. Break the peer-dep contract (`npm install --legacy-peer-deps` would technically allow it, but at the cost of unsupported runtime behavior with Medplum's React components).

**React 19 alone is allowed** by the peer-dep range, but a React-only bump without Mantine 9 is not the goal of STACK-01 — the milestone scope ties the React version to the Mantine upgrade.

### Roadmap-prescribed outcome

ROADMAP §Phase 45 SC #1 codifies the gate-fail path verbatim:

> "If gate fails → 45-SUMMARY.md records `WAIVE-AND-DEFER` decision with the actual peer range pinned, and Phase 45 closes as `deferred` with no source diff (defer to v1.7)."

This phase therefore closes as `deferred`. No source changes. No plans authored. SUMMARY.md is the only artifact written beyond this CONTEXT.md.

</preflight_gate>

<decisions>
## Implementation Decisions

### G-01 Gate Outcome

- **D-01 [auto-driven by gate fail]:** WAIVE-AND-DEFER. Phase 45 closes as `deferred` with no source diff. No `package.json` changes, no `npm install`, no codemod. Milestone v1.6 advances to its remaining phases (999.1 backlog item) without Phase 45.
  *Rationale:* ROADMAP SC #1 prescribes this outcome verbatim. Mantine 9 + Medplum 5.x are not yet compatible.

- **D-02 [auto-driven]:** Re-evaluate at v1.7. The trigger to re-run this gate is a `@medplum/react` release that bumps the Mantine peer range to allow 9.x. Track via `/gsd-plant-seed` or scheduled npm-view check.
  *Rationale:* Defer until Medplum upstream catches up. Forcing the upgrade now without peer-dep alignment would create an unsupported configuration.

### G-02 No-Op Verification

- **D-03 [auto-driven]:** Phase closes verifies that NO source files were modified. Specifically:
  - `package.json` `@mantine/core`, `@mantine/hooks`, `@mantine/notifications`, `@mantine/spotlight`, `react`, `react-dom` versions UNCHANGED from baseline (`^8.3.18` and `^18.3.1` respectively).
  - `package-lock.json` UNCHANGED (no install ran).
  - No `src/` files diff vs. base.
  *Rationale:* The defer outcome means zero source changes. Verification confirms no accidental drift.

</decisions>

<canonical_refs>
## Canonical References

### This phase's gate documentation
- `.planning/ROADMAP.md` §Phase 45 SC #1 — gate definition and WAIVE-AND-DEFER rule
- `.planning/REQUIREMENTS.md` STACK-01 (if listed)

### Re-evaluation trigger
- `npm view @medplum/react peerDependencies` — re-run at v1.7 milestone start; if `@mantine/core` allows `^9.x`, phase becomes runnable
- `https://github.com/medplum/medplum/releases` — watch for Mantine 9 peer-dep bump in @medplum/react release notes

### Prior phase context (still applicable when phase reactivates)
- Phase 30 (Layout Redesign) — Mantine 8 design tokens; many components touched
- Phase 26 (App-Shell Dedup) — central app shell layout
- Phase 35 (Per-Type Quality Matrix) — Mantine 8 Table patterns
- Phase 44 (IPS Compositions) — most recent Mantine 8 component additions (`<JsonInput>`, `<Tabs>`)

### Specs/Standards
- Mantine 9 changelog: https://mantine.dev/changelog/9-0-0/
- React 19 release notes: https://react.dev/blog/2024/12/05/react-19
- Medplum React peerDependencies: `npm view @medplum/react peerDependencies` (live probe)

</canonical_refs>

<code_context>
## Existing Code Insights

### What would have changed (if gate had passed)

For traceability when the phase reactivates at v1.7+:

- `package.json` — bump `@mantine/core`, `@mantine/hooks`, `@mantine/notifications`, `@mantine/spotlight` to `^9.0.0`; `react` + `react-dom` to `^19.0.0`; `@types/react` + `@types/react-dom` to `^19.0.0`
- `package-lock.json` — regenerate
- ~100+ component files affected by Mantine 8 → 9 breaking changes (the actual count needs a codemod dry-run when reactivated)
- Visual regression UAT across 7 views (Sidebar, Dashboard, Quality, Patient detail, Cohorts, Explorer, IPS Validator)

### What did NOT change in this phase

- All source code is byte-for-byte identical to base commit `6e735ef` (Phase 44 PROJECT.md evolution)
- No `npm install` ran; lockfile untouched
- No worktree created; no executor agent spawned

</code_context>

<specifics>
## Specific Ideas

- **The phase auto-defers safely** — the gate is a documented escape hatch, not a failure state. Milestone progression continues uninterrupted.
- **Re-activation trigger is a 30-second `npm view` check** — schedule this at v1.7 milestone start.
- **No risk to v1.6 ship** — STACK-01 is explicitly scoped as "conditional on upstream readiness" in PROJECT.md; deferring it does not block the milestone.

</specifics>

<deferred>
## Deferred Ideas

- **Mantine 9 + React 19 upgrade itself** — re-run this phase at v1.7. Same SCs apply. Re-check the peer-dep gate first.
- **Forking @medplum/react to patch peer-deps** — explicitly out of scope. Forking the library to bypass an upstream constraint creates an unsupported maintenance burden.
- **`npm install --legacy-peer-deps` workaround** — out of scope. Would technically install but creates an unsupported runtime configuration.
- **React 19-only upgrade (without Mantine)** — out of scope per STACK-01 milestone framing (the React bump is bundled with the Mantine bump).
- **Codemod evaluation** — defer to reactivation. Mantine ships codemods for major-version migrations; survey them when the gate clears.

</deferred>

---

*Phase: 45-mantine-9-upgrade-stack-01*
*Context gathered: 2026-04-30 via /gsd-discuss-phase 45 --auto*
*Mode: --auto (pre-flight gate failed → WAIVE-AND-DEFER per ROADMAP SC #1; no plans authored, no source diff)*
*Re-evaluate: at v1.7 milestone start, or whenever `@medplum/react` bumps Mantine peer-dep to `^9.x`*
