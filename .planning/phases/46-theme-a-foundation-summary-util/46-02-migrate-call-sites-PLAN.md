---
phase: 46
plan: 02
type: execute
wave: 2
depends_on: [01]
files_modified:
  - src/components/explorer/SearchResultsPage.tsx
  - src/components/patients/FhirResourcesView.tsx
  - src/components/patients/MiiModuleTab.tsx
autonomous: false
requirements: [NAV-02]
must_haves:
  truths:
    - "Zero legacy inline summary functions remain in the 3 component files — grep confirms no `function getResourceSummary` or `function getSummary` in src/components/"
    - "All 3 sites import and call summarizeResource(r).primary — grep confirms 3+ matches for `summarizeResource` across the component files"
    - "Visual output at the 3 migrated call sites matches or improves on prior inline output (Patient cells gain (age/sex) enrichment; no regressions)"
    - "npm run build clean; tsc -b --noEmit exit 0; full test suite passes (no regressions vs ~1270 post-PLAN-01 baseline)"
  artifacts:
    - path: "src/components/explorer/SearchResultsPage.tsx"
      provides: "Explorer search results table with summarizeResource(r).primary in the Summary column"
      contains: "summarizeResource"
    - path: "src/components/patients/FhirResourcesView.tsx"
      provides: "Patient FHIR resources view with summarizeResource(r).primary in each resource row"
      contains: "summarizeResource"
    - path: "src/components/patients/MiiModuleTab.tsx"
      provides: "MII module tab resource list with summarizeResource(r).primary in each row"
      contains: "summarizeResource"
  key_links:
    - from: "src/components/explorer/SearchResultsPage.tsx"
      to: "src/utils/summarizeResource.ts"
      via: "import { summarizeResource } from '../../utils/summarizeResource'"
      pattern: "from '../../utils/summarizeResource'"
    - from: "src/components/patients/FhirResourcesView.tsx"
      to: "src/utils/summarizeResource.ts"
      via: "import { summarizeResource } from '../../utils/summarizeResource'"
      pattern: "from '../../utils/summarizeResource'"
    - from: "src/components/patients/MiiModuleTab.tsx"
      to: "src/utils/summarizeResource.ts"
      via: "import { summarizeResource } from '../../utils/summarizeResource'"
      pattern: "from '../../utils/summarizeResource'"
---

<objective>
Migrate the three legacy inline summary implementations to call `summarizeResource` from the util delivered in PLAN 01. Delete each inline function body entirely, add the import, and update the render site to call `summarizeResource(r).primary`.

Purpose: NAV-02 closure — the util built in PLAN 01 has no value until its 3 consumers are wired to it. This plan eliminates duplicate summary logic and establishes a single source of truth for resource summarization across all three explorer entry points.

Output: Three modified component files, zero legacy inline summary functions, bundle-size verification, and a manual visual spot-check confirming no regression at any of the three call sites.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/REQUIREMENTS.md
@.planning/phases/46-theme-a-foundation-summary-util/46-CONTEXT.md
@.planning/phases/46-theme-a-foundation-summary-util/46-RESEARCH.md
@.planning/phases/46-theme-a-foundation-summary-util/46-01-SUMMARY.md
@CLAUDE.md

<interfaces>
<!-- Public contract from PLAN 01 — consume exactly as shown -->
<!-- From src/utils/summarizeResource.ts (created in PLAN 01) -->
```typescript
export interface Summary {
  primary: string;
  secondary?: string;
}

export function summarizeResource(r: Resource, now?: Date): Summary;
// Returns { primary: string; secondary?: string }
// Only .primary is rendered at the 3 migrated call sites (per D-13)
```

<!-- Helper functions being DELETED from each component — do not re-implement -->
<!-- SearchResultsPage.tsx lines 32-70: function getResourceSummary(resource: Resource) -->
<!-- FhirResourcesView.tsx lines 51-68: function getSummary(r: Resource) -->
<!-- MiiModuleTab.tsx lines 20-38: function getSummary(r: Resource) -->

<!-- Import line to add (adjust relative path per file location) -->
<!-- Both FhirResourcesView and MiiModuleTab are in src/components/patients/ -->
<!-- SearchResultsPage is in src/components/explorer/ -->
import { summarizeResource } from '../../utils/summarizeResource';
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Migrate SearchResultsPage.tsx — delete getResourceSummary, add import, update render site</name>
  <files>src/components/explorer/SearchResultsPage.tsx</files>
  <read_first>
    - src/components/explorer/SearchResultsPage.tsx (full file — lines 1-70 for the legacy function block, lines 108-167 for the typed-switch pattern context, line 490 for the render site; also scan for any imports that were exclusively used by `getResourceSummary` and will become unused)
    - src/utils/summarizeResource.ts (confirm `summarizeResource` is exported and its signature before adding the import)
    - src/utils/fhir-helpers.ts (confirm whether `toRecord` or `getCodeDisplay` are referenced outside the deleted block — if they appear elsewhere in SearchResultsPage, leave those imports; if `getResourceSummary` was their ONLY consumer, remove the import)
  </read_first>
  <action>
    **Step 1 — Delete lines 32-70 in `src/components/explorer/SearchResultsPage.tsx`.**

    The block to delete is the entire `function getResourceSummary(resource: Resource)` implementation. It begins at approximately line 32 with the function declaration and ends at approximately line 70 with the closing `}`. Read the file first to confirm the exact current line numbers — they should match the RESEARCH.md inventory unless a prior commit shifted them.

    The deleted block spans roughly:
    ```typescript
    function getResourceSummary(resource: Resource): string {
      // HumanName branch, code/type/category walk, identifier, status, id fallback
      // ... ~38 lines ...
    }
    ```

    Delete ALL lines from `function getResourceSummary(` through the matching closing `}`. Do not leave a blank function stub. Do not leave commented-out code.

    **Step 2 — Check for now-unused imports.**

    After deleting `getResourceSummary`, grep the remaining file for usages of any helpers that were exclusively used by that function. Specifically check:
    - `getCodeDisplay` — likely still used by `getResourceStatusByType` (line ~167) or elsewhere; leave if so.
    - `toRecord` — check if it appears outside the deleted block; if `getResourceSummary` was its only consumer, remove the import line.
    - Any other import that was exclusively inside the deleted block.

    Run: `grep -n "getCodeDisplay\|toRecord" src/components/explorer/SearchResultsPage.tsx` after deletion to confirm.

    **Step 3 — Add the new import.**

    In the imports section at the top of the file (after the existing imports), add:
    ```typescript
    import { summarizeResource } from '../../utils/summarizeResource';
    ```

    Place it with the other local utils imports (look for existing `import ... from '../../utils/...'` lines and group accordingly). The relative path `../../utils/summarizeResource` is correct because SearchResultsPage lives at `src/components/explorer/SearchResultsPage.tsx` and the util is at `src/utils/summarizeResource.ts`.

    **Step 4 — Update the render site at line 490.**

    The current render site is approximately:
    ```tsx
    {getResourceSummary(r)}
    ```
    inside an `<Anchor>` or truncated `<Text>` table cell. Change it to:
    ```tsx
    {summarizeResource(r).primary}
    ```

    Read the actual current content around line 490 first to confirm the exact expression — the file may have shifted. The change is purely the function call: `getResourceSummary(r)` becomes `summarizeResource(r).primary`. Do NOT change the surrounding JSX structure (the `<Anchor maxWidth: 400>` wrapper, the truncation logic, or any other props). Preserve everything else verbatim.

    **Step 5 — Run the type check.**
    ```bash
    npx tsc -b --noEmit
    ```
    Must exit 0. If there are unused-import TS errors, remove those imports. If there are other errors, fix them before proceeding.
  </action>
  <verify>
    <automated>npx tsc -b --noEmit && ! grep -n "function getResourceSummary" src/components/explorer/SearchResultsPage.tsx && grep -n "summarizeResource" src/components/explorer/SearchResultsPage.tsx</automated>
  </verify>
  <acceptance_criteria>
    - `! grep -n "function getResourceSummary" src/components/explorer/SearchResultsPage.tsx` exits 0 (function deleted).
    - `grep -n "summarizeResource" src/components/explorer/SearchResultsPage.tsx` exits 0 and shows at least 2 lines: the import line and the render-site call.
    - `grep -n "import { summarizeResource } from '../../utils/summarizeResource'" src/components/explorer/SearchResultsPage.tsx` exits 0 (import present).
    - `grep -n "summarizeResource(r).primary" src/components/explorer/SearchResultsPage.tsx` exits 0 (render site updated).
    - `! grep -n "getResourceSummary" src/components/explorer/SearchResultsPage.tsx` exits 0 (no residual references, not even as a comment).
    - If `toRecord` was only used in the deleted block: `! grep -n "toRecord" src/components/explorer/SearchResultsPage.tsx` exits 0. Otherwise the import must remain.
    - `npx tsc -b --noEmit` exits 0 (no type errors, no unused-import TS errors).
  </acceptance_criteria>
  <done>
    `getResourceSummary` function deleted, import added, render site at ~line 490 updated to `summarizeResource(r).primary`, unused imports cleaned up, tsc exits 0.
  </done>
</task>

<task type="auto">
  <name>Task 2: Migrate FhirResourcesView.tsx and MiiModuleTab.tsx — delete getSummary from both, add imports, update render sites</name>
  <files>
    src/components/patients/FhirResourcesView.tsx
    src/components/patients/MiiModuleTab.tsx
  </files>
  <read_first>
    - src/components/patients/FhirResourcesView.tsx (full file — lines 51-68 for the legacy `getSummary` block, line 223 for the render site; check for any imports exclusively used by `getSummary`)
    - src/components/patients/MiiModuleTab.tsx (full file — lines 20-38 for the legacy `getSummary` block, line 184 for the render site; specifically check `toRecord` usage since the RESEARCH.md § Pitfall 6 flags it as possibly the ONLY consumer in this file)
    - src/utils/summarizeResource.ts (confirm export is present — quick check: `grep -n "export function summarizeResource" src/utils/summarizeResource.ts`)
    - src/utils/fhir-helpers.ts (confirm `toRecord` and `getCodeDisplay` signatures for reference when verifying unused imports)
  </read_first>
  <action>
    Migrate BOTH files in this task. Both live at `src/components/patients/` so the relative import path is the same for each.

    --- FhirResourcesView.tsx ---

    **Step 1 — Delete lines 51-68 in `src/components/patients/FhirResourcesView.tsx`.**

    The block to delete is the entire `function getSummary(r: Resource)` (or `getSummary(r: Resource): string`) implementation. Read the file first to confirm exact current line numbers. The block spans roughly:
    ```typescript
    function getSummary(r: Resource): string {
      // code/type/category walk -> id
      // ... ~17 lines ...
    }
    ```
    Delete ALL lines from the function declaration through the closing `}`. No stubs, no comments.

    **Step 2 — Check for now-unused imports in FhirResourcesView.tsx.**

    After deletion, grep for `toRecord` and `getCodeDisplay` in the remaining file. If either is no longer referenced, remove the corresponding import line. Run:
    ```bash
    grep -n "toRecord\|getCodeDisplay" src/components/patients/FhirResourcesView.tsx
    ```

    **Step 3 — Add import to FhirResourcesView.tsx.**

    Add to the imports section (group with other `../../utils/` imports if present, or place after the `@medplum/fhirtypes` imports):
    ```typescript
    import { summarizeResource } from '../../utils/summarizeResource';
    ```
    The relative path `../../utils/summarizeResource` is correct: `src/components/patients/` -> `../../utils/` -> `src/utils/summarizeResource`.

    **Step 4 — Update render site at ~line 223 in FhirResourcesView.tsx.**

    Current expression: `{getSummary(r)}`
    Updated expression: `{summarizeResource(r).primary}`

    Read the actual content around line 223 first to confirm the exact variable name (may be `r`, `resource`, or another binding) and the surrounding JSX. Only change the function call — preserve all surrounding JSX (any `<Text>`, `<Anchor>`, table cell wrappers) verbatim.

    **Step 5 — Run type check after FhirResourcesView migration.**
    ```bash
    npx tsc -b --noEmit
    ```
    Fix any unused-import errors before proceeding to MiiModuleTab.

    --- MiiModuleTab.tsx ---

    **Step 6 — Delete lines 20-38 in `src/components/patients/MiiModuleTab.tsx`.**

    The block to delete is the entire `function getSummary(r: Resource)` implementation. It spans roughly:
    ```typescript
    function getSummary(r: Resource): string {
      // code/type/category walk + description fallback -> id
      // ... ~18 lines ...
    }
    ```
    Delete ALL lines from the function declaration through the closing `}`.

    **Step 7 — CRITICAL: Check toRecord import in MiiModuleTab.tsx.**

    RESEARCH.md § Pitfall 6 flags that `toRecord` may have been imported exclusively for the `getSummary` function in this file. After deleting `getSummary`, run:
    ```bash
    grep -n "toRecord" src/components/patients/MiiModuleTab.tsx
    ```
    If `toRecord` appears ONLY in the now-deleted block (zero hits remaining), remove the `import { toRecord }` (or `import { toRecord, ... }` — remove just the `toRecord` symbol from the import if other symbols from `fhir-helpers` remain). Do the same check for `getCodeDisplay`:
    ```bash
    grep -n "getCodeDisplay" src/components/patients/MiiModuleTab.tsx
    ```

    **Step 8 — Add import to MiiModuleTab.tsx.**

    Add to the imports section:
    ```typescript
    import { summarizeResource } from '../../utils/summarizeResource';
    ```
    Same relative path as FhirResourcesView — both files are in `src/components/patients/`.

    **Step 9 — Update render site at ~line 184 in MiiModuleTab.tsx.**

    Current expression: `{getSummary(r)}`
    Updated expression: `{summarizeResource(r).primary}`

    Read the actual content around line 184 first. Note: after deleting ~18 lines in Step 6, the render site has shifted up — read the file after deletion to find the new line number. Only change the function call expression. Preserve all surrounding JSX verbatim.

    **Step 10 — Run the FULL type check.**
    ```bash
    npx tsc -b --noEmit
    ```
    Must exit 0 for both files. Fix any unused-import errors.

    **Step 11 — Run the full test suite.**
    ```bash
    npm test
    ```
    Must pass. Expected count: >= the PLAN 01 close count (1240 + PLAN 01 additions, approximately 1270). Zero regressions.
  </action>
  <verify>
    <automated>npx tsc -b --noEmit && ! grep -rn "function getSummary" src/components/patients/ && grep -n "summarizeResource" src/components/patients/FhirResourcesView.tsx && grep -n "summarizeResource" src/components/patients/MiiModuleTab.tsx && npm test</automated>
  </verify>
  <acceptance_criteria>
    - `! grep -rn "function getSummary" src/components/patients/` exits 0 (both getSummary functions deleted).
    - `! grep -n "getSummary" src/components/patients/FhirResourcesView.tsx` exits 0 (no residual references).
    - `! grep -n "getSummary" src/components/patients/MiiModuleTab.tsx` exits 0 (no residual references).
    - `grep -n "import { summarizeResource } from '../../utils/summarizeResource'" src/components/patients/FhirResourcesView.tsx` exits 0.
    - `grep -n "import { summarizeResource } from '../../utils/summarizeResource'" src/components/patients/MiiModuleTab.tsx` exits 0.
    - `grep -n "summarizeResource(r).primary" src/components/patients/FhirResourcesView.tsx` exits 0 (render site at ~223 updated).
    - `grep -n "summarizeResource(r).primary" src/components/patients/MiiModuleTab.tsx` exits 0 (render site at ~184 updated).
    - toRecord unused-import check for MiiModuleTab: if `toRecord` is not referenced elsewhere in the file, `! grep -n "toRecord" src/components/patients/MiiModuleTab.tsx` exits 0. If still referenced, the import remains and this check is skipped.
    - `npx tsc -b --noEmit` exits 0 (no type errors in either file).
    - `npm test` exits 0 with no regression vs PLAN 01 close count.
    - Global zero-legacy check: `! grep -rn "function getResourceSummary\|function getSummary" src/components/` exits 0 (all three inline impls gone).
  </acceptance_criteria>
  <done>
    Both `getSummary` functions deleted from `FhirResourcesView.tsx` and `MiiModuleTab.tsx`. Both files import `summarizeResource`. Both render sites call `summarizeResource(r).primary`. toRecord/getCodeDisplay unused imports removed from MiiModuleTab if applicable. tsc exits 0. Full test suite passes with no regressions. Zero legacy inline summary computations remain in src/components/.
  </done>
</task>

<task type="auto">
  <name>Task 3: Bundle-size check — verify migration delta is within budget</name>
  <files></files>
  <read_first>
    - .planning/REQUIREMENTS.md (line 6: v1.6 close baseline 606.76 KB gz — the delta target is <= +5 KB gz for Theme A total)
    - .planning/phases/46-theme-a-foundation-summary-util/46-RESEARCH.md section "Bundle Budget Verification" (estimated ~2 KB gz delta for summarizeResource.ts; PLAN 02 migration only moves logic out of the components, net delta may be negative or near-zero)
  </read_first>
  <action>
    Run a production build and capture asset sizes to verify the migration does not blow the bundle budget.

    **Step 1 — Build:**
    ```bash
    npm run build
    ```
    Must exit 0. If it fails, fix the issue before proceeding.

    **Step 2 — Capture asset sizes:**
    ```bash
    ls -lh dist/assets/*.js | sort -k5 -h | tail -5
    ```
    This lists the 5 largest JS assets by size. Record the sizes.

    **Step 3 — Estimate gz delta:**
    ```bash
    gzip -c dist/assets/index-*.js 2>/dev/null | wc -c
    ```
    If there is no `index-*.js` (Vite may name chunks differently), run:
    ```bash
    for f in dist/assets/*.js; do printf "%s\t%s\n" "$(gzip -c "$f" | wc -c)" "$f"; done | sort -n | tail -5
    ```
    Record the gz sizes of the top chunks.

    **Step 4 — Compare against baseline:**
    Baseline: 606.76 KB gz (v1.6 close, REQUIREMENTS.md line 6).
    Acceptance: total asset gz delta <= +5 KB from baseline (RESEARCH.md bundle budget).

    Note: PLAN 02 migration removes ~38 + ~17 + ~18 = ~73 lines of inline logic from 3 components and replaces with import + 1-line call. Net bundle delta from PLAN 02 alone is likely neutral or slightly negative (the logic moved into `summarizeResource.ts` in PLAN 01, which already contributed its +~2 KB; this plan only removes duplicated logic). Any total delta <= +5 KB is within budget.

    Log the exact values in the SUMMARY.md.
  </action>
  <verify>
    <automated>npm run build && ls -lh dist/assets/*.js | sort -k5 -h | tail -5</automated>
  </verify>
  <acceptance_criteria>
    - `npm run build` exits 0.
    - Total gz size of all JS assets is <= 611.76 KB (baseline 606.76 KB + 5 KB budget per RESEARCH.md).
    - If actual delta is negative (bundle shrank) or < +2 KB, note it as "within budget, migration removed duplicate logic".
    - Build output shows no warnings about chunk size limits (Vite warns at > 500 KB uncompressed per chunk by default; if a warning appears, record it but do not treat it as a blocker — the gz comparison is the authoritative check per RESEARCH.md).
  </acceptance_criteria>
  <done>
    `npm run build` exits 0. Asset gz sizes recorded. Total delta <= +5 KB vs baseline 606.76 KB. Build clean — no errors.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 4: Visual spot-check — confirm all 3 migrated render sites display correctly</name>
  <files></files>
  <action>
    Run the dev server (`npm run dev`) and manually verify each of the 3 migrated render sites per the protocol in `<how-to-verify>`. No code changes are expected in this task — it is a blocking verification gate only.
  </action>
  <what-built>
    All 3 legacy inline summary implementations have been deleted and replaced with calls to `summarizeResource(r).primary` from `src/utils/summarizeResource.ts`. The migrated sites are:
    1. `SearchResultsPage.tsx` — the Summary column in the Explorer resource table.
    2. `FhirResourcesView.tsx` — summary cells in the per-type resource cards on the patient detail page.
    3. `MiiModuleTab.tsx` — summary rows in each MII module tab (e.g. Diagnose, Medikation).
  </what-built>
  <how-to-verify>
    Start the dev server:
    ```bash
    npm run dev
    ```

    **Site 1 — SearchResultsPage (Explorer):**
    Open `http://localhost:5173/explorer/Patient`.
    - Confirm the Summary column renders patient names (and `(age/sex)` parenthetical where birthDate + gender are present — e.g. `Müller, Anna (68/F)`).
    - Confirm no Patient rows show bare `id` strings where names were expected (the new Patient handler always produces a name or identifier fallback).
    - Confirm truncation is still applied (long summaries cut off at ~400px max-width via the existing Anchor wrapper).
    - Confirm no React errors or console errors (open DevTools).

    Navigate to `/explorer/Observation` (or any other resource type in the list).
    - Confirm Summary column shows meaningful display text (e.g. lab value + code for lab Observations, or code display for other types).
    - No console errors.

    **Site 2 — FhirResourcesView (Patient detail, expanded resource type):**
    Navigate to `http://localhost:5173/patients/<any-patient-id>`.
    Expand a resource type accordion (e.g. Observation, Condition, Encounter).
    - Confirm each resource row shows a non-empty summary string.
    - Confirm the summary is human-readable (not just a bare FHIR id).
    - No console errors.

    **Site 3 — MiiModuleTab (MII module tab):**
    On the same patient detail page, click a MII module tab (e.g. "Diagnose", "Medikation", or whichever tabs are populated for this patient).
    - Confirm rows render summaries (e.g. Condition code display for Diagnose rows, MedicationStatement medication name for Medikation rows).
    - Confirm the description-fallback from the old `getSummary` (which only existed in MiiModuleTab) is gone — Diagnose = Condition, which is now handled by the typed `summarizeCondition` returning `code` display. This is a correctness improvement.
    - No console errors.

    **Acceptance:** All 3 sites render summaries. No render site shows fewer characters or less information than v1.6 baseline (Patient gains `(age/sex)` — that is the intended improvement). No JS errors in the browser console at any of the 3 sites.
  </how-to-verify>
  <verify>
    <automated>MISSING — visual rendering cannot be verified by automated command; this task is inherently manual. Tasks 1-3 automated gates must have passed before reaching this checkpoint.</automated>
  </verify>
  <done>User types "approved" confirming all 3 sites render summaries correctly with no console errors.</done>
  <resume-signal>Type "approved" if all 3 sites look correct. Or describe any rendering issue found (e.g. "MiiModuleTab shows blank cells") so it can be investigated.</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Blaze server -> component | FHIR Resource payloads flow through summarizeResource; any malformed field is handled by summarizeResource's defensive `?.` chains — no new surface introduced by the migration |
| summarizeResource output -> DOM | summarizeResource returns plain strings; render sites pass them as React text children (Mantine `<Anchor>`/`<Text>`) which apply standard text-node escaping |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-46-07 | T (XSS) | summarizeResource string rendered in Anchor/Text cells across all 3 sites | accept | summarizeResource returns plain strings (no JSX, no HTML). React text-node escaping prevents script injection at render sites. No `dangerouslySetInnerHTML` added. Render site wrappers (`<Anchor>`, `<Text>`) are unchanged — their escaping behavior is preserved verbatim. |
| T-46-08 | T (Tampering) | Residual unused imports after deletion (e.g. toRecord, getCodeDisplay) | accept | Low risk — unused imports are dead code and do not alter runtime behavior. Acceptance criteria require grep-verification that unused imports are removed, enforced by `tsc --noImplicitAny` / noUnusedLocals (if enabled) or manual grep check. The risk is a stale import, not a security issue. |
| T-46-09 | I (Information Disclosure) | No new auth surface, no new env vars, no new routes | accept | This plan is a pure call-site refactor. No new network requests, no new data access patterns, no new secrets. PLAN 01 already handles all trust boundary analysis for summarizeResource itself (T-46-01 through T-46-06). |

No high-severity threats. ASVS L1 block-on-high threshold is met.
</threat_model>

<verification>
Phase 46 NAV-02 closure gates (run after Task 3, before Task 4):

```bash
# SC#2: Zero legacy inline summary computations remain
! grep -rn "function getResourceSummary\|function getSummary" src/components/

# SC#2: All 3 sites import the util
grep -rn "summarizeResource" src/components/ | grep -c "summarizeResource"
# Expected: >= 3 matches (1 import + 1 render call per file = 6+ total across 3 files)

# SC#2: Render sites updated
grep -rn "summarizeResource(r).primary" src/components/

# SC#5: Type gate
npx tsc -b --noEmit

# SC#5: Test suite (no regression)
npm test

# SC#5: Build gate
npm run build
```

SC#4 (visual match-or-improve) is verified in Task 4 (manual spot-check).
</verification>

<success_criteria>
NAV-02 satisfied:
- `! grep -rn "function getResourceSummary\|function getSummary" src/components/` exits 0 (SC#2 — zero legacy inline summary computations).
- All 3 component files have `import { summarizeResource } from '../../utils/summarizeResource'` (SC#2).
- All 3 render sites call `summarizeResource(r).primary` (SC#2).
- `npx tsc -b --noEmit` exits 0 (SC#5).
- `npm test` exits 0 with no regressions (SC#5).
- `npm run build` exits 0 (SC#5).
- Bundle gz delta <= +5 KB vs 606.76 KB baseline (SC#5 — bundle budget).
- Visual spot-check approved by user at all 3 sites (SC#4 — visual match-or-improve).
- Patient cells in SearchResultsPage now show `(age/sex)` parenthetical where data is available — this is the intentional improvement per CONTEXT specifics (SC#4 "improves on prior output" half).
</success_criteria>

<output>
After completion, create `.planning/phases/46-theme-a-foundation-summary-util/46-02-SUMMARY.md` documenting:
- Files modified and lines deleted per file (function block line ranges)
- Whether toRecord import was removed from MiiModuleTab (and from SearchResultsPage if applicable)
- Bundle gz delta vs 606.76 KB baseline (exact values from Task 3)
- Full-suite pass count after migration (PLAN 01 baseline -> PLAN 02 final)
- Visual spot-check result (approved / issues found)
- Verification commands run + exit codes
- NAV-02 closure status (closed / needs gap closure)
</output>
