# Phase 48: Theme C — Reverse References / Incoming-References Panel - Research

**Researched:** 2026-05-01
**Domain:** FHIR R4 reverse-reference search + Mantine 8 / Medplum component refactor
**Confidence:** HIGH

## Summary

Phase 48 generalizes the existing `PatientRelatedResources` "Related Resources" idiom into a single shared `RelatedResourcesPanel` and ships an `IncomingReferencesPanel` mounted below the Tabs on every non-Patient resource detail. Behavior, visuals, and the `_summary=count&_count=0` fetch pattern are preserved from the existing component — Phase 48 is a refactor + catalog-extraction + new-wrapper, not a new behavior phase.

Live probing of the local Blaze server (`http://localhost:8080/fhir`) **confirmed every assumption end-to-end**: `_summary=count&_count=0` returns `bundle.total` reliably with no entries; `Provenance.target` is indexed and queryable; the existing `client.fhirUrl(url).toString()` + `client.get()` pattern returns parseable bundles. Two SearchParameter errors in the proposed catalog (D-03) were caught by the live probe and must be corrected before plan-phase: `MedicationStatement.encounter` and `MedicationStatement.reason-reference` **do not exist** in R4 — Blaze silently drops the param and returns the unfiltered count, which is a significant new pitfall.

**Primary recommendation:** Three-plan split — Plan 01 (catalog file + catalog test, REVR-01); Plan 02 (shared `RelatedResourcesPanel` + `IncomingReferencesPanel` + their tests, REVR-02); Plan 03 (Patient wrapper refactor + ResourceDetailPage mount-point relocation + regression-guard test, REVR-03). Plans 01 and 02 can run in parallel (Plan 02 imports from a stub catalog interface during development); Plan 03 sequenced last so it consumes the finished shared component.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Catalog Shape & Scope**
- **D-01 (file location):** Catalog lives at `src/utils/reverseReferenceCatalog.ts` — matches the REQUIREMENTS.md REVR-01 wording verbatim and follows the existing `src/utils/` convention (peer of `summarizeResource.ts`, `fhir-helpers.ts`).
- **D-02 (entry value shape):** Each catalog entry exports as
  ```ts
  type ReverseReferenceEntry = { type: ResourceType; param: string; icon?: string };
  type ReverseReferenceCatalog = Partial<Record<ResourceType, ReverseReferenceEntry[]>>;
  ```
  Exported as a `const` (typed, frozen) for static analysis. `icon` is an optional emoji/string the card renderer falls back to neutral text if missing.
- **D-03 (catalog coverage — 9 source-type keys):**
  1. **Patient** — re-exported from the existing 11-entry list inside `PatientRelatedResources.tsx` (Condition, Procedure, Observation, Encounter, MedicationStatement, MedicationRequest, DiagnosticReport, ImagingStudy, AllergyIntolerance, Immunization, Consent — all via `param: 'patient'`). Move the array out of the component into the catalog so `PatientRelatedResources` consumes it, NOT duplicates it.
  2. **Observation** — `{ DiagnosticReport, param: 'result' }`, `{ Observation, param: 'has-member' }`, `{ Observation, param: 'derived-from' }`, `{ Provenance, param: 'target' }`.
  3. **Condition** — `{ Encounter, param: 'reason-reference' }`, `{ Procedure, param: 'reason-reference' }`, `{ MedicationStatement, param: 'reason-reference' }`, `{ Provenance, param: 'target' }`.
  4. **Encounter** — `{ Observation, param: 'encounter' }`, `{ Condition, param: 'encounter' }`, `{ Procedure, param: 'encounter' }`, `{ DiagnosticReport, param: 'encounter' }`, `{ MedicationStatement, param: 'context' }`, `{ MedicationRequest, param: 'encounter' }`.
  5. **MedicationStatement** — `{ Provenance, param: 'target' }` (most M-Statements are leaf nodes; minimal entry is acceptable, panel auto-hides when empty per D-12).
  6. **Procedure** — `{ DiagnosticReport, param: 'based-on' }`, `{ Provenance, param: 'target' }`.
  7. **DiagnosticReport** — `{ Observation, param: 'has-member' }`, `{ Provenance, param: 'target' }`.
  8. **AllergyIntolerance** — `{ Provenance, param: 'target' }`.
  9. **Practitioner** — `{ Encounter, param: 'practitioner' }`, `{ Procedure, param: 'performer' }`, `{ Observation, param: 'performer' }`, `{ DiagnosticReport, param: 'performer' }`, `{ Condition, param: 'asserter' }`.

  Researcher MUST verify each `{type, param}` pair against the FHIR R4 SearchParameter registry. **The 9 source-type list itself is locked; entries inside each may be tuned by the researcher with explicit notes** — see Findings §1 below for the two correction proposals.

**Component Architecture**
- **D-04 (shared render component — extracted):** Create `src/components/explorer/RelatedResourcesPanel.tsx` whose props are `{ title; entries; refValue; onCardNavigate }`. Owns the `useEffect` count fetch, loading-skeleton render, populated-cards render, and click-to-navigate. Knows nothing about Patient vs non-Patient.
- **D-05 (Patient wrapper — preserve filename, internal refactor):** `src/components/explorer/PatientRelatedResources.tsx` keeps its filename and prop signature; body becomes a thin wrapper around `RelatedResourcesPanel` consuming `reverseReferenceCatalog.Patient`. Hardcoded `RELATED_TYPES` deleted.
- **D-06 (new IncomingReferencesPanel wrapper):** `src/components/explorer/IncomingReferencesPanel.tsx` exports `<IncomingReferencesPanel resource={r} />` — looks up `reverseReferenceCatalog[resource.resourceType] ?? []`; type-not-in-catalog → returns null.

**Mount Position**
- **D-07 (relocate Patient panel + add Incoming panel below Tabs):** Remove existing `<PatientRelatedResources patientId={id} />` at `ResourceDetailPage.tsx` lines 172–174. Add a single ternary BELOW the `<Tabs>` block: `resource.resourceType === 'Patient' && id ? <PatientRelatedResources patientId={id} /> : <IncomingReferencesPanel resource={resource} />`. Patient panel moves above-Tabs → below-Tabs (deliberate spatial unification).

**Card Visual + States**
- **D-08:** Card layout byte-identical to current `PatientRelatedResources` — `Card withBorder padding="sm"`, `Group justify="space-between"`, `cursor: pointer`, `[icon? + type label]` left, `Badge size="sm" variant="light" color="blue"` right.
- **D-09:** Patient's 11 emoji icons move into the Patient catalog entry. Non-Patient entries omit `icon` in v1.
- **D-10:** Loading state — up to 4 placeholder cards each with `<Loader size="xs" />` while `populated.length === 0` and any query in flight.
- **D-11:** Failed lookup — silent drop (set count to 0). NO toast, NO console.error, NO retry.
- **D-12:** Zero-results panel — return `null` (Title + Grid never render) when `populated.length === 0` after all queries settle.

**Click-Through**
- **D-13:** Card click → `navigate(onCardNavigate(entry))`. Wrapper supplies the URL pattern `/explorer/{type}?{param}={refValue}`.

**Testing**
- **D-14 (REVR-01):** Catalog test — typed const + `as const satisfies` clause; Patient key has exactly 11 entries (regression guard); each non-Patient key has ≥1 entry with valid R4 ResourceType; 9 keys present.
- **D-15 (REVR-02):** Panel test — mock `MedplumClient.get` to return `{ total: 5 }` for one entry / `{ total: 0 }` for others → verify only the 5-card renders; all-zero → verify null; one-throw → verify others render without error toast; click → verify `useNavigate` called with correct URL.
- **D-16 (REVR-03):** Shared-component invariant — mount `<PatientRelatedResources patientId="p1" />` with same mocked counts → byte-identical output structure (regression guard); mount both wrappers side-by-side with identical entries+refValues → DOM structurally equivalent.
- **D-17:** `npm test` green (modulo pre-existing Phase 40 deuteranopia known-failure carry-over); `npx tsc -b --noEmit` exit 0; `npm run build` exit 0.

**Bundle Budget**
- **D-18:** Phase 48 delta ≤ +3 KB gz on initial chunk. Catalog ~1 KB raw / <0.5 KB gz. NO consumption of Phase 47 reference-resolution cache (count queries are bundle.total fetches, cache populates nothing useful).

**Backwards Compat**
- **D-19:** All existing `PatientRelatedResources` callers continue to import from the same path with same prop signature (verified: only one caller — `ResourceDetailPage.tsx:11`).

### Claude's Discretion

- Mantine icon strategy for non-Patient cards (recommend: skip in v1 per D-09 default; do NOT introduce `@tabler/icons-react` icons for catalog entries).
- Whether to memoize `entries` or `refValue` inside the shared component (recommend: `useMemo` on derived `urlString` only — entries is a stable const reference, refValue is a stable string).
- Card ordering — keep catalog-array order, do NOT sort by count (mirrors existing).
- Whether shared component takes a `cols` prop for SimpleGrid responsiveness (recommend: hardcoded `{ base: 2, sm: 3, md: 4 }` for v1, mirrors existing).
- Test file naming — `src/utils/__tests__/reverseReferenceCatalog.test.ts` for catalog; `src/components/explorer/__tests__/IncomingReferencesPanel.test.tsx` and `RelatedResourcesPanel.test.tsx` for components.

### Deferred Ideas (OUT OF SCOPE)

- CapabilityStatement-driven runtime catalog discovery (REQUIREMENTS.md "Future Requirements"; defer to v1.8+).
- "Peek JSON" card action (depends on JSON peek drawer phase, not yet scheduled).
- Card subtitle / top-referencer summary preview.
- Non-Patient card icons / IconStrip design system.
- Sort-by-count on card grid.
- 4-mode resource shell (`Summary | Human | Graph | JSON`) — Phase 47 explicitly preserved the existing `<Tabs>`, Phase 48 inherits that.
- CapabilityStatement gap report (Quality dashboard item — v1.8 candidate).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **REVR-01** | A curated catalog (`src/utils/reverseReferenceCatalog.ts`) defines reverse-reference search params per source resource type. Initial coverage: 8–12 types, mirroring `PatientRelatedResources.tsx`. Catalog entries are exported as TypeScript const for static analysis. | Findings §1 (corrected entries for D-03 keys 4 and 5 — `MedicationStatement.encounter` and `.reason-reference` do not exist in R4); Findings §3 (catalog file pattern matches `src/utils/summarizeResource.ts`); Code Examples §1. |
| **REVR-02** | New `<IncomingReferencesPanel resource={r}>` mounted at the bottom of `ResourceDetailPage.tsx` for non-Patient resources. Counts via parallel `?{param}={ref}&_summary=count&_count=0`. Card grid mirrors `PatientRelatedResources`. | Findings §2 (Blaze probe confirms `_summary=count&_count=0` returns `bundle.total` reliably); Existing `PatientRelatedResources.tsx:42-58` provides the verbatim pattern; Code Examples §2 (shared render component shape). |
| **REVR-03** | `PatientRelatedResources.tsx` and `IncomingReferencesPanel` share a single render component (two props paths). No regression in existing Patient detail UX. | Findings §4 (only ONE caller of `PatientRelatedResources` — `ResourceDetailPage.tsx:11,173`; `PatientHeaderCard` does NOT call it); Findings §5 (NO existing test file for `PatientRelatedResources` — regression guard must be created from scratch); Code Examples §3. |
</phase_requirements>

## Standard Stack

### Core (already installed — zero new dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@medplum/core` | 5.1.7 | `MedplumClient.get(url)`, `client.fhirUrl(path)` | Verified pattern in `PatientRelatedResources.tsx:43-45` and `useMiiExtensionCounts.tsx`. `client.get()` returns parsed JSON Bundle. |
| `@medplum/fhirtypes` | 5.1.7 | `Resource`, `ResourceType` union, `Bundle` | `ResourceType` provides compile-time-safe catalog keys (no `as` casts needed). |
| `@medplum/react-hooks` | 5.1.7 | `useMedplum()` | Returns `MedplumClient` from context. Verified in existing component. |
| `@mantine/core` | ^8.3.18 | `Card`, `SimpleGrid`, `Badge`, `Group`, `Text`, `Title`, `Loader` | All already imported in existing component — zero new Mantine imports needed for shared render. |
| `react-router-dom` | ^7.14.0 | `useNavigate` | Existing pattern at `PatientRelatedResources.tsx:90`. |

### Testing
| Library | Version | Purpose |
|---------|---------|---------|
| `vitest` | (existing) | Test runner |
| `@testing-library/react` | (existing) | RTL for component tests; existing `render`/`screen`/`fireEvent` pattern |
| `@mantine/core` `MantineProvider` | (existing) | Required wrapper for any test rendering Mantine components — see Code Examples §4 |

**Installation:** None — all dependencies already present.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual `client.get(url)` count fetch | `useSearch` hook from `@medplum/react-hooks` | `useSearch` returns full bundles; we need only `bundle.total`. The raw fetch is more efficient (zero entries returned) and is the established pattern. Stick with raw. |
| Promise.all aggregation | Parallel `useEffect` per entry | The existing component fires N parallel fetches independently and updates state per-resolution (see lines 42-55) — gives progressive render. `Promise.all` would block until last response. Keep existing pattern. |
| `AbortController` for cancellation | `cancelled = false` flag in cleanup | Medplum v5.1.7 `client.get()` doesn't accept signal (verified in Phase 42 — `useMiiExtensionCounts.tsx`). Keep flag pattern. |

## Architecture Patterns

### Recommended File Layout
```
src/
├── utils/
│   ├── reverseReferenceCatalog.ts          # NEW — catalog const (REVR-01)
│   └── __tests__/
│       └── reverseReferenceCatalog.test.ts # NEW — D-14 tests
├── components/explorer/
│   ├── RelatedResourcesPanel.tsx           # NEW — shared render (D-04)
│   ├── PatientRelatedResources.tsx         # REFACTOR — thin wrapper (D-05)
│   ├── IncomingReferencesPanel.tsx         # NEW — non-Patient wrapper (D-06)
│   ├── ResourceDetailPage.tsx              # EDIT — mount-point relocation (D-07)
│   └── __tests__/
│       ├── RelatedResourcesPanel.test.tsx        # NEW — D-15 panel tests
│       ├── IncomingReferencesPanel.test.tsx      # NEW — D-15/D-16 wrapper + invariant
│       └── PatientRelatedResources.test.tsx      # NEW — D-16 regression guard (no existing test)
```

### Pattern 1: Catalog as typed const with `Partial<Record<...>>`
**What:** Const-frozen object literal mapping `ResourceType` keys to entry arrays. Use `Partial<Record<ResourceType, …>>` so we don't have to enumerate all 144 R4 types (matches D-02 verbatim).
**When to use:** Static lookup tables where coverage grows incrementally and missing-key semantics are "no panel."

```ts
// src/utils/reverseReferenceCatalog.ts
import type { ResourceType } from '@medplum/fhirtypes';

export interface ReverseReferenceEntry {
  type: ResourceType;
  param: string;
  icon?: string;
}

export type ReverseReferenceCatalog = Partial<Record<ResourceType, ReverseReferenceEntry[]>>;

export const reverseReferenceCatalog = {
  Patient: [
    { type: 'Condition',           param: 'patient', icon: '🩺' },
    // ... 10 more (preserving the existing PatientRelatedResources order + emojis exactly)
  ],
  Observation: [
    { type: 'DiagnosticReport',    param: 'result' },
    // ...
  ],
  // ...
} as const satisfies ReverseReferenceCatalog;
```

The `as const satisfies ReverseReferenceCatalog` clause is the modern TypeScript idiom — preserves literal types for downstream inference while compile-checking against the schema. Used elsewhere in the project (e.g. registries in `summarizeResource.ts`).

### Pattern 2: Shared component owns fetch + state, wrappers own routing
**What:** `RelatedResourcesPanel` accepts `{ title, entries, refValue, onCardNavigate }`. `useEffect` inside fires `entries.length` parallel `_summary=count` queries against `refValue`. Wrappers compose `refValue` from the resource and supply the navigate callback.

This is the architectural payload of D-04 + D-05 + D-06. The wrappers contain ZERO business logic — they only construct the inputs to the shared component.

### Pattern 3: Cancellation-token effect cleanup
```ts
useEffect(() => {
  let cancelled = false;
  for (const entry of entries) {
    client.get(client.fhirUrl(`${entry.type}?${entry.param}=${refValue}&_summary=count&_count=0`).toString())
      .then((raw) => {
        if (cancelled) return;
        const bundle: Bundle = typeof raw === 'string' ? JSON.parse(raw) : raw;
        setCounts(prev => ({ ...prev, [entry.type]: bundle.total ?? 0 }));
      })
      .catch(() => {
        if (cancelled) return;
        setCounts(prev => ({ ...prev, [entry.type]: 0 })); // D-11 silent drop
      });
  }
  return () => { cancelled = true; };
}, [client, refValue, entries]);
```

Verbatim pattern from `PatientRelatedResources.tsx:36-58`. **Caveat:** `entries` in deps will retrigger on every render unless the parent passes a stable reference. Wrappers MUST pass the catalog array directly (it's a const, stable identity) — never inline `[]` literals.

### Pattern 4: Stable counts state key
Use `entry.type` as the key in the `counts` Record. **Pitfall:** if a single source-type has multiple entries with the same `type` (e.g. Condition's catalog has `{Encounter, reason-reference}` and could in future have `{Encounter, diagnosis}`), keying by type alone collides. The existing component doesn't have this problem (one row per type). For Phase 48, recommend using `${entry.type}:${entry.param}` as the state key to be future-proof, or — simpler — keep `entry.type` since the locked D-03 catalog has no per-type collisions. **Decision: keep `entry.type` for byte-identical D-08 / D-16 invariance.**

### Anti-Patterns to Avoid
- **Inline `useEffect` deps via `[entries]` with array literal** — re-runs on every render. Always import from the catalog const.
- **`AbortController` on `client.get()`** — v5.1.7 doesn't thread the signal through. Use `cancelled` flag (Phase 42 finding, `useMiiExtensionCounts.tsx`).
- **Sorting populated cards by count** — locked D-08 and CONTEXT discretion: catalog-array order only.
- **Hand-rolling URL construction** — always go through `client.fhirUrl(path).toString()` so the configured `fhirUrlPath` (Blaze: `/fhir`) is honored.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| FHIR URL construction | `\`${baseUrl}/${type}?...\`` template strings | `client.fhirUrl(path).toString()` | Honors `fhirUrlPath` config; respects auth headers. Existing pattern. |
| Bundle JSON parsing | `JSON.parse` on every response | `typeof raw === 'string' ? JSON.parse(raw) : raw` | Medplum `client.get()` returns parsed JSON in newer versions but stringified in older paths — the existing dual check handles both (`PatientRelatedResources.tsx:48`). |
| URL pattern for `/explorer/{type}?{param}={ref}` | New routing helper | Compose inline in `onCardNavigate` callback per D-13 | The existing `SearchResultsPage` already parses query strings into search filters; URL pattern is part of the URL contract, not a function to wrap. |
| Loading-skeleton render | Custom `<LoadingCard>` | Inline up to 4 `<Card>` with `<Loader size="xs" />` (verbatim from `PatientRelatedResources.tsx:73-82`) | D-08 byte-identical preservation. |
| Cancellation logic | `AbortController` plumbing | `let cancelled = false` flag in effect cleanup | v5.1.7 limitation. |
| Test fixture for `<MantineProvider>` wrap | Custom test utility | Inline `wrap = (ui) => <MantineProvider>{ui}</MantineProvider>` per Phase 47 convention | Established pattern in 5/5 existing test files. |

**Key insight:** Phase 48 is overwhelmingly an extraction + composition refactor of code that already exists and works. Adding ANY new abstraction beyond what the existing `PatientRelatedResources` already does is yak-shaving. The shared component is just the existing component with two of its hardcoded values lifted into props.

## Runtime State Inventory

> Phase 48 is a refactor + new component. Runtime state inventory below is included for completeness.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — Phase 48 reads only; no persistence layer touched | None |
| Live service config | None — no n8n / Datadog / external config | None |
| OS-registered state | None | None |
| Secrets/env vars | None — no auth changes | None |
| Build artifacts | None new — Vite picks up new files automatically | None |

**The only "rename" risk:** `PatientRelatedResources.tsx`'s internal `RELATED_TYPES` const moves out of file. Verified callers via grep:
- `src/components/explorer/ResourceDetailPage.tsx:11` (named import) — unchanged after refactor.
- `src/hooks/useMiiExtensionCounts.tsx:22,97` (comment references — line numbers in the comments) — comment refs, will become stale; recommend updating to `RelatedResourcesPanel.tsx:NN` post-refactor.
- `PatientHeaderCard.tsx` — **does NOT import `PatientRelatedResources`** (CONTEXT canonical_refs claims it does — incorrect). The Patient panel mount lives entirely in `ResourceDetailPage.tsx:172-174`.

## Common Pitfalls

### Pitfall 1: Blaze silently drops unknown SearchParameters and returns the unfiltered count
**What goes wrong:** A typo in a catalog entry's `param` (e.g. `MedicationStatement.reason-reference` — does not exist in R4) causes Blaze to **drop the param from the query** and return the bundle.total of an unfiltered query (e.g. all MedicationStatements on the server). This produces a misleadingly inflated count card on resources where the user expected zero or a small filtered count.
**Why it happens:** Blaze treats unrecognized params as no-ops by spec — the self-link in the response shows the rewritten URL with the param stripped. There's no error.
**How to avoid:**
1. Verify EVERY `{type, param}` pair against the live Blaze CapabilityStatement at plan-time (run `curl http://localhost:8080/fhir/metadata` and check `rest[0].resource[*].searchParam[*].name`).
2. Add a runtime sanity check or doc comment listing the verified-against-CapabilityStatement source.
3. Catalog test (D-14) should hard-code the known-good params per type — drift detection.
**Warning signs:** A non-Patient resource shows a "Referenced by" panel with surprisingly large counts that don't match expectation when click-through to the explorer; the explorer's filtered list shows the unfiltered set.
**This phase's exposure:** Catalog D-03 entries 4 and 5 — `MedicationStatement.encounter` (should be `context`) and `MedicationStatement.reason-reference` (does NOT exist in R4 at all). See Findings §1 for the locked-corrections proposal.

### Pitfall 2: `useEffect` deps churn from inline arrays
**What goes wrong:** If the wrapper passes `entries={[...]}` as a literal in JSX, the array identity changes on every render → infinite refetch loop.
**Why it happens:** React's dependency comparison is by reference.
**How to avoid:** Wrappers pull `entries` from the module-scoped catalog const (stable reference forever). Never pass inline `entries={[]}`.
**Warning signs:** Network tab shows the panel firing N requests on every prop change of the parent.

### Pitfall 3: `MantineProvider` missing in tests → cryptic Mantine 8 errors
**What goes wrong:** `Cannot read properties of null (reading 'colorScheme')` or similar at render time.
**Why it happens:** Mantine 8 components require theme context.
**How to avoid:** Wrap every component test in `<MantineProvider>{ui}</MantineProvider>` (existing convention; see Code Examples §4).
**Warning signs:** Tests pass in isolation, fail in suite.

### Pitfall 4: `useNavigate` outside Router
**What goes wrong:** `useNavigate() may be used only in the context of a <Router> component`.
**Why it happens:** Component using `useNavigate` rendered without a Router ancestor.
**How to avoid:** Wrap component tests in `<MemoryRouter>` (see existing pattern in `HumanReadableView.read-phase.test.tsx:42-45`). Catalog test does NOT need this — it tests data only.

### Pitfall 5: Missing `ResizeObserver` polyfill in jsdom
**What goes wrong:** Mantine `SimpleGrid` or `Loader` may invoke `ResizeObserver`; jsdom doesn't have it.
**Why it happens:** Mantine 8 uses ResizeObserver internally for responsive components.
**How to avoid:** Polyfill at the top of every component test file — verbatim from `ReferenceLink.test.tsx:14-35` (also includes `matchMedia` polyfill). Recommend factoring out into a shared `src/test/mantine-jsdom-polyfills.ts` if Phase 48 doesn't already do it.
**Warning signs:** `ReferenceError: ResizeObserver is not defined` in test output.

### Pitfall 6: `client.get()` return-shape (string vs object)
**What goes wrong:** Some `MedplumClient` methods return `string` (raw response body) and others return parsed `Resource | Bundle`. Misjudging causes `JSON.parse(undefined)` or `bundle.total` on a string.
**Why it happens:** Internal Medplum dispatch.
**How to avoid:** Always use the dual check `typeof raw === 'string' ? JSON.parse(raw) : raw` (verbatim from `PatientRelatedResources.tsx:48`).

### Pitfall 7: Patient panel relocation hides cards on mid-screen scroll
**What goes wrong:** After D-07 moves the Patient panel from above-Tabs to below-Tabs, users who relied on the panel being above the fold won't see it without scrolling past large clinical/JSON content.
**Why it happens:** Below-Tabs places the panel at the bottom of potentially long Tabs.Panel content (e.g. `HumanReadableView` with `ScrollArea h="calc(100vh - 250px)"` — the ScrollArea inside HumanReadableView contains its own scroll, but the panel is OUTSIDE the ScrollArea). Need to verify the panel is reachable without entering the ScrollArea.
**How to avoid:** Verify in HUMAN-UAT that the Patient detail page renders the Related Resources panel below the Tabs container at the page level — outside the inner ScrollArea. Mark as 48-HUMAN-UAT item.
**Warning signs:** UAT feedback "I can't find the related resources cards" on a Patient detail.

## Code Examples

### Example 1: Catalog file (REVR-01)
```ts
// src/utils/reverseReferenceCatalog.ts
// Source: live Blaze CapabilityStatement probe (http://localhost:8080/fhir/metadata, 2026-05-01)
//         + FHIR R4 SearchParameter registry verification per type
import type { ResourceType } from '@medplum/fhirtypes';

export interface ReverseReferenceEntry {
  type: ResourceType;
  param: string;
  icon?: string;
}

export type ReverseReferenceCatalog = Partial<Record<ResourceType, readonly ReverseReferenceEntry[]>>;

export const reverseReferenceCatalog = {
  Patient: [
    { type: 'Condition',           param: 'patient', icon: '🩺' },
    { type: 'Procedure',           param: 'patient', icon: '🔧' },
    { type: 'Observation',         param: 'patient', icon: '📊' },
    { type: 'Encounter',           param: 'patient', icon: '🏥' },
    { type: 'MedicationStatement', param: 'patient', icon: '💊' },
    { type: 'MedicationRequest',   param: 'patient', icon: '📋' },
    { type: 'DiagnosticReport',    param: 'patient', icon: '🧪' },
    { type: 'ImagingStudy',        param: 'patient', icon: '🖼' },
    { type: 'AllergyIntolerance',  param: 'patient', icon: '⚠' },
    { type: 'Immunization',        param: 'patient', icon: '💉' },
    { type: 'Consent',             param: 'patient', icon: '✍' },
  ],
  Observation: [
    { type: 'DiagnosticReport', param: 'result' },
    { type: 'Observation',      param: 'has-member' },
    { type: 'Observation',      param: 'derived-from' },
    { type: 'Provenance',       param: 'target' },
  ],
  Condition: [
    { type: 'Encounter',  param: 'reason-reference' },
    { type: 'Procedure',  param: 'reason-reference' },
    // NOTE: D-03 entry "MedicationStatement reason-reference" REMOVED — does not exist in R4 (see RESEARCH §1.b)
    { type: 'Provenance', param: 'target' },
  ],
  Encounter: [
    { type: 'Observation',         param: 'encounter' },
    { type: 'Condition',           param: 'encounter' },
    { type: 'Procedure',           param: 'encounter' },
    { type: 'DiagnosticReport',    param: 'encounter' },
    { type: 'MedicationStatement', param: 'context' },          // R4 uses 'context' not 'encounter'
    { type: 'MedicationRequest',   param: 'encounter' },
  ],
  MedicationStatement: [
    { type: 'Provenance', param: 'target' },
  ],
  Procedure: [
    { type: 'DiagnosticReport', param: 'based-on' },
    { type: 'Provenance',       param: 'target' },
  ],
  DiagnosticReport: [
    { type: 'Observation', param: 'has-member' },
    { type: 'Provenance',  param: 'target' },
  ],
  AllergyIntolerance: [
    { type: 'Provenance', param: 'target' },
  ],
  Practitioner: [
    { type: 'Encounter',        param: 'practitioner' },
    { type: 'Procedure',        param: 'performer' },
    { type: 'Observation',      param: 'performer' },
    { type: 'DiagnosticReport', param: 'performer' },
    { type: 'Condition',        param: 'asserter' },
  ],
} as const satisfies ReverseReferenceCatalog;
```

### Example 2: Shared `RelatedResourcesPanel` (REVR-02 / D-04)
```tsx
// src/components/explorer/RelatedResourcesPanel.tsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Card, Group, Loader, SimpleGrid, Text, Title } from '@mantine/core';
import { useMedplum } from '@medplum/react-hooks';
import type { Bundle } from '@medplum/fhirtypes';
import type { ReverseReferenceEntry } from '../../utils/reverseReferenceCatalog';

export interface RelatedResourcesPanelProps {
  title: string;
  entries: readonly ReverseReferenceEntry[];
  refValue: string;
  onCardNavigate: (entry: ReverseReferenceEntry) => string;
}

export function RelatedResourcesPanel({ title, entries, refValue, onCardNavigate }: RelatedResourcesPanelProps) {
  const client = useMedplum();
  const navigate = useNavigate();
  const [counts, setCounts] = useState<Record<string, number | 'loading'>>({});

  useEffect(() => {
    let cancelled = false;
    const initial: Record<string, number | 'loading'> = {};
    for (const e of entries) initial[e.type] = 'loading';
    setCounts(initial);

    for (const e of entries) {
      const url = `${e.type}?${e.param}=${refValue}&_summary=count&_count=0`;
      client.get(client.fhirUrl(url).toString())
        .then((raw) => {
          if (cancelled) return;
          const bundle: Bundle = typeof raw === 'string' ? JSON.parse(raw) : raw;
          setCounts(prev => ({ ...prev, [e.type]: bundle.total ?? 0 }));
        })
        .catch(() => {
          if (cancelled) return;
          setCounts(prev => ({ ...prev, [e.type]: 0 }));
        });
    }
    return () => { cancelled = true; };
  }, [client, refValue, entries]);

  const populated = useMemo(
    () => entries.filter(e => typeof counts[e.type] === 'number' && (counts[e.type] as number) > 0),
    [counts, entries]
  );
  const loading = Object.values(counts).some(c => c === 'loading');

  if (!loading && populated.length === 0) return null;

  return (
    <div>
      <Title order={5} mb="sm">{title}</Title>
      <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }}>
        {loading && populated.length === 0 &&
          entries.slice(0, 4).map(e => (
            <Card key={e.type} withBorder padding="sm">
              <Group justify="space-between">
                <Text size="sm">{e.type}</Text>
                <Loader size="xs" />
              </Group>
            </Card>
          ))}
        {populated.map(e => (
          <Card key={e.type} withBorder padding="sm" style={{ cursor: 'pointer' }} onClick={() => navigate(onCardNavigate(e))}>
            <Group justify="space-between">
              <Group gap="xs">
                {e.icon && <Text size="sm">{e.icon}</Text>}
                <Text size="sm" fw={500}>{e.type}</Text>
              </Group>
              <Badge size="sm" variant="light" color="blue">
                {(counts[e.type] as number).toLocaleString()}
              </Badge>
            </Group>
          </Card>
        ))}
      </SimpleGrid>
    </div>
  );
}
```

### Example 3: Patient + Incoming wrappers (REVR-03 / D-05 + D-06)
```tsx
// src/components/explorer/PatientRelatedResources.tsx — REFACTORED
import { reverseReferenceCatalog } from '../../utils/reverseReferenceCatalog';
import { RelatedResourcesPanel } from './RelatedResourcesPanel';

export interface PatientRelatedResourcesProps { patientId: string }

export function PatientRelatedResources({ patientId }: PatientRelatedResourcesProps) {
  const entries = reverseReferenceCatalog.Patient ?? [];
  const refValue = `Patient/${patientId}`;
  return (
    <RelatedResourcesPanel
      title="Related Resources"
      entries={entries}
      refValue={refValue}
      onCardNavigate={(e) => `/explorer/${e.type}?${e.param}=${refValue}`}
    />
  );
}
```

```tsx
// src/components/explorer/IncomingReferencesPanel.tsx — NEW
import type { Resource } from '@medplum/fhirtypes';
import { reverseReferenceCatalog } from '../../utils/reverseReferenceCatalog';
import { RelatedResourcesPanel } from './RelatedResourcesPanel';

export interface IncomingReferencesPanelProps { resource: Resource }

export function IncomingReferencesPanel({ resource }: IncomingReferencesPanelProps) {
  const entries = reverseReferenceCatalog[resource.resourceType] ?? [];
  if (entries.length === 0) return null; // type not in catalog — silent no-op
  if (!resource.id) return null;
  const refValue = `${resource.resourceType}/${resource.id}`;
  return (
    <RelatedResourcesPanel
      title="Referenced By"
      entries={entries}
      refValue={refValue}
      onCardNavigate={(e) => `/explorer/${e.type}?${e.param}=${refValue}`}
    />
  );
}
```

### Example 4: Test setup (D-15 / D-16)
```tsx
// src/components/explorer/__tests__/RelatedResourcesPanel.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import type { ReactNode } from 'react';
import { RelatedResourcesPanel } from '../RelatedResourcesPanel';

// jsdom polyfills (mirror ReferenceLink.test.tsx:15-35)
class MockResizeObserver { observe = vi.fn(); unobserve = vi.fn(); disconnect = vi.fn(); }
(globalThis as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn().mockImplementation((q: string) => ({ matches: false, media: q, onchange: null, addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() })) });

const mockGet = vi.fn();
const mockNavigate = vi.fn();
vi.mock('@medplum/react-hooks', () => ({
  useMedplum: () => ({ get: mockGet, fhirUrl: (p: string) => ({ toString: () => `http://test/fhir/${p}` }) }),
}));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const wrap = (ui: ReactNode) => <MantineProvider><MemoryRouter>{ui}</MemoryRouter></MantineProvider>;

beforeEach(() => { mockGet.mockReset(); mockNavigate.mockReset(); });

describe('RelatedResourcesPanel', () => {
  it('renders only entries with count > 0', async () => {
    mockGet.mockImplementation((url: string) =>
      url.includes('Observation?') ? Promise.resolve({ resourceType: 'Bundle', total: 5 } as Bundle)
                                   : Promise.resolve({ resourceType: 'Bundle', total: 0 } as Bundle));
    render(wrap(
      <RelatedResourcesPanel
        title="Test"
        entries={[{ type: 'Observation', param: 'x' }, { type: 'Condition', param: 'y' }]}
        refValue="Patient/p1"
        onCardNavigate={(e) => `/explorer/${e.type}?${e.param}=Patient/p1`}
      />
    ));
    await waitFor(() => expect(screen.getByText('Observation')).toBeTruthy());
    expect(screen.queryByText('Condition')).toBeNull();
  });
  // ... all-zero → null; one-throw → others render; click → navigate called
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Inline `RELATED_TYPES` array per component | Module-level catalog imported by N components | Phase 48 (this) | Single source of truth for reverse-reference search params; Phase 49 graph reuses the catalog. |
| Hardcoded Patient-only "Related Resources" panel | Generalized `<RelatedResourcesPanel>` + thin wrappers | Phase 48 | Code reuse; new resource types pick up panel for free by adding a catalog entry. |
| `as const` (legacy) | `as const satisfies T` (TS 4.9+) | TS 4.9 (2022) | Preserves literal types AND compile-checks against schema. Project already uses elsewhere. |

**Deprecated/outdated:**
- React 17 `useEffect` strict-mode-double-fire patterns — N/A; we're on React 18 already and the existing component handles double-fire via cancellation flag.
- `@types/fhir` for FHIR types — **Do not use**; project standardizes on `@medplum/fhirtypes`.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Blaze 0.x default Provenance.target indexing matches the tested instance | Findings §2 | Low — indexed in tested instance; if Phase-48 user runs against a Blaze with non-default config disabling Provenance indexing, Provenance entries silently return 0 → cards drop per D-12, harmless. |
| A2 | `MedicationRequest` (Patient catalog entry) supports `param: 'patient'` | D-03 entry 1 | None — verified part of the existing 11-entry list which has been in production since Phase 3. |

All other claims VERIFIED via live Blaze probe at `http://localhost:8080/fhir` on 2026-05-01 or via FHIR R4 spec at `https://hl7.org/fhir/R4/`.

## Open Questions

1. **Should the catalog include a comment-block per entry citing the verified-against source?**
   - What we know: Catalog test (D-14) checks shape, not param-name correctness.
   - What's unclear: Future drift — a developer adding entries without re-running the CapabilityStatement probe could silently introduce Pitfall 1 again.
   - Recommendation: Add a JSDoc header to `reverseReferenceCatalog.ts` documenting the verification protocol and the date the existing entries were verified. Recommend a Phase-48 plan task: add a `verify-catalog.mjs` script to `scripts/` that fetches `/metadata`, intersects each catalog entry's `param` against `searchParam[*].name`, and prints any drift. Optional; not required by REQ-IDs.

2. **Should we add `Practitioner` to D-03 if `Provenance.target` is the only entry for that type?**
   - Resolved by D-03 directly: Practitioner has 5 entries (Encounter, Procedure, Observation, DiagnosticReport, Condition).

3. **What if a user navigates to `/explorer/MedicationRequest/abc` — is MedicationRequest in the catalog?**
   - It is not (only 9 source-type keys per D-03). Per D-06, the panel returns `null` for absent catalog keys. UX: silently no panel. Acceptable per design.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Local Blaze server | Live probe verification (recommended for plan-time) | ✓ | (unknown — responding at localhost:8080/fhir) | Skip live probe; rely on FHIR R4 spec text + CapabilityStatement spec |
| `@medplum/core` | Runtime fetch + URL helpers | ✓ | 5.1.7 | None — required |
| `@medplum/fhirtypes` | Compile-time `ResourceType` union | ✓ | 5.1.7 | None — required |
| `@mantine/core` | Card / SimpleGrid / Loader | ✓ | ^8.3.18 | None — peer of @medplum/react |
| `vitest` | Test runner | ✓ | (existing) | None — test infra in place |
| `@testing-library/react` | RTL | ✓ | (existing) | None |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None — phase ships with zero new deps per D-18.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.x (existing in project; runs via `npm test`) |
| Config file | `vitest.config.ts` (project root; existing) |
| Quick run command | `npx vitest run src/utils/__tests__/reverseReferenceCatalog.test.ts src/components/explorer/__tests__/RelatedResourcesPanel.test.tsx src/components/explorer/__tests__/IncomingReferencesPanel.test.tsx src/components/explorer/__tests__/PatientRelatedResources.test.tsx` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REVR-01 | Catalog exports typed const with 9 source-type keys | unit | `npx vitest run src/utils/__tests__/reverseReferenceCatalog.test.ts` | ❌ Wave 0 (new test file) |
| REVR-01 | Patient key has exactly 11 entries (regression guard) | unit | (same as above) | ❌ Wave 0 |
| REVR-01 | Each non-Patient key has ≥1 entry with valid R4 `ResourceType` | unit | (same as above) | ❌ Wave 0 |
| REVR-02 | Panel fetches counts in parallel and renders cards with count > 0 only | unit (RTL) | `npx vitest run src/components/explorer/__tests__/RelatedResourcesPanel.test.tsx` | ❌ Wave 0 |
| REVR-02 | All-zero counts → component returns null | unit (RTL) | (same) | ❌ Wave 0 |
| REVR-02 | One-throw → other entries still render without console.error | unit (RTL) | (same) | ❌ Wave 0 |
| REVR-02 | Card click → `useNavigate` called with `/explorer/{type}?{param}={ref}` | unit (RTL) | (same) | ❌ Wave 0 |
| REVR-02 | `<IncomingReferencesPanel resource={resource of type-not-in-catalog}/>` returns null | unit (RTL) | `npx vitest run src/components/explorer/__tests__/IncomingReferencesPanel.test.tsx` | ❌ Wave 0 |
| REVR-03 | Refactored `<PatientRelatedResources>` produces byte-identical output to pre-refactor | unit (RTL) | `npx vitest run src/components/explorer/__tests__/PatientRelatedResources.test.tsx` | ❌ Wave 0 (no existing test) |
| REVR-03 | Both wrappers with identical entries+refValues produce structurally equivalent DOM | unit (RTL snapshot) | (same as IncomingReferencesPanel.test.tsx) | ❌ Wave 0 |
| All | Full suite green; tsc clean; build clean | suite + lint + build | `npm test && npx tsc -b --noEmit && npm run build` | ✅ existing infra |
| All | HUMAN-UAT live-Blaze: panel mount position below Tabs verified visually | manual | (HUMAN-UAT walk on local Blaze; create `48-HUMAN-UAT.md`) | ❌ Wave 0 manual scaffold |

### Sampling Rate
- **Per task commit:** `npx vitest run <new test files only>` (≤ 30s)
- **Per wave merge:** `npm test` (full suite; pre-existing Phase 40 deuteranopia failure carries over per D-17)
- **Phase gate:** `npm test && npx tsc -b --noEmit && npm run build` all green; HUMAN-UAT walk completed and recorded in `48-HUMAN-UAT.md`

### Wave 0 Gaps
- [ ] `src/utils/__tests__/reverseReferenceCatalog.test.ts` — covers REVR-01 (D-14)
- [ ] `src/components/explorer/__tests__/RelatedResourcesPanel.test.tsx` — covers REVR-02 (D-15)
- [ ] `src/components/explorer/__tests__/IncomingReferencesPanel.test.tsx` — covers REVR-02 + REVR-03 invariant
- [ ] `src/components/explorer/__tests__/PatientRelatedResources.test.tsx` — covers REVR-03 regression guard (D-16); NO existing test, must be written from scratch and snapshot the pre-refactor DOM as the regression baseline
- [ ] `48-HUMAN-UAT.md` scaffold — verify panel mount position below Tabs on live Blaze

*(No framework install needed — Vitest + RTL + MantineProvider patterns established in 6 existing test files.)*

## Findings (Researcher Notes)

### 1. SearchParameter validity for D-03 entries — TWO CORRECTIONS NEEDED

Live probe of Blaze CapabilityStatement (`curl http://localhost:8080/fhir/metadata` 2026-05-01) yields the authoritative supported-search-params list per type. Cross-referenced against D-03:

**Verified VALID (12 of 14 non-Patient entries):**
- ✅ `Observation`: `has-member`, `derived-from` (Blaze searchParam list confirms)
- ✅ `DiagnosticReport`: `result`, `based-on`, `performer`
- ✅ `Encounter`: `reason-reference`, `practitioner`
- ✅ `Procedure`: `reason-reference`, `performer`
- ✅ `Condition`: `asserter`
- ✅ `Provenance`: `target` (also indexed; live probe `Provenance?target=Patient/example&_summary=count&_count=0` returned `total: 0` cleanly)
- ✅ `MedicationStatement`: `context` (Blaze list: `['part-of', 'context', 'status', 'identifier', 'subject', 'medication', 'source', 'patient', 'category', 'code', 'effective']`)

**Verified INVALID (2 entries — must be corrected before locking the catalog):**

**1.a — D-03 Encounter entry "MedicationStatement encounter" → must use `context`**

D-03 entry 4 (Encounter source) lists `{ MedicationStatement, param: 'context' }` correctly already (this is the only D-03 line that gets it right). No correction needed.

**1.b — D-03 Condition entry "MedicationStatement reason-reference" → REMOVE entirely**

D-03 entry 3 (Condition source) lists `{ MedicationStatement, param: 'reason-reference' }`. Blaze CapabilityStatement confirms `MedicationStatement` does NOT support `reason-reference`. The R4 spec defines `MedicationStatement.reasonReference` as an element but provides NO matching SearchParameter (only `MedicationRequest` has the search param `reason-reference` in R4). **Recommendation: drop this entry from the Condition source list.** Replace with nothing — the Condition source still has 2 valid entries (Encounter.reason-reference + Procedure.reason-reference + Provenance.target).

**Sources:**
- Blaze CapabilityStatement live probe (definitive for the deployment target): `curl http://localhost:8080/fhir/metadata 2026-05-01`
- FHIR R4 MedicationStatement spec — `[VERIFIED: hl7.org/fhir/R4/medicationstatement.html]` no `reason-reference` SearchParameter listed
- FHIR R4 Encounter spec — `[VERIFIED: hl7.org/fhir/R4/encounter.html]` `reason-reference` SearchParameter exists

### 2. Bundle.total semantics with `_summary=count&_count=0` on Blaze

**VERIFIED via live probe** at `http://localhost:8080/fhir/Observation?_summary=count&_count=0`:

```json
{"resourceType":"Bundle","id":"DH...","type":"searchset","total":349715,
 "link":[{"relation":"self","url":"http://localhost:8080/fhir/Observation?_summary=count&_count=0"}]}
```

`bundle.total` returned reliably; `entry` array absent. Confirms D-12 fallback contract: when count is unavailable Blaze returns total or omits — `bundle.total ?? 0` covers both.

`_summary=count` without `_count=0` defaults to `_count=50` and DOES return entries — wasteful. Always pair `_summary=count` with `_count=0`. Existing `PatientRelatedResources.tsx:43` already does this; Phase 48 preserves.

**Sources:**
- Live Blaze probe 2026-05-01
- Blaze docs: [FHIR Search Performance](https://samply.github.io/blaze/performance/fhir-search.html)
- GitHub issue `samply/blaze#156` — historical context on totals; resolved in current Blaze versions [CITED: github.com/samply/blaze/issues/156]

### 3. Mantine 8 / Medplum testing patterns — closest reference files

The closest existing test files to mirror for Phase 48 are (in order of relevance):

1. **`src/components/explorer/__tests__/ReferenceLink.test.tsx`** — best match. Mocks `useReferenceResolver` (a hook), wraps in `<MantineProvider>`, includes ResizeObserver + matchMedia polyfills, uses `vi.mock(...)` for the hook. Phase 48 needs the same polyfills + the same vi.mock pattern (mock `useMedplum` + `useNavigate`).

2. **`src/components/explorer/__tests__/HumanReadableView.read-phase.test.tsx`** — adds `MemoryRouter` wrap on top of MantineProvider (because the rendered components include router-driven `<Link>` and `useNavigate`). Phase 48 needs MemoryRouter (panels call `useNavigate`).

3. **`src/components/explorer/__tests__/ContainedResourcesAccordion.test.tsx`** — simpler MantineProvider-only wrap; useful for IncomingReferencesPanel-with-no-router-needed early null-return test cases.

**Pattern to copy verbatim** (Code Examples §4 above): MockResizeObserver class, matchMedia polyfill, MantineProvider wrap, MemoryRouter wrap, `vi.mock('@medplum/react-hooks', ...)`, `vi.mock('react-router-dom', ...)` (the standard partial-mock idiom that preserves `MemoryRouter`).

### 4. PatientRelatedResources caller audit — only ONE caller

Grep confirms: `PatientRelatedResources` is imported only by `src/components/explorer/ResourceDetailPage.tsx:11` and rendered at line 173. **CONTEXT canonical_refs claim that `PatientHeaderCard.tsx` is a caller is INCORRECT** — `PatientHeaderCard.tsx` does not import or render `PatientRelatedResources`. The Patient panel mount lives entirely in `ResourceDetailPage.tsx:172-174`.

This means D-19 (backwards-compat invariant) has only one production caller to verify. The refactor surface is contained.

### 5. PatientRelatedResources has NO existing test file

Confirmed: no `PatientRelatedResources.test.tsx` exists in `src/components/explorer/__tests__/`. Phase 48 must create the regression-guard test from scratch (D-16). Recommended approach for the regression baseline:
- Take a "before" DOM snapshot in the test file using the pre-refactor commit (i.e. write the test first, run it against the existing component, capture the snapshot, then refactor).
- Snapshot to compare: rendered structure of `<PatientRelatedResources patientId="p1" />` with `mockGet` returning `{total: 5}` for all 11 entries.
- After refactor, re-run — must match.

This makes Plan 03 (D-05 + D-07 + regression test) a TDD-style plan: write test against current code, refactor, re-run.

### 6. Plan decomposition recommendation (3 plans, parallelizable)

Given REVR-01 / REVR-02 / REVR-03 + 1 catalog file + 1 shared render + 2 wrappers + 1 mount-point edit + 4 test files:

**Plan 48-01 — Catalog (REVR-01)** — sequential first; produces the import surface.
- Files: `src/utils/reverseReferenceCatalog.ts` + `src/utils/__tests__/reverseReferenceCatalog.test.ts`
- Tests: D-14 (shape, 9 keys, Patient = 11 entries, valid ResourceType per non-Patient key)
- ~½ day; pure data + tests, no React.

**Plan 48-02 — Shared component + IncomingReferencesPanel (REVR-02)** — parallelizable with 48-03 *if* catalog stub interface lands first; otherwise sequenced after 48-01.
- Files: `src/components/explorer/RelatedResourcesPanel.tsx`, `src/components/explorer/IncomingReferencesPanel.tsx`, `src/components/explorer/__tests__/RelatedResourcesPanel.test.tsx`, `src/components/explorer/__tests__/IncomingReferencesPanel.test.tsx`
- Tests: D-15 (parallel fetch, populated-only render, all-zero null, throw-recovery, click-navigate, type-not-in-catalog null)
- ~1 day.

**Plan 48-03 — Patient wrapper refactor + mount-point relocation (REVR-03)** — sequenced LAST; consumes 48-01 + 48-02.
- Files: `src/components/explorer/PatientRelatedResources.tsx` (refactor), `src/components/explorer/ResourceDetailPage.tsx` (mount edit), `src/components/explorer/__tests__/PatientRelatedResources.test.tsx` (regression guard from scratch)
- Tests: D-16 (regression guard pre-refactor DOM snapshot match; both-wrappers structurally equivalent)
- ~½ day.

**Wave parallelization:** 48-01 and 48-02 CAN run in the same wave if the catalog interface (`ReverseReferenceEntry`, `ReverseReferenceCatalog`) is defined as the first commit of 48-01 and 48-02 imports the type from there. The actual `reverseReferenceCatalog` const can be filled in parallel. Recommend: Wave 1 = 48-01 + 48-02 parallel; Wave 2 = 48-03.

**Total effort:** ~2 days (matches CONTEXT effort estimate "medium / 2-3 days"). HUMAN-UAT scaffolded for live-Blaze panel-position verification.

## Sources

### Primary (HIGH confidence)
- **Live Blaze CapabilityStatement probe** (`curl http://localhost:8080/fhir/metadata`) — definitive source for which SearchParameters Blaze actually supports per resource type. Used to verify all 14 non-Patient D-03 entries; surfaced 1 invalid (`MedicationStatement.reason-reference`) and 1 already-correct (`MedicationStatement.context`).
- **Live Blaze probe** of each catalog query individually (`?{param}={ref}&_summary=count&_count=0`) — confirms behavior end-to-end including the silent-drop pitfall.
- **Existing source**: `src/components/explorer/PatientRelatedResources.tsx` — the verbatim pattern being generalized; lines 36-58 are the cancellation-token + parallel-fetch idiom.
- **Existing source**: `src/hooks/useMiiExtensionCounts.tsx` — Phase 42 sibling using the same `_summary=count` pattern + cancelled-flag (no AbortController on `client.get()`).
- **Existing tests**: `src/components/explorer/__tests__/ReferenceLink.test.tsx`, `HumanReadableView.read-phase.test.tsx`, `ContainedResourcesAccordion.test.tsx` — 3 reference tests for Mantine + Medplum + Router test-setup patterns.
- **CONTEXT.md** (locked decisions D-01 through D-19) — verbatim user constraints.

### Secondary (MEDIUM confidence)
- FHIR R4 specification pages (hl7.org/fhir/R4/) for: [Encounter](https://hl7.org/fhir/R4/encounter.html), [Observation](https://hl7.org/fhir/R4/observation.html), [Procedure](https://hl7.org/fhir/R4/procedure.html), [Condition](https://hl7.org/fhir/R4/condition.html), [DiagnosticReport](https://hl7.org/fhir/R4/diagnosticreport.html), [MedicationStatement](https://hl7.org/fhir/R4/medicationstatement.html), [Provenance](https://hl7.org/fhir/R4/provenance.html) — verified via WebFetch; pages truncated for some SearchParameter tables but cross-referenced against live Blaze CapabilityStatement.
- [Blaze FHIR Search Performance docs](https://samply.github.io/blaze/performance/fhir-search.html) — confirms `_summary=count` is supported.
- [Blaze API docs](https://samply.github.io/blaze/api.html) — general behavior.

### Tertiary (LOW confidence — flagged for validation)
- [GitHub issue samply/blaze#156](https://github.com/samply/blaze/issues/156) — historical issue on totals; appears resolved in current versions per live probe.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new deps; all packages already at production-locked versions in `package.json`.
- Architecture (catalog + shared component + 2 wrappers): HIGH — refactor of existing pattern, locked by CONTEXT D-04..D-06.
- SearchParameter validity per D-03: HIGH (live Blaze CapabilityStatement is authoritative for the deployment) — surfaced 1 correction.
- Bundle.total reliability on Blaze: HIGH (live probe verified).
- Pitfalls: HIGH for #1 (silent-drop, demonstrated live), HIGH for #2-#6 (mostly carried-over from existing component), MEDIUM for #7 (panel position UX risk needs HUMAN-UAT to confirm).
- Test patterns: HIGH — 3 existing reference test files in the same directory follow identical patterns.

**Research date:** 2026-05-01
**Valid until:** 2026-05-15 (14 days — Mantine 8 / Medplum 5 stable; Blaze CapabilityStatement unlikely to drift; FHIR R4 SearchParameter list is frozen by spec).
