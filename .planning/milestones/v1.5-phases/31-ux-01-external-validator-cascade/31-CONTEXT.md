# Phase 31: UX-01 External Validator Cascade - Context

**Gathered:** 2026-04-23
**Status:** Ready for planning
**Source:** User chose "No preference" on all four v1.5 deltas — defaults locked from research/SUMMARY + PITFALLS + REQUIREMENTS. All 10 D-07..D-16 decisions from `29-CONTEXT.md` carry forward verbatim; v1.5 adds 4 new decisions (D-17..D-20) below.

<domain>
## Phase Boundary

Deliver a three-tier FHIR validator cascade — external HTTP → server `$validate` → local structural — on the Data Quality Validation tab. Every external call is PHI-gated, wrapped in `AbortController` with a 15 s default timeout, normalized through `normalizeOperationOutcomeIssue`, and probe-cached per `(serverUrl, externalValidatorUrl, resourceType)`. `ValidationPanel` renders an `Active strategy: external | server | local [(variant)]` status line.

**Requirements covered:** VAL-01, VAL-02, VAL-03, VAL-04, VAL-05

**Dependencies:** Independent of Phase 32. Merge-conflict watch on `ValidationPanel.tsx` — ship Phase 31 first; Phase 32 rebases (per ROADMAP.md).

**Effort (ROADMAP):** ~2-2.5 days (plan pre-litigated; 3 new src files + 3 new test files + touches to 6 existing files; regression-test contract drives most of the work).

**Explicitly NOT in this phase:**
- FHIR Validator Wrapper URL-shape handling (v1.6+)
- Bundle `$validate` batch mode
- R5/R6 FHIR version support (R4-only project constraint)
- Retry-with-backoff on 5xx from external validator (anti-feature per FEATURES.md §2.b)
- Auto-populate `validator.fhir.org` as default URL (anti-feature)
- Validator authentication (Basic/Bearer) — v1.6+
- Semantic near-miss detection (v1.6+; requires SNOMED CT + ICD-10 graph walking)
- Local full-featured FHIR validator in the browser (rejected per STACK.md)
- SMART on FHIR OAuth (project scope excludes)

</domain>

<decisions>
## Implementation Decisions

### Carried forward from Phase 29 CONTEXT (LOCKED — do not revisit)

- **D-07:** Settings schema `validation.externalValidator: { url: string; enabled: boolean; timeoutMs?: number }` in `src/config/types.ts` + `src/config/settings.ts`; default `timeoutMs: 15000`; default `enabled: false`; missing block backward-compatible via `deepMerge`.
- **D-08:** Cascade order: external (if enabled + probe succeeds) → server `$validate` (existing `remoteValidator.ts`) → local structural (existing `structuralValidator.ts`). Probe cached per-resource-type (key shape superseded by D-17 below).
- **D-09:** PHI gate MUST be consulted before ANY external-tier `fetch`; regression test with `vi.spyOn(global, 'fetch')` locks zero outbound calls before consent is recorded. Gate re-evaluated per-outbound-fetch (not hoisted out of per-resource loop — per PITFALLS #3).
- **D-10:** Every external fetch wrapped in `AbortController` + `setTimeout(() => controller.abort(), timeoutMs)`. On timeout: blue Mantine toast, `autoClose: 5000`, locked copy `"External validator timed out after {Math.round(timeoutMs / 1000)}s — falling back to {tier}"`.
- **D-11:** `ValidationPanel` renders `Active strategy: external | server | local` status line per resource type, sourced from probe cache, placed above `ResourceIssueTable`. Mantine `Text size="xs" c="dimmed"`.
- **D-12:** `normalizeOperationOutcomeIssue(issue, resourceRef): NormalizedIssue` in `src/quality/normalizers.ts`. ≥5 unit tests: severity mapping, location fallback, code extraction, extension handling, empty-issue fallback. Plus three validator-shape fixtures: HAPI, Firely, IG-Publisher.
- **D-13:** HAPI URL shape only — `POST {url}/{Type}/$validate?profile={profile}`, `Content-Type: application/fhir+json`. Validator Wrapper shape deferred to v1.6+.
- **D-14/D-15:** Plan ordering (superseded — single-plan execution of `29-02-PLAN.md` Tasks 1-5; see D-21 below).
- **D-16:** Move both pending todos to `.planning/todos/completed/` as part of the final task (verification step).

### v1.5 deltas beyond the preserved plan (NEW — this phase only)

#### D-17: Probe cache semantics — 3-part key + scoped reset triggers

**Key shape (supersedes D-08's 2-part key):**
```ts
type ProbeKey = `${serverUrl}::${externalValidatorUrl}::${resourceType}`;
```
Flat string (not nested Map) — matches Phase 24's `${serverUrl}::${resourceType}` separator convention and keeps the cache trivially inspectable in DevTools.

**Cache lives:** `useRef<Map<ProbeKey, ActiveStrategy>>` inside `useConformanceRun` (per Research Q3 + SUMMARY locked decision). Per-session; survives tab switches within `ValidationPanel`; cleared on full unmount or hook remount (new serverUrl connection).

**Reset triggers:**
1. **Settings change** (any field of `validation.externalValidator` — url, enabled, timeoutMs): **full wipe** of the cache. Rationale: any setting change invalidates all stored probe results; safer than per-entry matching because `timeoutMs` change also changes the physical probe behavior.
2. **"Validate sample" button click**: **per-type reset** — delete only the entry matching the currently selected `resourceType` (with current `serverUrl` + `externalValidatorUrl` suffix). Rationale: gives the user a one-button "retry external for this type" lever without nuking progress across types they've already probed. Covers the common case ("I fixed the CORS config on my validator — let me retry this one type").
3. **Hook unmount**: cache lost (per-session by design).

**Validator-variant suffix inclusion in key:** intentionally NOT part of the probe key. Variant detection (D-18) is cosmetic; a same URL can never swap variants mid-session.

#### D-18: Validator variant detection — URL-pattern heuristic + user-override label

Detect the validator variant for the `Active strategy: external (HAPI)` suffix using a **URL-pattern heuristic first, user-configured label wins**. No Capability Statement query (rejected — adds 200-500 ms round-trip per probe for a cosmetic label; not worth it).

**Priority:**
1. If `settings.validation.externalValidator.label` is set (NEW settings field, optional), use that verbatim.
2. Else apply heuristic (first match wins):
   - URL contains `/hapi-fhir-jpaserver/` OR host ends in `.fhir.org` → `"HAPI"`
   - URL contains `firely` → `"Firely"`
   - URL contains `ig-publisher` OR `/validator-wrapper/` OR `/matchbox` → `"IG-Publisher"`
   - Otherwise: `null` (no suffix — status line renders `Active strategy: external` with no parentheses)

**Schema change:** `validation.externalValidator.label?: string` added to `src/config/types.ts` alongside url/enabled/timeoutMs.

**Deferred:** authoritative Capability-Statement-based variant detection with `software.name` extraction — v1.6+ if a user reports the heuristic mis-identifies their validator AND the label field doesn't satisfy their need.

#### D-19: CORS failure UX — pre-timeout TypeError = "likely CORS" blue toast + root-cause copy

Browser `fetch()` throws `TypeError` for CORS violations BEFORE the AbortController fires. Use that as the heuristic signal.

**Detection rule:** in `cascadingValidator.ts`, catch exception thrown by `fetch`; if `error instanceof TypeError` AND `controller.signal.aborted === false`, treat as likely CORS/network. Do NOT issue a preflight OPTIONS — adds complexity for a cosmetic message.

**UX:** same **blue** Mantine toast color as timeout (this is a demote, not a hard error), `autoClose: 8000` (slightly longer than timeout's 5s so users can read the extended copy). Copy:
```
External validator unreachable — falling back to {tier}.
Likely CORS or network. Check browser console and the validator's Access-Control-Allow-Origin header.
```

**Distinct from timeout:** timeout toast stays on D-10's locked `autoClose: 5000` + original copy. Two distinct toasts for two distinct failure modes.

**HTTP 5xx:** unchanged from current `remoteValidator.ts` behavior — returns a single `exception` issue from the server response body, renders in `ResourceIssueTable`, no toast (it's a real answer from a reachable validator).

#### D-20: AbortSignal threading for server tier — widen ValidationBackend.validate signature

Additive, non-breaking widening of the `ValidationBackend.validate()` signature in `src/quality/types.ts`:

```ts
// Before:
validate(resource: Resource): Promise<OperationOutcomeIssue[]>

// After:
validate(resource: Resource, options?: { signal?: AbortSignal }): Promise<OperationOutcomeIssue[]>
```

Both existing backends (`createRemoteBackend`, `createStructuralBackend`) updated to accept the optional options param. `remoteValidator.ts` threads `options?.signal` through to `client.post<OperationOutcome>(path, resource, undefined, { signal: options?.signal })` — Medplum's `MedplumClient.post` accepts a RequestInit in its options parameter.

Rationale vs alternatives:
- Factory-param (`createRemoteBackend(url, profile, signal)`) rejected — signal changes per-call, not per-factory instance.
- Second overload method (`validateWithSignal`) rejected — duplicates the interface unnecessarily.
- Call-site churn: zero for existing callers (options param is optional); only `cascadingValidator.ts` and `useConformanceRun.ts` (when it threads the unmount signal) pass it.

Local tier (`validateStructural`) is synchronous — signal ignored. The options param is accepted for interface symmetry but not checked.

### Claude's Discretion

- **Normalizer fixture sources** — use committed real-world OperationOutcome JSON samples if available under `.planning/research/`; otherwise hand-craft minimal fixtures that exercise each severity/code/extension shape. Fixtures live under `src/quality/__tests__/fixtures/normalizers/` (new directory).
- **Probe-cache Map construction** — `useRef(new Map<string, ActiveStrategy>())` vs lazy `useRef<Map<...>>(null!)` with lazy init — executor picks.
- **CORS heuristic: host allowlist** — optional tightening (if `error.message` contains `"CORS"` or `"NetworkError"` to strengthen the heuristic) is left to the executor if browsers differ in message shape; default is the `TypeError + !aborted` check only.
- **Toast deduplication** — if multiple resources in the same batch trigger the same demote, Mantine's default behavior queues them all. If that's noisy in manual testing, the executor may add a `notifications.update()` key-based dedupe (one toast per `(externalValidatorUrl, reason)` pair). Not a requirement.
- **Active-strategy status line placement** — above `ResourceIssueTable` per D-11, but precise DOM position (inline with tab header vs dedicated row) is the executor's call.
- **Status line format with variant** — current default: `Active strategy: external (HAPI)` (plain text in parentheses). Alternative Mantine `<Badge size="xs">HAPI</Badge>` to the right is acceptable if it reads cleaner; executor chooses.

### Plan decomposition (supersedes D-14/D-15)

- **D-21:** Phase 31 is a **single-plan phase** executing `29-02-PLAN.md` Tasks 1-5 in order, with the four D-17..D-20 deltas woven into the relevant tasks:
  - Task 1 (PHI gate extraction) — unchanged from 29-02-PLAN
  - Task 2 (normalizers extraction + tests) — unchanged from 29-02-PLAN; add HAPI/Firely/IG-Publisher severity fixtures (D-12 evidence)
  - Task 3 (cascade orchestrator) — extended with D-17 probe-cache reset semantics + D-19 CORS heuristic
  - Task 4 (settings schema) — extended with D-18 `label?: string` field
  - Task 5 (useConformanceRun wiring + ValidationPanel status line) — extended with D-20 AbortSignal threading + D-18 variant-label rendering
  - Verification task — D-16 todo moves + 836+ passing test-baseline check

### Folded Todos

None newly folded — the two UX-01 / UX-02 todos from Phase 29 remain in the pending inventory for D-16 to move at the end of Task 5.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Executable plan (preserve verbatim)
- `.planning/phases/29-backlog-ux/29-02-PLAN.md` — UX-01 plan preserved with all tasks, interfaces, and test contracts. Phase 31 executes this file.
- `.planning/phases/29-backlog-ux/29-CONTEXT.md` — original D-07..D-16 decisions source (carried forward verbatim above).
- `.planning/phases/29-backlog-ux/29-RESEARCH.md` — research findings that drove the preserved plan.

### v1.5 requirement + roadmap
- `.planning/REQUIREMENTS.md` §"Group A — UX-01 External FHIR Validator Cascade (Phase 31)" — VAL-01..05 acceptance criteria (this is the AUTHORITATIVE requirement source; supersedes 29-02-PLAN where they conflict — specifically on probe-key shape and variant detection)
- `.planning/ROADMAP.md` §"Phase 31: UX-01 External Validator Cascade" — success criteria, UI hint, dependency notes

### Research (v1.5)
- `.planning/research/SUMMARY.md` §"Locked Decisions" + §"Phase 31 — UX-01 External Validator Cascade" — especially probe cache = `useRef<Map>` inside useConformanceRun; include `externalValidatorUrl` in key; reset on Validate-sample click + on settings change
- `.planning/research/PITFALLS.md` — Pitfalls #1 (AbortSignal not threaded through server tier), #2 (probe cache not invalidated on settings change), #3 (PHI gate bypass via refactoring), #5 (severity drift across HAPI/Firely/IG-Publisher), #6 (CORS root-cause surfacing). All five map directly to Phase 31.
- `.planning/research/STACK.md` — "Zero new runtime deps" invariant; native `fetch` + `AbortController`; no axios/ky (breaks `vi.spyOn(global, 'fetch')` contract)
- `.planning/research/FEATURES.md` §2.b — retry-with-backoff anti-feature rationale

### Existing code to read (reuse — do NOT duplicate)
- `src/components/quality/ValidationPanel.tsx` — inline PHI gate at lines 72, 100-107, 235, 270-294; inline normalizer at 167-178 (both extracted by this phase)
- `src/hooks/useConformanceRun.ts` — lines 146-214 (cascade integration target; legacy-backend path at lines 183-188)
- `src/quality/remoteValidator.ts` — `createRemoteBackend()` + `createValidatorClient()` (server tier reused verbatim; D-20 widens the signature)
- `src/quality/structuralValidator.ts` — `validateStructural()` + `createStructuralBackend()` (local tier reused verbatim)
- `src/quality/validationBackends.ts` — `resolveBackends()` + `dedupeIssues()` (cascade reuses dedup)
- `src/quality/types.ts` — `NormalizedIssue` interface; `ValidationBackend` interface (widened by D-20)
- `src/config/types.ts` — current `validation` block shape (extended by D-07 + D-18)
- `src/config/settings.ts` — `deepMerge` logic for backward-compatibility (D-07 extends)
- `public/settings.yaml` — user-facing config template (D-07 commented example block)

### Prior-phase patterns to mirror
- Phase 24 `QualityMetricsCache` — `${serverUrl}::${resourceType}` flat-string key convention + 2-entry LRU on Map<serverUrl>
- Phase 24 `useAsyncRun` — `AbortController` + `setTimeout` + cleanup pattern
- Phase 23 Mantine toast precedent — blue for demote/info; red for hard failure
- Phase 7 PHI gate — the behavior being preserved across refactoring (critical regression risk per PITFALLS #3)

### Todos to move on completion (D-16)
- `.planning/todos/pending/2026-04-14-add-external-validator-integration-for-full-fhir-validate.md` → `completed/`
- `.planning/todos/pending/2026-04-14-reduce-overview-strip-tile-count-move-totals-to-header.md` → `completed/`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`createRemoteBackend()` (`src/quality/remoteValidator.ts:51-78`)** — server-tier reuse; D-20 widens the `validate` signature to accept `{ signal?: AbortSignal }`. The existing `MedplumClient.post()` call already accepts a RequestInit-shaped options arg, so threading the signal is a 2-line change.
- **`validateStructural()` (`src/quality/structuralValidator.ts:22-52`)** — local-tier reuse verbatim; synchronous so signal is ignored but accepted for interface symmetry.
- **`dedupeIssues()` (`src/quality/validationBackends.ts`)** — cascade reuses this for merged-issue dedup across tiers.
- **`useConformanceRun` (`src/hooks/useConformanceRun.ts`)** — already has per-batch `Promise.all` over backends at lines 183-188; cascade slots in as a replacement for that loop on the legacy path. Current `cancelledRef` pattern remains for batch cancellation; new `AbortController` is per-fetch (finer granularity, complements the existing ref).
- **Mantine `notifications.show`** — blue for demote (D-10 timeout, D-19 CORS), red reserved for hard failure (unchanged).
- **PHI `useLocalStorage<boolean>`** — key format `${PHI_ACK_KEY_PREFIX}:${serverUrl}|${externalUrl ?? 'none'}` (extracted into `phiGate.ts`; legacy key shape preserved for non-migration of existing user acks).

### Established Patterns
- **PHI gate re-evaluation per outbound fetch** — critical invariant (PITFALLS #3); do NOT hoist the gate check out of the per-resource loop in any refactoring.
- **Probe-cache flat-string key with `::` separator** — matches Phase 24's `QualityMetricsCache` convention.
- **Backend interface widening** — `ValidationBackend` is a small interface; additive optional param is safe (zero call-site churn).
- **Fetch spy as regression contract** — `vi.spyOn(global, 'fetch')` in `phiGate.test.ts` locks the zero-fetch-before-consent invariant. Do NOT replace `fetch` with axios/ky (STACK.md + PITFALLS #3).

### Integration Points
- `src/quality/phiGate.ts` (NEW) — PHI gate utility; `ValidationPanel.tsx` + `cascadingValidator.ts` consumers
- `src/quality/normalizers.ts` (NEW) — `normalizeOperationOutcomeIssue`; consumed by `ValidationPanel.tsx` (replaces inline 167-178) + `cascadingValidator.ts` (external tier)
- `src/quality/cascadingValidator.ts` (NEW) — `validateWithCascade`; consumed by `useConformanceRun.ts` on the legacy-backend path
- `src/config/types.ts` — extend `validation.externalValidator?` block (D-07) + `label?` field (D-18)
- `src/config/settings.ts` — extend `deepMerge` for the new block
- `public/settings.yaml` — commented example block
- `src/hooks/useConformanceRun.ts` — thread `cascadingValidator` + probe-cache `useRef<Map>` + unmount `AbortController` (D-20 signal source)
- `src/components/quality/ValidationPanel.tsx` — consume `phiGate.ts` (replace inline 72/100-107/235/270-294) + `normalizers.ts` (replace inline 167-178) + render `Active strategy: ...` status line (D-11 + D-18 variant suffix)
- `src/quality/types.ts` — widen `ValidationBackend.validate` signature (D-20)

### Test Baseline
- Target: **836+ passing / 0 failing** after every atomic commit (per v1.5 cross-cutting verification).
- New tests: `phiGate.test.ts` (≥3), `normalizers.test.ts` (≥5 + 3 validator-shape fixtures), `cascadingValidator.test.ts` (≥3 — happy-path, timeout-fallback, probe-cache-hit; plus D-17 reset-on-settings-change + reset-on-Validate-sample-click; plus D-19 CORS-TypeError heuristic).
- Regression tests: fetch-spy zero-before-consent (D-09 locked contract); unmount-mid-fetch no-orphan-requests (D-20 via threaded signal).

</code_context>

<specifics>
## Specific Ideas

- **Timeout toast copy (locked from D-10):** `"External validator timed out after {Math.round(timeoutMs / 1000)}s — falling back to {tier}"`. Blue, `autoClose: 5000`.
- **CORS toast copy (D-19):** `"External validator unreachable — falling back to {tier}. Likely CORS or network. Check browser console and the validator's Access-Control-Allow-Origin header."` Blue, `autoClose: 8000`.
- **Probe key (D-17):** `${serverUrl}::${externalValidatorUrl}::${resourceType}`. Values: `'external' | 'server' | 'local' | 'probe-failed'` (from 29-02-PLAN `ActiveStrategy` type).
- **Settings schema (D-07 + D-18):**
  ```yaml
  validation:
    # ... existing validatorUrl / batchSize ...
    externalValidator:
      enabled: false          # default off
      url: ""                 # e.g., https://hapi.fhir.org/baseR4
      timeoutMs: 15000        # default 15s
      label: ""               # optional; overrides heuristic; blank = auto-detect
  ```
- **Active-strategy status line variants:**
  - `Active strategy: external (HAPI)` — variant detected via heuristic or label
  - `Active strategy: external` — external succeeded but no variant identified
  - `Active strategy: server` — fell back to server `$validate`
  - `Active strategy: local` — fell back to local structural checker
  - `Active strategy: local (probe failed)` — optional: extra suffix when `ActiveStrategy === 'probe-failed'`
- **Variant heuristic order:** (1) `label` override → (2) URL-pattern match — first match wins — (3) `null` suffix. Matching is case-insensitive; host-based checks use `URL` parsing, not substring.
- **Normalizer fixtures (D-12):** capture real-world OperationOutcome JSON from (a) HAPI's public `hapi.fhir.org` — profile-bound severity='error', (b) Firely — note different `details.text` vs `diagnostics` usage, (c) IG-Publisher — extension-heavy shape on `issue.extension`.

</specifics>

<deferred>
## Deferred Ideas

- **FHIR Validator Wrapper URL shape** — differs from HAPI `/{Type}/$validate?profile=...`; add if a user reports they use it. v1.6+.
- **Capability-Statement-based variant detection** — authoritative `GET /metadata` → `software.name`. Current D-18 heuristic is cosmetic; upgrade if heuristic mis-identifies AND label field isn't enough. v1.6+.
- **Bundle `$validate` batch mode** — v1.6+ if user asks.
- **R5/R6 FHIR support** — R4-only project constraint.
- **Validator authentication (Basic/Bearer)** — v1.6+.
- **Semantic near-miss detection** — v1.6+; requires SNOMED CT + ICD-10 graph-walking infrastructure.
- **Retry-with-backoff on 5xx** — permanent anti-feature (FEATURES.md §2.b).
- **Preflight OPTIONS probe for CORS detection** — rejected in D-19; adds complexity for a cosmetic message.
- **Toast deduplication key** — left to the executor if batch-demote is noisy in manual testing; not a requirement.
- **Local full FHIR validator in the browser** — permanent anti-feature (STACK.md); bundle-size cost exceeds value.

### Reviewed Todos (not folded)
None — `cross_reference_todos` step returned 0 matches for Phase 31.

</deferred>

---

*Phase: 31-ux-01-external-validator-cascade*
*Context gathered: 2026-04-23 — user chose "No preference" on all four v1.5 deltas; defaults locked per research/SUMMARY + PITFALLS*
*Downstream: `/gsd-plan-phase 31` — planner reads this + 29-02-PLAN.md + REQUIREMENTS.md §Group A + PITFALLS #1-6*
