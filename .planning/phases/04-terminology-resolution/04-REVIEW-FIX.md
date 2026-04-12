---
phase: 04-terminology-resolution
fixed_at: 2026-04-12T11:40:35Z
review_path: .planning/phases/04-terminology-resolution/04-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase 4: Code Review Fix Report

**Fixed at:** 2026-04-12T11:40:35Z
**Source review:** .planning/phases/04-terminology-resolution/04-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 5 (1 Critical + 4 Warnings)
- Fixed: 5
- Skipped: 0
- Full test suite after fixes: 286 passed / 22 todo / 3 skipped (target: 280+)

## Fixed Issues

### CR-01: `createTerminologyClient` throws on malformed URL, crashes provider tree

**Files modified:** `src/terminology/terminologyClient.ts`, `src/__tests__/terminology-client.test.ts`
**Commit:** 914cc46
**Applied fix:** Wrapped `new URL(url)` in try/catch; on parse failure returns `null` so the `TerminologyProvider` and `useTerminologyHealth` fall into the "not-configured" branch instead of crashing the app render. Also added a protocol guard (`http:` / `https:` only) because strings like `localhost:8080` parse as a URL with protocol `localhost:` but cause `MedplumClient` to throw downstream. Added a dedicated test file `src/__tests__/terminology-client.test.ts` with 6 cases covering absent/empty/whitespace/invalid-string/missing-scheme/well-formed inputs.

### WR-01: `probe.ts` fallback path leaks a `setTimeout` handle

**Files modified:** `src/terminology/probe.ts`
**Commit:** 34b37e1
**Applied fix:** Refactored `buildTimeoutSignal` to return `{ signal, cancel }`. `probeTerminologyHealth` now calls `cancel()` in a `finally` block, which `clearTimeout`s the fallback handle regardless of whether the request succeeded, failed, or the signal fired first. The native `AbortSignal.timeout` path returns a no-op `cancel` since the browser owns the timer there.

### WR-02: `useTerminologyHealth` constructs a second MedplumClient every effect run

**Files modified:** `src/hooks/useTerminologyHealth.ts`, `src/terminology/TerminologyResolver.ts`
**Commit:** a09c520
**Applied fix:** Exposed `TerminologyResolver.client` as a `readonly` public field so `useTerminologyHealth` can reuse the resolver's existing `MedplumClient` for probes instead of calling `createTerminologyClient(settings)` on every effect run. Removed the `useSettings` coupling from the hook; it now depends only on the resolver identity (which already changes when `settings.terminology` changes because the provider rebuilds the resolver on that key). This also removes the duplicate `new URL(...)` parse that was a second exposure point for CR-01.

### WR-03: `useResolvedResource` flashes stale resource on navigation

**Files modified:** `src/hooks/useResolvedResource.ts`
**Commit:** d6293e0
**Applied fix:** Used the React "derived-state-from-props" idiom: track `lastInput` alongside `resolved`, and when the incoming `resource` reference differs from `lastInput`, call `setResolved(resource)` / `setLastInput(resource)` during render so the reset takes effect in the same commit as the prop change. The hook returns the new `resource` directly during that transitional render (since `resolved` still holds the stale reference until the next render cycle). All 4 existing `useResolvedResource` tests still pass.

**Note: requires human verification.** The "derived-state-from-props" pattern has subtle correctness considerations (it triggers an extra render when input changes, relies on React's same-state short-circuit for identical inputs). Manual QA during navigation between detail pages is recommended to confirm the one-frame stale flash is gone.

### WR-04: `TerminologyResolver.resolveResource` double-walks and deep-clones unnecessarily

**Files modified:** `src/terminology/TerminologyResolver.ts`
**Commit:** ca0f162
**Applied fix:** First-pass now captures the resolved display strings into a local `displays` array (parallel to the `codings` array) via `lookupDisplay`. Replaced `JSON.parse(JSON.stringify(resource))` with `structuredClone(resource)` — faster, preserves `undefined`/Date/typed arrays. Second pass patches `display` directly from the local `displays` array instead of re-reading from the cache, which closes the race window where a concurrent `cache.clear()` could wipe the lookups between the first-pass `Promise.all` and the cache-read pass. All 20 resolver tests still pass.

---

_Fixed: 2026-04-12T11:40:35Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
