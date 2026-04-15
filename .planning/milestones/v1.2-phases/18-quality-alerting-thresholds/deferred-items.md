# Phase 18 — Deferred Items

Out-of-scope discoveries logged while executing plans. Not fixed — these predate Phase 18 work and belong to future tech-debt clean-up.

## Pre-existing TypeScript strict-mode violations (discovered during 18-01)

**Source:** `npx tsc -b --noEmit` run against the codebase before any Plan 18 changes (confirmed via `git stash` roundtrip on 2026-04-14).

**Files:**
- `src/quality/completenessWalker.ts:107` — `TS2352` Resource -> Record<string, unknown> cast unsafe for VisionPrescription
- `src/quality/profileConformanceChecker.ts:139,142,143,144,147,296` — same TS2352 for ElementDefinition and Resource casts
- `src/quality/temporalPlausibilityWalker.ts:439` — same TS2352 for Resource cast

**Impact:** Does NOT break the build (tsc exits 0 for the `-b --noEmit` flow under the project's current config; errors are reported but not fatal). Does NOT affect runtime behavior. Plan 18 files compile cleanly on their own.

**Recommendation:** Open a tech-debt ticket (DEBT-03) to replace these unsafe casts with `as unknown as Record<string, unknown>` per TypeScript's suggested pattern. Out of scope for Phase 18 (alerting/thresholds feature).

## Pre-existing quality-overview test failure (discovered during 18-03)

**Source:** `npx vitest run src/__tests__/quality-overview.test.tsx` on base commit `7b6d681` (confirmed via `git stash` roundtrip on 2026-04-14 during Plan 18-03 Task 2).

**Failure:** `expect(screen.getByRole('link', { name: 'Observation' })).toBeDefined()` at line 194 — unable to find link with accessible name "Observation". 10/11 tests pass; this is a single failure unrelated to Plan 18 changes.

**Impact:** Pre-existing flake in `ResourceCountsPanel` row rendering / mock data. Does NOT block Plan 18 work. SummaryCard extension does not consume or affect this panel.

**Recommendation:** Triage under DEBT-04 (test suite hygiene) alongside any other known-flaky tests. Out of scope for Phase 18.

## Connection state lost on page reload / direct-URL navigation (discovered during 18 UAT Test 10)

**Source:** Manual UAT 2026-04-14, Test 10 ("Direct URL with ?tab= selects the right tab"). User reported: "That lands on 'server not connected'."

**Root cause:** `src/contexts/ConnectionContext.tsx` initializes to `{ status: 'idle' }` on every mount. No `useEffect` auto-connects from persisted settings; the MedplumClient + CapabilityStatement live in in-memory React state only. All three route subtrees (`/quality/*`, `/explorer/*`, `/patients/*`) gate rendering on `state.status === 'connected'` (see `QualityLayout.tsx`, `ExplorerLayout.tsx`, `PatientsLayout.tsx` — all render a "Not connected" Alert when not connected). Result: any cold-start deep URL into these routes (bookmarks, pasted links, refresh) shows the alert until the user manually navigates to `/` and clicks Connect.

**Impact:** Cross-cutting limitation affecting ALL gated routes, not specific to Phase 18. The Phase 18 tab-routing code (`useSearchParams()` → `activeTab` in `QualityOverviewPage.tsx`) is correct and was proven end-to-end by Test 9 (in-session click navigation). Test 10 could not exercise it because the upstream connection gate blocked access.

**Recommendation:** Open a dedicated phase for connection persistence/auto-reconnect (localStorage hydration of minimal connection metadata, silent re-issue of the `metadata` probe on app boot, stale-TTL handling, error recovery when the server is unreachable on restart). Out of scope for Phase 18 (alerting/thresholds feature). Phase 18 UAT Test 10 waived as "blocked by pre-existing DEBT, not a phase regression".

