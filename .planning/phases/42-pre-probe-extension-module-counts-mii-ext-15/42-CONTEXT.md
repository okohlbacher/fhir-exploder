# Phase 42: Pre-probe extension-module counts (MII-EXT-15) - Context

**Gathered:** 2026-04-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Patient-detail extension-module tabs (15 of them: Bildgebung, Biobank, Dokument, Intensivmedizin, Kardiologie, Molekulargenetik, MTB, Onkologie, Pathologie, PRO, Seltene Erkrankungen, Studie, Symptom, …) show pre-probed counts on labels (`Onkologie (12)`) so users see which tabs have data before clicking. New `useMiiExtensionCounts(patientId)` hook fans out one `_summary=count` GET per extension module on patient mount, in parallel, and feeds the existing `useEmptyExtensionsCoordinator` so Phase 34's "Hide N empty modules" toggle becomes accurate on mount instead of accumulating after clicks.

**Out of scope (future phases or explicitly deferred):**
- Base 7 module pre-probe (kept unchanged — D-04)
- Counts on Dashboard MII tile grid or ClinicalTimeline (Phase 33/34 surfaces — Phase 42 is patient-detail tabs only)
- Manual refresh / cache-bust UI (planner discretion if needed; not user-requested)
- Per-type breakdown surface (e.g. tooltip with `12 ImagingStudy + 3 DiagnosticReport`) — explicitly rejected in D-02
- Replacing Phase 34's coordinator with a Phase 42 source-of-truth (D-05 chose "feed publisher" not "replace coordinator")

</domain>

<decisions>
## Implementation Decisions

### Label Format

- **D-01:** **Append count to primary line.** Tab pill renders `{germanLabel} ({count})` on the primary line (e.g. `Onkologie (12)`); subtitle (FHIR resource type via `fhirResourceTypesOf(mod).join(' / ')`) is unchanged. Touches `TabPillLabel` in `src/components/patients/MiiModuleTabs.tsx` (lines 64-100). Pills auto-size on count digit width — no fixed-width concern.

### Multi-Type Aggregation

- **D-02:** **Sum across types.** For modules with `fhirResourceTypesOf(mod).length > 1` (e.g. Bildgebung = `[ImagingStudy, DiagnosticReport]`, MTB = multiple types), the displayed count is the sum of per-type `_summary=count` results. Single number per module pill. This matches `MiiModuleTab.tsx`'s panel content behavior (already flattens `.resources` across types via `Promise.all(types.map(fetchOne))` then `.flat()`) — keeps panel content count and label count in sync.
  - Per-type breakdown UI (tooltip, "12+3" notation, separate counts) explicitly **NOT** in scope.

### Loading State

- **D-03:** **No placeholder; per-tab independent fade-in.** Tabs render exactly as today (`{germanLabel}` + FHIR-type subtitle) until each module's count resolves; then label updates to `{germanLabel} ({count})` for that single tab. No `(…)` placeholder, no inline `Loader`, no skeleton. Per-tab independent — fastest module's count appears first; slowest doesn't block others. Matches the precedent in `src/components/explorer/PatientRelatedResources.tsx` (lines 36-58), which does exactly this for Patient-detail "Related Resources" cards.

### Scope (Base vs Extension)

- **D-04:** **Extension-only.** Hook fans out across modules where `category === 'extension'` only — 15 modules, 1–2 types each, ~20 parallel `_summary=count` GETs on patient mount. Base 7 modules (Person, Fall, Diagnose, Prozedur, Consent, Laborbefund, Medikation) keep their existing label `{germanLabel}` + FHIR-type subtitle with no count. Mirrors Phase 34 D-21 base exemption.

### Empty Integration with Phase 34 Coordinator

- **D-05:** **Feed publisher from pre-probe.** Hook dispatches `isEmpty=true` (via the `reportEmptiness` callback exposed by `useEmptyExtensionsCoordinator`) for any extension module whose pre-probed count resolves to 0, AND `isEmpty=false` for any module whose count resolves to >0. Phase 34's "Hide N empty modules" toggle therefore becomes accurate on patient mount — instead of accumulating only after the user has visited each tab.
  - **Implementation note for planner (Rules of Hooks):** Phase 34's `useEmptyExtensionsPublisher({ moduleKey, isEmpty })` is a per-component single-pair hook; it CANNOT be called 15 times in a loop from inside `useMiiExtensionCounts`. Use the coordinator's exposed callback directly: `const { reportEmptiness } = useEmptyExtensionsCoordinator();` at the top of the hook, then call `reportEmptiness(moduleKey, count === 0)` imperatively inside the per-module fetch resolution within `useEffect`.
  - **Idempotency invariant:** `reportEmptiness` must be idempotent on `(moduleKey, isEmpty)` pairs because both sources (pre-probe in Phase 42 + post-visit publisher in Phase 34's `MiiModuleTab`) can fire for the same module — pre-probe first, then post-visit when the user opens the tab. Verify the existing coordinator's `reportEmptiness` already de-dupes; if not, add a `(prev) => prev[key] === isEmpty ? prev : ...` guard.

### Dim Timing & Opacity

- **D-06:** **Dim only after count resolves to 0.** Pills render at full opacity during fetch. When a module's count arrives:
  - count = 0 → pill at `opacity: 0.55` (matches Phase 34 D-18 panel-content idiom)
  - count > 0 → pill stays at full opacity
  - This is consistent with D-03 ("no placeholder") — nothing in the pill's appearance changes until the count is actually known.
  - Implementation: extend `TabPillLabel` (or wrap `<Tabs.Tab>`) to accept an `isEmpty` boolean and apply `style={{ opacity: 0.55 }}` conditionally. Use `data-testid="extension-tab-pill"` + `data-empty={isEmpty}` so regression tests can assert presence + dimming via `getByTestId` + `getComputedStyle` (mirrors Phase 34 `data-testid="empty-state-wrapper"` precedent at `src/components/patients/MiiModuleTab.tsx:144`).

### Claude's Discretion

The user explicitly chose NOT to discuss these — planner decides based on existing precedent:

- **Cleanup primitive (AbortController vs `cancelled`-flag):** ROADMAP §Phase 42 success criterion #3 says "AbortController threading … mirroring Phase 31's AbortSignal threading." However, the closest functional precedent in this codebase is `src/components/explorer/PatientRelatedResources.tsx`, which performs the same `_summary=count` fan-out pattern using a `let cancelled = false; ... return () => { cancelled = true; };` flag — simpler, no signal plumbing, works correctly. Phase 31's AbortController complexity (`cascadingValidator.ts:131-183`) is justified there because it threads abort across multiple chained fetch tiers (cache → external → terminology) with timeout race conditions; Phase 42 fans out to N independent equally-weighted requests with no chaining. **Planner recommendation:** prefer the `cancelled`-flag idiom from `PatientRelatedResources.tsx` for consistency with the closest sibling code. If the planner has a strong reason to use `AbortController` instead (e.g. wants to actually abort the underlying fetches rather than just guard `setState`), that's acceptable — but pick ONE and document the choice in the plan.
- **Cache scope and lifecycle:** Where the `(patientId, moduleId)` Map lives. Options: (a) hook-internal `useRef<Map<string, number>>()` keyed on composite ID — dies with hook unmount; (b) module-scope singleton `Map` — survives unmount, requires explicit invalidation; (c) React context — overkill. **Planner recommendation:** (a) hook-internal `useRef`, keyed by `${patientId}:${moduleId}`. Cache survives re-renders within the same patient; cleared on patient navigation by the natural React lifecycle. Matches the "session" lifetime called out in ROADMAP §Phase 42 success criterion #1 well enough; "session" isn't a hard requirement.
- **Concurrency cap:** ~20 parallel FHIR GETs is fine for Blaze on a healthy connection. No cap needed unless UAT surfaces lag — defer to planner.

### Folded Todos

(None — no pending todos matched Phase 42 scope at context-gathering time.)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### ROADMAP + REQUIREMENTS
- `.planning/ROADMAP.md` §Phase 42 — goal, dependencies, 4 success criteria
- `.planning/REQUIREMENTS.md` §MII-EXT-15 — full requirement text

### Phase 33 helpers (reused as-is)
- `src/utils/mii-modules.ts` — `MII_MODULES` constant, `getPatientSearchParamForType(module, type)`, `getExtraQueryForType(module, type)`, `fhirResourceTypesOf(module)` helpers
- `src/__tests__/mii-modules.test.ts` — D-17 contract test that already covers per-`(module, type)` patientSearchParam mapping for all 22 modules; Phase 42 does NOT extend this contract (no schema change)

### Phase 33 prior context (locked decisions)
- `.planning/milestones/v1.5-phases/33-mii-schema-foundation-extension-modules-collapse-ui/33-CONTEXT.md` — D-06 (per-type fan-out + per-type catch fallback), D-09 (Collapse session-only), D-11 (selective keepMounted on extension panels)

### Phase 34 prior context (locked decisions, integration surface)
- `.planning/milestones/v1.5-phases/34-14-mii-extension-modules-palette-bundled-profiles/34-CONTEXT.md` — D-17 (empty definition), D-18 (0.55 opacity convention), D-19 (`localStorage.patients.hideEmptyExtensions.v1` schema), D-21 (base exemption)
- `src/hooks/useEmptyExtensionsCoordinator.tsx` — coordinator + publisher implementation; exposes `reportEmptiness` callback that Phase 42 hook calls directly (D-05 implementation note)
- `src/components/patients/MiiModuleTabs.tsx:64-100` — `TabPillLabel` component (D-01 modification site)
- `src/components/patients/MiiModuleTab.tsx:65-109` — existing `useEffect` fan-out + `cancelled` flag idiom (D-02 + cleanup primitive precedent)

### Closest functional precedent (recommended pattern source)
- `src/components/explorer/PatientRelatedResources.tsx:36-58` — `_summary=count&_count=0` parallel fan-out + per-type `.catch(() => 0)` + `cancelled`-flag cleanup. Phase 42's `useMiiExtensionCounts` hook is a near-port of this pattern, generalized over MII modules instead of a hardcoded type list.

### Project-level
- `CLAUDE.md` — tech stack constraints (Medplum, Mantine 8, Vite); `.licenseuse` not relevant for Phase 42; "Out of scope: SMART on FHIR" applies (no auth changes)
- `.planning/PROJECT.md` — local-first read-only explorer; Blaze direct access (no SMART launch); MII Kerndatensatz lens

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`useMedplum()` hook** (`@medplum/react-hooks`) — `client.get(client.fhirUrl(url).toString())` is the standard fetch idiom; returns `Bundle` (or string). Phase 42 hook calls this once per `(module, type)` pair.
- **`fhirResourceTypesOf(module)`** — returns `string[]` of FHIR types for a given MII module. Phase 42 maps over this array per module to build per-type fetch URLs.
- **`getPatientSearchParamForType(module, type)`** — returns the correct search param (e.g. `patient`, `subject`) for a given `(module, type)` pair. Resolves IG-specific overrides.
- **`getExtraQueryForType(module, type)`** — returns extra query-string fragment (or empty) for a given pair (e.g. profile filter). Same idiom as `MiiModuleTab.tsx:79-83`.
- **`useEmptyExtensionsCoordinator`** (`src/hooks/useEmptyExtensionsCoordinator.tsx`) — exposes `reportEmptiness(moduleKey, isEmpty)` callback that Phase 42 calls directly from inside `useEffect`.
- **`Tabs.Tab`** — existing Mantine pill UI; Phase 42 wraps the existing `<Tabs.Tab>` with conditional `style={{ opacity: 0.55 }}` based on D-06 logic, OR pushes the dimming into `TabPillLabel` itself.

### Established Patterns

- **Parallel `_summary=count` fan-out:** `PatientRelatedResources.tsx:36-58` is the canonical example in this codebase. Per-type `.catch(() => 0)`, `cancelled` flag for `setState` guard, no AbortController. URL pattern: `${type}?${param}=Patient/${patientId}&_summary=count&_count=0`.
- **Per-type fan-out for multi-type modules:** `MiiModuleTab.tsx:78-95` already does `Promise.all(types.map(fetchOne))` with per-type `.catch(() => [])` returning empty array. Phase 42 mirrors this with per-type `.catch(() => 0)` returning numeric zero, then `.reduce((a, b) => a + b, 0)` to aggregate (D-02).
- **`data-testid` for opacity assertions:** `MiiModuleTab.tsx:144` uses `data-testid="empty-state-wrapper"` because Mantine 8's inline-style serialization isn't grep-friendly. Phase 42 dim test should use the same idiom: `data-testid="extension-tab-pill"` + `data-empty={count === 0}` + `getByTestId(...).getAttribute('data-empty') === 'true'` plus `getComputedStyle(...).opacity === '0.55'`.

### Integration Points

- **`MiiModuleTabs.tsx`** is the parent that consumes the new hook. Mounts inside `EmptyExtensionsProvider` (already there at line 109). Hook called from `MiiModuleTabsInner` (line 115) via `useMiiExtensionCounts(patientId)`. Returns `Record<moduleKey, number | undefined>` (undefined = still fetching, per D-03).
- **`TabPillLabel`** rendering site: lines 178-187 (base modules), 245-254 (extension modules). Phase 42 modifies the `primary` prop to be `${germanLabel} (${count})` when `count !== undefined && category === 'extension'`, else the original `germanLabel`.
- **`Tabs.Tab` dim wrapper:** the easiest place to apply `opacity: 0.55` is on the `<Tabs.Tab>` itself via `style={{ opacity: count === 0 ? 0.55 : 1 }}`. The visibleExtensionModules filter (line 159-161) is independent of D-06 dim — they coexist: hidden by toggle (filtered from list) OR visible-but-dimmed (rendered + dimmed).

### Risks / Pitfalls

- **Rules of Hooks (D-05):** Phase 42 hook cannot call `useEmptyExtensionsPublisher` 15 times in a loop. Use `reportEmptiness` from the coordinator callback directly. Verify the coordinator exposes this — if not, add a small bulk-publish API to the coordinator before the hook lands.
- **Idempotent reportEmptiness (D-05):** Two sources (Phase 42 pre-probe + Phase 34 post-visit `MiiModuleTab`) can fire for the same module. The existing coordinator must accept this; verify in `useEmptyExtensionsCoordinator.tsx` before the hook lands. If not idempotent, add a `prev[key] === isEmpty ? prev : ...` guard.
- **Concurrency on slow connections:** ~20 parallel FHIR GETs may bottleneck on a slow Blaze server (UAT will reveal). If lag is noticeable, planner can introduce a small concurrency cap (e.g. `p-limit`-style or chunked `Promise.all`) — but defer until UAT shows the need.
- **Stale fetches across patient navigation:** `cancelled`-flag pattern handles this correctly when the patientId dep changes. Don't drop the cleanup function.

</code_context>

<specifics>
## Specific Ideas

- **Hook signature** (planner-confirmable): `useMiiExtensionCounts(patientId: string): Record<string, number | undefined>` — returns a map keyed by `MiiModule.key`, `undefined` while fetching, number once resolved.
- **Closest precedent** for the planner to read first: `src/components/explorer/PatientRelatedResources.tsx` — the Phase 42 hook is essentially this code generalized over MII modules.
- **Test fixture pattern:** Phase 34 already has `MiiModuleTabs.test.tsx`; Phase 42 extends with a "counts appear in tab labels" test + a "dim opacity 0.55 on zero count" test. Mock `client.get` to return varying `bundle.total` values.

</specifics>

<deferred>
## Deferred Ideas

- **Manual refresh button to re-probe counts:** not requested in ROADMAP, not raised in discussion. If a future user surfaces "my counts are stale after I added new resources via FHIR import", this is the natural next phase.
- **Per-type breakdown tooltip:** ruled out in D-02 (sum-only). If users later report confusion over multi-type modules, revisit in a future phase.
- **Pre-probe for base 7 modules:** ruled out in D-04. Base modules nearly always have data; UX gap doesn't apply.
- **Cache survival across patient switch:** D-09 (Phase 33) Collapse already resets on patient mount; cache resetting too is consistent. If users want fast back-button between patients, revisit.

</deferred>

---

*Phase: 42-pre-probe-extension-module-counts-mii-ext-15*
*Context gathered: 2026-04-29*
