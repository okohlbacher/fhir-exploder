---
phase: 21-interactive-cohort-builder-rename
plan: "21-03"
subsystem: quality-sampling
tags: [sampling, fhir-query, patient-scoping, get-post-cutover, wave-1]

# Dependency graph
requires:
  - phase: 21-interactive-cohort-builder-rename
    plan: "21-01"
    provides: "Wave 0 skip-stub test file with 4 it.skip() names locked to VALIDATION.md -t filters for CHRT-03"
  - phase: 21-interactive-cohort-builder-rename
    plan: "21-02"
    provides: "resolveCohort(client, cohort) async resolver whose output (Patient-ID string[]) is the 4th argument this plan introduces"
provides:
  - "sampleResources(client, type, size, patientIds?) — backward-compatible 4-arg form routing through GET for ≤40 IDs, POST /_search for larger cohorts, _id= for Patient type"
  - "SHORT_QUERY_THRESHOLD = 40 exported constant (URL-length cutover boundary)"
  - "5 GREEN scoping tests + 3 GREEN helper tests (threshold boundary, Patient long POST, POST return shape)"
affects: [21-06-dashboard-wiring]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "FHIR R4 `search via POST` fallback with `application/x-www-form-urlencoded` body (spec escape hatch for URL-length ceiling; https://hl7.org/fhir/R4/search.html §search via POST)"
    - "Dual scope-param branching — non-Patient types use `patient=Patient/id,...`; Patient type uses `_id=id,...` (Pitfall 4 — `patient=` is not a valid Patient search param)"
    - "Defensive empty-array no-op — `patientIds.length === 0` treated identically to undefined (Pitfall 8)"
    - "URLSearchParams for POST body construction — automatic URL-encoding, no string concatenation into the URL path (threat T-21-07 mitigation)"

key-files:
  created: []
  modified:
    - src/quality/sampling.ts
    - src/quality/sampling.test.ts

# Requirements satisfied
requirements-satisfied:
  - id: CHRT-03
    how: "sampleResources gains optional 4th parameter `patientIds?: string[]`; for ≤40 IDs it adds `patient=` (or `_id=` for Patient) to the existing GET searchResources call; for >40 IDs it POSTs `<Type>/_search` with a URLSearchParams-encoded body. 3-arg callers (all 7 existing panel hooks) keep identical behavior — zero call-site changes required. Plan 21-06 will thread `patientIds` through the hook layer to activate scoping at the dashboard level."
    evidence: "src/quality/sampling.test.ts 'short GET', 'long POST', 'Patient uses _id', 'empty array', 'backward-compatible' — all 8 tests GREEN"

# Validation
validation:
  test-filters:
    - "short GET"
    - "long POST"
    - "Patient uses _id"
    - "empty array"
    - "backward-compatible"
  test-runs:
    - cmd: "npx vitest run src/quality/sampling.test.ts"
      result: "8 passed | 0 skipped | 0 failed (8 total)"
    - cmd: "npx vitest run src/quality/sampling.test.ts -t 'short GET'"
      result: "2 passed | 6 skipped"
    - cmd: "npx vitest run src/quality/sampling.test.ts -t 'long POST'"
      result: "3 passed | 5 skipped"
    - cmd: "npx vitest run src/quality/sampling.test.ts -t 'Patient uses _id'"
      result: "1 passed | 7 skipped"
    - cmd: "npx vitest run src/quality/sampling.test.ts -t 'empty array'"
      result: "1 passed | 7 skipped"
    - cmd: "npm test"
      result: "563 passed | 7 skipped | 22 todo | 21 failed — identical to baseline pre-21-03 (all 21 failures are pre-existing, unrelated to sampling)"
---

# Plan 21-03 Summary — Sampling Scope (GET/POST cutover)

## What was built

A single-file, test-first evolution of the quality subsystem's only
panel-wide chokepoint. `src/quality/sampling.ts` grew from an 18-line,
3-argument stub into a 60-line, 4-argument scoped sampler — without
touching any of the 7 existing panel hook call sites.

### `src/quality/sampling.ts` — evolved signature

```ts
export const SHORT_QUERY_THRESHOLD = 40;

export async function sampleResources(
  client: MedplumClient,
  resourceType: string,
  sampleSize: number,
  patientIds?: string[],       // NEW
): Promise<Resource[]>
```

Decision tree (in order):

1. **No cohort** (`!patientIds || patientIds.length === 0`) → identical to
   the legacy 3-arg form: `client.searchResources(type, { _count })`.
   Rest of the function is skipped.
2. **Scope-param selection**: `resourceType === 'Patient'` → `_id` (bare
   IDs, no `Patient/` prefix). Otherwise → `patient=Patient/id1,Patient/id2,...`
   (Medplum's array-of-references convention; Pitfall 4).
3. **Short query** (`patientIds.length ≤ 40`) → same GET path as legacy,
   with scope param appended to the params object. Medplum's internal
   URLSearchParams serializer owns URL construction (T-21-07 injection
   mitigation).
4. **Long query** (`patientIds.length > 40`) → `client.post(fhirUrl,
   body, 'application/x-www-form-urlencoded')` where `body` is built via
   `new URLSearchParams({...}).toString()` (auto-encodes `/` as `%2F`,
   `,` as `%2C`). Response is a `Bundle<Resource>` unwrapped to match
   the GET-path `Resource[]` shape (`bundle.entry.map(e => e.resource)
   .filter(Boolean)`).

The **40-ID threshold** is sized to keep the URL well under Jetty's 8KB
default (40 × ~44-char Patient refs + overhead ≈ 1.9KB — generous margin).
Above the threshold, the FHIR R4 `search via POST` endpoint (spec-sanctioned
at https://hl7.org/fhir/R4/search.html) is the escape hatch. This is
threat T-21-08 (DoS via URL length) mitigation.

### `src/quality/sampling.test.ts` — 8 tests

Un-skipped the 4 Wave 0 stubs seeded by Plan 21-01 and added 4 more for
boundary / return-shape coverage:

| Test name | Asserts |
|-----------|---------|
| `short GET: ≤40 patient IDs uses ?patient= query param` | `searchResources` called with `patient: 'Patient/p1,Patient/p2,Patient/p3'` (no POST) |
| `short GET: exactly 40 patient IDs still uses GET (threshold boundary)` | Length-40 still takes the GET path |
| `long POST: >40 patient IDs uses POST /_search form body` | `post` called with URL `.../Observation/_search`, form-urlencoded body `patient=Patient%2Fp0%2CPatient%2Fp1...`, correct content-type |
| `Patient uses _id not patient param` | For `resourceType === 'Patient'`, params contain `_id: 'p1,p2'` and no `patient` key |
| `Patient long POST uses _id in form body` | POST body has `_id=pat0` and no `patient=` |
| `empty array equivalent to no scoping` | Params === `{ _count: '50' }` exactly (no `patient`, no `_id`) |
| `backward-compatible: 3-arg form unchanged` | Legacy call identical to pre-plan behavior |
| `long POST returns bundle.entry resources (matches GET shape)` | `Bundle<Resource>` → `Resource[]` unwrap works |

Mock shape mirrors `src/quality/__tests__/pdfExport.test.ts` — a plain
object with `vi.fn()` for `searchResources`, `post`, and `fhirUrl` cast
through `as unknown as MedplumClient`.

## Commits

- `435b42a` test(21-03): activate sampling patientIds tests (short GET, long POST, Patient _id, empty array, backcompat)
- `32ea08a` feat(21-03): add patientIds to sampleResources with GET/POST cutover at 40 IDs
- `882758f` fix(21-03): satisfy strict TS for Bundle<Resource> test fixtures

## Test results

```
$ npx vitest run src/quality/sampling.test.ts

 Test Files  1 passed (1)
      Tests  8 passed (8)
   Duration  374ms
```

Full suite (`npm test`):
```
Tests  21 failed | 563 passed | 7 skipped | 22 todo (613)
```

The 21 failing tests are **pre-existing and unrelated** to Plan 21-03 — a
spot-check stashing our changes reproduced the exact same 21 failures from
the baseline at commit `86c02ea` (end of Plan 21-02). Failing files:
`patient-list`, `patient-detail`, `patient-view-toggle`,
`human-readable-view-terminology`, `sidebar-terminology-row`,
`quality-overview`, `resource-type-landing-counts`,
`terminology-health` — none touch `sampleResources` or the 7 panel hooks.

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 3 — Blocking] Strict TS on test fixtures**

- **Found during:** `npm run build` after committing RED + GREEN.
- **Issue:** `@medplum/fhirtypes`'s `Bundle<Resource>` requires
  `resourceType` and `type` fields; `Observation` requires `status` and
  `code`. The plan-provided mock stub
  `{ entry: [] } satisfies Bundle<Resource>` did not type-check.
- **Fix:** Extracted `emptyBundle()` and `bundleWith(resources)` helpers
  that return fully-populated `Bundle<Resource>` objects. Upgraded
  `fakeResources` to `Observation[]` with `status: 'final'` and
  `code: { text: 'test' }`.
- **Files modified:** `src/quality/sampling.test.ts` (types only; runtime
  behaviour unchanged).
- **Commit:** `882758f`

**2. [Test-correctness correction] `long POST` assertion substring mismatch**

- **Found during:** First GREEN run — test failed with "expected body to
  contain 'patient=Patient%2Fp1'" but received
  `patient=Patient%2Fp0%2CPatient%2Fp1...`.
- **Issue:** The plan's literal assertion
  `expect.stringContaining('patient=Patient%2Fp1')` only works if `p1` is
  the first ID. In our test fixture (`Array.from({length:41}, (_,i) => 'p'+i)`)
  the first ID is `p0`, so `patient=` is followed by `Patient%2Fp0`,
  not `Patient%2Fp1`.
- **Fix:** Asserted `patient=Patient%2Fp0` (correct first-ID placement)
  plus `%2CPatient%2Fp1` and `%2CPatient%2Fp40` (mid + last IDs via
  comma-separator). This is a stricter, correct assertion of the URL-
  encoded form-body shape.
- **Files modified:** `src/quality/sampling.test.ts`.
- **Commit:** folded into `32ea08a` (same commit as GREEN).

## Deferred Issues (out of scope per deviation-rules scope boundary)

**Pre-existing `tsc -b` errors in unrelated files:**

```
src/__tests__/completeness-walker.test.ts(216,77): TS2304: Cannot find name 'Resource'.
src/__tests__/completeness-walker.test.ts(230,100): TS2304: Cannot find name 'Resource'.
src/__tests__/completeness-walker.test.ts(243,38): TS2304: Cannot find name 'Resource'.
src/quality/completenessWalker.ts(107,43): TS2352: Conversion of type 'Resource' to type 'Record<string, unknown>'…
```

These errors exist in the baseline (verified at commit `86c02ea`
`docs(21-02): complete cohort hook + resolver plan` — the commit right
before Plan 21-03 started). They originate from Plan 15-01
`feat(15-01): extend completeness walker to return perResource data`
and were never resolved. The parent session's working tree has an
uncommitted fix (`(r as Record<…>)` → `(r as unknown as Record<…>)`);
that fix belongs to whichever plan is responsible for Plan 15-01 follow-up,
not here. Deviation Rule scope boundary: "only auto-fix issues directly
caused by the current task's changes." These errors are not.

Impact on this plan: `npm run build` exits non-zero with these 4 errors
(no new errors added by Plan 21-03). `npx tsc -b` scoped to our changed
files would pass. The 7 panel hooks that call `sampleResources` all
compile cleanly (verified via `grep sampleResources\\( src/hooks/` →
11 call sites, none failing tsc).

**Suggested follow-up:** A tiny fix plan or quick-hotfix commit to land
the 2-character `as unknown as` cast in `completenessWalker.ts:107`.
This will unblock `npm run build` for all Phase 21 plans going forward.

## Threat mitigations preserved

| Threat | Mitigation enforced | Location |
|--------|---------------------|----------|
| T-21-07 (URL/body injection via patient IDs) | All values routed through object keys → Medplum's URLSearchParams serializer (GET) or `new URLSearchParams({...}).toString()` (POST). Zero string concatenation into URL path. | sampling.ts lines 40–44, 54–58 |
| T-21-08 (DoS via URL length) | Hard 40-ID threshold (SHORT_QUERY_THRESHOLD). Test `short GET: exactly 40` + `long POST: >40` enforce the boundary. | sampling.ts line 24; sampling.test.ts lines 62–78 |
| T-21-09 (Information disclosure in errors) | No custom error messages added — errors surface via MedplumClient's existing exception chain. POST-body errors do not embed patient IDs (URLSearchParams encodes them; Medplum's error handler is unchanged). | sampling.ts (no catch blocks added) |

## Self-Check: PASSED

- [x] Files claimed as created/modified exist on disk (`src/quality/sampling.ts`, `src/quality/sampling.test.ts`).
- [x] Commits claimed exist in `git log`:
  - `435b42a` test(21-03): activate sampling patientIds tests
  - `32ea08a` feat(21-03): add patientIds to sampleResources with GET/POST cutover
  - `882758f` fix(21-03): satisfy strict TS for Bundle<Resource> test fixtures
- [x] Acceptance greps all pass (patientIds ≥3, SHORT_QUERY_THRESHOLD ≥2, client.post ≥1, _id ≥1, form-urlencoded ≥1).
- [x] 4 VALIDATION.md `-t` filters resolve to concrete tests and pass.
- [x] All 7 panel-hook call sites (`grep sampleResources( src/hooks/`) remain 3-arg and compile.

## Outstanding items

**None for Plan 21-03 scope.** The 4-arg form sits idle until Plan 21-06
threads `patientIds` through the dashboard:

- Plan 21-06 will call `resolveCohort(client, activeCohort)` from
  `useCohorts` + cohort-resolver (Plan 21-02), and pass the resolved
  `string[]` as the 4th argument to `sampleResources` in each of the 7
  panel hook layers (or in the shared hook if one is introduced).
