# Phase 33: MII Schema Foundation + Extension-Modules Collapse UI - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-24
**Phase:** 33-mii-schema-foundation-extension-modules-collapse-ui
**Areas discussed:** Dashboard MII tile scoping, UAT-FU-06 investigation approach, Per-type extraQuery shape, Collapse open/close state persistence

---

## Gray-area selection

| Option | Description | Selected |
|--------|-------------|----------|
| Dashboard MII tile scoping | UAT-FU-04: server-wide vs per-patient vs cohort vs both | ✓ |
| UAT-FU-06 investigation approach | Empty per-patient MII/FHIR panels — `patient=` vs `subject=` mismatch | ✓ |
| Per-type extraQuery shape | Map vs inline tuple vs forced map (no fallback) | ✓ |
| Collapse open/close state persistence | Session-only vs per-user localStorage vs per-patient localStorage | ✓ |

**User's choice:** All four areas selected.

---

## Area 1: Dashboard MII tile scoping (UAT-FU-04)

### Q1 — What should tile counts represent?

| Option | Description | Selected |
|--------|-------------|----------|
| Server-wide + label fix (Recommended) | Keep `counts[fhirResourceType]`; add unambiguous heading + tooltip | ✓ |
| Patients-with-data count | Distinct patients with ≥1 resource of this type | |
| Cohort-scoped when active | Cohort filter when active, server-wide otherwise | |
| Both columns: server-wide + patients-with-data | Two numbers per tile | |

**User's choice:** Server-wide + label fix.

### Q2 — Where does the tile click navigate?

| Option | Description | Selected |
|--------|-------------|----------|
| Keep → `/patients` (unchanged) | Today's behavior | |
| Navigate to `/explorer/<type>` with module filter | Explorer scoped to module's primary type | |
| Stay on Dashboard (drawer/modal) | Click expands per-module summary in place | ✓ |

**User's choice:** Stay on Dashboard (drawer/modal).
**Notes:** Prompted a follow-up on drawer scope since this adds new component surface not in MII-EXT-06.

### Q3 (follow-up) — What's in the drawer?

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal info — read-only | Module name, count, top-5 codes if cheap, "Open in Explorer" link, no new FHIR fetches | ✓ |
| Module 'what is this' panel | Description + types + Explorer link, no drill-down data | |
| Defer drawer — keep `/patients` nav | Drop drawer scope from Phase 33 | |

**User's choice:** Minimal info — read-only.
**Notes:** No new FHIR fetches in Phase 33; "top 5 codes" only if existing counts cache happens to provide them, otherwise just count + nav.

---

## Area 2: UAT-FU-06 investigation approach (MII-EXT-07)

### Q1 — How should the investigation run?

| Option | Description | Selected |
|--------|-------------|----------|
| Live Blaze probe + fix forward (Recommended) | Hit each module URL against live Blaze + Synthea, identify mismatches, patch `MII_MODULES` | ✓ |
| Fixture-based diagnostic test first | Recorded Synthea bundle fixture + asserting test, then fix | |
| Speculative codemod — try both params | Try `patient=`, fall back to `subject=` on empty | |

**User's choice:** Live Blaze probe + fix forward.

### Q2 — What artefact locks the contract for Phase 34?

| Option | Description | Selected |
|--------|-------------|----------|
| Per-module unit test (Recommended) | `mii-modules.test.ts` table asserting `getPatientSearchParamForType` per module/type | ✓ |
| JSDoc table on `MiiModule` interface | Documented in JSDoc; less enforced | |
| Both | Test + JSDoc | |

**User's choice:** Per-module unit test.

---

## Area 3: Per-type extraQuery shape

### Q1 — How to encode per-type filters?

| Option | Description | Selected |
|--------|-------------|----------|
| Map: `extraQueryByType?: Record<string, string>` (Recommended) | Type-keyed map + retain module-wide `extraQuery?: string` as fallback. Symmetric with `patientSearchParamOverrides`. | ✓ |
| Inline tuple: `fhirResourceType: Array<string \| {type, extraQuery?}>` | Co-locate type + filter; breaks simple `.fhirResourceType` reads | |
| Drop module-wide `extraQuery`; require map | Force every module to use the map; migrate Laborbefund | |

**User's choice:** Map shape with module-wide fallback retained.

### Q2 — Helper return type when nothing's defined?

| Option | Description | Selected |
|--------|-------------|----------|
| `string \| undefined` (Recommended) | Matches existing `extraQuery?: string` semantics; lets callers conditionally append | ✓ |
| Always returns `string` (empty when none) | DX gain via blind append; loses 'is set?' signal in tests | |

**User's choice:** `string | undefined`.

---

## Area 4: Collapse open/close state persistence

### Q1 — Should the extension Collapse state persist?

| Option | Description | Selected |
|--------|-------------|----------|
| Session-only via `useDisclosure(false)` (Recommended) | Defaults CLOSED on every mount; auto-expand on deep-link match; resets on patient change. No localStorage. | ✓ |
| Per-user persistence in localStorage | New key like `patients.showExtensionTabs.v1`; persists across patients + reloads | |
| Per-patient persistence in localStorage | Map keyed by patientId | |

**User's choice:** Session-only.
**Notes:** Confirmed Dashboard MII section also uses `useDisclosure(true)` without localStorage — no precedent for persistence.

### Q2 — Deep-link visual when Collapse is closed?

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-expand instantly, no animation (Recommended) | Set Collapse open=true synchronously on mount when URL `tab` is extension key | |
| Auto-expand with Mantine's default `<Collapse>` animation | Same outcome with ~200ms animation | ✓ |

**User's choice:** Auto-expand with default animation.

---

## Claude's Discretion

- Drawer vs Modal primitive choice for Dashboard tile click
- Final wording of the Dashboard MII heading clarification
- Whether MII-EXT-08 lands as standalone plan or folded into helper-sweep plan
- Internal location of new helpers (single file vs split)
- "Open in Explorer" link target for multi-type modules (defaults to first type)

## Deferred Ideas

- Per-cohort Dashboard MII counts (revisit when Dashboard becomes cohort-aware)
- Patients-with-data column on Dashboard tiles
- localStorage persistence of extension Collapse state (Phase 34 has separate empty-modules toggle)
- Drawer "top 5 codes" enrichment
- Speculative codemod (`patient=` → `subject=` fallback)
- Inline tuple shape for `fhirResourceType` (rejected in favor of map)
- Per-patient localStorage map for Collapse state
- JSDoc table on `MiiModule` for per-type param convention (rejected in favor of test-as-contract)

## Latent bug surfaced during scout (not user-discussed, captured in CONTEXT.md)

- `MiiModuleTab.tsx:63` URL builder doesn't append `module.extraQuery` — Laborbefund's `category=laboratory` filter is silently dropped today. Investigated during MII-EXT-07.
