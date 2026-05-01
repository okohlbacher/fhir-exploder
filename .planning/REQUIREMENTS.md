# Requirements: v1.7 Resource Navigation

**Milestone goal:** Make resources navigable. Improve the human-readable view, add a compact summary util used everywhere a resource appears in a list, surface incoming references at the bottom of resource details, and ship a graphical reference graph for the resource at hand.

**Started:** 2026-05-01
**Reference baseline (v1.6 close):** 1240 tests passing, `npm run build` clean, initial-load bundle 606.76 KB gz.

---

## v1 Requirements

### Theme A — Foundation: Summary Util

- [ ] **NAV-01**: A pure-function utility `summarizeResource(r: Resource) → { primary: string; secondary?: string }` returns a compact two-slot summary for any FHIR resource. Per-type registry covers Patient, Observation, Condition, Encounter, MedicationStatement, Procedure, DiagnosticReport, AllergyIntolerance (8 types); all other types fall back to a generic primary derived from `code`/`name`/`type`/`identifier`/`id`. NO status field — primary + optional secondary only. Pure (no I/O), unit-testable, deterministic.
- [ ] **NAV-02**: The three current call sites that compute summaries inline (`SearchResultsPage.getResourceSummary`, `FhirResourcesView.getSummary`, `MiiModuleTab.getSummary`) are migrated to call the new utility from NAV-01. Per-call-site visual output matches or improves on the prior version (no regressions in the explorer table or MII tab labels).

### Theme B — Readability: HumanReadableView

- [ ] **READ-01**: Reference fields rendered in the human-readable view auto-resolve their target resource via lazy fetch + per-session cache, and display `summarizeResource(target).primary` inline. The full reference URL remains accessible (hover tooltip), and the rendered text remains a clickable link to `/explorer/{type}/{id}`. Cache scope: a session-level Map keyed by `${type}/${id}` (cleared on full reload). Failed lookups (404, network error) fall back to the existing raw-href display silently — no error toast.
- [ ] **READ-02**: Property-level extensions (currently filtered by `_`-prefix check, e.g. `_birthDate.extension`) are surfaced. The exact UX (inline reveal, dedicated subsection, or [View] modal trigger) is the planner's discretion; the requirement is that the data is reachable from the human-readable view without dropping into raw JSON.
- [ ] **READ-03**: Contained resources (`Resource.contained[]`) render inline in the human-readable view rather than falling through to the JSON modal. Each contained resource displays its own summary via `summarizeResource()` and is expandable to a full ResourcePropertyTable view.

### Theme C — Reverse References: Incoming-References Panel

- [ ] **REVR-01**: A curated catalog (`src/utils/reverseReferenceCatalog.ts` or similar) defines the reverse-reference search params per source resource type — e.g. `{ Patient: [{ type: 'Observation', param: 'subject' }, { type: 'Condition', param: 'subject' }, ...] }`. Initial coverage: the same 8–12 resource types covered by NAV-01's summary registry, mirroring the scope of `PatientRelatedResources.tsx`. Catalog entries are exported as TypeScript const for static analysis.
- [ ] **REVR-02**: A new `<IncomingReferencesPanel resource={r}>` component, mounted at the bottom of `ResourceDetailPage.tsx` for non-Patient resources, lists the resource types referencing the current resource with counts. Counts are fetched via parallel `?{param}={ref}&_summary=count` queries against the catalog from REVR-01. UI mirrors `PatientRelatedResources` (clickable card grid).
- [ ] **REVR-03**: `PatientRelatedResources.tsx` is generalized so its render path is shared with `IncomingReferencesPanel` (single component, two props paths) — Patient still uses the existing forward-reference path, all other resource types use the new reverse-reference path. No regression in the existing Patient detail UX.

### Theme D — Graph View: Reference Graph

- [ ] **GRPH-01**: A new lazy-loaded route `/explorer/:type/:id/graph` mounts `<ResourceGraphView resource={r}>`. The route is reachable from a "Graph" button on `ResourceDetailPage` (next to "Raw JSON" / "$everything"). The route's chunk is code-split — initial-load bundle gz delta ≤ +5 KB.
- [ ] **GRPH-02**: The graph (G1 scope) shows the current resource's outgoing references (depth ≥ 1) AND incoming references at depth 1 (uses REVR-01 catalog), with the current resource as the center / root node. Default depth = 1 in both directions; depth control is the planner's discretion (slider, +/− buttons, or fixed). Hard cap at depth 3 (defense against accidental BFS explosion).
- [ ] **GRPH-03**: Each node in the graph is clickable and navigates to `/explorer/{type}/{id}` for that target resource. Nodes display `summarizeResource(target).primary` as their label (rendered as a Mantine-themed React component). Edge labels show the FHIR reference field name (e.g. `subject`, `encounter`). Hover on a node shows a tooltip with `summarizeResource(target).secondary`.
- [ ] **GRPH-04**: The graph layout is hierarchical (DAG) using `@dagrejs/dagre` ≥ 3.x via `@xyflow/react` (React Flow 12). Mantine 8 dark-mode integration is wired through CSS variables — switching the app theme re-themes the graph without remount. Zoom / pan / minimap built-in. Pinned dependencies recorded in 49-CONTEXT.md when this phase plans.

### Theme E — Carry-over: Mantine 9 / React 19 Gate

- [ ] **STACK-01**: Re-run the `@medplum/react` peer-dependency gate (`npm view @medplum/react peerDependencies`). If `@mantine/core` peer range now includes `^9.x`, proceed with the Mantine 8 → 9 + React 18 → 19 codemod + breaking-change sweep + visual regression UAT (per the v1.6 Phase 45 SCs). If the gate still fails, defer again to v1.8 with a documented `WAIVE-AND-DEFER` SUMMARY.md and no source diff. **This requirement closes either as `validated` (gate passed, upgrade shipped) or `deferred` (gate failed, pushed to v1.8) — both are acceptable closures per the v1.6 precedent.**

---

## Future Requirements (deferred to v1.8+)

- **Reverse-reference CapabilityStatement-driven discovery** — replace the curated catalog (REVR-01) with a runtime-discovered catalog from the connected server's CapabilityStatement.rest.resource[].searchParam. Defer until the curated approach reveals real-world gaps.
- **Graph view G2 — schema graph** — interactive visualization of the FHIR resource type graph (which types reference which; static, server-independent). Onboarding tool. Defer until G1 is validated.
- **Graph view depth > 3** — full $everything-driven graph for a Patient (could be 100s of nodes). Defer; React Flow handles it but the UX needs design.
- **Reference resolution prefetch** — eager-fetch all references on resource detail mount instead of lazy. Defer until lazy is observed insufficient.

---

## Out of Scope (this milestone)

- **Editing FHIR resources** — read-only explorer; no mutation surface.
- **Authoring graphs / saved graph views** — graph view is read-only navigation, not a saved diagram tool.
- **3D / WebGL graph rendering (reagraph etc.)** — bundle-size cost too high for the use case.
- **Markdown-based graph syntax (mermaid)** — no node-click navigation; wrong tool.
- **Cross-server reference resolution** — references that resolve to a different server are out of scope; show as raw href, link does nothing if cross-origin.

---

## Traceability (filled by roadmap)

| REQ-ID | Phase | Plan(s) | Status |
|--------|-------|---------|--------|
| NAV-01 | TBD | TBD | pending |
| NAV-02 | TBD | TBD | pending |
| READ-01 | TBD | TBD | pending |
| READ-02 | TBD | TBD | pending |
| READ-03 | TBD | TBD | pending |
| REVR-01 | TBD | TBD | pending |
| REVR-02 | TBD | TBD | pending |
| REVR-03 | TBD | TBD | pending |
| GRPH-01 | TBD | TBD | pending |
| GRPH-02 | TBD | TBD | pending |
| GRPH-03 | TBD | TBD | pending |
| GRPH-04 | TBD | TBD | pending |
| STACK-01 | TBD | TBD | pending |

---

*Last updated: 2026-05-01 — initial scope locked from /gsd-new-milestone discussion (4 user-confirmed answers: title "Resource Navigation"; lazy-fetch+session-cache; curated catalog; G1 only; sequential A→B→C→D→E; STACK-01 re-attempt).*
