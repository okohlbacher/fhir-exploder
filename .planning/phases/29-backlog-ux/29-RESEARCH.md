# Phase 29: Backlog UX — Research

**Researched:** 2026-04-22
**Domain:** React + TypeScript; FHIR `$validate` cascade; localStorage-backed PHI gate; PDF regression
**Confidence:** HIGH (all findings grounded in file:line inspection of the live codebase)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01** Drop tiles 1-2 (Total resources, Resource types) from `OverviewStrip.tsx`; keep 7 metric ring tiles in current Kahn order.
- **D-02** New status line ABOVE tile strip: `N resources · M types · Last computed {relative-time}`. Inline formatter, no new dep. >24h → absolute ISO date.
- **D-03** Mantine `Text size="sm" c="dimmed"`, interpunct separators, no icons, wraps on narrow viewports.
- **D-04** Cardinality entries remain non-clickable.
- **D-05** Update `18-UI-SPEC.md` in place at `.planning/milestones/v1.2-phases/18-quality-alerting-thresholds/18-UI-SPEC.md`; add new decision number (e.g., D-36) noting 9→7 reduction.
- **D-06** PDF export (`src/quality/pdfExport.ts` + `PdfReportLayout.tsx`) reflects new tile layout — 7 tiles + status line header. Regression test: snapshot cover + body.
- **D-07** Extend `settings.yaml`: `validation.externalValidator: { url: string; enabled: boolean; timeoutMs?: number }`. Default `timeoutMs: 15000`. Schema lives in `src/config/settings.ts` + `src/config/types.ts`.
- **D-08** Cascade: **external (if enabled + probe succeeds) → server `$validate` → local checker**. Probe cached in `Map<serverUrl, Map<resourceType, 'external'|'server'|'local'>>`; runs once per (server, resourceType) pair.
- **D-09** Every external fetch routes through the existing Phase 7 PHI gate BEFORE any network call. Regression test asserts no fetch fires before consent. Gate rejection → fall back to server/local, never bypass.
- **D-10** Every external `fetch` wrapped in `AbortController` with `setTimeout(() => controller.abort(), timeoutMs)`. Timeout → fall back to next tier + Mantine blue toast (NOT red). Wording: `"External validator timed out after {n}s — falling back to {tier}"`.
- **D-11** `ValidationPanel` renders `Active strategy: external / server / local` status line per resource type above the issues table.
- **D-12** New `normalizeOperationOutcomeIssue(issue: OperationOutcomeIssue): NormalizedIssue` mapper in `src/quality/normalizers.ts`. Unit tests: 5+ cases (severity mapping, location decoding, code extraction, extension handling, empty-issue fallback).
- **D-13** Validator URL shape: `POST {url}/{Type}/$validate?profile={profile}` with `application/fhir+json`. Wrapper path shape deferred to v1.5.
- **D-14** Plan 29-01 = UX-02 (T2 warm-up), ~4h. Touches OverviewStrip, pdfExport/PdfReportLayout, 18-UI-SPEC.md.
- **D-15** Plan 29-02 = UX-01 (T1 L-task), ~1.5 days. Touches settings config, ValidationPanel, new normalizer, capability probe, PHI gate integration, timeout/abort plumbing.
- **D-16** After both plans complete, move 2 pending todos to `.planning/todos/completed/` as final task of 29-02.

### Claude's Discretion

- Relative-time formatter (inline vs extract; `Intl.RelativeTimeFormat` vs custom).
- Normalizer function signature (single issue vs batch).
- Capability probe mechanism (HEAD vs `metadata` endpoint vs heuristic per URL pattern).
- PDF export regression test strategy (snapshot vs structural assertions).
- Toast timeout duration for timeout messages (recommend 5s).

### Deferred Ideas (OUT OF SCOPE)

- Local full-featured FHIR validator (HAPI/IG Publisher exist).
- FHIR Validator Wrapper `/validate` path shape (differs from HAPI) → v1.5.
- Bundle `$validate` batch mode → v1.5.
- R5/R6 support (R4-only).
- SMART on FHIR OAuth.
- Auto-connect, date-range picker, pin resource types (other pending todos).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UX-02 | OverviewStrip 9→7 ring tiles + status line above (`N resources · M types · Last computed {rel}`); `18-UI-SPEC.md` updated; PDF reflects new layout; cardinality entries stay non-clickable. | §2.5 (OverviewStrip), §2.6 (PDF), §2.5.c (18-UI-SPEC), Plan-batching |
| UX-01 | `settings.yaml` accepts `validation.externalValidator: {url, enabled, timeoutMs}`; `ValidationPanel` cascades external → server `$validate` → local; every fetch routes through Phase 7 PHI gate (regression-tested); `AbortController` + 15s default timeout with fallback + toast; `normalizeOperationOutcomeIssue` mapper unit-tested into `NormalizedIssue`; Active-strategy status line per resource type. | §2.1 (PHI gate), §2.2 (cascade), §2.3 (normalizer), §2.4 (settings), §2.7 (plans), §3 (diagram) |
</phase_requirements>

## 1. Executive Summary

- **PHI gate is inline UI state, NOT a utility.** Lives in `ValidationPanel.tsx` lines 72, 100-107, 235, 270-294. Scoped per `(serverUrl, validatorUrl)` key in `localStorage`. It gates at the UI layer (disables "Validate sample" button until ack) — the fetch prevention is indirect. **UX-01 must refactor this into a reusable check** (e.g., export `isExternalValidationPermitted(serverUrl, externalUrl)`) AND the cascade logic in `useValidationRun` must consult the same `localStorage` key on every external call path. Do not duplicate the key.
- **Active validation coordinator is `useConformanceRun`, not `useValidationRun`.** `ValidationPanel.tsx:146-154` wires `useConformanceRun` (Phase 18). `useValidationRun` at `src/hooks/useValidationRun.ts` is now legacy/unused by the panel. `resolveBackends()` in `validationBackends.ts` is the composition point — extend it to accept a 3-tier resolution.
- **OperationOutcome normalizer already exists, ad-hoc and inline.** Two paths converge into `NormalizedIssue`: (a) `profileConformanceChecker.ts:292 normalizeConformanceIssues` (typed `ConformanceIssue` → `NormalizedIssue`); (b) `ValidationPanel.tsx:167-178` inline mapper (legacy `OperationOutcomeIssue` → `NormalizedIssue`). **Recommendation: extract the inline mapper to `src/quality/normalizers.ts` as `normalizeOperationOutcomeIssue`, and have both the legacy path and the new external path use it.** Code delta is +20 lines / -12 lines (net almost zero).
- **Settings schema extension is additive and backward-compatible.** `src/config/settings.ts:56-78` already has `validation` section with `validatorUrl` + `batchSize`. Adding `externalValidator: { url, enabled, timeoutMs }` follows the same `deepMerge` pattern. Default `{ enabled: false }` makes every existing `settings.yaml` (including `public/settings.yaml` which has no `validation.externalValidator` block) keep working with zero config changes. **No schema version migration needed** — there's no version field in AppSettings today.
- **PDF regression is cheap.** `src/__tests__/pdf-report-layout.test.tsx` uses `screen.getByText` / `queryByText` — NO snapshot files. The 9-tile → 7-tile change is a grid-template update in `PdfReportLayout.tsx:253` (`repeat(3, 232px)`) and the loss of `totalResources`/`distinctTypes` as tiles (they already double as "Total resources on server" text below the grid at line 288-292). **Minimal-fragility approach: structural assertions only** — add three tests (tile count, status-line text, no tile labeled "Total resources" inside grid). Skip image snapshots.

**Primary recommendation:** Follow CONTEXT exactly. Plan 29-01 executes the PDF+strip tile reduction on the warm-up side (low risk, high shared context with already-stable 18-UI-SPEC). Plan 29-02 builds the cascade: extract PHI gate to a utility + extract the OperationOutcome mapper, THEN wire the external tier on top. No alternate sequencing makes sense.

## 2. Per-Focus Findings

### 2.1 PHI Gate Location and API (HIGH confidence)

**File:** `src/components/quality/ValidationPanel.tsx`

**Key lines:**
- `72`: `const PHI_ACK_KEY_PREFIX = 'quality.validation.phiAcknowledged.v1';`
- `100-107`: key construction + `useLocalStorage<boolean>` read/write
- `235`: `const requiresPhiAck = hasRemote && !phiAcknowledged;`
- `270-294`: Alert banner with `"I acknowledge and want to proceed"` button that calls `setPhiAcknowledged(true)`
- `313-318`: `Validate sample` button `disabled={run.status === 'running' || requiresPhiAck}`

**Key format:** `quality.validation.phiAcknowledged.v1:{serverUrl}|{validatorUrl ?? 'none'}` — keyed per `(serverUrl, validatorUrl)` so changing validator forces re-ack.

**Current consumers:** ONE — `ValidationPanel.tsx` only. Gate is NOT a utility; it's embedded UI state.

**Gate location in cascade:** The gate blocks at the **UI boundary** (button disabled). The network call is further downstream in `resolveBackends()` → `createRemoteBackend().validate()` → `client.post(...)` at `remoteValidator.ts:64`. There is no check at the call site. **This is the critical architectural concern** for D-09: if UX-01 adds an `external` tier that fires via a different code path (e.g., automatic probe on tab open), it will bypass the UI-level gate.

**Recommendation — refactor pattern for UX-01 (D-12 / D-09):**
1. Extract to `src/quality/phiGate.ts` exporting:
   ```ts
   export const PHI_ACK_KEY_PREFIX = 'quality.validation.phiAcknowledged.v1';
   export function phiAckKey(serverUrl: string, externalUrl: string | null): string;
   export function isPhiAcknowledged(serverUrl: string, externalUrl: string | null): boolean;
   ```
2. `ValidationPanel.tsx` retains the Alert banner but reads the key through the utility.
3. `useValidationRun`'s new external-tier code path (or wherever the fetch originates) calls `isPhiAcknowledged(...)` BEFORE the `AbortController` is wired up; returns false → skip external tier, cascade to server/local.
4. **Regression test** (per D-09): mock the external validator endpoint, assert `fetch` is never called when `localStorage` has no `phiAcknowledged` key. Use Vitest `vi.spyOn(global, 'fetch')` to track calls.

**The gate is the SAME key whether reached via UI button or cascade probe.** This is load-bearing: do NOT introduce a second key for the external-tier path.

### 2.2 Validation Stack Composition (HIGH confidence)

Current (post-Phase 18) composition traced through `ValidationPanel.tsx:146-154` → `useConformanceRun` → `resolveBackends(settings, resourceType)` in `validationBackends.ts:32`.

**Current backend resolution** (`validationBackends.ts:42-45`):
```
backends = [structural]
if (settings.validation.validatorUrl present) backends.push(remote)
```

Both backends run in parallel on every resource (`useValidationRun.ts:146-154` — `Promise.all(backends.map(b => b.validate(r)))`), then `dedupeIssues` merges. **The current composition is parallel, NOT cascading.**

**Gap for UX-01:** The phase explicitly says **cascade** (D-08) — try external first, fall back on failure. This is a DIFFERENT execution model from today's parallel-and-merge. The insertion point is NOT `resolveBackends` alone; it's a new composition layer.

**Recommendation: introduce `src/quality/cascadingValidator.ts`** that wraps `resolveBackends`:

```ts
export async function validateWithCascade(
  resource: Resource,
  settings: AppSettings,
  probeCache: ProbeCache,
  phiAckStatus: boolean,
): Promise<OperationOutcomeIssue[]> {
  const tier = probeCache.get(serverUrl, resource.resourceType) ?? 'probe';
  // tier='external' → only if phiAckStatus && settings.validation.externalValidator.enabled
  // else tier='server' → existing remoteValidator.ts path (also PHI-gated if hasRemote)
  // else tier='local' → structural backend
}
```

The existing `resolveBackends` stays as a fallback/unit-tested composition primitive. The cascade consults `probeCache: Map<serverUrl, Map<resourceType, tier>>` and updates on capability probe success/failure.

**Single extension point or new layer?** NEW LAYER. The existing `ValidationBackend` interface assumes unconditional execution; cascading requires a decision point that's orthogonal to "which backend ran." The cleanest shape: `cascadingValidator.ts` stays pure; `useConformanceRun` (or a new `useValidationRun` that supersedes the legacy one) calls it per resource.

See §3 for the ASCII flow diagram.

### 2.3 OperationOutcome Normalization (HIGH confidence)

**Yes, a normalizer already exists — but inline and duplicated.**

**Existing paths:**
1. `src/quality/profileConformanceChecker.ts:292-303 normalizeConformanceIssues(ConformanceIssue[], Resource): NormalizedIssue[]` — typed for conformance checker's internal shape, NOT `OperationOutcomeIssue`.
2. `src/components/quality/ValidationPanel.tsx:167-178` — inline `.map()` on `run.legacyIssues` (which ARE `OperationOutcomeIssue[]` from `useValidationRun`). Maps `OperationOutcomeIssue → NormalizedIssue`:
   - `_resourceId` → `resourceId` + `resourceType`
   - `expression?.[0] ?? location?.[0] ?? ''` → `field`
   - `${code ?? ''} -- ${diagnostics ?? details?.text ?? ''}` → `description`
   - `severity: 'fatal'|'error' → 'error'`, `'warning' → 'warning'`, else `'info'`

**D-12 is already 80% implemented as an inline anonymous function.** The new `normalizeOperationOutcomeIssue(issue: OperationOutcomeIssue, resourceRef: string): NormalizedIssue` should extract this to `src/quality/normalizers.ts`, and `ValidationPanel.tsx:167-178` rewrites to call it.

**Recommendation: single-issue signature** (not batch). Easier to unit test, caller controls iteration. The 5 unit-test cases required by D-12:
1. `severity: 'fatal'` → `'error'` (fail-closed).
2. `expression: ['Patient.name']` + no location → field = `'Patient.name'`.
3. `location: ['Patient.contact[0].name']` + no expression → field = `'Patient.contact[0].name'` (fallback).
4. `code` missing + `diagnostics` present → description has empty bracket then text.
5. Empty issue `{}` → valid `NormalizedIssue` with empty strings, `severity: 'info'`.

Extension handling (D-12 "extension handling"): `OperationOutcomeIssue.details?.text` as secondary fallback for description when `diagnostics` is missing. Already handled in the inline version at line 172 (`diagnostics ?? details?.text`).

**External path reuses the same converter.** `normalizeOperationOutcomeIssue` is tier-agnostic.

### 2.4 Settings Schema Extension Mechanics (HIGH confidence)

**Parser:** `src/config/settings.ts` uses `js-yaml` (per project CLAUDE.md recommended stack). `loadSettings()` does `fetch('/settings.yaml') → yaml.load(text)` → `deepMerge(DEFAULTS, parsed)`. Invalid YAML / missing file → silently falls back to `DEFAULTS`.

**Served from:** `public/settings.yaml` (NOT project root; Vite serves `public/` as static assets). Confirmed: `/Users/kohlbach/Claude/Exploder/public/settings.yaml` exists.

**Current `validation` block** (`types.ts:14-24`):
```ts
validation?: {
  validatorUrl?: string;       // server $validate tier (existing)
  batchSize?: number;          // default 25
};
```

**Extension for D-07:**
```ts
validation?: {
  validatorUrl?: string;
  batchSize?: number;
  externalValidator?: {        // NEW
    url: string;
    enabled: boolean;
    timeoutMs?: number;        // default 15000
  };
};
```

**Schema version migration:** **None needed.** There is no `version` field today in `AppSettings`. The existing `deepMerge` pattern at `settings.ts:56-78` already handles optional-block additions: if `parsed.validation.externalValidator` is absent, the field is `undefined` and consumers default to `{ enabled: false }`. Zero breakage for existing `public/settings.yaml`.

**Parse-error safety (D-07 pitfall):** `yaml.load` throws on malformed YAML → caught at `settings.ts:126` → returns `DEFAULTS`. If the user has a syntactically-valid but semantically-wrong `externalValidator` (e.g., `url: 123`), the type narrowing in `deepMerge` silently drops it (matches pattern at lines 62-77 for `validatorUrl`). **Recommendation: mirror the pattern** — `typeof ext.url === 'string'` narrowing with trim + length check, `typeof ext.enabled === 'boolean'` or default false, `typeof ext.timeoutMs === 'number' && Number.isFinite` or default 15000.

**Config location:** Edit `src/config/types.ts` (add optional block) + `src/config/settings.ts` (add narrowing in `deepMerge`). Also update `DEFAULTS` at `settings.ts:14-17` to include `externalValidator: undefined` explicitly (keeps type inference clean).

### 2.5 UI-SPEC Update Mechanics (MEDIUM confidence)

**Current location:** `.planning/milestones/v1.2-phases/18-quality-alerting-thresholds/18-UI-SPEC.md` — an archived v1.2 milestone folder.

**Recommendation: edit `18-UI-SPEC.md` in place** (CONTEXT D-05 also recommends this). Rationale:

- **Single source of truth principle.** 18-UI-SPEC.md is referenced by 4 phases (18, 19, 21, 28 all cite OverviewStrip layout). Creating a 29-UI-SPEC.md delta means future readers must consult both.
- **"Archived v1.2" is administrative, not architectural.** The v1.2 milestone SHIPPED, but the spec documents a live component still under active development. Archiving documents dated decisions; the component is not archived.
- **Precedent:** The file was already updated after its v1.2 ship date — line 125 references `navigate('/quality?tab=...')` which is Phase 18 Plan 02 code. Update-in-place is the existing pattern.

**How to preserve the milestone archive:** Add a new decision number (D-36 per CONTEXT D-05 recommendation; the existing spec uses D-04 through D-19 in Interactions, so D-36 is safe). Include a dated note: `**D-36 (2026-04-23 / Phase 29):** Tiles reduced 9→7; Total resources + Resource types moved to status-line header.` Diff-readable and traceable.

**What to update concretely in 18-UI-SPEC.md:**
- Section "Component Inventory > Modified Components" row for `OverviewStrip`: change "Expand from 4 tiles to 9" to "7 metric tiles; informational cards moved to status line above."
- Section "Layout Contract > OverviewStrip (9 tiles)" heading → "OverviewStrip (7 tiles)". Grid `cols` update: `{ base: 1, xs: 2, sm: 3, md: 4, lg: 5, xl: 7 }`.
- Tile order section: drop items 1-2; renumber 3-9 → 1-7.
- Interaction I-05 "Metric Tile Click-Through": remove the non-clickable-informational-tiles carve-out (no longer needed).
- Add new section above "OverviewStrip" describing the status-line header (N resources · M types · Last computed {rel}).

### 2.6 PDF Regression Strategy (HIGH confidence)

**File:** `src/__tests__/pdf-report-layout.test.tsx` (226 lines).

**Structure:** 11 test cases using **`screen.getByText` / `queryByText` / `getByRole`** — structural DOM assertions, NOT image snapshots or `toMatchSnapshot`. Mantine + html-to-image polyfills at lines 22-42. Renders `<PdfReportLayout>` in a `<MantineProvider>` wrapper; inspects the rendered DOM.

**Current 9-tile grid in `PdfReportLayout.tsx`:**
- Line 253: `gridTemplateColumns: 'repeat(3, 232px)'` (3×3 = 9 tiles)
- Lines 258-267: 2 informational SummaryCards (Total resources, Resource types) hardcoded
- Lines 269-286: `METRIC_ORDER.map(k => ...)` — 7 metric SummaryCards with ring/breach

**Change for D-06 (9→7 in PDF):**
- Remove the 2 informational SummaryCards (lines 258-268).
- Grid `repeat(3, 232px)` → `repeat(4, 176px)` (Trends page already uses this at line 317) OR `repeat(3, 232px)` with 7 items wrapping 3+3+1.
- The "Total resources on server: 1234" + "Distinct resource types: 15" **already exist** as `<Text>` elements at lines 288-292 (below the grid). UX-02's status-line is essentially upgrading these two lines to match the dashboard header.
- Update `CountSummary` type? **No** — the PDF still needs `totalResources` + `distinctTypes` for the text lines below.

**Minimal-fragility approach (recommended):**
1. **Keep the existing structural-assertion style** — do NOT add image snapshots.
2. Add 3 new tests, update 2 existing:
   - NEW: `'renders 7 metric tiles in overview grid'` — count `SummaryCard` children by ring presence or icon count.
   - NEW: `'does not render informational tiles inside grid after 9→7 reduction'` — `queryByText(/^Total resources$/)` inside grid container should be null (the label text is still in the Text line below).
   - NEW: `'renders status line with last-computed timestamp'` — matches regex `/\d+ resources · \d+ types · Last computed/`.
   - UPDATE line 151: `Total resources on server: 1234` assertion still passes (text line below grid unchanged).
   - UPDATE line 152: `Distinct resource types: 15` assertion still passes.

**Why no snapshots:** html-to-image is mocked in tests (confirmed by `pdfExport.ts:137-139` comment). A PNG snapshot would be either trivially passing (empty image) or platform-dependent. Structural DOM assertions catch the actual regression (wrong tile count, wrong labels) without flake.

### 2.7 Plan-Batching Confirmation (HIGH confidence)

**CONTEXT D-14/D-15 lock 2 plans sequential: 29-01 (T2 UX-02 warm-up, ~4h) BEFORE 29-02 (T1 UX-01 L-task, ~1.5d). Confirmed — no alternative proposed.**

Rationale for confirmation:
- **Risk gradient is correctly ordered.** UX-02 touches 3 files (OverviewStrip, PdfReportLayout, 18-UI-SPEC.md) with minimal logic churn. UX-01 touches 5+ files (settings/types, ValidationPanel, new cascade module, new normalizer, new probe module) + introduces the critical PHI gate refactor.
- **No shared code surface between the two plans.** UX-02 touches `OverviewStrip.tsx` + `PdfReportLayout.tsx`. UX-01 touches `ValidationPanel.tsx` + validator modules + config. Zero rebase conflict risk — could theoretically run in parallel, but sequential-within-phase preserves the "warm-up then L-task" ergonomic and matches the ROADMAP ordering lock.
- **4h vs 1.5d split is realistic.** UX-02 has the `formatRelative` helper precedent in `QualityOverviewPage.tsx:70-78` (reuse verbatim; no new logic). UX-01's 1.5d is dominated by PHI gate refactor + cascade module + tests for normalizer + regression tests for PHI gate + integration with probe cache.

**No alternative batching proposed.**

### 2.8 Secondary Details (LOW / MEDIUM confidence)

- **Capability probe mechanism (discretion):** Recommend **heuristic per URL pattern** for the MVP — no HEAD/metadata probe on first call; just attempt the `$validate` POST, and on HTTP 404/405 or AbortController timeout, demote tier to `server` and cache. The tier cache at `Map<serverUrl, Map<resourceType, tier>>` absorbs the first-call cost; subsequent calls skip the failed tier. A `metadata` endpoint probe adds a round-trip that pays off only for the uncommon case of a fully-working validator with one unsupported resource type. Confidence: MEDIUM — depends on real-world validator behavior.
- **Relative-time formatter (discretion):** `QualityOverviewPage.tsx:70-78` already has `formatRelative` (3 cases: `<60s`, `<60m`, `<60h`). CONTEXT D-02 adds a 4th: `>24h` → absolute ISO date. **Extract to `src/utils/relativeTime.ts`** (project convention), share between `QualityOverviewPage` header and new `OverviewStrip` status line. +1 unit test file, ~10 LOC. No dependency on `Intl.RelativeTimeFormat`.
- **Toast timeout:** Mantine default is 4000ms for non-error. CONTEXT specifies 5s for timeout messages. Explicit `autoClose: 5000` matches D-10.

## 3. Validation Stack Composition Diagram

```
┌─ User clicks "Validate sample" in ValidationPanel ──────────────────────────┐
│                                                                               │
│  ValidationPanel.tsx                                                          │
│    disabled={requiresPhiAck}  ← UI-level gate (today)                        │
│         │                                                                     │
│         └→ run.start()   (useConformanceRun, NOT useValidationRun today)     │
│                          │                                                    │
│ ┌────────────────────────┴──────────────────────────────┐                    │
│ │ NEW cascade wrapper (src/quality/cascadingValidator.ts) │                    │
│ │                                                        │                    │
│ │   for each resource in sample:                         │                    │
│ │                                                        │                    │
│ │     1. probeCache.get(serverUrl, resourceType)?        │                    │
│ │        ├─ 'external' + phiAck + enabled → try external│                    │
│ │        │    POST {externalUrl}/{Type}/$validate        │                    │
│ │        │    AbortController(timeoutMs=15000)           │                    │
│ │        │    ok        → normalizeOperationOutcomeIssue │                    │
│ │        │    timeout   → toast blue, demote cache='server'                  │
│ │        │    404/405   → demote cache='server'                              │
│ │        │    other err → demote cache='server'                              │
│ │        │                                                                    │
│ │        ├─ 'server' → existing remoteValidator.createRemoteBackend(...)    │
│ │        │              (POST {serverUrl}/{Type}/$validate)                  │
│ │        │              OR if server doesn't support: demote='local'         │
│ │        │                                                                    │
│ │        └─ 'local' → structuralValidator (bundled MII profiles)            │
│ │                     ALWAYS succeeds (no network)                            │
│ │                                                                             │
│ │     2. issues → normalizeOperationOutcomeIssue per issue → NormalizedIssue│
│ │                                                                             │
│ │     3. setActiveStrategy(resourceType, tier)                                │
│ │        → ValidationPanel renders "Active strategy: {tier}" status line    │
│ └───────────────────────────────────────────────────────────────────────────┘│
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘

PHI GATE CHECKPOINT (D-09): BEFORE step 1's 'external' branch fires the fetch:
  if (!isPhiAcknowledged(serverUrl, externalUrl)) demote to 'server' tier.
  NEVER fetch against the external URL without a positive ack check.
```

**Where external tier slots in:** NEW layer between `useConformanceRun` and `resolveBackends`. The existing `resolveBackends` + `ValidationBackend` interface stay intact for the `server` and `local` tiers (`remoteValidator.ts`, `structuralValidator.ts` unchanged). The cascade is an orchestrator, not a backend replacement.

## 4. Plan-Batching Confirmation

**CONFIRMED per CONTEXT D-14/D-15. 2 plans sequential:**

| Plan | Scope | Effort | Files touched |
|------|-------|--------|---------------|
| 29-01 | UX-02 (T2 warm-up): OverviewStrip 9→7, status line, PDF layout update, 18-UI-SPEC.md update | ~4h | 3 source + 1 spec + 1 test |
| 29-02 | UX-01 (T1 L-task): settings schema + cascade + PHI gate utility + normalizer + probe cache + ValidationPanel integration + todo moves | ~1.5d | 7+ source + 3+ test |

**No alternative proposed.** See §2.7 for rationale.

## 5. Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 2.x (confirmed by existing `*.test.tsx`, `vi.fn()`, `describe/it/expect` imports from `vitest`) |
| Config file | `vite.config.ts` (Vite+Vitest shared; verified via existing test structure) |
| Quick run command | `npx vitest run <path/to/file.test.tsx>` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UX-02 | OverviewStrip renders exactly 7 metric tiles (no informational tiles inside grid) | unit | `npx vitest run src/components/quality/__tests__/OverviewStrip.test.tsx` | ❌ Wave 0 — create |
| UX-02 | Status line renders `N resources · M types · Last computed {rel}` above grid | unit | same file | ❌ Wave 0 |
| UX-02 | PDF overview page has 7 tiles (no Total/Types tiles in grid) | unit | `npx vitest run src/__tests__/pdf-report-layout.test.tsx` | ✅ exists — add 3 cases |
| UX-02 | PDF cover page still renders locked text (Captured, Server, Sample size) | unit | same | ✅ |
| UX-02 | `formatRelative` handles `<60s`, `<60m`, `<24h`, `>24h` with ISO fallback | unit | `npx vitest run src/utils/__tests__/relativeTime.test.ts` | ❌ Wave 0 |
| UX-01 | `normalizeOperationOutcomeIssue` handles 5+ cases (severity, location fallback, code, extension, empty) | unit | `npx vitest run src/quality/__tests__/normalizers.test.ts` | ❌ Wave 0 |
| UX-01 | Settings `deepMerge` accepts `validation.externalValidator: {url, enabled, timeoutMs}` and defaults `timeoutMs=15000`; invalid shapes drop silently | unit | `npx vitest run src/config/__tests__/settings.test.ts` | Check via Wave 0 (likely ❌) |
| UX-01 | Cascade: external tier skipped when `!phiAcknowledged` — assert `fetch` not called | unit | `npx vitest run src/quality/__tests__/cascadingValidator.test.ts` | ❌ Wave 0 |
| UX-01 | Cascade: external timeout demotes to server tier, triggers blue toast, falls back | unit | same | ❌ Wave 0 |
| UX-01 | Cascade: external returns OperationOutcome → normalized into `NormalizedIssue[]` | unit | same | ❌ Wave 0 |
| UX-01 | Probe cache `Map<serverUrl, Map<resourceType, tier>>` stores one entry per pair | unit | same | ❌ Wave 0 |
| UX-01 | `ValidationPanel` renders `Active strategy: {tier}` status line per resource type | integration | `npx vitest run src/components/quality/__tests__/ValidationPanel.test.tsx` | check Wave 0 |
| UX-01 | PHI gate regression: mock external endpoint, no `fetch` fires before consent | integration | same | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run <touched test files>` (~10-30s)
- **Per wave merge:** `npx vitest run` (full suite, ~60-120s — 814+ tests post-Phase 28)
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/components/quality/__tests__/OverviewStrip.test.tsx` — covers UX-02 tile reduction + status line render
- [ ] `src/utils/__tests__/relativeTime.test.ts` + `src/utils/relativeTime.ts` — shared formatter
- [ ] `src/quality/__tests__/normalizers.test.ts` — covers UX-01 `normalizeOperationOutcomeIssue` 5+ cases
- [ ] `src/quality/normalizers.ts` — extract the inline mapper from `ValidationPanel.tsx:167-178`
- [ ] `src/quality/__tests__/cascadingValidator.test.ts` — covers UX-01 cascade logic
- [ ] `src/quality/cascadingValidator.ts` — the new cascade module
- [ ] `src/quality/phiGate.ts` + `src/quality/__tests__/phiGate.test.ts` — extract PHI gate utility
- [ ] Check: `src/config/__tests__/settings.test.ts` exists (likely yes — verify and extend)
- [ ] Check: `src/components/quality/__tests__/ValidationPanel.test.tsx` exists (verify and extend)
- [ ] Framework install: none — Vitest + @testing-library/react + Mantine testing polyfills already configured

## 6. Pitfalls

| # | Pitfall | Severity | Prevention |
|---|---------|----------|------------|
| 1 | **PHI gate bypass via direct fetch.** Extracting the gate but forgetting to check in the new `cascadingValidator.ts` path. Today the gate is UI-only (disables button); adding cascade that fires on-mount or probe would bypass it. | HIGH | Regression test: `vi.spyOn(global, 'fetch')` asserts zero calls to external URL when `localStorage` lacks the `phiAcknowledged.v1:*` key. Gate check MUST happen inside `cascadingValidator.ts` BEFORE `new AbortController()` is allocated. Reference: PITFALLS.md §8 HIGH severity. |
| 2 | **AbortController memory leak on unmount mid-fetch.** If `ValidationPanel` unmounts (tab switch) while an external POST is in flight, the `setTimeout(abort, timeoutMs)` handle leaks unless cleared. Also: the async closure may call `setIssues` after unmount → React warning. | MEDIUM | Store the `controller` + `timeoutId` in a `useRef`; on unmount (`useEffect` cleanup), call `controller.abort()` + `clearTimeout(timeoutId)`. Mirror the cancellation pattern from `useValidationRun.ts:181-185` (`useEffect(() => () => { cancelledRef.current = true; }, [])`). |
| 3 | **`settings.yaml` parse error on malformed `externalValidator` block.** User types invalid YAML (e.g., unquoted URL with `:`) → `yaml.load` throws → entire settings falls back to DEFAULTS, silently losing `terminology.serverUrl` too. | MEDIUM | Existing `settings.ts:109-128` already catches this globally. For better UX, consider logging `console.warn` with the specific parse error before returning DEFAULTS. In `deepMerge`, narrow `externalValidator` fields defensively — drop individual invalid fields rather than rejecting the whole block. Match existing pattern at `settings.ts:62-77`. |
| 4 | **OperationOutcome schema drift between HAPI, IG Publisher, and FHIR Validator Wrapper.** HAPI emits `expression[]` populated; IG Publisher often emits only `location[]` (deprecated but still returned); Wrapper emits a non-standard envelope. CONTEXT explicitly defers Wrapper to v1.5, but HAPI vs IG drift still matters today. | LOW | `normalizeOperationOutcomeIssue` uses `expression?.[0] ?? location?.[0] ?? ''` fallback (already present at `ValidationPanel.tsx:172`). Unit test cases 2+3 in §2.3 cover this. Document in normalizer: "Wrapper envelope handling deferred to v1.5 per CONTEXT D-13." |

## 7. Open Questions

1. **Should the capability probe fire eagerly on tab open or lazily on first validation run?**
   - What we know: CONTEXT D-08 says "probe runs once per (server, resourceType) pair" — silent on when.
   - What's unclear: eager probe costs 1 round-trip per resource type on every `ValidationPanel` mount; lazy probe costs nothing until user clicks "Validate sample."
   - Recommendation: **lazy** — probe fires as part of the first validation attempt (tier starts `'probe'`, promotes to `'external'|'server'|'local'` based on first-call outcome). Matches the minimal-surface-area principle. One-line planning decision for Plan 29-02.

2. **Is the Active-strategy status line per-resource-type (D-11) or per-resource?**
   - What we know: D-11 says "per resource type." Cascade tier is cached per `(serverUrl, resourceType)`.
   - What's unclear: if a single run of `Condition` validation fires 100 resources, and the first 50 hit `external` but the external validator then goes down and the remaining 50 hit `server`, does the status line show `external` or `server` or a mixed state?
   - Recommendation: show the **last-seen tier** per resource type — matches the cache semantics. The toast (D-10) announces the demotion event; the status line reflects post-demotion state. Not a blocker for planning.

---

## Sources

### Primary (HIGH confidence)
- `src/components/quality/ValidationPanel.tsx:72-107,167-178,235,270-294` — PHI gate inline implementation; legacy OperationOutcome normalizer
- `src/quality/validationBackends.ts:32-48` — backend resolution composition point
- `src/quality/remoteValidator.ts:51-78` — existing `$validate` call shape, AbortController absent
- `src/quality/structuralValidator.ts:22-52` — local fallback tier (no network)
- `src/quality/profileConformanceChecker.ts:292-303` — existing `normalizeConformanceIssues` (template for new `normalizeOperationOutcomeIssue`)
- `src/quality/types.ts:92-114` — `NormalizedIssue` shape + `ValidationBackend` interface
- `src/config/settings.ts:14-78,109-128` — `deepMerge` pattern, fetch-fallback-to-DEFAULTS
- `src/config/types.ts:14-24` — current `validation` block shape
- `src/hooks/useValidationRun.ts:63-196` — legacy coordinator (superseded by useConformanceRun)
- `src/components/quality/OverviewStrip.tsx:1-150` — 9-tile grid, `METRIC_ORDER` with 7 metric keys
- `src/components/quality/QualityOverviewPage.tsx:70-78` — reusable `formatRelative` helper
- `src/components/quality/PdfReportLayout.tsx:253-286` — PDF overview grid (9 tiles = 2 info + 7 metric)
- `src/__tests__/pdf-report-layout.test.tsx:1-226` — structural assertion pattern
- `public/settings.yaml` — served settings file
- `.planning/research/PITFALLS.md` §8 — PHI gate HIGH pitfall

### Secondary (MEDIUM confidence)
- `.planning/milestones/v1.2-phases/18-quality-alerting-thresholds/18-UI-SPEC.md` — UI spec requiring 9→7 edit
- `.planning/ROADMAP.md` §Phase 29 — goal, dependencies, success criteria
- `.planning/REQUIREMENTS.md` §Phase 29 — UX-01, UX-02 acceptance

### Tertiary (LOW confidence — discretion space)
- Capability probe mechanism (heuristic vs HEAD vs metadata): needs real validator testing — recommend heuristic for MVP
- Active-strategy status line mixed-state behavior: reasonable default is "last seen tier"

## Metadata

**Confidence breakdown:**
- PHI gate location: HIGH — file:line evidence
- Cascade architecture: HIGH — `resolveBackends` + `useConformanceRun` traced
- Normalizer extraction: HIGH — inline mapper already exists at line 167-178
- Settings schema: HIGH — backward-compatible additive change
- UI-SPEC recommendation: MEDIUM — judgment call, rationale documented
- PDF regression strategy: HIGH — existing test uses structural assertions
- Pitfalls: HIGH — 3/4 grounded in PITFALLS.md §8, 1 in general AbortController practice
- Plan batching: HIGH — CONTEXT already locked, no alternative needed

**Research date:** 2026-04-22
**Valid until:** 2026-05-22 (30 days — stable codebase, no fast-moving external deps)
