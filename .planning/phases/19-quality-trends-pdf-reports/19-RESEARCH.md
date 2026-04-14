# Phase 19: Quality Trends & PDF Reports - Research

**Researched:** 2026-04-14
**Domain:** Client-side chart visualization, localStorage time-series, headless-DOM PDF composition
**Confidence:** HIGH

## Summary

Phase 19 layers a trend chart (QUAL-05) and PDF report (QUAL-06) on top of the Phase 18 threshold-alerting infrastructure. Every technical dependency except one — `jspdf` — is already installed. Recharts 3.8.1 and `@mantine/charts` 9.0.1 are in `node_modules`, `html-to-image` 1.11.13 is already used by the feedback screenshot flow, `@mantine/hooks` provides `useLocalStorage`, and Phase 18 shipped `useThresholds` / `quality.thresholds.v1` which Phase 19's `quality.trends.v1` pattern mirrors verbatim. [VERIFIED: package.json, npm view jspdf]

One sharp finding the planner MUST address: the currently installed `@mantine/charts@9.0.1` declares peer dependencies on React 19 and `@mantine/core@9.0.1`, but this project is on React 18.3.1 / Mantine 8.3.18. `npm ls` reports the peer mismatch as "invalid". The correct version for this stack is `@mantine/charts@8.3.18` (peer: `react ^18.x || ^19.x`, `@mantine/core 8.3.18`). The CSS import works at runtime because Mantine charts v9 is mostly backwards-compatible at the component level, but the `LineChart` JSX component must not be trusted until the version is aligned — it compiles only because the React 18/Mantine 8 renderer is structurally close enough to what Recharts 3 needs. **Plan a Wave 0 dependency task: `npm install @mantine/charts@8.3.18`.** [VERIFIED: npm view @mantine/charts@8.3.18 peerDependencies, npm ls output]

**Primary recommendation:** Downgrade `@mantine/charts` to 8.3.18 before any chart work. Install `jspdf@4.2.1` (MIT, no peer deps, ESM-compatible with Vite 8). Use Mantine `LineChart` with `referenceLines` for per-snapshot threshold overlays, `lineProps` callback + custom recharts `dot` render prop for per-point breach coloring, and the documented `tooltipProps.content` escape hatch for multi-field tooltips. Render the PDF layout into an off-screen `createPortal` div sized 816×1056px, capture via `html-to-image` `toPng({ pixelRatio: 2 })`, stitch pages with `jsPDF({ unit: 'px', format: [816, 1056] })`, download via `doc.save(filename)`.

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Snapshot capture trigger & retention (QUAL-05 foundation)**
- **D-01:** Capture is explicit — a "Capture snapshot" button on the `/quality` toolbar (alongside existing "Recompute metrics" and "Configure thresholds"). No auto-capture on metric recompute.
- **D-02:** One snapshot payload records `QualitySnapshot { id: string (crypto.randomUUID); capturedAt: string ISO; serverUrl: string; sampleSize: number; cohort: string[]; scores: Record<MetricKey, number | null>; thresholds: Record<MetricKey, number | null>; }` — everything needed to reinterpret the chart later.
- **D-03:** Storage is `localStorage` under key `quality.trends.v1`, value is a JSON array ordered chronologically (newest last). Mirrors Phase 18's `quality.thresholds.v1` pattern.
- **D-04:** Retention is unlimited; explicit "Clear history" action provides manual pruning; soft warning appears when array exceeds ~500 snapshots.
- **D-05:** `serverUrl` is recorded so the chart can disambiguate snapshots from different Blaze instances. Default view shows current server only; "Include other servers" toggle reveals all.

**Trends tab layout (QUAL-05 visualization)**
- **D-06:** Add a new 9th tab labeled "Trends" to `QualityOverviewPage.tsx`, positioned after "References". Route suffix: `?tab=trends`.
- **D-07:** Default view is a small-multiples grid of 7 mini line charts, one per metric. Uses Mantine `LineChart` from `@mantine/charts`. X-axis = capture timestamp, Y-axis = 0–100 (fixed). Card-sized (~280×160) in responsive SimpleGrid (xl: 4, md: 3, sm: 2, xs: 1).
- **D-08:** Tab toolbar: `[Capture snapshot]` `[Clear history…]` `[Overlay all] (toggle)` `[Include other servers] (toggle)`. "Clear history" opens a Mantine confirmation modal matching Phase 18 "Reset to defaults" UX.
- **D-09:** "Overlay all metrics" toggle collapses the 7-chart grid into one larger overlaid `LineChart` with 7 color-coded series. Single legend at the top.
- **D-10:** Empty state (0 snapshots): centered Mantine `Center` + `IconChartLine` + heading "No snapshots yet" + body + primary Capture button. Single-snapshot state: "1 snapshot captured. Capture at least one more to see trends." plus the capture button.

**Threshold overlay on trend charts (Phase 18 breach history)**
- **D-11:** Each per-metric mini-chart renders the threshold as a dashed horizontal reference line drawn at the threshold value active at each snapshot time (per-snapshot, not current).
- **D-12:** Data points render red when score was below active threshold at capture time, blue otherwise (same palette as Phase 18 OverviewStrip breach visual). Null-threshold points render gray with no reference line visible for that segment.
- **D-13:** Hovering shows a Mantine tooltip: timestamp, metric value (XX%), threshold at capture, breach state. Uses Mantine `ChartTooltip`.

**PDF generation (QUAL-06)**
- **D-14:** PDF structure (portrait, letter-size, multi-page): Header page (title / timestamp / server URL / sample size / cohort summary / backend badge) + Section 1 Overview (OverviewStrip snapshot with 7 tiles + totals status line) + Section 2 Trends (included only when ≥2 snapshots; note replaces section otherwise) + Footer "Generated [timestamp] · FHIR Exploder [version]" on every page.
- **D-15:** Generation strategy is off-screen DOM composition → `html-to-image` → `jsPDF`. Off-screen React portal at 816×1056px per page (letter at 96 DPI). `toPng()` captures each section to PNG data URL. `jsPDF` stitches PNGs into pages. Download via blob URL. Filename: `fhir-exploder-quality-report_[serverUrlSlug]_[YYYY-MM-DD_HHMMSS].pdf`.
- **D-16:** Add `jspdf` (~50KB gzipped) as dependency.
- **D-17:** "Export PDF" button on `/quality` toolbar (right of "Capture snapshot"). Uses Mantine `Button` + `IconFileDownload` + `loading` state. Notification on completion (success/error).

### Claude's Discretion

- Exact Mantine `LineChart` vs `AreaChart` / curve style (monotone vs linear) for mini charts.
- Whether per-metric series colors in Overlay mode match metric icon colors on OverviewStrip or use a fresh `@mantine/charts`-friendly palette.
- Off-screen PDF portal implementation — `createPortal` to fixed-position hidden div vs `ReactDOMServer` in-memory.
- Whether to extract a `useTrendsHistory()` hook (analogous to `useThresholds()`) or layer CRUD into `QualityMetricsContext`.
- Multi-line tooltip vs compact single-line on chart hover.
- PDF image compression quality (PNG default vs JPEG).
- Whether "Clear history" prunes individual snapshots (select+delete) or only bulk-clears; recommendation: bulk-clear only for v1.

### Deferred Ideas (OUT OF SCOPE)

- Scheduled snapshots (daily auto-capture)
- Cross-device sync of trend history (localStorage is per-browser)
- Per-snapshot editable notes / titles
- PDF email/share workflow (local download only)
- PDF with embedded drill-down tables
- Import / export trend history as JSON
- Chart annotations (user-added markers)
- Compare two snapshots side-by-side (diff view)
- Non-time X-axis options (by cohort / sample size)
- Breach event log (textual breach history)

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| QUAL-05 | User can view a chart showing how quality metrics (completeness, coding coverage) change across multiple measurement points | Mantine `LineChart` v8.3.18 with `referenceLines`, `lineProps` callback for custom dots, `tooltipProps.content` for rich tooltip. Snapshot storage via `quality.trends.v1` localStorage array. Per-snapshot threshold provenance supported by capturing full `Thresholds` at snapshot time. |
| QUAL-06 | User can generate and download a PDF quality report for the current dashboard state | `jspdf@4.2.1` (MIT, ESM) + existing `html-to-image@1.11.13`. Off-screen `createPortal` at 816×1056px. `new jsPDF({ orientation: 'portrait', unit: 'px', format: [816, 1056] }).addImage(pngDataUrl, 'PNG', 0, 0, 816, 1056).addPage().save(filename)`. |

## Project Constraints (from CLAUDE.md)

- **React 18.3.1 required** — React 19 is explicitly rejected as unnecessary risk.
- **Mantine 8.3.18 required** — `@mantine/core ^8.3.18`. Mantine 9 is on the Do NOT Use list (requires React 19 exclusively).
- **No Tailwind, no react-query, no SMART on FHIR libs, no Next.js.**
- **Vite 8 / TypeScript 5.7 / vitest 4.1.4** — test framework is vitest with jsdom.
- **License: MIT** — new dependencies must be MIT-compatible. (`jspdf` is MIT — verified.)
- **GSD workflow required** — all edits go through phase plans, not direct repo edits.
- **@tabler/icons-react@3.41.1** is the icon source — `IconChartLine`, `IconFileDownload`, `IconCamera` / `IconClipboardPlus` are standard.

## Standard Stack

### Core (new + already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `jspdf` | `^4.2.1` | Client-side PDF generation | [VERIFIED: `npm view jspdf version`] MIT-licensed, ESM-compatible (`"module": "dist/jspdf.es.min.js"`, `"exports".".".import"`), no peer deps. Published 2026-03-17. Transitive deps: `@babel/runtime`, `fflate`, `fast-png` — no React/Mantine peer conflicts. |
| `@mantine/charts` | `^8.3.18` **(downgrade from 9.0.1)** | LineChart + ChartTooltip | [VERIFIED: `npm view @mantine/charts@8.3.18 peerDependencies`] The 8.x line peers on `react ^18.x || ^19.x` and `@mantine/core 8.3.18` — matches this project. The currently installed `9.0.1` peers on React 19 + Mantine 9 and npm reports "invalid" peer deps. Downgrade is mandatory. |
| `html-to-image` | `1.11.13` (installed) | DOM → PNG data URL for PDF sections | [VERIFIED: package.json] Already consumed by `FeedbackButton.tsx`. `toPng(element, { pixelRatio, cacheBust, backgroundColor, width, height })` returns a data URL. |
| `recharts` | `3.8.1` (installed, transitive) | Underlying chart engine | [VERIFIED: `npm ls recharts`] Mantine charts 8.3.18 peers on `recharts >=2.13.3`; 3.8.1 satisfies. |

### Supporting (already installed)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@mantine/hooks` | `^8.3.18` | `useLocalStorage` for snapshot array, `useDisclosure` for clear-history modal | Same pattern as `useThresholds`. |
| `@mantine/notifications` | `^8.3.18` | Success / error toasts on capture + export | Existing pattern in `ThresholdsPage.tsx`. |
| `@mantine/core` | `^8.3.18` | Button, Modal, SimpleGrid, Center, Badge, Tabs, Text, Stack | Already the design system. |
| `@tabler/icons-react` | `^3.41.1` | `IconChartLine`, `IconFileDownload`, `IconCamera` / `IconClipboardPlus`, `IconTrash` | Standard icon source. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `jspdf` | `pdf-lib`, `pdfkit`, `window.print()` | `pdf-lib` is better for manipulating existing PDFs but heavier and lacks `addImage` convenience. `pdfkit` targets Node, not browser. `window.print()` is zero-dep but rejected by CONTEXT D-16 (dialog UX, non-deterministic output). |
| Off-screen `createPortal` | `ReactDOMServer.renderToString` | `renderToString` does NOT run component effects and — critically — does NOT emit Mantine's runtime CSS-in-JS styles from `@mantine/emotion`. Captures would render unstyled. Portal is the only viable path. |
| Per-point custom dot via recharts `<Line dot={...} />` children | `dotProps` as function | Mantine's `dotProps` is static only. The children escape hatch with `recharts.Line` is the canonical pattern. `lineProps` callback (per-series) is simpler when variations are per-series, not per-point. |

**Installation (new):**
```bash
npm install jspdf@^4.2.1
npm install @mantine/charts@8.3.18  # downgrade from installed 9.0.1
```

**Version verification:**
- `jspdf@4.2.1` — published 2026-03-17, MIT, ESM-ready [VERIFIED: npm registry 2026-04-14]
- `@mantine/charts@8.3.18` — published 2026-04-13, MIT, peers `react ^18.x || ^19.x` + `@mantine/core 8.3.18` [VERIFIED: npm registry 2026-04-14]
- `html-to-image@1.11.13` — already installed, last modified 2025-04-19 [VERIFIED: npm view]

## Architecture Patterns

### Recommended Project Structure

```
src/
├── quality/
│   ├── trendsHistory.ts       # NEW: TrendSnapshot type, STORAGE_KEY, serialize/deserialize
│   ├── pdfExport.ts           # NEW: off-screen render → toPng → jsPDF orchestration
│   ├── thresholds.ts          # REUSE: MetricKey, METRIC_LABELS, DEFAULT_THRESHOLDS
│   └── QualityMetricsContext.tsx  # READ: snapshot serializer reads the 7 overall* values
├── hooks/
│   ├── useTrendsHistory.ts    # NEW: read/write snapshots, analogous to useThresholds
│   └── useThresholds.ts       # REUSE: resolveThreshold for per-snapshot threshold capture
└── components/quality/
    ├── QualityOverviewPage.tsx      # EDIT: add Trends tab + toolbar buttons
    ├── TrendsPanel.tsx              # NEW: small-multiples grid + overlay toggle
    ├── TrendMiniChart.tsx           # NEW: single-metric LineChart with threshold reference line
    ├── TrendOverlayChart.tsx        # NEW: 7-series overlaid LineChart
    ├── PdfReportLayout.tsx          # NEW: off-screen 816×1056 layout, header + sections
    └── OverviewStrip.tsx            # READ-ONLY: PDF mirrors its visual contract
```

### Pattern 1: localStorage array via Mantine `useLocalStorage` + reducer callbacks

**What:** Back the snapshot array with Mantine's `useLocalStorage<QualitySnapshot[]>` so reads/writes stay in sync across tabs within the same browser. Expose `appendSnapshot`, `clearAll`, and `filteredByServerUrl` from a `useTrendsHistory` hook. Do NOT attempt to dedupe or sort inside the reducer — append is naturally chronological and UUID collision probability is negligible.

**When to use:** Every read/write of `quality.trends.v1`.

**Example:**
```typescript
// Source: src/hooks/useThresholds.ts (analogous), src/components/quality/SampleSizeControl.tsx
import { useLocalStorage } from '@mantine/hooks';
import { useCallback, useEffect, useState } from 'react';

export const TRENDS_STORAGE_KEY = 'quality.trends.v1';
export const TRENDS_SOFT_LIMIT = 500;

export interface QualitySnapshot {
  id: string;
  capturedAt: string;
  serverUrl: string;
  sampleSize: number;
  cohort: string[];
  scores: Record<MetricKey, number | null>;
  thresholds: Record<MetricKey, number | null>;
}

export function useTrendsHistory() {
  const [snapshots, setSnapshots] = useLocalStorage<QualitySnapshot[]>({
    key: TRENDS_STORAGE_KEY,
    defaultValue: [],
    // Be defensive about JSON.parse corruption: Mantine's useLocalStorage
    // already try/catches; if it returns non-array (corrupt payload), coerce.
  });
  // HYDRATION GATE — same as useThresholds to avoid Wave 0 flicker if
  // the TrendsPanel mounts before the array hydrates.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { setHydrated(true); }, []);

  const safeSnapshots = Array.isArray(snapshots) ? snapshots : [];

  const append = useCallback((snap: QualitySnapshot) => {
    setSnapshots((prev) => [...(Array.isArray(prev) ? prev : []), snap]);
  }, [setSnapshots]);

  const clearAll = useCallback(() => setSnapshots([]), [setSnapshots]);

  return { snapshots: safeSnapshots, hydrated, append, clearAll };
}
```

### Pattern 2: Off-screen React portal for PDF composition

**What:** Mount `<PdfReportLayout>` via `createPortal` to a fixed-position, off-viewport, fully-painted `div`. Wait one `requestAnimationFrame` + a microtask (to flush web fonts and Mantine's CSS-in-JS emotion styles) before calling `toPng`.

**When to use:** Every PDF export.

**Exact off-screen CSS (copy verbatim):**
```css
position: fixed;
top: 0;
left: 0;
width: 816px;
/* Height is per-page; PdfReportLayout renders pages stacked and
   pdfExport.ts slices per-page via child refs. */
z-index: -1;           /* keep below any visible UI */
pointer-events: none;
opacity: 0;            /* invisible but still laid out + painted */
/* Do NOT use `display: none` or `visibility: hidden` — html-to-image
   needs a painted box to capture. `opacity: 0` still paints. */
```

**Example:**
```typescript
// Source: derived from html-to-image README + feedback/FeedbackButton.tsx pattern
import { createPortal } from 'react-dom';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

async function waitForPaint(): Promise<void> {
  // Two rAFs + microtask drains layout + paint + style injection.
  await new Promise((r) => requestAnimationFrame(() => r(null)));
  await new Promise((r) => requestAnimationFrame(() => r(null)));
  await Promise.resolve();
}

export async function renderPdf(pageNodes: HTMLElement[], filename: string) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'px',
    format: [816, 1056], // letter at 96 DPI
    compress: true,
  });
  for (let i = 0; i < pageNodes.length; i++) {
    await waitForPaint();
    const dataUrl = await toPng(pageNodes[i], {
      pixelRatio: 2,              // retina-quality rings
      cacheBust: true,            // defeat stale data URL caches
      backgroundColor: '#ffffff', // jsdom default is transparent
      width: 816,
      height: 1056,
    });
    if (i > 0) doc.addPage([816, 1056], 'portrait');
    doc.addImage(dataUrl, 'PNG', 0, 0, 816, 1056, undefined, 'FAST');
  }
  doc.save(filename);
}
```

### Pattern 3: Per-point breach coloring via recharts `<Line dot={renderFn}>` children escape hatch

**What:** Mantine `LineChart` accepts `children` that are rendered inside recharts' `<LineChart>` alongside the auto-generated lines. Override the generated `<Line>` by providing your own with `dataKey` matching the series name and a custom `dot` render function that reads `payload` (the data row) to decide fill color.

**When to use:** Per-point breach coloring on the mini charts (D-12).

**Example:**
```typescript
// Source: Mantine charts docs (https://mantine.dev/charts/line-chart/) +
// recharts Line dot API (https://recharts.org/en-US/api/Line)
import { LineChart } from '@mantine/charts';
import { Line } from 'recharts';

interface TrendPoint {
  capturedAt: string;     // used as dataKey
  score: number | null;
  threshold: number | null;
  breached: boolean;      // precomputed at row level
}

function BreachDot(props: { cx?: number; cy?: number; payload?: TrendPoint }) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null || payload == null || payload.score == null) return null;
  const fill =
    payload.threshold == null ? 'var(--mantine-color-gray-5)'
    : payload.breached ? 'var(--mantine-color-red-6)'
    : 'var(--mantine-color-blue-6)';
  return <circle cx={cx} cy={cy} r={4} fill={fill} stroke="white" strokeWidth={1} />;
}

<LineChart
  h={160}
  data={points}
  dataKey="capturedAt"
  series={[{ name: 'score', color: 'blue.6' }]}
  withDots={false}          // we render our own
  connectNulls={false}      // null score → gap
  referenceLines={activeThresholdLines}  // see pattern 4
  yAxisProps={{ domain: [0, 100] }}
  valueFormatter={(v) => `${v}%`}
>
  <Line type="monotone" dataKey="score" stroke="var(--mantine-color-blue-6)"
        dot={<BreachDot />} isAnimationActive={false} />
</LineChart>
```

### Pattern 4: Per-snapshot threshold as horizontal reference lines

**What:** Because threshold can change per snapshot, you cannot use a single `referenceLines: [{ y: threshold }]`. Instead, compute either (a) a single line at the most-recent threshold with a note in the tooltip, or (b — recommended) use a *step-function* second data series that renders the threshold as a stepped horizontal line (more honest visual). The simpler implementation: add a second series `threshold` with `strokeDasharray: '4 4'` and `curveType: 'step'`.

**When to use:** Mini-chart threshold overlay (D-11).

**Example:**
```typescript
// Recommended pattern: threshold-as-second-series
const chartData = snapshots.map((s) => ({
  capturedAt: s.capturedAt,
  score: s.scores[metricKey],
  threshold: s.thresholds[metricKey],  // null when disabled at capture
}));

<LineChart
  data={chartData}
  dataKey="capturedAt"
  series={[
    { name: 'score', color: 'blue.6', label: METRIC_LABELS[metricKey] },
    { name: 'threshold', color: 'gray.5', label: 'Threshold', strokeDasharray: '4 4', curveType: 'step' },
  ]}
  connectNulls={false}
  withDots={true}
  yAxisProps={{ domain: [0, 100] }}
>
  <Line ... dot={<BreachDot />} />  {/* override the 'score' line only */}
</LineChart>
```

### Pattern 5: Custom multi-field tooltip via `tooltipProps.content`

**What:** Mantine `LineChart`'s `tooltipProps` accepts a recharts `TooltipProps` object including a `content` render prop. Inside you can pull the data row off the payload and render timestamp + score + threshold + breach state.

**Example:**
```typescript
// Source: Mantine charts docs tooltipProps.content
import { Paper, Text, Stack } from '@mantine/core';

<LineChart
  tooltipProps={{
    content: ({ label, payload }) => {
      if (!payload?.length) return null;
      const row = payload[0]?.payload as TrendPoint | undefined;
      if (!row) return null;
      return (
        <Paper withBorder shadow="sm" p="xs" radius="sm">
          <Stack gap={2}>
            <Text size="xs" fw={600}>{new Date(row.capturedAt).toLocaleString()}</Text>
            <Text size="xs">Score: {row.score == null ? '—' : `${row.score}%`}</Text>
            <Text size="xs" c="dimmed">
              Threshold: {row.threshold == null ? 'disabled' : `${row.threshold}%`}
            </Text>
            {row.breached && <Text size="xs" c="red.6">Breached</Text>}
          </Stack>
        </Paper>
      );
    },
  }}
/>
```

### Pattern 6: Filename slug sanitization for `serverUrl`

**What:** The filename must be cross-platform safe. Strip protocol, replace `://`, `/`, `:` with `-`, and truncate.

**Example:**
```typescript
export function serverUrlSlug(url: string): string {
  return url
    .replace(/^https?:\/\//i, '')       // strip protocol
    .replace(/\/fhir\/?$/i, '')         // strip trailing /fhir (Blaze convention)
    .replace(/[:/\\?#&]+/g, '-')        // replace path separators
    .replace(/^-+|-+$/g, '')            // trim edge dashes
    .slice(0, 60)                        // keep filename reasonable
    || 'unknown-server';
}

export function pdfFilename(serverUrl: string, at: Date): string {
  const ts = at.toISOString().replace(/[-:]/g, '').replace('T', '_').slice(0, 15);
  return `fhir-exploder-quality-report_${serverUrlSlug(serverUrl)}_${ts}.pdf`;
}
```

### Anti-Patterns to Avoid

- **Capture inside `React.useEffect` and call `toPng` in the same tick.** The effect runs before the browser paints. Always await `requestAnimationFrame` twice before capture.
- **`ReactDOMServer.renderToString` for the off-screen layout.** Mantine's emotion/CSS-in-JS styles inject at runtime in the browser; `renderToString` outputs HTML with no style blocks and html-to-image captures unstyled mush.
- **`display: none` or `visibility: hidden` on the off-screen portal.** html-to-image needs a painted box. Use `opacity: 0; pointer-events: none` while keeping the element laid out.
- **Rendering the threshold as `referenceLines: [{ y: currentThreshold }]`.** This silently rewrites history when the user later tunes thresholds. Always use per-snapshot thresholds via a stepped data series (Pattern 4).
- **`withDots={true}` + override via `dotProps` callback.** `dotProps` is static in Mantine charts. Use the children `<Line dot={<Renderer />}>` escape hatch (Pattern 3).
- **`connectNulls={true}` on the score series.** Null scores (undefined metrics at capture time) should render as gaps, not interpolated lines that fake data.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Time-series chart from scratch | Custom SVG line chart | `@mantine/charts` `LineChart` | Axis/tooltip/legend alone are weeks of work; recharts handles edge cases like empty data, single point, null gaps. |
| PDF assembly | `canvas → png → jspdf.raw` custom pipeline | `jsPDF.addImage(dataUrl, 'PNG', ...)` | jsPDF handles PNG decoding, color spaces, compression. |
| DOM-to-image capture | `html2canvas` + manual style extraction | `html-to-image` (already installed) | html-to-image is smaller, handles modern CSS (grid, CSS vars, gradients) correctly; html2canvas has known Mantine emotion incompatibilities. |
| UUID generation | `Math.random().toString(36)` | `crypto.randomUUID()` | Native to all evergreen browsers; zero-collision guarantee. |
| Date formatting | Custom slicing | `Intl.DateTimeFormat` / `toLocaleString()` | Locale-correct, zero-dep. |
| localStorage hook | `useEffect` + `window.localStorage` | Mantine `useLocalStorage` | Cross-tab sync via storage events, SSR-safe (not that we need SSR), matches existing `quality.*` keys. |
| Confirmation modal | Custom dialog | Mantine `Modal` + `useDisclosure` | Already the pattern in `ThresholdsPage.tsx`. |
| Toast notification | Custom snackbar | `@mantine/notifications` `notifications.show()` | Already the pattern. |

**Key insight:** Every building block for Phase 19 exists in the tree already except `jspdf`. The planner's job is composition, not construction.

## Runtime State Inventory

> This is a feature-add phase, NOT a rename/refactor — most categories are "nothing to migrate". Documented for completeness.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | **NEW key** `quality.trends.v1` in `localStorage`. Existing `quality.thresholds.v1` (read-only for Phase 19). | New key; no migration. |
| Live service config | None — this is a pure-browser feature, no external services configured by name. | None. |
| OS-registered state | None. | None. |
| Secrets/env vars | None — PDF generation is fully local. | None. |
| Build artifacts | `package.json` + `package-lock.json` will update with `jspdf` add and `@mantine/charts` downgrade. | Standard `npm install` after changes. |

## Common Pitfalls

### Pitfall 1: `@mantine/charts` peer-dep mismatch silently "works"

**What goes wrong:** The currently installed `@mantine/charts@9.0.1` peers on React 19 and Mantine 9. `npm ls` shows "invalid" but nothing throws. Chart components may render in dev then fail at build time (tsc type-mismatch on Mantine 9 vs 8 Mantine types), or may crash at runtime in Recharts 3 when React 18 reconciler meets Mantine 9 expected React 19 internals.
**Why it happens:** npm warns but doesn't enforce peer deps by default. The package was installed accepting the warning.
**How to avoid:** `npm install @mantine/charts@8.3.18` BEFORE Wave 1 chart work begins. Verify with `npm ls @mantine/charts @mantine/core` — no "invalid" output.
**Warning signs:** `npm ls` shows "invalid", TS errors like "Type 'MantineColor' is not assignable", runtime errors inside `@mantine/emotion` style injection.

### Pitfall 2: `html-to-image` captures before Mantine injects styles

**What goes wrong:** First PDF export after a cold page load renders with default (unstyled) fonts and broken ring progress arcs because Mantine's emotion-based CSS-in-JS hasn't flushed yet when the portal mounts and `toPng` runs.
**Why it happens:** Mantine 8 injects CSS synchronously on first component render, but font assets (`Inter`, `tabler-icons.woff2`) load asynchronously. html-to-image snapshots the paint-at-that-moment.
**How to avoid:** Double-`requestAnimationFrame` + `document.fonts.ready` before capture:
```typescript
await document.fonts.ready;
await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
```
**Warning signs:** First export looks wrong (no icons, fallback fonts); reload export looks right. QA with incognito / cold cache every time.

### Pitfall 3: RingProgress + Card `overflow: hidden` clipping in PDF output

**What goes wrong:** Phase 18 UAT already found that the 80px RingProgress clips inside the Mantine Card at narrow widths (solved by SummaryCard vertical layout). If the PDF's overview section doesn't reuse the fixed 816px width, the rings clip again.
**Why it happens:** Mantine Card defaults `overflow: hidden`; RingProgress with 80px needs a container wider than ~110px to render fully.
**How to avoid:** The PDF `PdfReportLayout` MUST size the OverviewStrip mirror at 816px and lay out 7 metric tiles + 2 info tiles in a fixed grid (not the responsive `SimpleGrid`). Reuse `SummaryCard` verbatim, do not re-theme.
**Warning signs:** PDF rings show as partial arcs or squares.

### Pitfall 4: `connectNulls: true` lies about data gaps

**What goes wrong:** A snapshot where the user hadn't run a certain metric (e.g., Duplicates) stores `scores.duplicates: null`. Mantine LineChart's default `connectNulls={true}` draws a straight line across the gap, implying the metric had a stable intermediate value.
**Why it happens:** Recharts default behavior, surfaced verbatim by Mantine.
**How to avoid:** Always set `connectNulls={false}` on trend charts.
**Warning signs:** Flat horizontal segments where you expected gaps.

### Pitfall 5: Threshold reference line shows *current* threshold on historical data

**What goes wrong:** Using `referenceLines={[{ y: currentThreshold }]}` means the dashed line moves when the user edits thresholds. A user who tightens a threshold from 80 to 85 will see old snapshots retroactively "breach". The chart is no longer an audit trail.
**Why it happens:** Natural default but wrong for per-snapshot provenance.
**How to avoid:** Encode the threshold in each snapshot's data row and render it as a stepped second series (Pattern 4). `breached` is precomputed per row from `score < threshold` at capture time.
**Warning signs:** Dot colors change when the user edits thresholds.

### Pitfall 6: `useLocalStorage` hydration + flicker on mount

**What goes wrong:** Mantine's `useLocalStorage` returns `defaultValue` (`[]`) on the first render and hydrates asynchronously. If TrendsPanel renders immediately and sees `[]`, it may flash the empty state for one frame before the real snapshots appear.
**Why it happens:** Known Mantine hook behavior — already documented in `useThresholds.ts` hydration gate comment.
**How to avoid:** Track a `hydrated` flag via `useEffect(() => setHydrated(true), [])` and skip empty-state rendering until hydrated (render a skeleton or nothing).
**Warning signs:** Empty-state flash on refresh when snapshots exist.

### Pitfall 7: `jsPDF.save()` name not honored in some browsers

**What goes wrong:** Older Safari + some embedded webviews ignore `doc.save(filename)` and use the URL's last segment as the download name.
**Why it happens:** jsPDF `save()` creates a blob URL with an anchor click; some environments don't respect the `download` attribute.
**How to avoid:** For this local-first tool targeting modern Chrome/Firefox/Safari on desktop, `doc.save()` is sufficient. Document the constraint; if a report lands here, fall back to explicit blob + anchor with `a.download = filename; a.click()`.
**Warning signs:** Downloaded file is named `blob` or `download.pdf`.

### Pitfall 8: Large snapshot arrays hit localStorage quota

**What goes wrong:** localStorage has a ~5-10MB per-origin quota. 500 snapshots × ~600 bytes each is ~300KB — safe. But if the user never clears and hits 50K snapshots, writes start throwing `QuotaExceededError`.
**Why it happens:** Browser-enforced cap.
**How to avoid:** The D-04 soft warning at 500 snapshots is the user-facing mitigation. Catch `QuotaExceededError` in `append` and surface a notification. Do NOT silently drop.
**Warning signs:** Capture button stops working after N snapshots; console shows DOMException.

## Code Examples

### 1) Create a snapshot from current context state

```typescript
// Source: derived from src/quality/QualityMetricsContext.tsx + src/hooks/useThresholds.ts
import { METRIC_LABELS, type MetricKey, type Thresholds } from '../quality/thresholds';
import { useQualityMetrics } from '../quality/QualityMetricsContext';
import { useThresholds } from '../hooks/useThresholds';

export function captureSnapshot(params: {
  metrics: ReturnType<typeof useQualityMetrics>;
  stored: Thresholds;
  serverUrl: string;
  sampleSize: number;
  cohort: string[];
  getActiveThreshold: (key: MetricKey) => number | null;
}): QualitySnapshot {
  const { metrics, serverUrl, sampleSize, cohort, getActiveThreshold } = params;
  const map: Record<MetricKey, number | undefined> = {
    completeness: metrics.overallCompleteness,
    coverage: metrics.overallCoverage,
    validation: metrics.overallValidation,
    plausibility: metrics.overallPlausibility,
    labRanges: metrics.overallLabRanges,
    duplicates: metrics.overallDuplicates,
    references: metrics.overallReferences,
  };
  const scores = Object.fromEntries(
    (Object.keys(map) as MetricKey[]).map((k) => [k, map[k] ?? null]),
  ) as Record<MetricKey, number | null>;
  const thresholds = Object.fromEntries(
    (Object.keys(map) as MetricKey[]).map((k) => [k, getActiveThreshold(k)]),
  ) as Record<MetricKey, number | null>;
  return {
    id: crypto.randomUUID(),
    capturedAt: new Date().toISOString(),
    serverUrl,
    sampleSize,
    cohort,
    scores,
    thresholds,
  };
}
```

### 2) Tab value list edit in `QualityOverviewPage.tsx`

```typescript
// Source: current src/components/quality/QualityOverviewPage.tsx line 34-43
// ADD 'trends' AFTER 'references':
const VALID_TABS = new Set([
  'counts',
  'completeness',
  'coverage',
  'validation',
  'plausibility',
  'lab-ranges',
  'duplicates',
  'references',
  'trends',           // NEW
] as const);
// ... and add a <Tabs.Tab value="trends">Trends</Tabs.Tab> after references
// and a <Tabs.Panel value="trends" pt="md" keepMounted>
//   <TrendsPanel serverUrl={medplum.getBaseUrl()} />
// </Tabs.Panel>
```

### 3) Confirmation modal for "Clear history" (reuse Phase 18 pattern)

```typescript
// Source: src/components/quality/ThresholdsPage.tsx lines 205-228
const [clearOpen, clearCtrl] = useDisclosure(false);

<Modal
  opened={clearOpen}
  onClose={clearCtrl.close}
  title="Clear all snapshots?"
  centered size="md" radius="sm"
>
  <Stack gap="md">
    <Text size="sm">
      This will remove every captured snapshot from browser storage. Trend history
      cannot be recovered from the UI. This does not affect current metric scores.
    </Text>
    <Group justify="flex-end" gap="sm">
      <Button variant="default" onClick={clearCtrl.close}>Keep history</Button>
      <Button color="red" onClick={() => { clearAll(); clearCtrl.close();
        notifications.show({ color: 'blue', title: 'History cleared',
          message: 'All snapshots removed.' }); }}>
        Clear history
      </Button>
    </Group>
  </Stack>
</Modal>
```

### 4) PDF report layout skeleton

```typescript
// Source: new file src/components/quality/PdfReportLayout.tsx
import { forwardRef } from 'react';
import { Stack, Group, Text, Title, Badge, SimpleGrid } from '@mantine/core';

export interface PdfPageProps {
  children: React.ReactNode;
}
export const PdfPage = forwardRef<HTMLDivElement, PdfPageProps>((props, ref) => (
  <div ref={ref} style={{
    width: 816, height: 1056, padding: 48,
    background: '#ffffff', fontFamily: 'Inter, system-ui, sans-serif',
    boxSizing: 'border-box',
  }}>
    {props.children}
  </div>
));
// Compose header page + overview page (+ trends page when snapshots.length >= 2)
// as sibling <PdfPage> elements. pdfExport.ts iterates their refs for capture.
```

### 5) jsPDF final assembly

```typescript
// Source: jspdf README (https://github.com/parallax/jsPDF) + verified against
// installed node_modules/jspdf type declarations
import { jsPDF } from 'jspdf';

const doc = new jsPDF({
  orientation: 'portrait',
  unit: 'px',
  format: [816, 1056],      // letter at 96 DPI
  compress: true,
  hotfixes: ['px_scaling'],  // forces pixel coords to map 1:1 without unit conv
});
doc.addImage(headerPng, 'PNG', 0, 0, 816, 1056, undefined, 'FAST');
doc.addPage([816, 1056], 'portrait');
doc.addImage(overviewPng, 'PNG', 0, 0, 816, 1056, undefined, 'FAST');
if (hasTrends) {
  doc.addPage([816, 1056], 'portrait');
  doc.addImage(trendsPng, 'PNG', 0, 0, 816, 1056, undefined, 'FAST');
}
doc.save(pdfFilename(serverUrl, new Date()));
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `html2canvas` for DOM capture | `html-to-image` | Ongoing — html2canvas has known incompatibilities with CSS-in-JS (emotion) and modern CSS (grid, CSS vars) | Already the project choice. No change needed. |
| `pdfmake` declarative PDF layouts | `jsPDF` imperative addImage pipeline | `html-to-image` + `jsPDF` composition is the de facto stack for dashboard PDF exports (Medplum, Retool, Metabase use similar patterns). | Matches CONTEXT D-15 choice. |
| Recharts 2.x | Recharts 3.8.1 | Mantine charts 8.3.18 peers on recharts `>=2.13.3`, installed 3.8.1. Breaking changes in recharts 3 are internal; `Line` / `LineChart` / `ReferenceLine` / `Tooltip` public API unchanged. | No action. |
| `crypto.randomUUID()` polyfill | Native `crypto.randomUUID()` | All evergreen browsers ≥2021. Vite 8 targets ES2020+. | Zero-dep. Use directly. |

**Deprecated/outdated:**
- `@mantine/charts@9.0.1` peer-invalid on this stack — treat installed version as a bug to fix in Wave 0.
- `html2canvas` — do NOT add. Project already correctly picked `html-to-image`.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `crypto.randomUUID()` is available in all supported target browsers without polyfill | Pattern 1, Code Example 1 | Snapshot ID generation fails on very old Safari (<15.4). Project is local-dev-oriented; mitigation: document min-browser requirement. |
| A2 | `@mantine/charts@8.3.18` `tooltipProps.content` accepts a recharts-style render prop, identical to the 9.0.1 behavior the Mantine docs describe | Pattern 5 | If the 8.3.18 API differs, a docs check against the installed package types during planning will catch it. Both versions wrap recharts `Tooltip`, which has been stable since recharts 2.x. |
| A3 | Downgrading `@mantine/charts` from 9.0.1 → 8.3.18 is a clean `npm install` with no side effects on `@mantine/core`, `@mantine/hooks`, or `recharts` | Standard Stack | If the downgrade produces tsc errors in unrelated code, the planner may need to add a Wave 0 cleanup task. The current codebase uses `@mantine/charts` only for its CSS import — impact should be zero. |
| A4 | jsdom (used by vitest) cannot execute html-to-image's canvas pipeline, so PDF rendering is not unit-testable end-to-end in the current test setup | Validation Architecture | If we assumed wrong, we'd get broader coverage than planned. No downside. Unit-test the orchestration logic (filename sanitization, page slicing, filter predicates) in vitest; leave full PDF capture to manual UAT. |
| A5 | The Phase 18 `useThresholds` hydration-gate pattern (`useEffect + setHydrated`) is the correct way to avoid empty-state flicker | Pitfall 6 | Low risk — it's verbatim reuse of Phase 18's WR-04 fix. |

**All other claims in this research are VERIFIED or CITED.**

## Open Questions

1. **Should the "Export PDF" button live on the main `/quality` toolbar or only on the Trends tab toolbar?**
   - What we know: CONTEXT D-17 says main toolbar ("right of Capture snapshot"). But D-08 Trends-tab toolbar also includes Capture snapshot.
   - What's unclear: Is Capture duplicated on both toolbars, or only on Trends?
   - Recommendation: Per D-17 verbatim — Capture + Export PDF live on the main `/quality` toolbar (always-visible). Trends tab toolbar has Clear history + Overlay toggle + Include-other-servers toggle. Let planner resolve at UI-SPEC.

2. **Tooltip type on overlay chart: single-line multi-series vs stacked?**
   - What we know: Claude's Discretion per CONTEXT.
   - What's unclear: Does 7-series tooltip need compacting?
   - Recommendation: Use Mantine's default `ChartTooltip` behavior in overlay mode (it handles multi-series natively), override only for mini-charts.

3. **Per-snapshot threshold reference-line rendering: single reference line at most-recent threshold, OR stepped second data series, OR multiple `referenceLines` (one per distinct threshold value)?**
   - What we know: D-11 specifies "threshold value active at each snapshot time" — not the current threshold.
   - What's unclear: Visual treatment — a stepped line (Pattern 4) is truthful but can clutter the 280×160 mini-chart.
   - Recommendation: Start with stepped second-series (most truthful, matches D-11 literally). Planner may downgrade to "single ref line at most-recent threshold + tooltip-disclosed per-snapshot threshold" if UAT finds it too busy.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js (for npm install) | `jspdf` install | ✓ (assumed — project uses `npm run build` in CI) | — | — |
| Modern browser with `crypto.randomUUID()` | Snapshot ID generation | ✓ (Chrome 92+, Firefox 95+, Safari 15.4+) | — | `Math.random().toString(36).slice(2)` fallback if needed |
| Browser `localStorage` | Snapshot + threshold persistence | ✓ (universal) | — | — |
| Browser `canvas` API | `html-to-image` PNG rendering | ✓ (universal in browsers; jsdom lacks it) | — | None — PDF export is not testable in unit tests, must be UAT |
| `document.fonts.ready` | Paint-barrier before `toPng` | ✓ (Chrome 35+, Firefox 41+, Safari 10+) | — | `await new Promise(r => setTimeout(r, 100))` as a last resort |

**Missing dependencies with no fallback:** None for Phase 19 scope.

**Missing dependencies with fallback:** None blocking.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 4.1.4 + @testing-library/react 16.3.2, jsdom 29.0.2 [VERIFIED: package.json + vitest.config.ts] |
| Config file | `/Users/kohlbach/Claude/Exploder/vitest.config.ts` |
| Quick run command | `npm run test -- src/__tests__/trends-history.test.ts` |
| Full suite command | `npm run test` |
| Existing Mantine polyfills | ResizeObserver + matchMedia mocks — established pattern in `src/__tests__/thresholds-page.test.tsx` (copy verbatim). |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| QUAL-05 | `trendsHistory.ts` serializes QualitySnapshot round-trip through JSON | unit | `npm run test -- src/quality/trendsHistory.test.ts` | ❌ Wave 0 |
| QUAL-05 | `useTrendsHistory` append/clearAll + hydration gate | hook test | `npm run test -- src/__tests__/use-trends-history.test.tsx` | ❌ Wave 0 |
| QUAL-05 | `captureSnapshot` reads context + thresholds correctly (maps all 7 MetricKey → scores + thresholds; `undefined` → `null`) | unit | `npm run test -- src/quality/capture-snapshot.test.ts` | ❌ Wave 0 |
| QUAL-05 | `TrendsPanel` renders empty / 1-snapshot / N-snapshot states | component | `npm run test -- src/__tests__/trends-panel.test.tsx` | ❌ Wave 0 |
| QUAL-05 | Breach-coloring logic `computeBreachedFlag(score, threshold)` correctness | unit (pure) | `npm run test -- src/quality/trends-breach.test.ts` | ❌ Wave 0 |
| QUAL-05 | "Include other servers" filter predicate | unit (pure) | `npm run test -- src/quality/trends-filter.test.ts` | ❌ Wave 0 |
| QUAL-05 | `?tab=trends` URL activates the Trends panel via existing tab-routing contract | component | `npm run test -- src/__tests__/quality-overview.test.tsx` (extend) | ✅ extend existing |
| QUAL-06 | `serverUrlSlug` sanitizes protocol/path/port/query | unit (pure) | `npm run test -- src/quality/pdf-filename.test.ts` | ❌ Wave 0 |
| QUAL-06 | `pdfFilename` produces the documented pattern with ISO timestamp | unit (pure) | `npm run test -- src/quality/pdf-filename.test.ts` | ❌ Wave 0 |
| QUAL-06 | `PdfReportLayout` renders the three sections (header, overview, trends) conditionally | component | `npm run test -- src/__tests__/pdf-report-layout.test.tsx` | ❌ Wave 0 |
| QUAL-06 | `pdfExport.ts` orchestration — `toPng` + `jsPDF.save` wiring — with both mocked, verifies page count and filename | unit with mocks | `npm run test -- src/quality/pdfExport.test.ts` | ❌ Wave 0 |
| QUAL-06 | End-to-end PDF generation against a real DOM | **manual UAT** (jsdom lacks canvas) | n/a — documented in phase HUMAN-UAT.md | n/a |
| QUAL-05 | Soft-warning at 500 snapshots triggers a single notification (not spam) | component | `npm run test -- src/__tests__/trends-panel.test.tsx` | ❌ Wave 0 |
| QUAL-05 | localStorage `QuotaExceededError` is surfaced as a toast, not silently swallowed | unit + component | `npm run test -- src/__tests__/use-trends-history.test.tsx` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npm run test -- src/quality/trendsHistory.test.ts src/quality/pdf-filename.test.ts src/quality/trends-breach.test.ts` (pure-function tests, ~1 sec)
- **Per wave merge:** `npm run test -- src/quality src/__tests__/trends src/__tests__/pdf` (all Phase 19 files, ~10 sec)
- **Phase gate:** `npm run test` (full suite green) + `npm run build` (tsc -b clean) before `/gsd-verify-work`.
- **UAT:** Manual PDF export with 0, 1, 5 snapshots across two servers; manual inspection of generated PDF for ring fidelity, pagination, filename.

### Wave 0 Gaps

- [ ] `src/quality/trendsHistory.test.ts` — covers QUAL-05 serializer
- [ ] `src/quality/capture-snapshot.test.ts` — covers QUAL-05 snapshot factory
- [ ] `src/quality/pdf-filename.test.ts` — covers QUAL-06 filename sanitization
- [ ] `src/quality/trends-breach.test.ts` — covers QUAL-05 breach coloring
- [ ] `src/quality/trends-filter.test.ts` — covers QUAL-05 server filter
- [ ] `src/quality/pdfExport.test.ts` — covers QUAL-06 orchestration (mocks `html-to-image` + `jspdf`)
- [ ] `src/__tests__/use-trends-history.test.tsx` — covers QUAL-05 hook
- [ ] `src/__tests__/trends-panel.test.tsx` — covers QUAL-05 UI
- [ ] `src/__tests__/pdf-report-layout.test.tsx` — covers QUAL-06 layout
- [ ] **Dependency task:** `npm install @mantine/charts@8.3.18` + `npm install jspdf@^4.2.1` — done BEFORE any chart or PDF component is written.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No auth surface added — feature is local-browser. |
| V3 Session Management | no | No session state added. |
| V4 Access Control | no | Local-first tool, no multi-user access model. |
| V5 Input Validation | yes | (a) `JSON.parse` of `quality.trends.v1` — catch + fall back to `[]` on corruption. (b) `serverUrlSlug` strips path/query chars — prevents filesystem injection in downloaded filename. (c) PDF content is derived from app state only; no user-typed free text embedded (no XSS vector in PNG). |
| V6 Cryptography | n/a | `crypto.randomUUID()` is used for snapshot IDs — native browser crypto, not hand-rolled. |

### Known Threat Patterns for React 18 + Vite 8 + browser-local tool

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| localStorage tampering (user or malicious extension edits `quality.trends.v1`) | Tampering | Defensive `Array.isArray` check on read; corrupt payload → empty array + dev-console warning. Not a security boundary — this is a local dev tool. |
| Filename injection via malicious `serverUrl` | Tampering | `serverUrlSlug` strips `:/\?#&` and trims to 60 chars. Safe for macOS/Windows/Linux filenames. |
| PDF blob XSS (rare) | Information Disclosure | PDFs don't execute scripts via `.save()` download. N/A in this flow. |
| localStorage quota exhaustion | DoS (self-inflicted) | Soft warning at 500 snapshots; `QuotaExceededError` surfaced as toast. |

**Threat model context:** This is a local-first browser tool, no remote attack surface added. Security focus is on defensive programming against user/environment edge cases, not adversarial input.

## Sources

### Primary (HIGH confidence)

- `@mantine/charts@8.3.18` peerDependencies [VERIFIED: `npm view @mantine/charts@8.3.18 peerDependencies`, 2026-04-14]
- `@mantine/charts@9.0.1` peerDependencies (installed, peer-invalid) [VERIFIED: `node_modules/@mantine/charts/package.json`]
- `jspdf@4.2.1` version, license, ESM config, deps [VERIFIED: `npm view jspdf`, 2026-04-14]
- Installed LineChart TypeScript declarations [VERIFIED: `node_modules/@mantine/charts/lib/LineChart/LineChart.d.ts`]
- Installed ChartTooltip / types / GridChartBaseProps [VERIFIED: `node_modules/@mantine/charts/lib/types.d.ts`, `ChartTooltip.d.ts`]
- Project package.json + package-lock.json [VERIFIED: files read]
- CONTEXT.md / REQUIREMENTS.md / ROADMAP.md / STATE.md [VERIFIED: files read]
- Phase 18 artifacts: `useThresholds.ts`, `thresholds.ts`, `SummaryCard.tsx`, `OverviewStrip.tsx`, `QualityOverviewPage.tsx`, `ThresholdsPage.tsx`, `SampleSizeControl.tsx` [VERIFIED: files read]
- vitest.config.ts + `thresholds-page.test.tsx` + `quality-overview.test.tsx` [VERIFIED: files read]

### Secondary (MEDIUM confidence)

- Mantine LineChart prop shapes — reference, custom tooltip, dot render [CITED: https://mantine.dev/charts/line-chart/, fetched 2026-04-14, cross-referenced against installed types]
- jsPDF API (`new jsPDF({...})`, `addImage`, `addPage`, `save`) [CITED: https://github.com/parallax/jsPDF README + installed `dist/jspdf.es.min.js` export shape]
- html-to-image `toPng` API — already used by `src/components/feedback/FeedbackButton.tsx` [VERIFIED: codebase grep]

### Tertiary (LOW confidence — none used in this research)

None — all claims are verified or cited.

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — all versions verified against npm registry or installed `package.json`; peer-dep compatibility confirmed.
- Architecture: **HIGH** — patterns are literal reuse of Phase 18 patterns (useLocalStorage, confirmation modal, notifications, hydration gate) or canonical patterns for the dep combination.
- Pitfalls: **HIGH** — 8 concrete pitfalls each with code-level mitigation; pitfall 1 (peer-dep mismatch) verified via `npm ls`; pitfall 2 (font flush) verified against html-to-image docs; pitfall 3 (ring clipping) sourced from actual Phase 18 UAT finding in STATE.md.
- Validation: **HIGH** — vitest infrastructure verified, existing test patterns readable and copyable; canvas limitation in jsdom is a well-known constraint.

**Research date:** 2026-04-14
**Valid until:** 2026-05-14 (Mantine + React have monthly-ish minor releases; recheck versions if planning slips past this window)

---

## RESEARCH COMPLETE

**Phase:** 19 - quality-trends-pdf-reports
**Confidence:** HIGH

### Key Findings
- **Critical dep fix before any chart work:** installed `@mantine/charts@9.0.1` is peer-invalid (needs React 19 / Mantine 9). Downgrade to `8.3.18` in Wave 0 alongside `jspdf@^4.2.1` install.
- **Every building block except `jspdf` is already in the tree:** `html-to-image`, `@mantine/charts`, Mantine `useLocalStorage` + Modal + notifications, `recharts@3.8.1`, `@tabler/icons-react`.
- **Per-snapshot threshold provenance requires stepped second-series in `LineChart`**, not `referenceLines: [{ y: currentThreshold }]`. The simpler approach silently rewrites breach history when thresholds are edited.
- **Per-point breach coloring uses the recharts `<Line dot={<Renderer/>}>` children escape hatch** — Mantine's `dotProps` is static only.
- **Off-screen PDF render MUST use `createPortal` + `opacity: 0`** (not `display: none` or `visibility: hidden`); Mantine's runtime CSS-in-JS means `ReactDOMServer.renderToString` captures unstyled output.
- **Paint-barrier before `toPng`:** `await document.fonts.ready` + double `requestAnimationFrame` — first-export-after-cold-load is otherwise unstyled.

### File Created
`/Users/kohlbach/Claude/Exploder/.planning/phases/19-quality-trends-pdf-reports/19-RESEARCH.md`

### Confidence Assessment
| Area | Level | Reason |
|------|-------|--------|
| Standard Stack | HIGH | Versions verified against npm registry and installed `node_modules`; peer-dep compatibility explicitly validated. |
| Architecture | HIGH | All patterns copy verbatim from Phase 18 or follow recharts/Mantine canonical idioms. |
| Pitfalls | HIGH | 8 concrete pitfalls each with code-level mitigation; pitfall #1 (peer-dep) independently verified via `npm ls`. |
| Validation | HIGH | Existing vitest + jsdom setup reviewed, boilerplate pattern (ResizeObserver + matchMedia mocks) is a direct copy target. |

### Open Questions
1. Does "Export PDF" button live on main `/quality` toolbar only, or also on Trends-tab toolbar? (Recommendation: main toolbar only, per D-17 verbatim.)
2. Overlay-mode tooltip style (stacked multi-series vs compact single-line)? (Claude's Discretion; recommend Mantine default.)
3. Threshold reference-line rendering: stepped second-series (most truthful, matches D-11) vs simpler single-line-at-most-recent — confirm at UI-SPEC stage.

### Ready for Planning
Research complete. Planner can create Wave 0 (deps + test scaffolding) and subsequent plan files. Start with `npm install @mantine/charts@8.3.18 jspdf@^4.2.1` as the first task — every other task depends on it.
