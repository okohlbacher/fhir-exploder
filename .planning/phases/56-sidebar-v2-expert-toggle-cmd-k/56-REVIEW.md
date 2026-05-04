---
phase: 56-sidebar-v2-expert-toggle-cmd-k
reviewed: 2026-05-04T00:00:00Z
depth: standard
files_reviewed: 9
files_reviewed_list:
  - src/contexts/ExpertModeContext.tsx
  - src/components/layout/Spotlight.tsx
  - src/components/layout/AppLayout.tsx
  - src/main.tsx
  - src/components/layout/Sidebar.tsx
  - src/components/explorer/SearchResultsPage.tsx
  - src/__tests__/expert-mode-context.test.tsx
  - src/__tests__/spotlight-cmd-k.test.tsx
  - src/__tests__/expert-toggle.test.tsx
findings:
  critical: 0
  warning: 2
  info: 2
  total: 4
status: issues_found
---

# Phase 56: Code Review Report

**Reviewed:** 2026-05-04
**Depth:** standard
**Files Reviewed:** 9
**Status:** issues_found — no showstoppers; 2 warnings to address before shipping

## Summary

Phase 56 delivers `ExpertModeContext`, the `AppSpotlight` ⌘K palette, and Sidebar v2 polish. The implementation is clean and well-structured. No critical issues were found — XSS risk is absent (server URL rendered as `Text` content, not HTML), and the localStorage key `app.expertMode.v1` is sufficiently namespaced. Two warnings need attention: `AppSpotlight` is mounted outside the Mantine `SpotlightProvider` tree (causes a runtime crash on open), and `useResourceCounts` is called unconditionally in `Sidebar` even when disconnected, firing N×`_summary=count` requests on every sidebar render whenever connected. Two info items cover minor quality points.

---

## Warnings

### WR-01: `AppSpotlight` mounted outside `SpotlightProvider` — runtime crash on ⌘K

**File:** `src/components/layout/AppLayout.tsx:41`

**Issue:** `AppSpotlight` is placed as a sibling of `AppShell`, not wrapped in `SpotlightProvider`. `@mantine/spotlight` requires `SpotlightProvider` in the tree for its store context. Without it, `openSpotlight()` and the `<Spotlight>` component itself throw on first use. Mantine's Spotlight store is separate from `MantineProvider`.

**Fix:**
```tsx
// In AppLayout.tsx, wrap the subtree (or just AppSpotlight) in SpotlightProvider:
import { SpotlightProvider } from '@mantine/spotlight';

export function AppLayout({ connectionStatus }: AppLayoutProps) {
  return (
    <ExpertModeProvider>
      <SpotlightProvider>
        <AppSpotlight />
        <AppShell ...>
          ...
        </AppShell>
      </SpotlightProvider>
    </ExpertModeProvider>
  );
}
```

Verify via `npm run dev` — pressing ⌘K before this fix produces a React context error in the console.

---

### WR-02: `useResourceCounts` called unconditionally in `Sidebar` — fires N count fetches on every render when connected

**File:** `src/components/layout/Sidebar.tsx:237`

**Issue:** `useResourceCounts(client, typeNames)` fires up to N concurrent `_summary=count` FHIR requests every time `Sidebar` mounts or re-renders with a connected client. `Sidebar` is always mounted (it is the AppShell navbar), so this runs on every navigation and any state update that reaches the sidebar. While `useResourceCounts` has a module-scope cache that absorbs subsequent calls for the same server + type pair, the initial load (or after a cache clear) issues O(N) requests where N is the capability resource type count — typically 100–150 on Blaze. This may overload Blaze in low-resource environments and blocks the sidebar from rendering the count badge until all `_summary=count` requests settle.

The cache mitigates repeated costs, but the on-mount fire is unconditional regardless of whether the Explorer count badge is visible on the current route.

**Fix:** Gate the fetch behind a condition — only fetch when the user is on the `/explorer` route, or pass `client = null` when the sidebar is not on an explorer route:

```tsx
const explorerMatch = useMatch({ path: '/explorer', end: false });
const countClient = explorerMatch ? client : null;
const counts = useResourceCounts(countClient, typeNames);
```

This preserves the cache (a null client returns `{}` immediately per hook contract) while eliminating the fetch for every other route.

---

## Info

### IN-01: `navigate` included in `useMemo` deps for Spotlight actions — unnecessary but harmless

**File:** `src/components/layout/Spotlight.tsx:65`

**Issue:** `navigate` from `useNavigate()` is stable across renders (React Router guarantees reference stability), so including it in the `useMemo([query, parsedTypes, navigate])` dep array is harmless but adds noise. ESLint `exhaustive-deps` would require it anyway — leave it; no action needed.

---

### IN-02: `setExpert` callback wraps `setIsExpert` with no additional logic — redundant

**File:** `src/contexts/ExpertModeContext.tsx:25`

**Issue:** `setExpert` is `useCallback((value) => setIsExpert(value), [setIsExpert])`, which is exactly `setIsExpert` itself. Exposing the wrapped version is fine for API ergonomics (shields consumers from Mantine's internal `useLocalStorage` setter type), but if `setIsExpert` is a stable reference (Mantine guarantees this), the wrapper adds a needless indirection and extra closure allocation.

**Fix (optional):** Either expose `setIsExpert` directly in context, or document why the wrapper is intentional. No bug risk — this is a style note.

---

_Reviewed: 2026-05-04_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
