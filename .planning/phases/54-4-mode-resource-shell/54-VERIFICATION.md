---
phase: 54-4-mode-resource-shell
verified: 2026-05-04T19:40:00Z
status: human_needed
score: 9/9 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Navigate to /explorer/Patient/:id and confirm 4 pill-style tabs render visually (Summary | Human | Graph | JSON)"
    expected: "4 tabs rendered in pill style; Summary tab active by default"
    why_human: "jsdom cannot verify computed CSS or visual Mantine pill styles — tab presence is tested but pill appearance requires browser"
  - test: "Press keys 1, 2, 3, 4 in browser while on the resource detail page"
    expected: "Each key instantly activates the corresponding mode (1=Summary, 2=Human, 3=Graph, 4=JSON)"
    why_human: "useShortcuts fires real keydown events; jsdom test verifies the handler is wired but browser confirmation is needed for key-repeat edge cases"
  - test: "Navigate to Graph tab on a resource with connections; verify React Flow SVG canvas renders"
    expected: "React Flow canvas with nodes/edges visible; no doubled 'Reference graph' header"
    why_human: "jsdom cannot render SVG or React Flow canvas; compact prop suppression of title is code-verified but visual confirmation of graph rendering requires live Blaze"
  - test: "Navigate to JSON tab; observe validation chip color (teal=0 issues / yellow=N issues / gray=Not validated)"
    expected: "Correct color applied based on profile availability and structural validation result"
    why_human: "Mantine Badge color is a computed class — the color prop is verified in code but rendered color requires browser CSS computation"
  - test: "Click Download button on JSON tab; verify file is saved to filesystem"
    expected: "A file named {ResourceType}-{id}.json is saved with valid JSON content"
    why_human: "downloadString() triggers a browser download — file system interaction is not testable in jsdom"
  - test: "Navigate to /explorer/Patient/p1/graph directly (legacy URL); verify redirect to /explorer/Patient/p1?mode=graph"
    expected: "Browser URL bar shows /explorer/Patient/p1?mode=graph; Graph tab is active"
    why_human: "Redirect logic is unit-tested (graph-redirect.test.tsx passes); confirming browser navigation and URL bar update needs live app"
---

# Phase 54: 4-Mode Resource Shell Verification Report

**Phase Goal:** Replace ResourceDetailPage's 2-tab layout with a 4-mode shell (Summary | Human | Graph | JSON) with URL-driven mode persistence (?mode=), keyboard shortcuts (1/2/3/4), lazy-loaded Graph mode, and JSON mode enhancements (Copy/Download/validation chip).
**Verified:** 2026-05-04T19:40:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | ResourceDetailPage renders a 4-tab pill switcher (Summary \| Human \| Graph \| JSON) with `variant="pills"`, URL-driven via `?mode=` with `replace: true`, and `useShortcuts` for keys 1/2/3/4 | ✓ VERIFIED | `ResourceDetailPage.tsx` lines 87-92: `useShortcuts({'1':summary,'2':human,'3':graph,'4':json})`; line 195: `<Tabs variant="pills">`; lines 71-83: `useSearchParams` + `setSearchParams(next,{replace:true})`; all 4 tabs confirmed at lines 197-200 |
| 2 | Summary mode renders `summarizeResource(r).primary` as `Title order={3}`, then `KeyFieldsTable`, then reference panels (PatientRelatedResources for Patient+patientId, IncomingReferencesPanel otherwise) — panels live inside Summary tab only | ✓ VERIFIED | Lines 206-215: `<Title order={3}>{summarizeResource(resource).primary}</Title>` + `<KeyFieldsTable>` + conditional panel; D-09 comment confirms legacy bottom-mount removed; 3 live summary-mode tests pass |
| 3 | Graph mode lazy-loads ResourceGraphView via `React.lazy` + `Suspense` with `Skeleton h={600}` fallback; `compact` prop suppresses standalone Title/Back-button header | ✓ VERIFIED | Lines 38-40: `const ResourceGraphView = lazy(...)` with `retry()`; lines 223-226: `<Suspense fallback={<Skeleton h={600} />}><ResourceGraphView compact /></Suspense>`; ResourceGraphView.tsx line 136: `{!compact && (...)}` guards the header group |
| 4 | `/graph` routes redirect to `?mode=graph` via `NavigateToMode` adapter; orphaned lazy ResourceGraphView declaration removed from App.tsx | ✓ VERIFIED | App.tsx lines 155, 165-166: both `/graph` routes use `<NavigateToMode mode="graph" />`; `grep -c "lazy.*ResourceGraphView" src/App.tsx` = 0; 2 live redirect tests pass |
| 5 | JSON mode renders `JsonModeView` with Copy + Download buttons, validation chip (5-state machine: pending/0-issues/N-issues/Not-validated), "Open in validator" Anchor | ✓ VERIFIED | JsonModeView.tsx lines 91-108: 5-state chip machine; lines 114-139: Copy/Download/Badge/Anchor; 7 live json-mode-view tests pass |
| 6 | `JsonViewer` accepts `showLineNumbers` prop; when true renders flat `<pre>` with numbered gutter via existing `JsonSyntaxHighlight` tokenizer; when false preserves tree view | ✓ VERIFIED | JsonViewer.tsx lines 24, 42, 45: prop interface + usage; `renderLineNumberedJson` function at line 59; 2 live JsonViewer tests pass |
| 7 | PEEK-06 invariant: `JsonTreeView` imported only in `JsonViewer.tsx`; no `react-syntax-highlighter` in `src/` | ✓ VERIFIED | `grep -rn "react-syntax-highlighter" src/` = 0 hits; `grep -rn "JsonTreeView" src/` = 3 hits (definition in JsonTreeView.tsx + 1 import in JsonViewer.tsx + 1 comment); PEEK drawer tests: 3/3 passing |
| 8 | `DeveloperJsonView.tsx` deleted; no remaining importers; `display-modes.test.tsx` block removed | ✓ VERIFIED | `ls DeveloperJsonView.tsx` = "No such file"; `grep -rn "DeveloperJsonView" src/` = 0 hits; clean |
| 9 | All Wave 0 describe.skip stubs promoted to live tests; full suite passes (163 files / 1480 tests) | ✓ VERIFIED | `grep -c "describe.skip"` = 0 in all 6 Phase-54-owned test files; `npm test` = 163 passed / 1480 passed |

**Score:** 9/9 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/components/explorer/ResourceDetailPage.tsx` | 4-mode shell with URL-driven mode + useShortcuts + Summary composition | ✓ VERIFIED | 240 lines; Tabs.Panel value="summary/human/graph/json"; useShortcuts wired; summarizeResource + KeyFieldsTable + IncomingReferencesPanel/PatientRelatedResources in Summary; lazy ResourceGraphView + Suspense for Graph |
| `src/components/explorer/ResourceGraphView.tsx` | `compact?: boolean` prop suppressing standalone Title + Back button | ✓ VERIFIED | Lines 42-50: `ResourceGraphViewProps { compact?: boolean }`; line 60: destructured with `compact=false` default; line 136: `{!compact && (...)}` guard |
| `src/App.tsx` | NavigateToMode adapter + /graph routes using it; no orphaned lazy ResourceGraphView | ✓ VERIFIED | Lines 94-104: `export function NavigateToMode`; lines 155, 165-166: both /graph routes use NavigateToMode; `grep "lazy.*ResourceGraphView" App.tsx` = 0 |
| `src/utils/keyFieldsRegistry.ts` | `getKeyFields(r)` with 8 typed handlers + generic fallback | ✓ VERIFIED | 141 lines; 8 `case` branches; 9 handler functions (8 typed + `genericFields`); 19 live tests pass |
| `src/components/explorer/KeyFieldsTable.tsx` | 2-column Mantine Table; em-dash for undefined; monospace for generic fallback | ✓ VERIFIED | BUNDLED_TYPED_RESOURCE_TYPES set at line 15; em-dash at line 47; `ff="monospace"` at line 50 |
| `src/components/explorer/JsonModeView.tsx` | Copy/Download/validation chip/Open-in-validator; `showLineNumbers` on JsonViewer | ✓ VERIFIED | All 4 behaviors wired; `createStructuralBackend` + `downloadString` + `navigator.clipboard.writeText` + `Anchor to="/quality"`; `<JsonViewer ... showLineNumbers />` at line 143 |
| `src/components/json/JsonViewer.tsx` | `showLineNumbers?: boolean` prop + `renderLineNumberedJson` helper | ✓ VERIFIED | Lines 24, 42, 45, 59-93; PEEK-06 invariant preserved |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| ResourceDetailPage.tsx | useShortcuts.ts | `import { useShortcuts }` | ✓ WIRED | Line 8 import + lines 87-92 usage |
| ResourceDetailPage.tsx | JsonModeView.tsx | `import { JsonModeView }` | ✓ WIRED | Line 11 import + line 230 usage |
| ResourceDetailPage.tsx | KeyFieldsTable.tsx | `import { KeyFieldsTable }` | ✓ WIRED | Line 12 import + line 209 usage |
| ResourceDetailPage.tsx | react-router-dom | `useSearchParams` + `setSearchParams(next, { replace: true })` | ✓ WIRED | Lines 71-83 |
| ResourceDetailPage.tsx | ResourceGraphView.tsx | `React.lazy(retry(...))` | ✓ WIRED | Lines 38-40 (module scope) + lines 224-226 (Suspense usage) |
| App.tsx | react-router-dom | `<Navigate to={target} replace />` inside NavigateToMode | ✓ WIRED | Line 103 |
| JsonModeView.tsx | JsonViewer.tsx | `import { JsonViewer }` + `showLineNumbers` | ✓ WIRED | Line 20 import + line 143 usage with `showLineNumbers` prop |
| JsonModeView.tsx | structuralValidator.ts | `createStructuralBackend(getProfileForType)` | ✓ WIRED | Line 22 import + line 32 usage in useMemo |
| JsonModeView.tsx | export.ts | `import { downloadString }` | ✓ WIRED | Line 21 import + lines 79-83 usage |
| KeyFieldsTable.tsx | keyFieldsRegistry.ts | `import { getKeyFields }` | ✓ WIRED | Line 12 import + line 31 usage |
| JsonViewer.tsx | JsonSyntaxHighlight.tsx | `import { tokenize, TOKEN_COLORS }` | ✓ WIRED | Line 4 import + lines 83-86 usage in renderLineNumberedJson |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| ResourceDetailPage | `resource` state | `client.readResource()` in useEffect (line 101) | Yes — API call with real ResourceType/id params; state set via `.then((res) => setResource(res))` | ✓ FLOWING |
| JsonModeView | `issueCount` state | `backend.validate(resource)` via createStructuralBackend (line 52-55) | Yes — calls `validateStructural` against bundled profiles; cancelled-flag guard prevents stale state | ✓ FLOWING |
| keyFieldsRegistry | KeyFieldEntry[] | Typed field accessors on the Resource object (optional chaining throughout) | Yes — reads real FHIR resource properties; generic fallback uses `toRecord(r)` for real field iteration | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Phase 54 targeted tests (7 files) | `npm test -- [...] --run --no-coverage` | 53 passed | ✓ PASS |
| Full test suite | `npm test --run --no-coverage` | 163 files / 1480 tests passed | ✓ PASS |
| Production build | `npm run build` | ✓ built in 518ms | ✓ PASS |
| PEEK-06 regression | `npm test -- src/__tests__/peek-related-resources.test.tsx --run` | 3 passed | ✓ PASS |
| TypeScript | `tsc -b --noEmit` | 0 diagnostics (clean) | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| SHELL-01 | 54-02-PLAN.md | 4-tab pill switcher with URL-driven mode + keyboard shortcuts 1/2/3/4 | ✓ SATISFIED | ResourceDetailPage.tsx: Tabs variant="pills", useSearchParams, useShortcuts, 4 live tests pass |
| SHELL-02 | 54-01-PLAN.md + 54-02-PLAN.md | Summary mode: summarizeResource heading + KeyFieldsTable (8 typed + generic) + reference panels | ✓ SATISFIED | keyFieldsRegistry.ts (8 handlers + generic), KeyFieldsTable.tsx, Summary Tabs.Panel with composition; 19+3 live tests pass |
| SHELL-03 | 54-02-PLAN.md | Graph mode lazy-loaded + compact prop + /graph route redirects via NavigateToMode | ✓ SATISFIED | ResourceDetailPage.tsx: React.lazy + Suspense + compact; App.tsx: NavigateToMode on both /graph routes; 1+2 live tests pass |
| SHELL-04 | 54-01-PLAN.md + 54-02-PLAN.md | JSON mode: Copy/Download/validation chip (5-state machine)/Open-in-validator + showLineNumbers in JsonViewer | ✓ SATISFIED | JsonModeView.tsx: all 4 behaviors; JsonViewer.tsx: showLineNumbers prop + renderLineNumberedJson; 7+2 live tests pass |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None found | — | — | — | — |

No TODOs, FIXMEs, stubs, orphaned state, or legacy remnants found in Phase 54 source files. The legacy patterns (raw keydown listener, activeTab useState, IconAffiliate, DeveloperJsonView import, bottom-mounted reference panels) are all absent from ResourceDetailPage.tsx.

### Human Verification Required

These items cannot be verified programmatically and are deferred to Phase 58 UAT per the plan's own specification (54-VALIDATION.md §Manual-Only Verifications):

#### 1. 4 Pill Tabs Visual Appearance

**Test:** Navigate to `/explorer/Patient/:id` in a browser connected to Blaze
**Expected:** 4 tabs render with Mantine pill styling; Summary tab is active by default
**Why human:** jsdom verifies tab presence and aria-selected but cannot render Mantine pill CSS classes

#### 2. Keyboard Mode Switching (1/2/3/4)

**Test:** With the resource detail page open and no text input focused, press 1, 2, 3, 4
**Expected:** Each key instantly activates Summary, Human, Graph, JSON respectively with no page reload
**Why human:** useShortcuts + keydown behavior is unit-tested but browser key-repeat and focus-context edge cases need live verification

#### 3. Graph Tab React Flow Canvas + compact prop

**Test:** Click the Graph tab on any resource that has references
**Expected:** React Flow canvas renders with nodes and edges; no duplicated "Reference graph" heading
**Why human:** jsdom cannot render SVG or React Flow; compact prop is code-verified but visual graph requires live Blaze with data

#### 4. Validation Chip Color

**Test:** Navigate to JSON tab for (a) a Patient (MII profile bundled) and (b) an Appointment (no profile)
**Expected:** (a) teal "0 issues" or yellow "N issues" badge; (b) gray "Not validated" badge
**Why human:** Mantine Badge color is a computed CSS class — the `color` prop is code-verified but rendered color requires browser CSS

#### 5. Download Button Saves File

**Test:** Click Download on the JSON tab
**Expected:** A file named `{ResourceType}-{id}.json` downloads with valid formatted JSON
**Why human:** `downloadString()` triggers a browser download; file system interaction not testable in jsdom

#### 6. Legacy /graph URL Redirect (Browser Verification)

**Test:** Navigate directly to `/explorer/Patient/p1/graph` in address bar
**Expected:** Browser URL bar changes to `/explorer/Patient/p1?mode=graph`; Graph tab active
**Why human:** Unit test verifies the redirect logic; visual URL bar update and tab activation need live confirmation

### Gaps Summary

No automated gaps found. All 9 must-haves are verified. The human verification items are browser-only behaviors that were explicitly planned for Phase 58 UAT from the beginning — they are not defects, they are deferred validation steps.

---

_Verified: 2026-05-04T19:40:00Z_
_Verifier: Claude (gsd-verifier)_
