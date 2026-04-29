# Phase 42: Pre-probe extension-module counts (MII-EXT-15) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-29
**Phase:** 42-pre-probe-extension-module-counts-mii-ext-15
**Areas discussed:** Label format & multi-type aggregation, Loading state UX, Zero-count dim & integration with Phase 34 hide-empty toggle

---

## Gray Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Label format & multi-type aggregation | Where the count goes; how multi-type modules aggregate | ✓ |
| Loading state UX | What pills show while ~20 parallel `_summary=count` GETs are in flight | ✓ |
| Zero-count dim & integration with Phase 34 hide-empty toggle | How pre-probed zero counts feed the existing coordinator | ✓ |
| Cleanup primitive & cache lifecycle | AbortController vs cancelled-flag; cache scope | (deferred to Claude's Discretion) |

---

## Label format & multi-type aggregation

### Q1: Where should the count render visually in the tab pill?

| Option | Description | Selected |
|--------|-------------|----------|
| Append to primary line (Recommended) | `Onkologie (12)` on top, FHIR type subtitle below unchanged. Simplest, scannable, matches ROADMAP literal example. | ✓ |
| Append to subtitle line | `Onkologie` on top, `Condition · 12` below. Keeps primary line stable; subtitle gets verbose. | |
| Mantine Badge to the right of label | Two stacked text lines unchanged + a small Badge component beside. Pills get noticeably wider. | |
| Replace subtitle with count | `Onkologie` on top, `12` below (drop the FHIR type subtitle). Cleanest visual but loses the type hint. | |

**User's choice:** Append to primary line (Recommended).
**Notes:** Captured as D-01 in CONTEXT.md.

### Q2: How should multi-type module counts aggregate?

| Option | Description | Selected |
|--------|-------------|----------|
| Sum (Recommended) | Single number = sum across types. `Bildgebung (15)`. Matches MiiModuleTab.tsx panel behavior (already flattens .resources across types). | ✓ |
| Per-type breakdown inline | `Bildgebung (12 + 3)` or `Bildgebung (12/3)`. Cryptic without legend; pills wider. | |
| Primary type only | Show count for only the FIRST type. Inconsistent with panel content (which aggregates). | |
| Tooltip with breakdown, sum in label | `Bildgebung (15)` + Mantine Tooltip on hover shows `12 ImagingStudy + 3 DiagnosticReport`. Power-user feature. | |

**User's choice:** Sum (Recommended).
**Notes:** Captured as D-02 in CONTEXT.md.

---

## Loading state UX

### Q3: What should the tab label show while the count is still being fetched?

| Option | Description | Selected |
|--------|-------------|----------|
| Nothing — then label fades in (Recommended) | Tabs render as today; when each count resolves, label updates per-tab. Per-tab independent (no waiting for slowest). | ✓ |
| Inline placeholder `(…)` | Render `Onkologie (…)` until count arrives. Communicates "count coming" explicitly but visually noisy across 15 pills. | |
| Inline Mantine Loader (xs) | Small spinner inside parens. Most explicit but 15 spinning loaders is busy and animation-heavy. | |
| Single blocking skeleton on entire extension row | Replace the Collapse content with a skeleton until ALL counts resolve. Worst UX — blocks user from clicking ANY extension tab until slowest fetch completes. | |

**User's choice:** Nothing — then label fades in (Recommended).
**Notes:** Captured as D-03 in CONTEXT.md. Matches PatientRelatedResources.tsx precedent.

### Q4: Should base-7 module pills also pre-probe + show counts?

| Option | Description | Selected |
|--------|-------------|----------|
| Extension-only (Recommended) | Per ROADMAP literal scope. Base 7 unchanged. Saves 7 unnecessary FHIR GETs per patient mount. | ✓ |
| All 22 modules | Pre-probe base 7 + 15 extensions. Consistent visual but violates ROADMAP scope. | |
| Base 7 lazily — only after click | Extensions pre-probe; base 7 counts populate from MiiModuleTab fan-out after user visits. Inconsistent label timing. | |

**User's choice:** Extension-only (Recommended).
**Notes:** Captured as D-04 in CONTEXT.md.

---

## Zero-count dim scope & integration with Phase 34 hide-empty toggle

### Q5: How should pre-probed zero counts integrate with Phase 34's existing useEmptyExtensionsCoordinator + 'Hide N empty modules' toggle?

| Option | Description | Selected |
|--------|-------------|----------|
| Feed publisher from pre-probe (Recommended) | Hook publishes isEmpty=true for any module whose pre-probed count === 0, independent of MiiModuleTab visit. 'Hide N empty modules' becomes accurate on mount. | ✓ |
| Independent — dim pills only, leave coordinator visit-driven | Pre-probe 0 → dim pill at 0.55. Coordinator stays as-is. Dim and hide-empty become two separate signals. | |
| Replace coordinator with pre-probe source of truth | Remove useEmptyExtensionsPublisher from MiiModuleTab. Hook is single source of truth. Wider blast radius. | |
| New separate 'hide zero tabs' toggle | Two adjacent toggles in the extension header — confusing. | |

**User's choice:** Feed publisher from pre-probe (Recommended).
**Notes:** Captured as D-05 in CONTEXT.md. Includes implementation note for planner: Rules of Hooks prevents calling useEmptyExtensionsPublisher in a loop; use coordinator's reportEmptiness callback directly. Idempotency invariant must be verified.

### Q6: When pre-probe is in flight and count is unknown for a module, should the pill dim treatment apply?

| Option | Description | Selected |
|--------|-------------|----------|
| Only after count resolves (Recommended) | Pill renders normally during fetch. When count arrives: 0 → 0.55 opacity, >0 → stay normal. Consistent with D-03 ("no placeholder"). | ✓ |
| Dim during fetch + lift if count > 0 | All extension pills start at 0.55 on mount, lift to full opacity as counts arrive. Visual flicker; pre-judges that everything is empty. | |
| Dim during fetch only for previously-known-empty modules | Read last session's cache. Complicates cache lifecycle. | |

**User's choice:** Only after count resolves (Recommended).
**Notes:** Captured as D-06 in CONTEXT.md.

---

## Wrap-up

### Q7: Continue or ready for context?

| Option | Description | Selected |
|--------|-------------|----------|
| I'm ready for context (Recommended) | Lock 6 decisions, write CONTEXT.md, defer cleanup primitive + cache lifecycle to Claude's Discretion. | ✓ |
| Discuss cleanup primitive | AbortController vs cancelled-flag — pin down explicitly. | |
| Discuss cache scope & invalidation | Where Map lives, patient-switch behavior, manual refresh. | |
| Explore other gray areas | Surface 2-4 additional gray areas. | |

**User's choice:** I'm ready for context.

---

## Claude's Discretion

- **Cleanup primitive (AbortController vs cancelled-flag):** ROADMAP §Phase 42 success criterion #3 says AbortController per Phase 31, but PatientRelatedResources.tsx uses simpler cancelled-flag for the identical use case. Planner picks; recommendation is cancelled-flag.
- **Cache scope and lifecycle:** Where the (patientId, moduleId) Map lives. Recommendation: hook-internal `useRef<Map>` keyed `${patientId}:${moduleId}`.
- **Concurrency cap:** No cap unless UAT reveals lag.

## Deferred Ideas

- Manual refresh / cache-bust button (not requested)
- Per-type breakdown tooltip (ruled out by D-02)
- Pre-probe for base 7 modules (ruled out by D-04)
- Cross-patient cache survival (out of scope)
