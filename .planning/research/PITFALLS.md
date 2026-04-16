# PITFALLS Research — v1.4 Hardening & Tech-Debt Sweep

**Domain:** Refactor of existing FHIR Exploder codebase (35K LOC, 582 passing tests, live Blaze integration)
**Researched:** 2026-04-16
**Confidence:** HIGH — all pitfalls grounded in existing code patterns inspected directly at file:line references

---

## Critical Pitfalls

### Pitfall 1: `useAsyncRun<TState>` extraction breaks type inference at the 4 call sites (R6)

**What goes wrong:** A generic state-machine hook with `<TState>` looks clean on paper, but the four target hooks (`usePlausibilityReport`, `useLabRangesReport`, `useDuplicateReport`, `useReferenceReport`) each shape `state` differently — `issues` lives on the run for some, on a sibling field for others; `progress` is `{done, total}` here, `{processed, total}` elsewhere. A single `TState` type either becomes `unknown`-typed (caller has to re-narrow on every read) or grows union-typed fields that infect each individual report. Either way, `tsc -b --noEmit` stays clean (the v1.3 invariant) but consumer panels (`PlausibilityPanel`, etc.) end up with `as` casts that move the duplication from the hooks into the consumers.

**Why it happens:** When you look at `useCompletenessReport.ts:70-133` and the four sibling report hooks side-by-side, their state-machine *control flow* is identical (status / progress / cancellation / cleanup). The temptation is to extract that control flow as a generic hook. But the *state shape* is genuinely different per metric — Plausibility tracks issues by code, Duplicates tracks pairs+singletons, References tracks resolved/unresolved separately.

**Warning signs:**
- `useAsyncRun` ends up taking `TState extends { status; progress; ...}` constraint that grows with every consumer
- New `as` casts appear in `PlausibilityPanel.tsx`, `DuplicatesPanel.tsx`, etc.
- Any consumer needs `useAsyncRun<typeof initialState>(...)` — the `typeof` smell means `TState` is leaking
- Type narrowing requires `if (run.state.kind === 'plausibility')` checks that never existed before

**Prevention strategy:**
1. Do NOT extract `<TState>` generically. Instead extract `useAsyncStateMachine()` returning **only** `{status, progress, errorMessage, cancel, run}` as a fixed shape — let each hook keep its own `useState` for the metric-specific payload.
2. The four target hooks should call the new helper for orchestration but retain typed `useState<PerTypePlausibilityReport>()` calls for the data.
3. **If you see** the generic constraint growing past 3 generic params, **it means** the abstraction is wrong, **do** revert and extract only the runner shell.
4. Verify after extraction: each consumer panel has zero new `as` casts (compare git diff).

**Phase to address:** Phase 24 (`useAsyncRun` extraction)

---

### Pitfall 2: Picking the wrong cancellation pattern when unifying `let cancelled` vs `cancelledRef` (R6)

**What goes wrong:** The codebase has two patterns intentionally:
- `useCompletenessReport.ts:75` uses closure-scoped `let cancelled = false` (the comment at lines 71-74 is *explicit* about why: a shared ref would let a stale in-flight promise from a prior effect run commit after the new effect re-sets the ref)
- `useResourceCounts.ts:26-29` uses `cancelledRef` and *resets* it on every effect run — which has the bug the comment in `useCompletenessReport` warns against

If `useAsyncRun` picks `cancelledRef` and resets it on each effect (mirroring `useResourceCounts`), then under React 18 strict-mode double-mount or rapid `serverUrl`/`sampleSize` changes, the *first* effect's promises will write into state after the *second* effect has reset the ref to `false` — silent stale writes that look like ghost data appearing seconds after a setting change.

**Why it happens:** The 4 target hooks (`useValidationRun.ts:81`, `useConformanceRun.ts:102`, `usePlausibilityReport.ts:62`, `useLabRangesReport.ts:58`, `useDuplicateReport.ts:73`, `useReferenceReport.ts:67`) all use `cancelledRef`. Looks like the majority pattern. But majority ≠ correct — `useCompletenessReport`'s author wrote a 4-line code comment explaining why they deliberately diverged.

**Warning signs:**
- After extracting `useAsyncRun`, completeness/coding tests start showing intermittent "computed value of `undefined` written after `setReports({})`" assertions
- Strict-mode-only failures in CI — passes locally without `<StrictMode>`, fails in test
- React DevTools shows brief "loading → done → loading → done" flicker on rapid resource-type changes

**Prevention strategy:**
1. Use the **closure-scoped `let cancelled`** pattern in `useAsyncRun`. The `cancelledRef` reset-on-every-effect pattern in `useResourceCounts.ts:29` is itself a latent bug — don't propagate it.
2. **If you see** a `useRef(false)` plus `cancelledRef.current = false` at effect start, **it means** the author missed the closure-isolation problem, **do** convert to `let cancelled = false` inside the effect.
3. Add a regression test: rapidly toggle `sampleSize` 10→100→10 and assert no `setReports` call lands after the final cancel.
4. Phase 24 should pre-fix `useResourceCounts.ts:29` to use `let cancelled` *while it's already touching the file* for the count-cache work.

**Phase to address:** Phase 24 (`useAsyncRun` + `useResourceCounts` cache work both touch this file)

---

### Pitfall 3: `Map<serverUrl, cache>` with no eviction → unbounded memory across server switches (R2, R1)

**What goes wrong:** `useResourceCounts` and `useCompletenessReport`/`useCodingCoverage` currently keep a *single* `cacheInstance` that rotates on `serverUrl` change (line 46 of useCompletenessReport), discarding the previous server's cache. The v1.4 plan promotes this to `Map<serverUrl, QualityMetricsCache>`. Without eviction, every distinct `serverUrl` the user ever points at adds an entry that's never freed — stays for the lifetime of the tab. Local-first usage where users alternate between localhost:8080 (Blaze), staging.example.com, and prod.example.com triples memory permanently.

For `useResourceCounts` the entries are tiny (number per type). For `QualityMetricsCache` an entry can be 1-10 MB (per-resource completeness reports for 1000 sampled resources × 100+ types).

**Why it happens:** `Map<serverUrl, cache>` looks like the canonical fix for "discards previous server's cache" in the inline comment. The fix is correct but incomplete — multi-server usage is rare per the comment, but the Map turns rare-into-leaked.

**Warning signs:**
- Memory grows monotonically across server switches in DevTools heap snapshots
- After 5+ server switches the `Map` shows 5+ entries with no `delete()` ever called
- No upper bound or `Map.size` assertion in the cache module
- No "cache cleared" notification when settings change

**Prevention strategy:**
1. **For `useResourceCounts`** (entries are tiny): unbounded `Map` is fine, but key off `${serverUrl}::${resourceType}` not nested map structure to keep deletion simple.
2. **For `QualityMetricsCache`**: bound to **2 entries** (current + previous, so a quick A/B server toggle preserves both), LRU-evict on insert beyond that. Mirrors the LRU pattern already used for terminology server display caches per project conventions.
3. **Settings-change invalidation**: when `settings.yaml` changes — even if `serverUrl` stays the same — the cache may be stale (e.g., bearer token rotated → different server response permissions). Subscribe `metricsCache.ts` to a `useSettings()` listener and clear the entry for the current `serverUrl` on settings change.
4. **If you see** the Map growing past 2 entries, **it means** the eviction policy isn't wired, **do** add an LRU eviction in `set()`.
5. Add a unit test that creates 5 distinct serverUrls and asserts `cache.size <= 2`.

**Phase to address:** Phase 24 (cache foundation)

---

### Pitfall 4: `<DrillDownShell>` becomes a god component with too many props (R3)

**What goes wrong:** Looking at the 5 drill-downs the cross-AI review wants to collapse — `PlausibilityDrillDown.tsx`, `LabRangesDrillDown.tsx`, `DuplicatesDrillDown.tsx`, `ReferencesDrillDown.tsx`, `CompletenessDrillDown.tsx` (and partially `CodingDrillDown.tsx`) — they look identical in skeleton (Back / Title / autofocus / progress / error / empty / `ResourceIssueTable`) but differ in the hook they invoke, the title text, the error-message copy, and (critically for `CodingDrillDown`) the *second* fetch for path examples. A naive `<DrillDownShell>` taking `{ status, progress, issues, errorMessage, title, hook, hookArgs, focusRef, ... }` ends up with 12+ props and an `extras: ReactNode` escape hatch to handle the coding-specific second fetch — at which point all consumers pass slightly different prop combinations and the abstraction adds nothing.

**Why it happens:** The 5 drill-downs DO share the same outer skeleton, but `CodingDrillDown` has the `useExamplesByPath` second-fetch concern *that R5 is supposed to remove in the same milestone*. If you extract `<DrillDownShell>` *before* deleting `useExamplesByPath`, you have to design around that asymmetry; if you extract *after*, you only have 4-5 truly-symmetric pages.

**Warning signs:**
- `<DrillDownShell>` props interface exceeds 8 fields
- A `children` or `extras` slot appears to handle special cases (CodingDrillDown's path examples)
- 2+ optional props flag "this drill-down is different"
- The shell's prop types use `unknown` or generic params

**Prevention strategy:**
1. **Sequence matters**: do R5 (drop `useExamplesByPath`, thread `perPathExamples` into `PerTypeCoverageReport`) **first**, then extract `<DrillDownShell>`. Now all 5 are truly symmetric.
2. Design `<DrillDownShell>` for the **smallest common subset** — accept `{ status, progress, issues, errorMessage, title, backHref }` only. Anything page-specific stays in the consumer.
3. The autofocus ref problem (currently `useRef<HTMLAnchorElement|null>` at `CompletenessDrillDown.tsx:44`, see also Claude review STYLE-MEDIUM): the shell should own the ref typed as `HTMLElement` and accept an `autoFocus` boolean — not pass the ref as a prop.
4. **If you see** consumers passing `<>{shell}{extra-content}</>` patterns, **it means** the shell isn't generic enough OR is too generic, **do** widen the API of `ResourceIssueTable` to absorb the difference instead of widening the shell.

**Phase to address:** Phase 25 — and *order* tasks within phase: R5 (perPathExamples) → R3 (DrillDownShell)

---

### Pitfall 5: `<ConnectionGatedOutlet>` changes `MedplumProvider` mount timing → child hooks fire wrong (R7)

**What goes wrong:** Currently `QualityLayout.tsx:106` wraps the Outlet in `<MedplumProvider medplum={state.client}>` *only* when connected. The disconnected branch returns the alert without ever instantiating `MedplumProvider`. Children inside the Outlet (e.g., `QualityOverviewPage` calling `useMedplum()`) only mount once a client exists.

If `<ConnectionGatedOutlet>` instead wraps `<MedplumProvider>` outside the gate (so the provider is always mounted with either `state.client` or some `null`/sentinel client), child hooks like `useMedplum()` will start returning a mock/null client where they used to never be called. Every `useMedplumProfile()`, `useResource()`, `useSearchResources()` call across the quality module needs to handle the null case it never previously saw. Test mocks may break too — `jest.mock('@medplum/react')` setups likely return a real client.

Inverse risk: if you put `<MedplumProvider>` *inside* the connected branch of `<ConnectionGatedOutlet>`, the *triplication* is preserved (the provider wrapping is the very thing being deduped) — back to square one.

Additionally: `QualityLayout` runs the legacy-key migration `useEffect` (line 57-82) **before** any child mounts. The migration *assumes* parent-effect-before-child-effect ordering on first render (commented at line 38-43). Moving QualityLayout's `useEffect` into a wrapped `<ConnectionGatedOutlet>` could change the effect-firing order if the wrapper introduces an intermediate component — breaking the `useLocalStorage` hydration race protection.

**Why it happens:** `<ConnectionGatedOutlet>` looks like a mechanical extraction of triplicated alert + provider boilerplate. But the three layouts are *not* identical — `QualityLayout` adds `<QualityMetricsProvider>` and the migration effect; `PatientsLayout` and `ExplorerLayout` don't. The "shared" wrapper has to compose with these per-layout extras, and the composition order is load-bearing.

**Warning signs:**
- After extracting `<ConnectionGatedOutlet>`, the legacy-key migration test breaks (`useLocalStorage` reads the legacy key before migration)
- A child hook that was `useMedplum()` returns `null` when it didn't before
- Test mocks of `MedplumProvider` need updating
- `useMedplumContext()` returns a sentinel that callers don't handle

**Prevention strategy:**
1. Design `<ConnectionGatedOutlet>` as a **render-prop or children-as-function** taking the `client` + `capability` and rendering the connected branch. The unconnected branch is the only thing standardized; the connected branch is fully composable per layout.
2. Keep `<MedplumProvider>` and `<QualityMetricsProvider>` and the migration `useEffect` *inside* QualityLayout's connected-branch render — only the disconnected alert is shared.
3. **If you see** the gated outlet wanting to own `<MedplumProvider>`, **it means** you're past the dedup minimum, **do** stop and only share the alert.
4. Verify: `tests/quality-layout.test.tsx` still passes the legacy-migration test without modification.

**Phase to address:** Phase 26 (app-shell dedup)

---

### Pitfall 6: `React.lazy()` route extraction breaks Vitest tests that don't await Suspense (R15)

**What goes wrong:** Currently `App.tsx` statically imports all routes — drill-downs, panels, ThresholdsPage, CohortsPage. After Phase 27 lazy-loads them, every existing test that does `render(<App />)` and immediately queries for a drill-down element will get back the Suspense fallback (typically a `Skeleton` or nothing) instead of the actual page. With React Router v7, the Outlet renders the Suspense fallback during chunk load; tests that pre-Phase-27 wrote `expect(screen.getByText('Plausibility issues')).toBeInTheDocument()` will fail with "unable to find element" and **no indication** that the fallback is the cause.

Worse: in jsdom, the lazy import resolves *immediately* if the test imports the lazy module elsewhere (which happens via test setup files). So tests can pass on machine A and fail on machine B depending on whether some previous test happened to eagerly resolve the chunk. Flaky test pattern.

**Why it happens:** `React.lazy()` returns a Promise that suspends. RTL's `render()` doesn't `await` Suspense by default. Adding `await screen.findByText(...)` *should* work but with React 18 + Suspense + Vitest, the fallback can stick around for one render cycle even after the chunk resolves.

**Warning signs:**
- Tests that previously found drill-down content with `getByText` start needing `findByText` (await-based query)
- Tests pass locally but fail in CI sporadically
- `Skeleton` or `LoadingOverlay` appears in test output where it shouldn't
- Test files start importing the lazy component directly to "warm" the chunk

**Prevention strategy:**
1. After lazy-loading, wrap every test `render(<App />)` body in `await waitFor(() => expect(...))` for the first assertion against any lazy-loaded content. Don't rely on `getByText`.
2. Provide a Suspense fallback that's **distinguishable from real content** (`<div data-testid="route-loading">`) so test failures clearly point at the fallback being shown.
3. Add a global Suspense boundary in `App.tsx` *outside* routes so chunk-load errors get a defined recovery path — without it, a chunk-load failure during navigation hard-throws.
4. Add a chunk-retry mechanism (lazy import wrapped in `retry(() => import(...), 3)`) — chunk-load races on flaky networks are silent in dev and unrecoverable without page reload otherwise.
5. **If you see** a test failing with "unable to find element" right after lazy-load conversion, **it means** the test isn't awaiting Suspense, **do** convert `getBy` → `await findBy`.

**Phase to address:** Phase 27 (`React.lazy()` work). Add a test-migration sub-task explicitly: "audit all `render(<App />)` tests for Suspense-await."

---

### Pitfall 7: `useSyncExternalStore` `getSnapshot` allocates → infinite render loop (R14)

**What goes wrong:** If Phase 27 splits `QualityMetricsContext` via `useSyncExternalStore`, the `getSnapshot` callback **must return a referentially stable value** when nothing has changed. The current context exposes `duplicatesBreakdown: { patient?, hashByType: Record<string, number> }` (line 47-49 of QualityMetricsContext.tsx). A naive `getSnapshot` like `() => ({ patient: store.patient, hashByType: store.hashByType })` allocates a new object every call → React detects a "change" → re-renders → calls `getSnapshot` again → new object → infinite loop. React 18 throws "The result of getSnapshot should be cached to avoid an infinite loop" but only in dev mode and only sometimes.

The trap is even subtler with the existing `setDuplicatesContribution` reducer (line 117-135): it allocates `{ ...prev.hashByType }` and a new outer object every call. A `useSyncExternalStore` rewrite that preserves this reducer is fine for `subscribe`/notify, but `getSnapshot` consumers need to read off a frozen reference, not reconstruct the shape.

**Why it happens:** `useSyncExternalStore` is the Gemini reviewer's suggested fix for the "all consumers re-render on any metric update" concern. The ergonomics encourage one-snapshot-per-consumer functions; each consumer wants only its slice. The instinct is to write `getCompletenessSnapshot = () => ({ value: store.overallCompleteness })`. Wrapping in an object loses referential equality.

Compounding factor: the v1.4 plan flags R14 as "L task" (large) and notes "context split touches ~20 files" — wide blast radius.

**Warning signs:**
- React dev console shows "The result of getSnapshot should be cached to avoid an infinite loop"
- React DevTools Profiler shows the same component re-rendering 100+ times per second
- Tests that consume the context start hanging
- A reducer pushing a *new* object on every dispatch (look for `{ ...prev }` patterns)

**Prevention strategy:**
1. **Return primitives or stable references** from `getSnapshot`. For `overallCompleteness: number | undefined`, return the number directly. For `duplicatesBreakdown` (object), the store must store a frozen reference and only allocate a new one on actual change — the existing `setDuplicatesContribution` reducer already does this correctly via `useState((prev) => ...)`.
2. For object-shaped slices, use `useSyncExternalStoreWithSelector` from `use-sync-external-store/with-selector` and pass `Object.is` or a custom equality function.
3. **Defer R14 to v1.5 if at all possible** — the v1.4 plan already calls this out as the highest-risk task. The actual user-visible re-render cost is low (8 panels), and the refactor risk is high.
4. **If you see** `getSnapshot` returning a `{ ... }` literal, **it means** you're allocating per call, **do** convert to a primitive return or store the object on the store itself.
5. Mitigation: keep the current `Context.Provider`-with-`useMemo` pattern but split into one provider per metric. Less elegant, but no `useSyncExternalStore` footgun.

**Phase to address:** Phase 27 (R14). Strong recommendation: defer to v1.5.

---

### Pitfall 8: External validator T1 — blocking UI on slow validator without timeout, and PHI regression (T1)

**What goes wrong:**
1. **No timeout**: HAPI / official FHIR validator $validate calls take 1-30+ seconds for complex resources. If T1 wires the external validator into `ValidationPanel` without a per-request timeout (default `fetch()` has none), users see a permanently-spinning sample that never resolves. Worse: the next sampled resource stacks behind it.
2. **PHI regression**: There is **already** a PHI acknowledgment gate for remote validation (per PROJECT.md Key Decisions: "PHI acknowledgment gate for remote validation — Explicit user consent before POSTing full resources to external validator — Validated Phase 7"). If T1 implementation calls a *new* external validator endpoint without routing through the same gate, PHI leaks to the external host without consent — silent regression of a Phase 7 requirement.
3. **OperationOutcome parsing inconsistency**: The local checker emits issues in a normalized internal shape. An external validator returns FHIR `OperationOutcome` resources with `issue[].severity`, `issue[].code`, `issue[].diagnostics`, `issue[].location`. Naively mapping these to the local shape risks losing severity nuance (FHIR has `fatal/error/warning/information`, local checker may only have `error/warning`) and dropping `expression[]` (FHIRPath of the issue location, key for drill-down).

**Why it happens:** "Add external validator support" sounds like a single integration. The three concerns above are easy to overlook: timeout because dev-loop testing uses fast localhost validators; PHI gate because reviewer focus is on the new UI not regression of an old gate; OperationOutcome parsing because both shapes "look like an issue list."

**Warning signs:**
- T1 PR doesn't reference Phase 7's PHI ack gate
- `fetch(validatorUrl, ...)` with no `AbortController` + timeout
- New `parseOperationOutcome()` function that doesn't unit-test severity coercion + missing-field fallback
- ValidationPanel can spin indefinitely with no cancel button

**Prevention strategy:**
1. Wrap every external `$validate` call in `AbortController` with a configurable timeout (default 15s); on timeout, fall back to local checker for that resource and surface a yellow toast (≤3 toasts per minute, debounced).
2. **Reuse the existing PHI ack gate** — search for the Phase 7 implementation (likely in `src/components/quality/ValidationPanel.tsx` or a sibling) and route the new external validator path through the *same* gate. Add a regression test that mocks the validator endpoint and asserts no `fetch` is issued before user consent.
3. Define a single `normalizeOperationOutcomeIssue(issue: OperationOutcomeIssue): NormalizedIssue` mapping and unit-test it. Use the existing `NormalizedIssue` type per PROJECT.md Key Decisions ("`NormalizedIssue` type for all quality findings — Validated Phase 15").
4. Status line surfaces *which validator strategy ran* (external / server $validate / local) per resource so users can see when fallback occurred.
5. **If you see** the T1 PR doesn't touch the Phase 7 PHI gate file, **it means** PHI consent is being bypassed, **do** block merge until gate routing is added.

**Phase to address:** Phase 29 (T1). Add explicit acceptance criteria: timeout, PHI gate routing, OperationOutcome→NormalizedIssue mapping unit-tested.

---

### Pitfall 9: Phase 23 `handleExport` closure-capture fix (W1) — wrong fix pattern

**What goes wrong:** Looking at `CohortsPage.tsx:418` the per-row `onExport` is passed as `onExport={handleExport}` and `SavedCohortRow:201` calls `onClick={() => onExport(cohort)}`. The cohort is closed over **per row instance** via the `cohort` prop — so this *specific* code is actually fine.

The W1 audit warning about closure-capture is referencing a different pattern (likely the `cohorts.map((c) => <SavedCohortRow ... cohort={c} ... />)` loop at line 411-420, where IF someone refactors to inline the menu without going through SavedCohortRow, they'll lose the per-iteration binding).

The pitfall: a "fix" for W1 may *introduce* the closure-capture bug if the developer tries to inline the menu back into the .map() body, or restructures with a `useMemo` of menu items per cohort using a stale `cohorts` reference. The current code is *correct* because each `SavedCohortRow` instance closes over its own `cohort` prop.

**Why it happens:** The audit warning ("Export menu item for non-current row always serializes the currently-rowed cohort") sounds severe. A reader without git-diff context may believe the bug exists today and refactor the working code, accidentally breaking it. In the `for (const c of cohorts) { menuItems.push({ onClick: () => handleExport(c) }) }` pattern, `c` is per-iteration in `for...of` so closure-capture is safe — but in `cohorts.forEach((c, i) => { ... handleExport(cohorts[i]) ... })`, the `i` index combined with a stale `cohorts` reference re-introduces the bug.

**Warning signs:**
- The W1 fix PR refactors `SavedCohortRow` away
- Test changes look like "now passes" against a test that wasn't failing
- The fix uses `cohorts[index]` where `cohorts` is captured from outer scope
- No before/after test demonstrating the actual bug being fixed

**Prevention strategy:**
1. **Before fixing W1, write the failing test first**: simulate clicking Export on row 0 when there are 3 rows; assert the *correct* cohort.id was passed to `cohortToFdpgSq`. If the test passes against the current code, the W1 warning may already be addressed by the SavedCohortRow extraction.
2. Use `for...of` or `.map((c) => ...)` exclusively — never `forEach` with index lookup, never `for (let i = 0; ...)` with closure capture of `i`.
3. **If you see** the fix removes `SavedCohortRow` and inlines the menu, **it means** the developer misread the warning, **do** revert and verify the test against the original structure first.
4. Document in the Phase 23 SUMMARY: "W1 audit warning was a code-review concern about loop-capture pattern; verification showed `SavedCohortRow` extraction at line 125 already isolates per-row closure."

**Phase to address:** Phase 23 (W1)

---

### Pitfall 10: Phase 23 quota probe (W2) — probing without persisting

**What goes wrong:** `useCohorts.ts:154-159` shows `activateCohort`:

```ts
const activateCohort = useCallback(
  (id: string | null) => {
    setStored({ ...stored, activeCohortId: id });
  },
  [stored, setStored],
);
```

The W2 fix is to wrap this in the `persist()` helper at line 171-189 (which probes `localStorage.setItem` then calls `setStored`). The pitfall: a developer copying `addCohort`'s pattern may write the probe but **forget** the `setStored(next)` call after the try block — meaning the probe succeeds but React state never updates. UI looks like it activated but on next render it reverts.

The inverse pitfall: the developer probes correctly but doesn't pass through the same error handling — `addCohort` re-throws on quota error (line 144) so the caller can react; if `activateCohort` swallows, callers don't know it failed.

**Why it happens:** `setStored` from Mantine's `useLocalStorage` is async-hydration-aware and wraps its own `setItem` in try/catch — it eats the error silently. The probe pattern (line 132-145) only works because `setStored` is *also* called after a successful probe; if you probe-then-skip-`setStored`, persist works but state doesn't.

**Warning signs:**
- W2 fix calls `persist(next, ...)` but the persist function *only* calls `setStored` on success (verify line 186 of useCohorts.ts)
- Activating a cohort succeeds in localStorage (visible in DevTools) but UI doesn't update
- Test for W2 doesn't assert both: localStorage is written AND React state reflects new active id

**Prevention strategy:**
1. Use the existing `persist()` helper (line 171-189) which already does `try-setItem-catch / setStored(next)` correctly.
2. Add a Phase 23 test: `activateCohort('id-1')` followed by `expect(result.current.activeCohortId).toBe('id-1')` AND `expect(localStorage.getItem(COHORTS_STORAGE_KEY)).toContain('id-1')`.
3. **If you see** the W2 fix has a try/catch *without* the matching `setStored(next)` outside the try, **it means** state will diverge from storage, **do** mirror the `addCohort` structure exactly.

**Phase to address:** Phase 23 (W2)

---

### Pitfall 11: Phase 23 `PATIENT_REF_CAP` dedupe ordering (W3)

**What goes wrong:** Per CohortBuilderForm.tsx:184, `truncated = parsedRefs.length === PATIENT_REF_CAP`. The audit warns this can false-positive: 10,050 non-unique IDs that dedupe to 9,900 still trigger the truncation copy because `parsedRefs.length` is post-dedupe but `=== 10_000` happens to match if the dedupe coincidentally lands at exactly the cap.

The fix needs `parsePatientRefs` to track *whether truncation actually occurred* during parsing — not infer it from final length. The pitfall is the obvious-looking fix:

```ts
// WRONG — still has the same bug pattern:
const deduped = unique(parsed);
const truncated = deduped.length >= PATIENT_REF_CAP;
```

vs. the correct fix:

```ts
// CORRECT — track during parse, not after dedupe:
const truncated = inputCount > PATIENT_REF_CAP;
const deduped = unique(parsed.slice(0, PATIENT_REF_CAP));
```

**Why it happens:** `parsePatientRefs` likely loops through tokens and short-circuits at `PATIENT_REF_CAP` reached. If dedupe happens *inside* the loop, the cap counts unique IDs (good); if dedupe happens *after* the loop (typical), the cap counts raw tokens. The truncation flag must be set based on *whether the input had more tokens than the cap*, not the output array length.

**Warning signs:**
- W3 fix changes `parsedRefs.length === PATIENT_REF_CAP` to `parsedRefs.length >= PATIENT_REF_CAP` — same bug, different inequality
- W3 fix doesn't add a separate `truncated` boolean to `parsePatientRefs` return
- Test has 9,900 unique IDs with 100 dupes (10,000 raw) and expects no truncation — but the implementation still flags it

**Prevention strategy:**
1. Change `parsePatientRefs` to return `{ refs: string[], truncated: boolean, originalCount: number }` instead of just `string[]`. The truncation flag is set by `parsePatientRefs` based on input count vs. cap, decoupled from the deduplicated output length.
2. Update CohortBuilderForm.tsx:184 to read `parsedRefs.truncated` directly.
3. Test matrix: (a) 100 IDs all unique → not truncated, (b) 10,000 unique → not truncated (exactly at cap), (c) 10,001 unique → truncated, (d) 10,050 with 100 dupes (9,950 unique) → not truncated, (e) 11,000 with 5,000 dupes (6,000 unique) → truncated (input exceeded cap regardless of dedupe).
4. **If you see** the W3 fix only changes the comparison operator, **it means** the developer didn't decouple input-count from dedupe-output, **do** require the parser to return a `truncated` flag.

**Phase to address:** Phase 23 (W3)

---

## Test Regression Hotspots

Tests most likely to break silently across this milestone:

| Test category | Why at risk | Mitigation |
|---|---|---|
| `render(<App />)` tests post-Phase-27 (R15) | Suspense fallback returned where content expected; flaky depending on chunk-warm state | Audit all `getBy*` → `findBy*` after lazy-load conversion |
| `useResourceCounts` mock-MedplumClient tests (R2) | Module-scoped Map persists across tests; state from prior test leaks into next | Add `afterEach(() => resourceCountsCache.clear())` in test setup |
| Quality module tests using `MedplumProvider` mock (R7) | If `<ConnectionGatedOutlet>` changes provider mount timing, mocked `useMedplum()` hooks may receive null | Audit test mocks before merging Phase 26 |
| `useCohorts` localStorage hydration tests (Phase 23 W2) | StrictMode double-mount fires `useEffect` twice; W2 quota probe runs twice; second run sees populated storage | Wrap probe in `if (cancelled) return` mirroring useCompletenessReport pattern |
| `QualityMetricsContext` consumer tests (R14) | If split into per-metric providers, tests that wrapped one consumer with the monolithic provider need rewrap | Provide a `<TestQualityMetricsProvider>` test-utility composing all sub-providers |
| Snapshot tests of CohortsPage post-W1 | If row export gets new test scaffolding, snapshots drift | Inline snapshots only, no `__snapshots__` dirs |
| Strict-mode-only race tests | Phase 24's cancellation pattern flip will surface latent bugs | Set `<StrictMode>` in vitest setup if not already; CI-only flake → run vitest twice |

---

## Inter-phase Integration Risks

How the 7 phases interact and step on each other:

| Phase pair | Conflict risk | Mitigation |
|---|---|---|
| **25 (DrillDownShell) ↔ 28 (`as unknown as` sweep)** | Phase 28 sweeps `as unknown as Record` casts in drill-down files that Phase 25 is restructuring; rebase conflicts likely | Sequence: ship 25 fully before 28 starts. Phase 28's task list on drill-down files re-grep'd post-25. |
| **24 (useAsyncRun) ↔ 25 (useSampleWalker)** | Both rewrite the same hooks; useSampleWalker depends on useAsyncRun's cancellation contract | Strict ordering: 24 lands first, 25 builds on it. Plan tasks in 25 should reference 24's `useAsyncRun` API explicitly. |
| **24 (cache Map) ↔ 27 (effect-dep memoization)** | Both touch `useResourceCounts.ts:75`; 27's `useMemo(types.join(','))` needs to compose with 24's serverUrl-keyed cache | One PR per file is safest; if both lands in 24, mark 27's `useResourceCounts` task "absorbed by Phase 24". |
| **25 (drop keepMounted) ↔ 27 (lazy routes)** | Both reduce work-on-mount; tests for tab-switching may pass in 25 but break in 27 because lazy chunk loads on first visit | Add a "tab-switch UAT" item that re-runs after each phase. |
| **26 (ConnectionGatedOutlet) ↔ 23 (W1/W2/W3)** | Phase 23 touches CohortsPage which renders inside QualityLayout; if 26 changes layout structure, W1's regression test may need rewriting | Sequence: 23 ships standalone before 26's layout work. |
| **27 (QualityMetricsContext split) ↔ 25 (useSampleWalker)** | useSampleWalker pushes via `setCompleteness`; if context split changes the setter signature, useSampleWalker regression-test breaks | If R14 is included in v1.4, do it last (after 25); otherwise defer to v1.5. |
| **28 (drop eslint-disable) ↔ 24 (useAsyncRun)** | The `eslint-disable react-hooks/exhaustive-deps` lines in 4 drill-downs are absorbed by `useAsyncRun`; 28 must not run until 24 has landed | 28's task says "absorbed by Phase 24's useAsyncRun" — make this an explicit ordering dependency in the milestone |
| **29 (T1 validator) ↔ 25 (drop keepMounted on quality tabs)** | T1 wires into ValidationPanel; if Phase 25 gates ValidationPanel hook on `isActive`, T1's status-line update needs to consider not-mounted state | Coordinate: ValidationPanel author for both phases should be same engineer if possible. |

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|---|---|---|---|
| Skip the LRU eviction on `Map<serverUrl, cache>` | Phase 24 ships faster | Memory leak grows with each server switch; not visible to users until tab is open for hours | Never — add eviction even if just `Map.size > 2 → clear oldest`. Cheap to add now, painful to retrofit. |
| Pass an `extras: ReactNode` prop into `<DrillDownShell>` | Lets you ship before R5 lands | The shell becomes a god component; future drill-downs add more `extras` slots; original "remove duplication" goal is undermined | Never — sequence R5 first, then extract shell as truly symmetric. |
| Use `<TState>` generic in `useAsyncRun` to "future-proof" | Looks more reusable | Type errors leak to call sites; adds `as` casts that move duplication rather than removing it | Never — extract only the orchestration shell, not the state shape. |
| Defer R14 (context split) to v1.5 | Phase 27 ships smaller | Re-render cost stays; users with many resource types feel sluggishness | **Acceptable** — actual user-visible cost is low (≤8 panels), refactor risk is high. v1.4 plan already calls out as L task. |
| Skip Suspense audit when adding `React.lazy()` | Phase 27 ships faster | Test flake in CI; on-call burden later | Never — audit takes 1 hour; flake-debugging takes days. |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|---|---|---|---|
| Unbounded `Map<serverUrl, QualityMetricsCache>` | Heap snapshot grows on each server switch | LRU eviction (max 2 entries) | After ~5 server switches with 1000-sample completeness reports cached |
| `getSnapshot` returning fresh objects in `useSyncExternalStore` | Console: "infinite loop" warning; profiler shows component rendering 100+/sec | Return primitives or store-frozen references; use `useSyncExternalStoreWithSelector` with custom equality | Immediately on first consumer mount |
| Lazy-loaded chunks with no retry | Failed chunk load → blank route, requires hard reload | Wrap `lazy(() => retry(() => import(...), 3))` | On flaky networks (~5% of users) |
| `keepMounted` removal exposing un-cancellable in-flight work | Switching tabs mid-fetch leaves promises completing into unmounted components → React warnings | Ensure `useAsyncRun` cancels on unmount (already in design) | First user who tab-switches during a sample run |
| External validator with no timeout | Permanent spinner; backed-up sample queue | `AbortController` with 15s timeout + fallback to local | First time user points at slow public validator |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---|---|---|
| External validator T1 bypasses Phase 7 PHI ack gate | PHI leaks to external host without consent — silent regression of a Validated Phase 7 requirement | Route new validator path through *same* PHI gate; regression test mocks validator endpoint, asserts no `fetch` before consent |
| `<ConnectionGatedOutlet>` exposes child hooks to null clients | Untrusted FHIR responses leaked into UI when supposedly disconnected | Keep `<MedplumProvider>` *inside* the connected branch; share only the alert |
| OperationOutcome parser with no severity coercion | Errors logged as warnings or vice versa, masking real validation failures | Unit-test severity mapping; default unknown severity to `error` (fail closed) |
| Cache invalidation on serverUrl but not on auth token | Stale cached data from previous auth session shown to new user | Subscribe metricsCache to `useSettings()`; clear on any settings change |

---

## "Looks Done But Isn't" Checklist

- [ ] **R1 (`useSampleWalker`)**: Often missing the *cache-key suffix* for `patientIds` (per useCompletenessReport.ts:87-88) — verify completeness/coding cache distinguishes cohort-scoped vs unscoped runs
- [ ] **R2 (`Map<serverUrl, count>`)**: Often missing settings-change invalidation — verify auth token rotation clears cache
- [ ] **R3 (`<DrillDownShell>`)**: Often missing autofocus equivalence — verify Back button receives focus in extracted shell
- [ ] **R4 (drop `keepMounted`)**: Often missing scroll-position preservation — verify tab restore returns user to prior scroll
- [ ] **R5 (`perPathExamples`)**: Often missing test that asserts `useExamplesByPath` is no longer imported — grep should return 0 matches
- [ ] **R6 (`useAsyncRun`)**: Often missing strict-mode double-mount test — verify cancellation in `<StrictMode>`
- [ ] **R7 (`<ConnectionGatedOutlet>`)**: Often missing the QualityMetricsProvider migration test — verify legacy-key migration still runs in correct order
- [ ] **R10 (sidebar nested-route)**: Often missing test for `/explorer/Patient/123` activating "Explorer" — assert via `aria-current="page"`
- [ ] **R11 (`as unknown as Record` sweep)**: Often missing one or two sites — final grep for `as unknown as Record<string` must return 0
- [ ] **R14 (context split)**: Often missing the test-utility provider — verify all consumer tests have a single replacement wrapper
- [ ] **R15 (`React.lazy()`)**: Often missing the chunk-error boundary — verify navigation after deploy hash mismatch shows error UI not blank page
- [ ] **T1 (external validator)**: Often missing Phase 7 PHI ack gate routing — verify with regression test
- [ ] **T1**: Often missing timeout — verify `AbortController` wires through
- [ ] **T2 (OverviewStrip 9→7)**: Often missing PDF export update — verify PDF reflects new tile layout
- [ ] **W1 (handleExport)**: Often "fixed" by refactoring working code — verify failing test exists *before* the fix
- [ ] **W2 (activateCohort persist)**: Often missing the `setStored` call after probe — verify state matches localStorage
- [ ] **W3 (PATIENT_REF_CAP)**: Often missing the dedupe-vs-input-count test matrix — verify all 5 cases (a-e above)

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---|---|---|
| 1. `useAsyncRun<TState>` type leak | Phase 24 | grep consumer panels for new `as` casts; should be zero |
| 2. Wrong cancellation pattern | Phase 24 | Strict-mode test for rapid sample-size toggle; assert no late writes |
| 3. Unbounded cache Map | Phase 24 | Unit test: 5 distinct serverUrls, assert `cache.size <= 2` |
| 4. `<DrillDownShell>` god component | Phase 25 (after R5) | Props interface ≤ 6 fields; no `extras`/`children` slot |
| 5. ConnectionGatedOutlet provider timing | Phase 26 | Existing legacy-migration test passes unchanged |
| 6. Lazy route Suspense in tests | Phase 27 | All `render(<App />)` tests audited for `findBy*` conversion |
| 7. `useSyncExternalStore` infinite loop | Phase 27 (or defer to v1.5) | No "getSnapshot should be cached" console warnings |
| 8. T1 PHI gate regression | Phase 29 | Regression test asserts no `fetch` before PHI ack |
| 9. W1 working-code refactor | Phase 23 | Failing test written *before* fix; SavedCohortRow extraction preserved |
| 10. W2 probe-without-persist | Phase 23 | Test asserts both localStorage AND React state |
| 11. W3 dedupe ordering | Phase 23 | 5-case test matrix (a-e); `parsePatientRefs` returns `{refs, truncated, originalCount}` |

---

## Sources

- `.planning/PROJECT.md` (Key Decisions including Phase 7 PHI ack gate, NormalizedIssue, drill-down primitives)
- `.planning/CODE-REVIEW-2026-04-16.md` (R1-R15 findings with file:line refs)
- `.planning/v1.4-PLAN-DRAFT.md` (phase decomposition, ordering, risk callouts)
- `.planning/milestones/v1.3-MILESTONE-AUDIT.md` (W1/W2/W3 origin)
- `src/hooks/useCompletenessReport.ts:43-51,70-133` (closure cancellation rationale at lines 71-74; cache singleton at 43-51)
- `src/hooks/useResourceCounts.ts:26-29,75` (cancelledRef-with-reset pattern that contradicts useCompletenessReport's documented rationale; effect-dep allocation at line 75)
- `src/components/quality/CohortsPage.tsx:125,304-339,411-420` (SavedCohortRow extraction proves W1 isolation; .map iteration pattern)
- `src/hooks/useCohorts.ts:113-189` (addCohort probe pattern; persist helper that activateCohort doesn't yet use)
- `src/components/quality/QualityLayout.tsx:32-118` (parent-effect-before-child ordering for migration; provider mount inside connected branch)
- `src/components/quality/CohortBuilderForm.tsx:97,184` (PATIENT_REF_CAP definition and the post-dedupe length comparison that W3 calls out)
- `src/quality/QualityMetricsContext.tsx:107-173` (useMemo + useCallback patterns that survive Phase 27 split if done carefully)
