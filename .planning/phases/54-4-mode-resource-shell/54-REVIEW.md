---
phase: 54-4-mode-resource-shell
reviewed: 2026-05-04T00:00:00Z
depth: standard
files_reviewed: 17
files_reviewed_list:
  - src/App.tsx
  - src/__tests__/display-modes.test.tsx
  - src/__tests__/graph-redirect.test.tsx
  - src/__tests__/json-mode-view.test.tsx
  - src/__tests__/reference-navigation.test.tsx
  - src/__tests__/resource-detail-graph-mode.test.tsx
  - src/__tests__/resource-detail-summary-mode.test.tsx
  - src/__tests__/resource-detail.test.tsx
  - src/components/explorer/JsonModeView.tsx
  - src/components/explorer/KeyFieldsTable.tsx
  - src/components/explorer/ResourceDetailPage.tsx
  - src/components/explorer/ResourceGraphView.tsx
  - src/components/explorer/__tests__/ResourceGraphView.test.tsx
  - src/components/json/JsonViewer.tsx
  - src/components/json/__tests__/JsonViewer.test.tsx
  - src/utils/__tests__/keyFieldsRegistry.test.ts
  - src/utils/keyFieldsRegistry.ts
findings:
  critical: 0
  warning: 3
  info: 4
  total: 7
status: issues_found
---

# Phase 54: Code Review Report

**Reviewed:** 2026-05-04
**Depth:** standard
**Files Reviewed:** 17
**Status:** issues_found

## Summary

Phase 54 replaces the 2-tab ResourceDetailPage with a well-structured 4-mode shell (Summary | Human | Graph | JSON). The architecture is clean: URL-driven mode state, `useShortcuts` for keyboard nav, lazy-loaded graph view, and a dedicated `keyFieldsRegistry` with 8 typed field pickers plus a generic fallback. No security vulnerabilities were found. There are no critical bugs that would cause crashes or data loss in the typical path.

Three warnings were found: an unhandled promise rejection in `JsonModeView` when `backend.validate()` rejects, an inaccurate truncation alert title in `ResourceGraphView`, and a React key collision risk in `KeyFieldsTable` for the generic fallback path. Four info-level items cover the deprecated `JSX.Element` return type, a shallow display-modes test, and some minor code-quality observations.

## Warnings

### WR-01: Unhandled promise rejection in validation effect

**File:** `src/components/explorer/JsonModeView.tsx:52`

**Issue:** `backend.validate(resource).then(...)` has no `.catch()`. `validateStructural` is currently synchronous internally, so the async wrapper will not reject under normal operation. However, the `ValidationBackend` interface types `validate` as `Promise<OperationOutcomeIssue[]>`, and any future backend implementation (or a `getProfile` function that throws) will produce an unhandled rejection — leaving the chip permanently in the "…" (pending) state with no user feedback and an uncaught error in the console.

**Fix:**
```ts
backend.validate(resource).then((issues) => {
  if (!cancelled) setIssueCount(issues.length);
}).catch(() => {
  if (!cancelled) setIssueCount(0); // or a dedicated error state
});
```

---

### WR-02: Truncation alert title always shows "150" regardless of actual node count

**File:** `src/components/explorer/ResourceGraphView.tsx:216`

**Issue:** The alert title reads `` `Showing 150 of ${nodeCount}+ nodes` ``. `nodeCount` is derived from `reactFlowGraph.nodes.length`, which is already the truncated set (capped at `MAX_NODES = 150`). Since truncation only fires when `nodes.size >= 150`, `nodeCount` will always equal 150 when this alert renders, making the message tautologically "Showing 150 of 150+ nodes". The `+` suffix is correct in intent (there are more nodes not shown) but the hardcoded constant belongs in the string, not the variable.

**Fix:**
```tsx
title={`Graph truncated at ${MAX_NODES} nodes`}
```
Or import `MAX_NODES` from `useGraphBfs` and use it:
```tsx
import { MAX_DEPTH, MAX_NODES, useGraphBfs } from './useGraphBfs';
// ...
title={`Showing first ${MAX_NODES} nodes`}
```

---

### WR-03: React key collision risk in KeyFieldsTable for generic-fallback resources

**File:** `src/components/explorer/KeyFieldsTable.tsx:38`

**Issue:** `<Table.Tr key={f.label}>` uses the field label as the React key. For typed pickers (the 8 bundled types) all labels are unique, so this is safe. For the generic fallback, `f.label` is the raw object key from the FHIR resource — in practice unique per resource, but if a FHIR resource ever has two sibling fields that stringify to identical labels (unlikely but possible with unusual property names), React will emit a console warning and potentially render incorrectly.

More practically: the `f.label` value for the generic fallback comes directly from `Object.keys(r)`, which are object keys and therefore unique within a single resource object. The risk is low in practice, but using a stable index-based key would be safer since there is no meaningful ordering concern for the key attribute here.

**Fix:**
```tsx
{fields.map((f, i) => (
  <Table.Tr key={i}>
```
Using index is appropriate here because the list order is stable within a render (it does not reorder, filter, or animate).

---

## Info

### IN-01: Deprecated `JSX.Element` return type in `renderLineNumberedJson`

**File:** `src/components/json/JsonViewer.tsx:59`

**Issue:** `function renderLineNumberedJson(resource: Resource): JSX.Element` uses the global `JSX` namespace which is deprecated in React 18/19 with the new JSX transform. The preferred type is `React.JSX.Element` or simply `React.ReactElement`.

**Fix:**
```ts
import type React from 'react';
// ...
function renderLineNumberedJson(resource: Resource): React.JSX.Element {
```

---

### IN-02: `display-modes.test.tsx` provides no rendering coverage

**File:** `src/__tests__/display-modes.test.tsx`

**Issue:** Both tests only assert `typeof HumanReadableView === 'function'` and inspect the module's export keys. No rendering occurs. The file is named `display-modes.test.tsx` which implies mode-switching coverage, but it only verifies the module exists and does not import `ResourceForm`. This is a placeholder, not a functional test, and may give false confidence in CI.

**Fix:** Either expand the test to render `HumanReadableView` with a stub resource inside a `MantineProvider` + `MemoryRouter`, or rename the file to reflect its actual scope (e.g., `human-readable-view.smoke.test.tsx`).

---

### IN-03: Duplicate resource fetch in Graph mode when embedded in ResourceDetailPage

**File:** `src/components/explorer/ResourceGraphView.tsx:75-93`

**Issue:** `ResourceGraphView` fetches the root resource itself via `client.readResource()` using `useParams`. When it is embedded as a `Tabs.Panel` inside `ResourceDetailPage` (Graph mode), the parent has already fetched the same resource. This results in a duplicate network call for the same `resourceType/id`. The resource is not passed as a prop — `ResourceGraphView` is always self-fetching, which was the prior standalone design.

This is an architectural info-level note, not a correctness bug (both fetches should return the same data). Fixing it would require either passing `resource` as a prop to `ResourceGraphView` (changing its contract) or memoizing the client cache — both are out of scope for this phase.

**Fix (future):** Accept an optional `resource?: Resource` prop on `ResourceGraphView`; if provided, skip the internal fetch. `ResourceDetailPage` passes its already-fetched resource; the standalone `/graph` route continues to pass nothing (triggering the internal fetch as today).

---

### IN-04: Commented `eslint-disable` for non-interactive `div` carrying a click handler

**File:** `src/components/explorer/ResourceDetailPage.tsx:203`

**Issue:** The `onClick` handler is placed on a `<div>` used for reference-click interception:
```tsx
{/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
<div onClick={handleReferenceClick}>
```
The suppress-comment is correct (the div is a delegation container, not an interactive element), but the interaction is purely pointer-based — keyboard users who tab to a Medplum `ReferenceDisplay` link and press Enter will not trigger the interception handler because `handleReferenceClick` only fires on `onClick` (mouse events), not keyboard `keydown`. Keyboard activation of the same `<a href>` elements would navigate away from the app.

This is a pre-existing accessibility gap, not introduced by this phase, and is acceptable for a local dev tool. Flagging for awareness.

**Fix (optional):** Add `onKeyDown={handleReferenceKeyDown}` that intercepts `Enter` key presses on anchor descendants, mirroring the `onClick` logic.

---

_Reviewed: 2026-05-04_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
