---
phase: 19-quality-trends-pdf-reports
reviewed: 2026-04-14T00:00:00Z
depth: standard
files_reviewed: 18
files_reviewed_list:
  - src/quality/trendsHistory.ts
  - src/quality/__tests__/trendsHistory.test.ts
  - src/quality/__tests__/capture-snapshot.test.ts
  - src/quality/__tests__/pdf-filename.test.ts
  - src/quality/__tests__/trends-breach.test.ts
  - src/quality/__tests__/trends-filter.test.ts
  - src/hooks/useTrendsHistory.ts
  - src/components/quality/TrendMiniChart.tsx
  - src/components/quality/TrendOverlayChart.tsx
  - src/components/quality/TrendsPanel.tsx
  - src/components/quality/PdfReportLayout.tsx
  - src/components/quality/QualityOverviewPage.tsx
  - src/quality/pdfExport.ts
  - src/__tests__/use-trends-history.test.tsx
  - src/__tests__/trends-panel.test.tsx
  - src/__tests__/pdf-report-layout.test.tsx
  - src/quality/__tests__/pdfExport.test.ts
findings:
  critical: 0
  warning: 4
  info: 8
  total: 12
status: issues_found
---

# Phase 19: Code Review Report

**Reviewed:** 2026-04-14
**Depth:** standard
**Files Reviewed:** 17 source + 7 test files (18 unique paths, `trendsHistory.ts` contains both data layer and PDF filename helpers)
**Status:** issues_found

## Summary

Phase 19 adds the Quality Trends tab and PDF report export. The code is well-documented, the pure-data layer (`trendsHistory.ts`) is tightly scoped and well-tested, and the hydration gate pattern in `useTrendsHistory` correctly mirrors Phase 18's WR-04 fix. Security posture is strong: the `serverUrlSlug` sanitizer is the only path from user-supplied `settings.yaml` into the filesystem and is well-fenced, `localStorage` quota errors surface through notifications per T-19-09, and the PDF contains only rasterized PNGs (no executable content per T-19-15).

Four warnings concern correctness around snapshot ordering assumptions, nested `Card` rendering in the PDF trend page, a test-driven fallback in production code that masks real failures, and a double-write pattern in `useTrendsHistory.append`. The remaining items are informational (duplicated `METRIC_KEYS`, missing memoization for derived data in `TrendMiniChart`, minor a11y polish, slug sanitizer coverage of control chars, state update on unmount in PDF export flow, and page-index logging).

No critical issues were found. No security vulnerabilities were found at standard review depth.

## Warnings

### WR-01: Snapshot ordering not enforced before chart / PDF rendering

**Files:**
- `src/components/quality/TrendMiniChart.tsx:200-208`
- `src/components/quality/TrendOverlayChart.tsx:115-126`
- `src/components/quality/PdfReportLayout.tsx:326-330`

**Issue:** `TrendMiniChart`, `TrendOverlayChart`, and the "captured between" line in `PdfReportLayout` all assume `snapshots` are sorted by `capturedAt` ascending. The hook `useTrendsHistory` only guarantees chronological order if the array is ONLY mutated via `append` — but users can tamper with `localStorage` directly, and `filterSnapshotsByServer` preserves input order (not chronological order). A non-monotonic X axis with `curveType="monotone"` produces a visually-misleading line that zig-zags backwards in time. The `PdfReportLayout` "captured between `snapshots[0]` and `snapshots[length-1]`" line is simply wrong if the array is not sorted.

**Fix:** Sort in one authoritative place (either in the hook on read, or in a helper used by every consumer):

```ts
// In trendsHistory.ts
export function sortSnapshotsByCapturedAt(
  snapshots: QualitySnapshot[],
): QualitySnapshot[] {
  return [...snapshots].sort((a, b) =>
    a.capturedAt.localeCompare(b.capturedAt),
  );
}
```

Then in `TrendMiniChart`, `TrendOverlayChart`, and `PdfReportLayout` (or, cheaper, in `useTrendsHistory`'s `snapshots` memo) apply `sortSnapshotsByCapturedAt` before rendering / deriving date ranges. The existing `filterSnapshotsByServer` test pins "preserves original order" as a contract, so the sort belongs downstream of that filter, not inside it.

---

### WR-02: `TrendMiniChart` compact mode renders a `Card` nested inside PDF `Card`

**Files:**
- `src/components/quality/TrendMiniChart.tsx:212-252`
- `src/components/quality/PdfReportLayout.tsx:302-323`

**Issue:** `PdfReportLayout` wraps each trend mini-chart in an outer 176×180 `<Card>` (with header strip for metric label + icon). Inside that Card, it renders `<TrendMiniChart ... compact />` — and `TrendMiniChart` in compact mode ALSO renders a `<Card withBorder>` at 120×40. This produces nested Cards with two borders, two radii, and the inner 120-wide card sitting inside the 176-wide outer card, leaving uneven whitespace. The `data-compact="true"` attribute on the inner card is used by a test (`trends-panel.test.tsx:311-314`), so the nested card is intentional for the test, but from a rendered-PDF standpoint this is a visual bug.

**Fix:** Either drop the outer Card + header in `PdfReportLayout` and let compact `TrendMiniChart` own the tile, OR drop the inner Card in compact mode (render `<div data-compact="true">` wrapping the `LineChart` directly). The latter is less invasive:

```tsx
if (compact) {
  return (
    <div data-compact="true" style={{ width: 120, height: 40 }}>
      <LineChart ... />
    </div>
  );
}
```

---

### WR-03: Test-shaped fallback in production `pdfExport` silently masks ref-population failures

**File:** `src/quality/pdfExport.ts:123-135`

**Issue:** The loop reads `pageRefs[i].current` and falls back to `portalHost` if `el == null` "so toPng's mock is still exercised without a hard failure." In production this fallback swallows a real bug: if any page ref fails to populate (e.g., React commit throws, `PdfReportLayout` mounts with a conditional trends page that never renders, or `createRoot` is called but `render` didn't flush before `waitForPaint` returned), the pipeline silently captures the SAME `portalHost` element for every page. The user gets a PDF with 2-3 identical pages instead of an error, and the failure is invisible.

**Fix:** Fail loud in production; keep the mock convenience only in tests. Either throw and let `finally` run its cleanup:

```ts
for (let i = 0; i < pageRefs.length; i++) {
  const el = pageRefs[i].current;
  if (!el) {
    throw new Error(
      `PDF export: page ${i + 1} ref was not populated — ` +
      `PdfReportLayout did not mount correctly.`,
    );
  }
  const png = await toPng(el, { /* ... */ });
  // ...
}
```

…or restructure the test to stub `createRef` so the mock returns a fake element. The current production-code concession to the test is a WR-level smell.

---

### WR-04: `useTrendsHistory.append` writes to `localStorage` twice per append

**File:** `src/hooks/useTrendsHistory.ts:67-98`

**Issue:** `append` calls `window.localStorage.setItem(TRENDS_STORAGE_KEY, JSON.stringify(next))` directly as a probe (lines 78-80) to surface `QuotaExceededError`, then on success calls `setStored(next)` (line 95). Mantine's `useLocalStorage` `setStored` ALSO writes to `localStorage`. Net result: two `JSON.stringify(next)` + two `setItem` writes per append, with a narrow window where the direct write succeeds but Mantine's internal write silently fails (e.g., if Mantine's serializer differs or a storage event handler runs in between). The data is identical in practice (both use JSON), but the pattern is fragile and couples the hook to Mantine internals.

**Fix:** Either (a) use `estimateSize` to check quota without committing, then delegate fully to Mantine; or (b) replace Mantine's `useLocalStorage` with a hand-rolled `useSyncExternalStore` pattern that owns the write and the error surface:

```ts
const append = useCallback(
  (snap: QualitySnapshot) => {
    const base = Array.isArray(stored) ? stored : [];
    const next = [...base, snap];
    const serialized = JSON.stringify(next);
    // Probe size against ~5MB cap BEFORE any setItem call
    try {
      window.localStorage.setItem(TRENDS_STORAGE_KEY, serialized);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'QuotaExceededError') {
        // Roll back to prior value to keep localStorage + React state consistent
        window.localStorage.setItem(
          TRENDS_STORAGE_KEY,
          JSON.stringify(base),
        );
        notifications.show({ /* ... */ });
        return;
      }
      throw err;
    }
    // No Mantine re-write — manually sync React state via storage event.
    // (Or: keep setStored and accept the double-write as a known trade-off.)
    setStored(next);
  },
  [stored, setStored],
);
```

At minimum, add a comment explaining the double-write is intentional and document which write "wins" on divergence.

## Info

### IN-01: `serverUrlSlug` does not strip ASCII control characters or null bytes

**File:** `src/quality/trendsHistory.ts:142-150`

**Issue:** The slug sanitizer's contract is "filesystem-safe" but only strips `[:/\\?#&]`. ASCII control chars (0x00-0x1F), null bytes, and unicode BiDi marks (U+202E etc.) would pass through. A maliciously crafted `settings.yaml` with `serverUrl: "http://host\u202Etxt.pdf"` could produce a filename with embedded RLO that renders deceptively. Low risk for a local-first app (the attacker already has write access to settings.yaml), but the sanitizer contract should explicitly whitelist safe characters instead of blacklisting known-unsafe ones.

**Fix:** Switch from blacklist to whitelist:

```ts
const cleaned = url
  .replace(/^https?:\/\//i, '')
  .replace(/\/fhir\/?$/i, '')
  .replace(/[^a-zA-Z0-9.-]+/g, '-')  // whitelist: alphanumerics, dot, dash
  .replace(/^-+|-+$/g, '')
  .slice(0, 60);
```

Tests at `pdf-filename.test.ts:33-44` already assert the blacklist contract; extending them to cover control chars is cheap.

---

### IN-02: `TrendMiniChart.chartData` recomputed on every render

**File:** `src/components/quality/TrendMiniChart.tsx:199-208`

**Issue:** `sortedServers` (O(n log n) sort) and `chartData` (O(n) map with an O(k) `indexOf` per point → O(n·k)) are computed outside any `useMemo`. For each `TrendMiniChart`, and there are 7 of them per render of `TrendsPanel`, this work repeats. At 500 snapshots (the soft limit), this is 7 × 500 = 3500 map iterations per render, plus 7 sorts. Not a correctness issue, but a future-proofing opportunity. Out of v1 performance scope per review guidelines, but noted.

**Fix:**

```ts
const chartData = useMemo<TrendPoint[]>(() => {
  const sortedServers = Array.from(
    new Set(snapshots.map((s) => s.serverUrl)),
  ).sort();
  return snapshots.map((s) => ({ /* ... */ }));
}, [snapshots, metric]);
```

---

### IN-03: `METRIC_KEYS` / `METRIC_ORDER` duplicated in four files

**Files:**
- `src/quality/trendsHistory.ts:82-90`
- `src/components/quality/TrendsPanel.tsx:46-54`
- `src/components/quality/PdfReportLayout.tsx:48-56`
- `src/components/quality/QualityOverviewPage.tsx:136-144` (inline in `handleExport`)

**Issue:** The 7-element ordered list of `MetricKey`s appears as a top-level `const` in three files and as an inline `const` inside `handleExport`. All four are identical. If a future phase adds an 8th metric, three of these will update and one will silently drift.

**Fix:** Export a single source of truth from `src/quality/thresholds.ts`:

```ts
export const METRIC_KEYS_ORDERED: readonly MetricKey[] = [
  'completeness', 'coverage', 'validation', 'plausibility',
  'labRanges', 'duplicates', 'references',
] as const;
```

Then delete the three top-level re-declarations and the inline one. Keep the name as `METRIC_KEYS_ORDERED` to distinguish from any unordered set.

---

### IN-04: `QualityOverviewPage.handleExport` can call `setExporting(false)` on an unmounted component

**File:** `src/components/quality/QualityOverviewPage.tsx:133-199`

**Issue:** The PDF pipeline is 2-5 seconds. If the user navigates away mid-export (e.g., clicks "Back to Home"), `setExporting(false)` in `finally` fires on an unmounted component. React 18 tolerates this silently, but it indicates an unhandled lifecycle race: the export continues in the background, rendering the portal, saving the PDF (which then downloads), even though the user left the page.

**Fix:** Track mounted state or abort on unmount:

```ts
const mountedRef = useRef(true);
useEffect(() => () => { mountedRef.current = false; }, []);
// ...
} finally {
  if (mountedRef.current) setExporting(false);
}
```

A stronger fix would accept an `AbortSignal` in `exportQualityPdf` and bail early between pages, but for a 2-5s pipeline the mounted-ref guard is sufficient.

---

### IN-05: `pdfExport` does not log which page failed on `toPng` rejection

**File:** `src/quality/pdfExport.ts:123-138`

**Issue:** If `toPng(pageRefs[2].current)` rejects on the trends page, the error surfaces as a bare exception with no context about which page failed. QualityOverviewPage's `catch` writes `console.error(err)` but the user sees only a red notification "Could not generate PDF". Debugging requires source inspection.

**Fix:** Wrap the per-page call with context:

```ts
for (let i = 0; i < pageRefs.length; i++) {
  const el = pageRefs[i].current;
  const pageName = ['cover', 'overview', 'trends'][i] ?? `page-${i}`;
  try {
    const png = await toPng(el!, { /* ... */ });
    if (i > 0) doc.addPage([PAGE_WIDTH, PAGE_HEIGHT], 'portrait');
    doc.addImage(png, 'PNG', 0, 0, PAGE_WIDTH, PAGE_HEIGHT, undefined, 'FAST');
  } catch (err) {
    throw new Error(`PDF export failed on ${pageName} page: ${String(err)}`, { cause: err });
  }
}
```

---

### IN-06: Destructive "Clear history" confirm button lacks `aria-describedby`

**File:** `src/components/quality/TrendsPanel.tsx:239-262`

**Issue:** The Modal has `title="Clear all snapshots?"` and body text explaining the consequences, but the destructive red "Clear history" button does not explicitly reference the body copy via `aria-describedby`. Screen-reader users tabbing to the button may hear only "Clear history, button" without the "cannot be recovered" warning. Mantine's Modal focuses the close button by default; destructive confirmations should announce the consequence.

**Fix:**

```tsx
<Text size="sm" id="clear-history-warning">
  This will remove all {snapshots.length} snapshot(s)…
</Text>
// ...
<Button color="red" onClick={handleConfirmClear} aria-describedby="clear-history-warning">
  Clear history
</Button>
```

---

### IN-07: `EmptyState.onCapture` may be `undefined`, rendering a no-op button

**File:** `src/components/quality/TrendsPanel.tsx:89-97`

**Issue:** `EmptyState` renders a "Capture snapshot" Button with `onClick={onCapture}`. When `onCapture` is `undefined` (Plan 02 pre-wiring, or consumers that don't pass it), the button still renders and clicking does nothing. Expected callers always pass it post-Plan 03, but the defensive default produces a dead button. Consider disabling when no handler is provided:

**Fix:**

```tsx
<Button
  variant="filled"
  color="blue"
  leftSection={<IconCamera size={16} />}
  onClick={onCapture}
  disabled={!onCapture}
  aria-label={
    onCapture
      ? 'Capture snapshot'
      : 'Capture snapshot (action is not available in this context).'
  }
>
  Capture snapshot
</Button>
```

---

### IN-08: `TrendOverlayChart` constructs a new dot component class per series on every render

**File:** `src/components/quality/TrendOverlayChart.tsx:157-169`

**Issue:** When `applyShapeRotation` is true, the `OVERLAY_SERIES.map` block calls `makeServerShapeDot(s.color)` — a higher-order component factory — inline. Each render creates 7 new component functions. Recharts' `<Line dot={<DotComponent />}>` receives fresh component identity each time, potentially defeating recharts' internal memoization and forcing dot re-renders. Low risk since `isAnimationActive={false}` but worth noting.

**Fix:** Hoist the 7 components to module scope (one per palette color), or memoize via `useMemo`:

```ts
const DOT_COMPONENTS = Object.fromEntries(
  OVERLAY_SERIES.map((s) => [s.name, makeServerShapeDot(s.color)]),
) as Record<string, ReturnType<typeof makeServerShapeDot>>;
```

Then look up by `s.name` in the render.

---

_Reviewed: 2026-04-14_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
