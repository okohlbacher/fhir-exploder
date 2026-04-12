---
phase: 04-terminology-resolution
verified: 2026-04-12T10:00:00Z
status: human_needed
score: 10/10 must-haves verified
overrides_applied: 0
---

# Phase 4: Terminology Resolution Verification Report

**Phase Goal:** CodeableConcept values throughout the app display human-readable terms (e.g., "Diabetes mellitus Typ 2" instead of "E11.9") resolved from the MII Terminology Server, with graceful degradation.

**Verified:** 2026-04-12T10:00:00Z
**Status:** human_needed (all automated checks pass; live-server UX needs human smoke test)
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth                                                                                                                      | Status     | Evidence                                                                                                                                                |
| --- | -------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | CodeableConcept fields in detail views display resolved display values from the terminology server instead of raw codes    | VERIFIED   | `useResolvedResource` wraps `HumanReadableView` + `ClinicalRawView` left panel; `TerminologyResolver.resolveResource` populates Coding.display; V-04/V-05 tests pass |
| 2   | Previously resolved terminology values load instantly from cache without additional server requests                        | VERIFIED   | `TerminologyCache` LRU (10K mem) + localStorage mirror (2K); `TerminologyResolver.lookupDisplay` checks cache before fetch; inflight dedup map; V-06/V-07/V-08 tests pass |
| 3   | When the terminology server is unavailable or a code cannot be resolved, the app displays the raw code without errors or broken UI | VERIFIED   | `TerminologyResolver.fetchLookup` try/catch returns null + negative cache on ANY failure; `useResolvedResource` belt-and-braces `.catch()`; V-11/V-12/V-14 tests pass |

**Score:** 3/3 roadmap success criteria verified.

### Required Artifacts

| Artifact                                               | Expected                              | Status   | Details                                                                     |
| ------------------------------------------------------ | ------------------------------------- | -------- | --------------------------------------------------------------------------- |
| `public/settings.yaml`                                 | terminology.serverUrl = Ontoserver    | VERIFIED | Line 12: `serverUrl: "https://r4.ontoserver.csiro.au/fhir"` uncommented; MII URL commented with mTLS note (line 17) |
| `src/terminology/types.ts`                             | TerminologyHealth + CacheEntry + ResolverOptions | VERIFIED | All three types exported (17 lines)                                         |
| `src/terminology/terminologyClient.ts`                 | createTerminologyClient factory       | VERIFIED | Returns `MedplumClient | null`; baseUrl/fhirUrlPath split correct            |
| `src/terminology/probe.ts`                             | probeTerminologyHealth                | VERIFIED | 3s default timeout; `AbortSignal.timeout` + `AbortController` fallback; never throws |
| `src/terminology/terminologyKey.ts`                    | makeTerminologyKey + LOCAL_STORAGE_PREFIX | VERIFIED | Format `{serverUrl}|{system}|{code}`; prefix `tx-cache:v1:`                |
| `src/terminology/TerminologyCache.ts`                  | LRU class with MEMORY_LIMIT=10_000, LOCAL_STORAGE_LIMIT=2_000 | VERIFIED | Constants present; `get`/`set`/`clear`/`size`; server-URL namespaced hydration |
| `src/terminology/TerminologyResolver.ts`               | resolveCoding / resolveCodeableConcept / resolveResource / lookupDisplay + extractDisplay | VERIFIED | Full API; inflight dedup; positive (Infinity TTL) + negative (5 min TTL) cache |
| `src/terminology/walker.ts`                            | collectCodings depth-first            | VERIFIED | Yields any object with `system: string` AND `code: string`; no skip list    |
| `src/terminology/statusConfig.ts`                      | Shared TERMINOLOGY_STATUS_CONFIG      | VERIFIED | Exact UI-SPEC hex tokens + labels                                           |
| `src/contexts/TerminologyContext.tsx`                  | TerminologyProvider + context         | VERIFIED | Memo key = JSON.stringify(settings?.terminology); no eslint-disable         |
| `src/hooks/useTerminology.ts`                          | Hook throws outside provider          | VERIFIED | Throws with message `useTerminology must be used within a TerminologyProvider` |
| `src/hooks/useTerminologyHealth.ts`                    | Health hook driven by probe           | VERIFIED | Re-probes on serverUrl change; resets to 'unknown'                          |
| `src/hooks/useResolvedResource.ts`                     | Progressive enhancement hook          | VERIFIED | Sync raw return, async enrich, cancelled flag on unmount; no Loader/Skeleton |
| `src/components/explorer/HumanReadableView.tsx`        | Wrapped with useResolvedResource      | VERIFIED | `const resolved = useResolvedResource(resource); <ResourceTable value={resolved ?? resource} />` |
| `src/components/explorer/ClinicalRawView.tsx`          | Left panel wrapped, right panel raw   | VERIFIED | Left: `resolved ?? resource`; right: `data={resource}` (wire format)        |
| `src/components/layout/Sidebar.tsx`                    | Two-row status block                  | VERIFIED | Two `<Group gap="xs">` inside `<Stack gap="xs" mt="xs">`; FHIR + terminology rows; `useTerminologyHealth` consumed |
| `src/components/settings/SettingsPage.tsx`             | Terminology Server Paper + Clear button | VERIFIED | `<Title order={3}>Terminology Server</Title>`, `IconTrash`, `variant="light" color="red"`, `resolver.cache.clear()`, notifications.show |
| `src/App.tsx`                                          | TerminologyProvider wraps Routes      | VERIFIED | `ConnectionProvider > AppRoutes > TerminologyProvider > Routes` (locked nesting) |
| `src/__tests__/terminology-health.test.ts`             | 4 tests (V-15 probe layer)            | VERIFIED | 4 tests present, all green                                                  |
| `src/__tests__/terminology-cache.test.ts`              | 5+ tests (V-06/V-08/V-10 + eviction + clear) | VERIFIED | 9 tests present, all green                                                  |
| `src/__tests__/terminology-resolver.test.ts`           | Full V-01..V-13 coverage              | VERIFIED | 18 tests present, all green                                                 |
| `src/__tests__/terminology-context.test.tsx`           | Provider + hook tests                 | VERIFIED | 3 tests present; expected throw-logs during "outside provider" test         |
| `src/__tests__/resolved-resource.test.tsx`             | V-04 hook enrichment                  | VERIFIED | 4 tests present, all green                                                  |
| `src/__tests__/human-readable-view-terminology.test.tsx` | V-05 + V-14                         | VERIFIED | 2 tests present (renders resolved display, fallback to code), both green   |
| `src/__tests__/sidebar-terminology-row.test.tsx`       | V-15 UI assertion                     | VERIFIED | 4 tests (one per health state), all green                                   |
| `src/__tests__/settings-clear-cache.test.tsx`          | V-09 integration                      | VERIFIED | 2 tests (cache wipe + empty no-op), both green                              |
| `src/__tests__/fixtures/terminology.ts`                | mockMedplumClientForTerminology       | VERIFIED | Predicate-map API (metadataReachable, lookupResponses, errors)              |

### Key Link Verification

| From                                               | To                                           | Via                                              | Status | Details                                                              |
| -------------------------------------------------- | -------------------------------------------- | ------------------------------------------------ | ------ | -------------------------------------------------------------------- |
| `src/config/settings.ts`                           | AppSettings.terminology.serverUrl            | `deepMerge` + DEFAULTS.terminology               | WIRED  | `DEFAULTS.terminology.serverUrl = 'https://r4.ontoserver.csiro.au/fhir'`; deepMerge validates string type |
| `src/terminology/terminologyClient.ts`             | `@medplum/core` MedplumClient                | `new MedplumClient({ baseUrl, fhirUrlPath })`    | WIRED  | Constructs client with baseUrl/fhirUrlPath split                      |
| `src/terminology/TerminologyCache.ts`              | `window.localStorage`                        | setItem/getItem/removeItem under `tx-cache:v1:`  | WIRED  | Verified read/write/clear paths in TerminologyCache.ts lines 75-127  |
| `src/terminology/TerminologyCache.ts`              | `src/terminology/types.ts` TerminologyCacheEntry | `import type { TerminologyCacheEntry } from './types'` | WIRED  | No inline duplicate                                                  |
| `src/terminology/TerminologyResolver.ts`           | `src/terminology/TerminologyCache.ts`        | `this.cache.get/set` per lookup                  | WIRED  | Constructor instantiates TerminologyCache; lookupDisplay reads + writes cache |
| `src/terminology/TerminologyResolver.ts`           | `MedplumClient.get('CodeSystem/$lookup?...')` | `this.client.get`                                | WIRED  | Line 143-146: `client.get<Parameters>(`CodeSystem/$lookup?...`)`      |
| `src/contexts/TerminologyContext.tsx`              | `src/hooks/useTerminology.ts`                | shared module export of TerminologyContext       | WIRED  | useTerminology imports TerminologyContext from the same module        |
| `src/components/explorer/HumanReadableView.tsx`    | `src/hooks/useResolvedResource.ts`           | `const resolved = useResolvedResource(resource)` | WIRED  | Line 23; passes `resolved ?? resource` to ResourceTable               |
| `src/components/explorer/ClinicalRawView.tsx`      | `src/hooks/useResolvedResource.ts`           | left panel uses resolved; right panel raw        | WIRED  | Lines 23, 28 (left), 33 (right, raw)                                  |
| `src/App.tsx`                                      | `src/contexts/TerminologyContext.tsx`        | `<TerminologyProvider settings={settings}>`      | WIRED  | Line 14 (import), line 35 (JSX open), wraps all Routes                |
| `src/components/layout/Sidebar.tsx`                | `src/hooks/useTerminologyHealth.ts`          | `const termHealth = useTerminologyHealth()`      | WIRED  | Line 9 (import), line 37 (invocation)                                 |
| `src/hooks/useTerminologyHealth.ts`                | `src/terminology/probe.ts`                   | `probeTerminologyHealth(client)`                 | WIRED  | Line 4 (import), line 31 (invocation)                                 |
| `src/components/settings/SettingsPage.tsx`         | `src/hooks/useTerminology.ts` + cache.clear() | onClick → `resolver.cache.clear()` + notifications.show | WIRED  | Lines 20, 25-26, 33-37                                                |

### Data-Flow Trace (Level 4)

| Artifact                              | Data Variable | Source                                      | Produces Real Data | Status   |
| ------------------------------------- | ------------- | ------------------------------------------- | ------------------ | -------- |
| `HumanReadableView`                   | `resolved`    | `useResolvedResource(resource)` → `resolver.resolveResource(resource)` → `client.get('CodeSystem/$lookup?...')` | Yes — real MedplumClient bound to settings.terminology.serverUrl | FLOWING  |
| `ClinicalRawView` left panel          | `resolved`    | Same as above                               | Yes                | FLOWING  |
| `Sidebar` terminology row             | `termHealth`  | `useTerminologyHealth()` → `probeTerminologyHealth(createTerminologyClient(settings))` | Yes — probes live metadata endpoint | FLOWING  |
| `SettingsPage` Terminology section    | `settings.terminology.serverUrl` + `termStatus` | `settings` prop from `useSettings()` (reads public/settings.yaml) + `useTerminologyHealth` | Yes | FLOWING  |
| `SettingsPage` Clear button           | `resolver.cache` | `useTerminology()` → provider's TerminologyResolver instance | Yes — synchronous cache size + clear | FLOWING  |

### Behavioral Spot-Checks

| Behavior                                                              | Command                                                                    | Result                                             | Status |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------- | ------ |
| All 8 Phase 4 test files pass                                         | `npm test -- --run src/__tests__/terminology-*.test.* src/__tests__/resolved-resource.test.tsx src/__tests__/human-readable-view-terminology.test.tsx src/__tests__/sidebar-terminology-row.test.tsx src/__tests__/settings-clear-cache.test.tsx` | 8 files, 46 tests, 0 failures                      | PASS   |
| Full suite has no regressions                                         | `npm test -- --run`                                                        | 24 files passed + 3 skipped, 170 tests passed + 22 todo, 0 failures | PASS   |
| Resolver issues $lookup call                                          | grep `CodeSystem/\$lookup` in src/terminology/TerminologyResolver.ts       | Found at line 144 (real call) + test paths         | PASS   |
| No TODOs/stubs/placeholders in terminology subsystem                  | grep `TODO|FIXME|placeholder|coming soon` in src/terminology/              | No matches                                         | PASS   |
| No Loader/Skeleton in detail views (progressive enhancement)          | grep `Loader|Skeleton` in HumanReadableView.tsx                            | No matches                                         | PASS   |
| useResolvedResource used in exactly the expected views                | grep `useResolvedResource` in src/                                         | 5 files: hook + 2 views + 2 tests (matches D-09 scope) | PASS |
| TerminologyProvider wired in App.tsx                                  | grep `TerminologyProvider` in src/App.tsx                                  | 2 occurrences (import + JSX)                       | PASS   |

### Requirements Coverage

| Requirement | Source Plans       | Description                                                                 | Status    | Evidence                                                                  |
| ----------- | ------------------ | --------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------- |
| TERM-01     | 04-01, 04-03, 04-04 | App resolves CodeableConcept display values by querying the terminology server ($lookup, $translate) | SATISFIED | `TerminologyResolver.fetchLookup` issues `CodeSystem/$lookup?...&displayLanguage=de`; `useResolvedResource` wires detail views; V-01/V-02/V-03/V-04/V-05 tests green |
| TERM-02     | 04-02, 04-03, 04-05 | Resolved terminology display values are cached to avoid redundant server requests | SATISFIED | `TerminologyCache` LRU (10K mem) + localStorage mirror (2K); inflight dedup Map; Settings Clear button atomic wipe; V-06/V-07/V-08/V-09/V-10 tests green |
| TERM-03     | 04-03, 04-04, 04-05 | App falls back gracefully to raw code values when the terminology server is unavailable or a code cannot be resolved | SATISFIED | Every resolver path is non-throwing (try/catch + negative cache); `useResolvedResource` belt-and-braces `.catch()`; Sidebar shows "Unreachable"; V-11/V-12/V-14/V-15 tests green |

No orphaned requirements detected — all three TERM IDs from REQUIREMENTS.md are claimed by at least one plan.

### Anti-Patterns Found

| File                                  | Line | Pattern                | Severity | Impact |
| ------------------------------------- | ---- | ---------------------- | -------- | ------ |
| (none)                                | —    | —                      | —        | —      |

Scanned all 18 Phase 4 source files and all 8 Phase 4 test files. No TODOs, no FIXMEs, no placeholders, no empty handlers, no Loader/Skeleton violations, no stub returns, no `return null` / `return []` shortcuts outside the documented short-circuit paths.

### Human Verification Required

Automated checks all pass, but three aspects of Phase 4 can only be confirmed against a live terminology server. The following should be verified by the developer before marking the phase complete:

#### 1. End-to-end terminology resolution against Ontoserver

**Test:** Run `npm run dev`, connect to a Blaze server with at least one Condition resource containing an ICD-10 or SNOMED CT `Coding` (no `display` set). Open the Condition detail page in `HumanReadableView` mode.
**Expected:** The table first renders the raw code (e.g., `E11.9`), then within ~1-3 seconds re-renders with the German display (e.g., `Diabetes mellitus, Typ 2 : Ohne Komplikationen`) resolved via Ontoserver's `$lookup`. No loader or skeleton, no layout shift.
**Why human:** The progressive-enhancement swap, the German designation, and the absence of visual glitch are all DOM/render-timing behaviors that require a running browser + live network.

#### 2. Sidebar terminology health indicator with real network

**Test:** Run `npm run dev`. Observe the sidebar status block. Toggle `settings.yaml` between a reachable terminology URL, an unreachable one (e.g., `http://localhost:9999/fhir`), and an empty/missing URL. Reload after each change.
**Expected:** Dot color + label match: reachable → green `Terminology: Reachable`; unreachable → red `Terminology: Unreachable` (within ~3s timeout); empty → gray `Terminology: Not configured`; while probing → gray pulsing `Terminology: Checking…`.
**Why human:** The 3-second timeout, the pulsing animation, and the color transitions are visual + timing behaviors jsdom cannot faithfully simulate.

#### 3. Clear terminology cache UX

**Test:** Run `npm run dev`. Visit several Condition/Observation detail pages so the cache fills. Open DevTools → Application → Local Storage; confirm keys prefixed `tx-cache:v1:` exist. Navigate to Settings, click "Clear terminology cache".
**Expected:** Mantine green toast appears with title "Cache cleared" and body like "N cached terms removed from memory and local storage." DevTools localStorage shows zero `tx-cache:v1:` keys. Re-visiting a previously resolved page triggers fresh `$lookup` calls (visible in Network tab).
**Why human:** Toast display + DevTools inspection + network-tab behavior require a running browser.

### Gaps Summary

No gaps detected. All 10 must-haves (3 roadmap success criteria + 7 plan-frontmatter-derived truths) are verified, all 26 artifacts pass the three-level checks (exists + substantive + wired), all 13 key links are wired, data flows real through every consumer, and the full 170-test suite is green with zero regressions.

The phase status is `human_needed` rather than `passed` only because the progressive-enhancement swap, the sidebar health indicator's visual animation, and the clear-cache toast UX are live-browser behaviors that require one-time human smoke verification before the phase can be declared fully complete.

---

_Verified: 2026-04-12T10:00:00Z_
_Verifier: Claude (gsd-verifier)_
