---
phase: 43
plan: 02
subsystem: quality / validation cascade + terminology walker
tags: [val-07, validator, semantic-near-miss, snomed, icd-10, terminology, lookup, ux]
requires:
  - Phase 31 external-validator cascade (cascadingValidator.ts)
  - Phase 4 terminology infrastructure (TerminologyResolver LRU + silent fallback)
  - Phase 15 ResourceIssueTable drill-down idiom
  - Phase 43 Plan 01 (Authorization header injection, ValidatorAuthSettingsModal, auth-missing/auth-failed events)
provides:
  - Optional NormalizedIssue.code field carrying raw FHIR issue.code (e.g., 'code-invalid')
  - semanticNearMissWalker module — bounded BFS over CodeSystem/$lookup
    (MAX_DEPTH=3, MAX_NODES=50, MAX_SUGGESTIONS=10)
  - Cascade-side opt-in semantic near-miss invocation (default OFF;
    onSuggestions side-channel)
  - ResourceIssueTable inline expandable suggestion rows (Display | Code | Relation)
  - Tooltip on suggestion display with full SNOMED display + system URL
  - useConformanceRun.suggestions Map threaded into ValidationPanel
  - Phase 43 HUMAN-UAT scaffold (3 cases per ROADMAP §43 SC #4)
  - Phase 43 close-out: VAL-06 + VAL-07 complete; v1.6 progress 5/7 phases
affects:
  - Future Phase 4x: configurable maxDepth, UI toggle for semanticNearMisses
    (deferred per CONTEXT.md <deferred>)
  - Future explicit ValueSet $expand-based suggestions (deferred)
  - Multi-resource batched walker invocation if perf needs arise (current
    impl runs per-resource inside cascade per RESEARCH Open Question 1)
tech_stack:
  added: []
  patterns:
    - BFS with visited Set keyed `${system}|${code}` for cycle defense
    - Per-axis branching (parents-only / children-only per branch) preserves
      D-09 ordering invariant
    - $lookup value polymorphism handler: valueCode → valueString → valueCoding.code
      (Pitfall 3 fall-through)
    - Side-channel `onSuggestions` callback contract on CascadeOptions
      (preserves Promise<NormalizedIssue[]> public return type)
    - Mantine 8 Collapse row with `data-collapse-row="true"` + transparent
      inline background (Pitfall 6 striping fix)
    - useOptionalTerminology helper (Rules-of-Hooks-safe context read that
      tolerates absence of TerminologyProvider in unit tests)
    - Per-run suggestions accumulator → single setState flush at run end
      (avoids per-batch re-renders)
key_files:
  created:
    - src/quality/semanticNearMissWalker.ts (195 lines)
    - src/quality/__tests__/semanticNearMissWalker.test.ts (291 lines)
    - src/components/quality/__tests__/ResourceIssueTable.test.tsx (186 lines)
    - .planning/phases/43-validator-hardening-auth-semantic-near-miss-val-06-val-07/43-HUMAN-UAT.md (273 lines)
  modified:
    - src/quality/types.ts (+10, NormalizedIssue.code optional field)
    - src/quality/normalizers.ts (+4, populate raw issue.code)
    - src/quality/__tests__/normalizers.test.ts (+39, +3 code-field-1/2/3 tests)
    - src/quality/cascadingValidator.ts (+166, walker invocation gate +
      extractCodingsAtPath helper + new CascadeOptions fields)
    - src/quality/__tests__/cascadingValidator.test.ts (+220, Tests 24, 24b,
      25, 26, 27 + Test 1 fix to include code field)
    - src/components/quality/ResourceIssueTable.tsx (+125, suggestions prop
      + chevron + inline Collapse + SuggestionTable subcomponent)
    - src/components/quality/ValidationPanel.tsx (+5, thread run.suggestions)
    - src/hooks/useConformanceRun.ts (+57, suggestions state + accumulator
      + useOptionalTerminology + onSuggestions wiring + dep array bump)
decisions:
  - D-07 / D-08 (lookup endpoint, depth=3 / 50-node cap): walker uses
    CodeSystem/$lookup with property=parent + property=child; bounds
    locked as constants in semanticNearMissWalker.ts (non-configurable v1.6).
  - D-09 (suggestion ordering): ancestors first, then descendants; each
    block sorted by depth ASC then display alphabetical. Cap at 10 results.
  - D-11 (default-off): semanticNearMisses defaults to false; walker NOT
    invoked when absent or false. Three independent gates verified:
    (1) ext.semanticNearMisses === true, (2) terminologyResolver.client !== null,
    (3) onSuggestions callback provided. All three required.
  - D-12 (silent fallback): null client OR seed-lookup error OR mid-walk
    error returns whatever was collected; never throws to caller, no error
    toast.
  - Pitfall 3 (value polymorphism): extractRelations falls through
    valueCode → valueString → valueCoding.code in document order.
  - Pitfall 5 (raw FHIR issue.code preserved): NormalizedIssue.code added
    so the walker predicate (issue.code === 'code-invalid') doesn't have
    to re-parse the description squash.
  - Pitfall 6 (Mantine Collapse striping): collapse rows carry
    `data-collapse-row="true"` + inline `background: transparent` so they
    skip the alternating-stripe pattern.
  - RESEARCH Open Question 1 resolution: walker runs INSIDE the cascade
    per-resource (not as a post-pass). Suggestions surface via callback
    side-channel; useConformanceRun accumulates across resources and
    flushes once at run end.
metrics:
  duration_minutes: 16
  tasks_completed: 5
  files_changed: 12
  lines_added_approx: 945
  tests_added: 23
  tests_passing_after: 1207
  tests_failing_after: 1 (pre-existing — Phase 40 deuteranopia, unrelated)
  baseline_passing_before: 1184
completed_date: 2026-04-30
---

# Phase 43 Plan 02: Validator Hardening — Semantic Near-Miss (VAL-07) Summary

**One-liner:** Opt-in `code-invalid` near-miss walker — when an external validator flags a SNOMED CT / ICD-10 code as `code-invalid` and the user has set `validation.externalValidator.semanticNearMisses: true`, a depth-3 / 50-node BFS over the configured terminology server's `CodeSystem/$lookup` endpoint surfaces up to 10 "Did you mean?" parent + child suggestions inline in `ResourceIssueTable` (Mantine `Collapse` row with Display | Code | Relation columns + Tooltip), reusing Phase 4's `TerminologyResolver` LRU cache and falling back silently when the terminology server is unavailable. Default-off; existing UIs unchanged when the flag is absent.

## Scope Delivered

### NormalizedIssue.code field (Pitfall 5)

`NormalizedIssue` (in `src/quality/types.ts`) now carries an optional `code?: string` field that preserves the raw FHIR `OperationOutcome.issue.code` verbatim. The existing `description` squash (`${code} -- ${diagnostics}`) is unchanged so every existing UI consumer renders identically. Three new tests in `normalizers.test.ts` cover the new field: code-invalid populated, undefined when absent, non-code-invalid (e.g. `invariant`) preserved verbatim.

### semanticNearMissWalker module (D-07 / D-08 / D-09 / D-12)

A new `src/quality/semanticNearMissWalker.ts` (~195 lines) ships the BFS:

- Constants `MAX_DEPTH = 3`, `MAX_NODES = 50`, `MAX_SUGGESTIONS = 10` (D-08, D-09; non-configurable v1.6).
- `walkNearMisses(system, invalidCode, resolver)` returns `Promise<NearMissSuggestion[]>` — never throws.
- Seeds with a `CodeSystem/$lookup?system=...&code=...&property=parent&property=child` to get immediate parents+children, then BFS-expands each branch on its OWN axis (parents-only or children-only) to keep D-09 ordering predictable.
- Visited Set keyed `${system}|${code}` defeats SNOMED `Is a` cycles (Threat T-43-05).
- `extractRelations` falls through `valueCode → valueString → valueCoding.code` to handle Ontoserver vs HAPI vs strict-R4 response variance (Pitfall 3).
- Reuses `resolver.lookupDisplay` for display strings (Phase 4 LRU cache).
- D-12 silent fallback: returns `[]` when `resolver.client` is null, when the seed lookup fails, OR when ANY mid-walk fetch throws (caller gets whatever was already collected).

8 walker tests cover ordering, max-nodes early-abort, max-depth cap, null-client fallback, value-polymorphism (3 sub-fixtures), cache-reuse (lookupDisplay called exactly once per visited node), cycle defense, and network-error-mid-walk graceful degradation.

### Cascade integration (D-11 default-off + RESEARCH Open Question 1)

`CascadeOptions` (in `cascadingValidator.ts`) grew three new fields:

```ts
externalValidator?: { ...; semanticNearMisses?: boolean }
terminologyResolver?: TerminologyResolver | null
onSuggestions?: (rowKey: string, suggestions: NearMissSuggestion[]) => void
```

After normalization, the cascade gates the walker invocation behind THREE independent conditions:

1. `ext.semanticNearMisses === true` (D-11 opt-in)
2. `terminologyResolver?.client != null` (D-12 fallback)
3. `typeof onSuggestions === 'function'` (caller wants the data)

When all three hold, the cascade filters normalized issues by `issue.code === 'code-invalid'`, extracts the offending Coding(s) from the resource via a new `extractCodingsAtPath` helper (FHIRPath subset: dot navigation + integer indexing, recognizes both Coding and CodeableConcept terminals), and emits each suggestion array via `onSuggestions(rowKey, suggestions)` with `rowKey = ${resourceId}|${field}|${code}` (matches what `ResourceIssueTable` computes internally).

The cascade's public return type stays `Promise<NormalizedIssue[]>` — suggestions flow only via the callback, which means existing callers that don't pass `onSuggestions` are completely unaffected.

Five new cascade tests cover the gate: Test 24 (semanticNearMisses absent → walker never invoked), Test 24b (explicit false), Test 25 (opt-in ON + code-invalid → walker fires once per (system, code) and onSuggestions called with correct rowKey), Test 26 (opt-in ON but issue.code !== 'code-invalid' → walker NOT invoked), Test 27 (opt-in ON but client null → silent fallback, no calls).

### ResourceIssueTable inline expandable rows (D-10 / Pitfall 6)

`src/components/quality/ResourceIssueTable.tsx` grew an optional `suggestions?: Map<string, NearMissSuggestion[]>` prop (~125 line delta) for inline expansion:

- For each issue with `code === 'code-invalid'` AND `≥1` suggestion in the Map at `${resourceId}|${field}|${code}`, a chevron `<ActionIcon>` renders to the left of the row number; clicking toggles a `<Mantine.Collapse>` containing a small `<Table>` with columns `Display | Code | Relation`.
- Each suggestion display cell is wrapped in a `<Tooltip>` showing `"${display} (${system})"` so users can confirm the SNOMED system URL on hover.
- The relation column renders a Mantine `<Badge size="xs" variant="light">` with text `parent` / `child` / `sibling`.
- Pitfall 6 striping fix: collapse rows carry `data-collapse-row="true"` + inline `style={{ background: 'transparent' }}` to opt out of the alternating-stripe pattern so subsequent rows don't shift visually.
- Default-off (D-11): when `suggestions` is undefined/empty, NO chevron and NO collapse-row appear in the DOM — pre-43 byte-identical render.

7 new ResourceIssueTable tests cover: default-off (no chevron, no collapse-row), opt-in via Map but empty arrays (still no chevron), opt-in with real suggestions (chevron renders), non-code-invalid issue (chevron suppressed), expansion (Display/Code/Relation cells visible), and the Pitfall 6 striping invariant (data-collapse-row + transparent background present).

### useConformanceRun threading

`src/hooks/useConformanceRun.ts` grew a `suggestions: Map<string, NearMissSuggestion[]>` field on `ConformanceRunState`:

- Reset to empty Map at the start of every run.
- Threaded `terminologyResolver` (read via a new `useOptionalTerminology` helper that uses `useContext(TerminologyContext)` directly so it doesn't throw outside a provider) into the cascade options.
- Cascade emits via `onSuggestions(rowKey, sugs)` per code-invalid issue with ≥1 result; the hook accumulates into a local `Map` across all batch resources and flushes to component state in a single `setState` at run end (avoids mid-batch re-renders).
- `ValidationPanel.tsx` passes `run.suggestions` directly to `<ResourceIssueTable suggestions={...} />`.

### HUMAN-UAT scaffold (D-18)

`.planning/phases/43-validator-hardening-auth-semantic-near-miss-val-06-val-07/43-HUMAN-UAT.md` ships in `status: blocked` mode (live infrastructure not available in this auto-mode chain). 3 cases × 8 sub-cases per ROADMAP §43 SC #4:

- **Case A** — Basic-auth-protected validator URL (A.1 positive, A.2 negative wrong-password)
- **Case B** — Bearer-token-protected validator URL (B.1 modal save + positive validate, B.2 token-missing demote, B.3 token rotation T-43-04 cache invalidation)
- **Case C** — Deliberately-invalid SNOMED code surfacing ≥1 near-miss (C.1 opt-in ON + real terminology, C.2 default-off, C.3 terminology unavailable D-12 silent fallback)

The scaffold mirrors Phase 42's structure (frontmatter status + roadmap_success_criterion, prerequisites, steps + expected + pass/fail blanks per case, sign-off block). Human tester walks via `/gsd-verify-work 43` once a protected-validator instance and a SNOMED-invalid test resource are available.

## Threat Coverage Table

| Threat | Disposition | Code marker | Test |
|--------|-------------|-------------|------|
| T-43-05 (D — DoS via cyclic SNOMED hierarchy) | mitigate | `MAX_DEPTH = 3` + `MAX_NODES = 50` constants in semanticNearMissWalker.ts; visited Set keyed `${system}|${code}` | Walker Test 7 (cycle defense) — cyclic fixture (P1's parent points back to INVALID) returns finite result; bounded number of fetch calls. |
| T-43-06 (I — terminology server logging $lookup with invalid codes tied to PHI by inference) | accept | `walkNearMisses(system, invalidCode, resolver)` signature — only system + code + property params hit the terminology server; resourceId / patientId / other PHI never crosses the cascade-to-walker boundary | Documented in this SUMMARY (codes alone non-PHI per FHIR R4). |
| T-43-05 (UI — suggestion DOM leak) | accept | Suggestion display + code + relation render in DOM by design (non-PHI). Inherits Plan 43-01's PHI gate: cascade only runs when `isPhiAcknowledged()` passes. | Inherited from Plan 43-01 PHI-gate tests. |

(Cross-plan threats T-43-01..04, T-43-07 were mitigated within Plan 43-01; this plan does not weaken those mitigations.)

## Deviations from Plan

**Test 1 fix in cascadingValidator.test.ts (Rule 1).** When Task 2 added the optional `code?: string` field on `NormalizedIssue`, the existing `Test 1: external happy path` in `cascadingValidator.test.ts` used a strict `.toEqual([{...}])` comparison on the result and failed because the new `code: 'required'` field was now present in the actual output. Fix was minimal: add `code: 'required'` to the expected array. This is a deliberate shape extension (Pitfall 5) that the test now correctly reflects. No threat rule fired.

**HUMAN-UAT status set to `blocked` (instead of `scaffolded`).** The plan's task verify command grep-rejects `scaffolded` (`grep -vE "scaffolded"`). Per the prompt's auto-mode-checkpoint instructions ("the scaffold itself satisfies the task"), the file IS the deliverable; the actual cases run in a future manual session via `/gsd-verify-work 43`. Setting `status: blocked` with a `blocked_reason` and `deferral_target` matches the plan's done criteria (allowed: `passed | partially-passed | blocked`) and accurately reflects that no live tester can be in the loop in this auto chain.

**No other deviations from CONTEXT.md decisions.**

## Authentication Gates Encountered

None. All work executed autonomously without auth prompts. (The HUMAN-UAT scaffold is an explicit task deliverable, not an auth gate.)

## Test Deltas

| Window | Passing | Failing | Total | Notes |
|--------|---------|---------|-------|-------|
| Baseline (post-43-01) | 1184 | 1 | 1207 | Pre-existing Phase 40 deuteranopia failure (unrelated; documented in 43-01-SUMMARY.md) |
| Post-43-02 | 1207 | 1 | 1230 | +23 net new tests; same pre-existing deuteranopia failure (unchanged by this plan) |

New tests added in this plan: **+23 across 4 test files**:
- `src/quality/__tests__/normalizers.test.ts`: +3 (code-field-1, code-field-2, code-field-3)
- `src/quality/__tests__/semanticNearMissWalker.test.ts`: +8 (Tests 1-8: ordering, max-nodes, max-depth, null-client, polymorphism, cache reuse, cycle defense, network-error-mid-walk)
- `src/quality/__tests__/cascadingValidator.test.ts`: +5 (Tests 24, 24b, 25, 26, 27 — opt-in gate, code-invalid routing, null-client guard) + Test 1 fix
- `src/components/quality/__tests__/ResourceIssueTable.test.tsx`: +7 (wire-1, wire-1b, wire-2, wire-3, wire-4, wire-5, wire-6)

## Bundle Size

```
dist/assets/index-DRbpdedA.js   1,144.24 kB │ gzip: 342.47 kB
```

Delta vs Plan 43-01 (`1,141.49 kB / 341.65 kB gz`): **+2.75 kB raw / +0.82 kB gz**, well within the ±5 KB gz target. The walker module + UI changes are tree-shaken efficiently because the suggestions code path is opt-in default-off.

## Known Stubs

None. Default-off behavior is intentional (D-11) — when `semanticNearMisses` is absent or false, the new code paths simply don't execute; this is not a stub but the documented opt-in posture.

## Deferred Issues

Pre-existing `deuteranopia.test.tsx` pair #13 failure carries over from Plan 43-01 (Phase 40 / DEUT-01 backlog item; out of scope for this plan; `deferred-items.md` already records it).

## Self-Check: PASSED

- All 5 tasks executed and committed atomically (5 commits — `0875d07`, `2a02f30`, `2a7cf26`, `4b33ca1`, `7af3e82`).
- All `<acceptance_criteria>` blocks verified via grep + `npx vitest run`:
  - Task 1: 5 skipped tests (stub) — green
  - Task 2: NormalizedIssue.code field added; raw populated; description squash unchanged; 14 normalizer tests pass
  - Task 3: walker file exists; MAX_DEPTH=3, MAX_NODES=50, MAX_SUGGESTIONS=10 constants; exports walkNearMisses + NearMissSuggestion; CodeSystem/$lookup call present; valueCode/valueString/valueCoding present (7 occurrences); visited Set + new Set present; describe.skip removed; 8 walker tests green
  - Task 4: walkNearMisses() called from cascade; semanticNearMisses gate present; issue.code === 'code-invalid' predicate present; Collapse/data-collapse-row/Tooltip/ChevronDown/ChevronRight all present in ResourceIssueTable; useTerminology/terminologyResolver wired in useConformanceRun; opt-in tests pass (Tests 24-27); did-you-mean tests pass (wire-1..wire-6); npm build green; bundle delta within ±5 KB gz
  - Task 5: HUMAN-UAT.md exists; status: blocked (not scaffolded); ≥3 "Case [ABC]" matches (6)
- `npx tsc -b --noEmit` exits 0
- `npm run build` exits 0
- Full suite 1207 passing / 1 failing (pre-existing deuteranopia, documented)
- Per-task verification commands from `<verification>` block all green

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | `0875d07` | test(43-02): add Wave 0 stub for semanticNearMissWalker |
| 2 | `2a02f30` | feat(43-02): preserve raw FHIR issue.code on NormalizedIssue |
| 3 | `2a7cf26` | feat(43-02): add semanticNearMissWalker — bounded BFS over CodeSystem/$lookup |
| 4 | `4b33ca1` | feat(43-02): wire semanticNearMissWalker into cascade + ResourceIssueTable |
| 5 | `7af3e82` | docs(43-02): scaffold HUMAN-UAT for VAL-06 + VAL-07 (3 cases per ROADMAP SC #4) |
