# Phase 50: Theme E — STACK-01 Carry-Over: Mantine 9 / React 19 Gate - Context

**Gathered:** 2026-05-01
**Status:** Ready for planning
**Mode:** interactive — gate checked live, user decided to defer

<domain>
## Phase Boundary

**In scope (Phase 50):**
- Pure-doc `WAIVE-AND-DEFER` closure of STACK-01 matching the v1.6 Phase 45 precedent.
- Capture the live `npm view @medplum/react peerDependencies` output verbatim in the phase closure as evidence of the gate state at v1.7-close time.
- Update REQUIREMENTS.md traceability so STACK-01 is marked `deferred` (NOT `validated`); add it to the v1.8 deferred-items list with the trigger condition for re-attempt.
- Close the phase as `deferred`. No source diff. No new dependencies. No test changes. No build changes.

**Out of scope (deferred to v1.8 milestone start):**
- Mantine 8 → 9 codemod
- React 18 → 19 upgrade (locked decision: keep React/Mantine coupled even though React 19's gate has independently opened — see D-02)
- Visual regression UAT walk
- Bundle size measurement against pre-upgrade baseline
- Test suite churn from Mantine 9 / React 19 breaking changes

</domain>

<decisions>
## Implementation Decisions

### Gate Outcome (live check at 2026-05-01)

- **D-01 (Gate result — MIXED):** `npm view @medplum/react peerDependencies` (medplum/react@5.1.10) returned:
  ```json
  {
    "@mantine/core": "^8.0.0",
    "@mantine/hooks": "^8.0.0",
    "@mantine/notifications": "^8.0.0",
    "@mantine/spotlight": "^8.0.0",
    "@medplum/core": "5.1.10",
    "@medplum/react-hooks": "5.1.10",
    "react": "^18.0.0 || ^19.0.0",
    "react-dom": "^18.0.0 || ^19.0.0",
    "rfc6902": "^5.0.1",
    "signature_pad": "^5.0.10"
  }
  ```
  - **Mantine 9 gate: FAILS** — peer pin still `^8.0.0` only.
  - **React 19 gate: PASSES** — peer pin now `^18.0.0 || ^19.0.0`.

  This is meaningfully different from the v1.6-close assumption that Mantine 9 + React 19 would move together. Medplum has decoupled them since.

### User Decision

- **D-02 (Defer the entire upgrade until Mantine 9 gate opens):** Keep the React/Mantine pair coupled even though React 19 alone is now unblocked. Rationale (captured from interactive discussion):
  - Mantine 9 is the larger, more visually impactful change; doing React 19 alone yields breaking-change cost (deprecated `React.FC` defaults, ref forwarding changes, StrictMode tightening) without the matching Mantine bundle/cascade wins.
  - Medplum's `^8.0.0` Mantine pin means a Mantine 9 attempt today would require `--legacy-peer-deps` long-term — a footgun that masks future incompatibilities.
  - 145 source files import Mantine (~25% of codebase). Visual regression UAT across 9 surfaces (Sidebar, Dashboard, Patients, Quality, Explorer, Patient detail, Cohorts, IPS, Phase-49 Graph) is significant manual work to absorb on a moving target.
  - One coordinated upgrade in v1.8 (when Medplum's gate also opens for Mantine 9) is lower risk than a partial shuffle now.
  - Matches v1.6 Phase 45 WAIVE-AND-DEFER precedent exactly.

- **D-03 (Phase closure path — `deferred`):** Phase 50 closes as `deferred` (NOT `validated`). STACK-01 carries to v1.8 deferred-items list. No source diff. No npm install. No tests. The phase ships ONLY:
  - The frozen gate-check output (D-01) as v1.7-close evidence.
  - Updated REQUIREMENTS.md traceability marking STACK-01 `deferred`.
  - Updated `.planning/PROJECT.md` v1.8 candidates list with the carry-over.
  - A `50-SUMMARY.md` documenting the WAIVE-AND-DEFER decision with rationale (D-02), the gate output (D-01), and the trigger condition for re-attempt (D-04).
  - A `50-VERIFICATION.md` with status `passed` (the closure path itself is the deliverable; there are no must-haves beyond "the doc closure exists and the gate output is captured").

### Re-attempt Trigger

- **D-04 (v1.8 re-attempt trigger condition):** At v1.8 milestone start (date TBD when v1.8 begins), re-run the gate:
  ```bash
  npm view @medplum/react peerDependencies
  ```
  - **If `@mantine/core` peer range now includes `^9.x`:** Open a new phase (working name "Theme X — STACK-01 Mantine 9 / React 19 upgrade") in the v1.8 roadmap. Scope: codemod + breaking-change sweep + visual regression UAT + bundle measurement, exactly as the original Phase 50 success criteria laid out for the gate-PASS branch.
  - **If `@mantine/core` peer range still pins `^8.0.0`:** Re-defer to v1.9 with another WAIVE-AND-DEFER. Document the gate output again as evidence.

### Out of Scope for Phase 50 (do NOT do these)

- **D-05 (NO partial React 19 upgrade):** Even though `@medplum/react` now accepts `^19.0.0`, do NOT upgrade React in isolation. The decoupling rationale in D-02 holds — keep the pair coupled until both gates open.
- **D-06 (NO `--legacy-peer-deps` workaround attempt):** Do not try to install `@mantine/core@9.x` against the current Medplum peer pin via `--legacy-peer-deps`. This was rejected as a footgun in D-02.
- **D-07 (NO codemod preview):** Do not run the Mantine 9 codemod against a scratch branch "to see what it would do." Pure-doc deferral means zero source touch on this phase.

### Folded Todos

None — no pending todos matched Phase 50 scope.

### Claude's Discretion

- Exact wording of the WAIVE-AND-DEFER record in `50-SUMMARY.md` — researcher/planner can mirror v1.6 Phase 45's `45-SUMMARY.md` format.
- Whether to add a brief "Mantine 9 watch" note to `.planning/PROJECT.md` v1.8 section (recommended yes — keeps the trigger condition visible).
- Whether to file a feature-request issue against `medplum/medplum` asking for the Mantine 9 peer-dep update (recommend no — it's their roadmap; we just track state).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### v1.6 Phase 45 precedent (the WAIVE-AND-DEFER pattern to mirror)
- `.planning/milestones/v1.6-phases/45-*/45-CONTEXT.md` — original STACK-01 context (codemod scope, visual UAT plan, what would have shipped if gate had passed)
- `.planning/milestones/v1.6-phases/45-*/45-SUMMARY.md` — the WAIVE-AND-DEFER closure document; format for `50-SUMMARY.md` should mirror this
- `.planning/milestones/v1.6-phases/45-*/45-VERIFICATION.md` — sets the precedent that pure-doc closure phases verify as `passed` (no must-haves beyond "the doc closure exists")

### Roadmap & requirements
- `.planning/ROADMAP.md` §"Phase 50: Theme E — STACK-01 Carry-Over: Mantine 9 / React 19 Gate" — gate-PASS / gate-FAIL closure paths
- `.planning/REQUIREMENTS.md` §STACK-01 — verbatim acceptance criterion ("re-run peer-dep gate; if open, ship upgrade; if closed, WAIVE-AND-DEFER to v1.8")
- `.planning/PROJECT.md` §"Active (v1.7 candidates)" — STACK-01 carried from v1.6; will move to v1.8 deferred-items list at this phase's close

### Live gate evidence (frozen at this phase's gathered date)
- `npm view @medplum/react peerDependencies` output captured verbatim in D-01 above (date: 2026-05-01, medplum/react version: 5.1.10)

### Project guidelines
- `CLAUDE.md` §"Do NOT Use" — pins Mantine 9 as forbidden ("Requires React 19 exclusively; incompatible with @medplum/react 5.x which peers on Mantine ^8.0.0"). This phase honors that pin by deferring.

### Discussion log
- `.planning/phases/50-theme-e-stack-01-carry-over-mantine-9-react-19-gate/50-DISCUSSION-LOG.md` — full audit of pros/cons and the user's decision rationale.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
None for this phase — pure-doc closure has no code to reuse.

### Established Patterns
- **WAIVE-AND-DEFER closure pattern** from v1.6 Phase 45 — mirror format for `50-SUMMARY.md` and `50-VERIFICATION.md`.
- **STACK-01 carry-forward pattern** — `.planning/PROJECT.md` v1.6 → v1.7 carry-forward block at line ~94 ("STACK-01 (carried from v1.6): Mantine 9 / React 19 upgrade — re-run peer-dep gate at v1.7 milestone start...") becomes the model for the v1.7 → v1.8 carry.

### Integration Points
- `.planning/REQUIREMENTS.md` STACK-01 row — flip status to `deferred`, update target phase pointer.
- `.planning/PROJECT.md` — add v1.8 deferred-items entry mirroring the v1.7 candidates block.
- `.planning/ROADMAP.md` — Phase 50 row marks `deferred` at close, mirroring how Phase 45 closed in v1.6.

### Surface area we'd be touching IF we did the upgrade (informational, NOT scope for Phase 50)
- 190 import statements across 145 source files use `@mantine/*` packages.
- Specific subpackages in use: `@mantine/charts`, `@mantine/core`, `@mantine/dates`, `@mantine/hooks`, `@mantine/notifications`, `@mantine/spotlight`.
- High-traffic components that would need migration in a future upgrade: `<Tabs>` (ResourceDetailPage, IPSPanel, MiiModuleTabs), `<Notification>` API, `<Modal>` styles prop, `<Slider>` (Phase 49 Graph view depth control), `<Card>` (Phase 49 ResourceGraphNode + PatientRelatedResources cards).
- Phase 49's `graph.module.css` CSS-variable bridge is tuned to Mantine 8's `--mantine-color-*` namespace; would need re-validation under Mantine 9.

</code_context>

<specifics>
## Specific Ideas

- The pros/cons discussion (captured in DISCUSSION-LOG.md) is the substantive deliverable of this discuss-phase. The user's decision rationale should remain visible to future v1.8 planners so they can verify the trigger condition (D-04) is actually met before re-attempting.
- The mixed-gate result (D-01: React 19 gate open, Mantine 9 gate closed) is a NEW finding vs. v1.6-close assumptions. Document it prominently so v1.8 planners know to check BOTH peer pins separately.
- The `--legacy-peer-deps` rejection (D-06) should be reaffirmed in the v1.8 re-attempt phase if the gate is still mixed at that point.

</specifics>

<deferred>
## Deferred Ideas

- **STACK-01 (Mantine 9 / React 19 coupled upgrade)** — re-attempt trigger documented in D-04. Carries to v1.8 deferred-items list.
- **Partial React 18 → 19 upgrade alone** — explicitly rejected in D-05; keep React/Mantine coupled.
- **Codemod preview against scratch branch** — explicitly rejected in D-07; pure-doc deferral.
- **Mantine 9 feature-request issue against medplum/medplum** — out of scope per Claude's Discretion above; we track state, not influence Medplum's roadmap.
- **Reviewed Todos (not folded):** None.

</deferred>

---

*Phase: 50-theme-e-stack-01-carry-over-mantine-9-react-19-gate*
*Context gathered: 2026-05-01 via interactive discuss-phase (live gate check + pros/cons discussion)*
