# Phase 59: Code Quality Sweep - Context

**Gathered:** 2026-05-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix 8 pre-specified backlog items across independent code surfaces. No new features, no UX changes, no new user-visible behaviour. Each fix has an exact acceptance criterion from REQUIREMENTS.md (FIX-01..08).

</domain>

<decisions>
## Implementation Decisions

### FIX-01 — BasePathContext for ReferenceLink middle-click (NAV-01)

- **D-01:** Create `src/contexts/BasePathContext.tsx` following the established PeekContext / ExpertModeContext idiom. Exports `BasePathContext` (React.createContext) and `useBasePath()` hook.
- **D-02:** Context value type is `string` — the full base path prefix (e.g. `/patients/abc123` or `/explorer`). Default value is `/'/explorer'` so all existing call sites outside ResourceDetailPage retain current behavior.
- **D-03:** Provider placed in `ResourceDetailPage.tsx`, wrapping its JSX subtree. `basePath` is already computed at line 64 (`patientId ? '/patients/${patientId}' : '/explorer'`) — the provider simply exposes that value.
- **D-04:** `ReferenceLink.tsx` calls `useBasePath()` and replaces ALL `buildExplorerHref(type, id)` calls with `` `${basePath}/${type}/${id}` ``. This covers both the regular-reference and the contained-fragment href branches. `buildExplorerHref` itself is NOT removed (still used elsewhere and as a standalone helper).

### FIX-02 — HumanReadableView extension cast (TYPE-01)

- **D-05:** Replace `(resource as unknown as Record<string, unknown>).extension as ExtensionShape[]` with `(resource as DomainResource).extension ?? []`. `DomainResource` from `@medplum/fhirtypes` has `extension?: Extension[]` — single cast is safe and TypeScript-idiomatic.

### FIX-03 — NavigationBreadcrumbs bare /patients (EDGE-01)

- **D-06:** Change `basePath.startsWith('/patients/')` to `basePath === '/patients' || basePath.startsWith('/patients/')`. This activates the patient breadcrumb for the bare `/patients` route without broadening the match to unrelated paths.

### FIX-04 — referenceChecker id validation (EDGE-02)

- **D-07:** Import `FHIR_ID_PATTERN` from `src/utils/referenceUrl.ts` (already exported). Validate each extracted resource id against the pattern before adding it to the `_id` query bucket; skip malformed ids silently (log-only, no thrown error). Do NOT redefine the pattern locally.

### FIX-05 — structuralValidator AbortSignal check (EDGE-03)

- **D-08:** Add `if (signal?.aborted) return []` as the first statement in the validator entry point. The function already accepts `signal?: AbortSignal` in its options parameter (line 50) — just needs the early-exit guard.

### FIX-06 — ConnectionContext plain-object throw (ERR-01)

- **D-09:** Change `throw { status: 0, message: 'Invalid CapabilityStatement response' }` (line 30 of `ConnectionContext.tsx`) to `throw new Error('Invalid CapabilityStatement response')`. Scope: fix ONLY the identified line 30 — no audit of other throws. `classifyError` already receives `err: unknown` so it handles `Error` instances correctly.

### FIX-07 — completenessWalker sliced-array regression test (TEST-01)

- **D-10:** Add a test in the existing `completenessWalker` test file that asserts Pitfall 4 behaviour: a path like `fieldX[0].subField` is treated at base cardinality (the walker inspects the first element only and does not error or skip). The test must fail if the slice-aware logic is removed.

### FIX-08 — $everything button icon swap (ICON-01)

- **D-11:** Replace `IconShareplay` with `IconExternalLink` for the `$everything` button in `ResourceDetailPage.tsx`. Both icons are from `@tabler/icons-react`. Remove the `IconShareplay` import if it becomes unused after the swap.

### Batching

- **D-12:** All 8 fixes are in a single plan (59-01). Execution commits one fix at a time (atomic per-fix commits) for clean git history and easy bisect, but they are planned and verified together.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §Code Quality Fixes — FIX-01..08 acceptance criteria (exact before/after behaviour for each fix)

### Source Files (one per fix)
- `src/components/explorer/ReferenceLink.tsx` — FIX-01 target; `buildExplorerHref` calls to replace
- `src/components/explorer/HumanReadableView.tsx` — FIX-02 target; line 62 double-cast
- `src/components/explorer/NavigationBreadcrumbs.tsx` — FIX-03 target; line 35 startsWith check
- `src/quality/referenceChecker.ts` — FIX-04 target; id bucket insertion site
- `src/quality/structuralValidator.ts` — FIX-05 target; function entry point
- `src/contexts/ConnectionContext.tsx` — FIX-06 target; line 30 throw
- `src/quality/completenessWalker.ts` — FIX-07 subject; Pitfall 4 comment at line 61 region
- `src/components/explorer/ResourceDetailPage.tsx` — FIX-08 target; `$everything` button + FIX-01 Provider placement

### Shared Utilities
- `src/utils/referenceUrl.ts` — exports `FHIR_ID_PATTERN` (FIX-04 import source) and `buildExplorerHref` (FIX-01 partial replacement)
- `src/contexts/PeekContext.tsx` — established context pattern; BasePathContext (FIX-01) mirrors this structure

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `BasePathContext` (FIX-01): Does NOT exist yet — must be created at `src/contexts/BasePathContext.tsx`. Pattern: `createContext('/explorer')` + named `useBasePath()` hook. Mirrors `ExpertModeContext.tsx`.
- `FHIR_ID_PATTERN` from `referenceUrl.ts`: Already exported; FIX-04 imports from there. Same pattern defined locally in `ResourceDetailPage.tsx:26` and `ResourceGraphNode.tsx:26` (those duplicates are out of scope for this phase).
- `DomainResource` from `@medplum/fhirtypes`: Has `extension?: Extension[]` — correct type for FIX-02 cast target.

### Established Patterns
- Context provider placement: providers wrap JSX subtrees at the narrowest correct scope (PeekContext wraps the app-level drawer; ExpertModeContext is app-level; BasePathContext goes in ResourceDetailPage since basePath is local to that component).
- Error throwing: `new Error(message)` is the established pattern throughout the codebase (`ConnectionContext.tsx:58` already uses `new Error`). Line 30 is the lone outlier.
- AbortSignal guard: Phase 49 `useGraphBfs.ts` uses a cancellation-flag pattern; FIX-05 uses the simpler `signal?.aborted` early-exit because `structuralValidator` is synchronous.

### Integration Points
- `ResourceDetailPage.tsx` is the provider host for FIX-01 — `basePath` is computed at line 64; JSX subtree starts at its return statement.
- `ReferenceLink.tsx` is a leaf component — it consumes context; no children need BasePathContext.
- `completenessWalker.ts` test file: check `src/quality/__tests__/completenessWalker.test.ts` (or equivalent path) for where to add the FIX-07 regression test.

</code_context>

<specifics>
## Specific Ideas

- FIX-01 href format in patient scope: `/patients/${patientId}/${type}/${id}` — matches the pattern used in `ResourceGraphNode.tsx:51-52` (`navigate(\`/patients/${patientId}/${type}/${id}\`)`).
- FIX-03 exact check: `basePath === '/patients' || basePath.startsWith('/patients/')` — not `basePath.startsWith('/patients')` (would over-match hypothetical `/patients-admin` paths).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 59-code-quality-sweep*
*Context gathered: 2026-05-11*
