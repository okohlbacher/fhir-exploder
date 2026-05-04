# Phase 52: Code Review — JSON Peek Drawer Foundation

**Reviewed:** 2026-05-04
**Depth:** Standard
**Files Reviewed:** 10

---

## Summary

Phase 52 introduces the JSON peek drawer (420px right-side Mantine `Drawer`), a
shared `useShortcuts` hook, the `PeekContext`, and a `JsonViewer` extraction
shim. The implementation is well-structured and the design decisions documented
in `CONTEXT.md` are correctly reflected in the code.

No BLOCKER issues were found. Three ADVISORY issues and two NITPICK items are
documented below.

---

## ADVISORY Issues

### ADV-01: `onBlur` relatedTarget guard does not cover the drawer's portal node

**File:** `src/components/explorer/SearchResultsPage.tsx:442-450`

**Issue:** When focus moves from a focused `<Table.Tr>` into the drawer,
`tbody.contains(relatedTarget)` will be `false` because Mantine renders the
`Drawer` in a portal appended to `document.body`, outside the table's DOM
subtree. The guard therefore falls through and calls `setFocusedResource(null)`
before the J shortcut handler has a chance to capture `focusedResource` in its
closure via `openPeek`.

In practice this works today because `handleJ` is called synchronously by
`useShortcuts` on the `keydown` event — React's `onBlur` fires on `focusin`/
`focusout` *before* the key handler when the user Tabs into the drawer, but the
J shortcut is pressed *while the row is still focused*, so the order is:
1. keydown J → `handleJ` reads `focusedResource` (non-null) → `openPeek()`
2. focus moves to drawer → `onBlur` fires → `setFocusedResource(null)`

However, the guard comment says "keep focusedResource when focus moves into the
drawer (trapFocus)" — that intent is never actually satisfied. Any re-open
scenario that starts with focus already in the drawer (e.g. user returns focus
to a row while the drawer is open) would behave unexpectedly if the comment's
intent were relied upon.

**Fix:** If the comment's stated invariant is needed for a future scenario,
add a drawer-portal sentinel. For now, remove the misleading comment line
"or into the drawer (trapFocus)" and document the real invariant: `focusedResource`
is read synchronously on keydown before blur can fire.

```diff
-  // Pitfall 2: keep focusedResource when focus moves within the
-  // table tbody (e.g. another row) or into the drawer (trapFocus).
-  // Only clear when focus leaves the tbody entirely.
+  // Keep focusedResource when focus stays within the same tbody
+  // (e.g. Tab to next row). Clear when focus leaves the table entirely.
+  // Note: the drawer is a portal outside this tbody, so focus moving
+  // INTO the drawer WILL clear focusedResource — this is safe because
+  // handleJ reads focusedResource synchronously on keydown, before blur fires.
   const next = e.relatedTarget as Node | null;
   const tbody = (e.currentTarget as HTMLElement).closest('tbody');
   if (!next || !tbody?.contains(next)) {
     setFocusedResource(null);
   }
```

---

### ADV-02: `useShortcuts` does not call `e.preventDefault()` — Enter scrolls the page

**File:** `src/hooks/useShortcuts.ts:26-31`

**Issue:** The `handleKeyDown` handler calls the user-provided handler but never
calls `e.preventDefault()`. For the `Enter` key registered in `JsonPeekDrawer`,
this means that when the drawer is open and Enter is pressed (triggering
navigation), the browser also processes the default `Enter` behavior for the
focused element — typically form submission or scrolling. Since focus lives inside
the Mantine `Drawer` (trapFocus is on) and the focused element is likely the
drawer container `<div>` or a focusable child, the effect in practice is probably
silent. But for the `j` shortcut (registered while the table is focused), the
default behavior of a `KeyboardEvent` on a `tabIndex=0` row is no-op, so the risk
is low today.

The more immediate concern is if a future shortcut uses Space, ArrowDown, or any
scroll key — those will scroll the page AND fire the handler.

**Fix:** Either (a) call `e.preventDefault()` inside the handlers that need it
(caller responsibility, documented in JSDoc), or (b) pass a flag through the
shortcut map to opt-in:

Simplest safe option — document caller responsibility in the JSDoc:

```typescript
/**
 * ...
 * Handlers are responsible for calling e.preventDefault() if they want to
 * suppress the browser's default key behavior. useShortcuts does not
 * suppress defaults automatically.
 */
```

Or, for the Enter shortcut specifically, add `e.preventDefault()` in the
`JsonPeekDrawer` handler before navigating:

```typescript
// In JsonPeekDrawer — update useShortcuts signature to pass KeyboardEvent:
useShortcuts(
  {
    Enter: (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'BUTTON' || tag === 'A') return;
      e.preventDefault(); // suppress default Enter behavior in drawer
      handleOpenFull();
    },
  },
  opened,
);
```

This would require changing the hook signature from `Record<string, () => void>`
to `Record<string, (e: KeyboardEvent) => void>` and passing `e` to the handler.

---

### ADV-03: Inline `<style>` tag in `JsonTreeView` is injected on every render

**File:** `src/components/explorer/JsonTreeView.tsx:118-122`

**Issue:** `JsonTreeView` renders a `<style>` tag inline inside its JSX on every
render. While React deduplicates DOM nodes via reconciliation, this pattern
creates a stylesheet node inside the component tree (not in `<head>`) and can
cause specificity surprises if the component is mounted multiple times
(e.g., once in `DeveloperJsonView` and once in `JsonPeekDrawer` simultaneously).

This file is not new in Phase 52, but `JsonViewer` now instantiates it in two
contexts (drawer + detail page), making this more observable.

**Fix:** Move the hover rule to a CSS module (`JsonTreeView.module.css`) using
Mantine's `useStyles` or a plain `.module.css` import:

```css
/* JsonTreeView.module.css */
.row:hover {
  background: var(--mantine-color-gray-0);
}
```

```tsx
import classes from './JsonTreeView.module.css';
// ...
className={classes.row}
```

Alternatively, use Mantine's `sx` prop or inline `onMouseEnter`/`onMouseLeave`
state if a CSS module file is undesirable.

---

## NITPICK Items

### NIT-01: `closePeek` does not clear `peekState` — stale resource stays in memory

**File:** `src/contexts/PeekContext.tsx:48-53`

**Issue:** `closePeek` only calls `close()` (sets `opened = false`). `peekState`
retains the last-peeked resource until the next `openPeek` call. The comment
explains this is deliberate ("focus restore needs peekState.originElement before
peekState is cleared"), which is correct. However, peekState is never cleared
even after focus is restored, meaning the previous FHIR resource object stays
in memory until a new peek is opened. For large resources this is a minor memory
overhead.

This is a nitpick, not a correctness issue, since `opened=false` gates all
rendering and the resource reference is held by the FHIR result set anyway.

**Suggestion:** If future phases add a "peek history" or the resource can be
large, clear peekState in an effect when `opened` transitions to false. No
action needed now.

---

### NIT-02: `ContentSwap` test name refers to PEEK-02 but tests a PEEK-01 scenario

**File:** `src/__tests__/peek-drawer.test.tsx:143`

**Issue:** The test at line 143 is titled "content swaps without unmounting when
openPeek is called with a different resource (PEEK-02)" but it is actually
verifying the content-replacement behavior of `openPeek` — which is PEEK-01
(open with resource). PEEK-02 is the focus-return requirement. The test is
correct; only its tag comment is mislabelled.

**Suggestion:** Rename to `(PEEK-01 content swap)` or untag it since it is an
extension of the open behavior, not the focus-return behavior.

---

## Test Coverage Assessment

The test suite is comprehensive for the stated requirements:

| Requirement | Test | File | Status |
|---|---|---|---|
| PEEK-01: J opens drawer | `J on focused row opens the drawer` | peek-srp-integration | Covered |
| PEEK-01: drawer shows resourceType/id | `opens drawer with resourceType/id title` | peek-drawer | Covered |
| PEEK-02: Esc closes drawer | `Esc closes the drawer` | peek-drawer | Covered |
| PEEK-02: focus returned to origin | `focuses the originElement after Esc` | peek-drawer | Covered |
| PEEK-02: J on different row | `J on a different focused row` | peek-srp-integration | Covered |
| PEEK-03: Enter navigates | `Enter while drawer open navigates` | peek-drawer | Covered |
| PEEK-03: BUTTON guard | `Enter does NOT navigate when focus is on BUTTON` | peek-drawer | Covered |
| PEEK-03: Open full button | `clicking Open full → navigates` | peek-drawer | Covered |
| Input focus guard | `J does not open drawer when INPUT focused` | peek-srp-integration | Covered |
| J with no focused row | `J without a focused row does nothing` | peek-srp-integration | Covered |
| Hook cleanup | `removes the keydown listener on unmount` | useShortcuts | Covered |

One gap: there is no test for `J` when `enabled=false` (the second parameter to
`useShortcuts`) propagated through the drawer context — i.e., pressing J while
the drawer is already open should not re-open a second peek. This is guarded by
`useShortcuts({ j: handleJ })` always being enabled (no second argument), which
means `handleJ` will call `openPeek` even if the drawer is open. `openPeek`
replaces `peekState` with the same resource and re-calls `open()`, which is
idempotent in `useDisclosure`. Not a bug, but the behavior is untested.

---

## Security Assessment

| Area | Finding |
|---|---|
| XSS via FHIR fields | `{r.id}` and `{resourceType}/{id}` rendered as React text nodes — no `dangerouslySetInnerHTML`, no injection vector. |
| XSS via JsonTreeView | String values rendered via Mantine `<Text>` with `{display}` — React-escaped. No injection vector. |
| URL injection in navigate | `navigate(\`/explorer/${resourceType}/${id}?mode=json\`)` — values come from the FHIR server's own resource payload, not from user input. Acceptable for a local tool. |
| originElement focus injection | `origin?.focus()` — `origin` is `document.activeElement` at the time of J press, always a real DOM element from the current page. No injection vector. |

No security issues found.

---

## CODE REVIEW: PASS

No BLOCKER findings. Phase 52 is complete and ready for human UAT.
ADV-01 through ADV-03 are recommended for Phase 53 or a dedicated cleanup phase
but do not block this phase's completion.
