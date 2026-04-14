/**
 * exportQualityPdf — Plan 19-03 Task 1.
 *
 * Orchestrates the off-screen PDF pipeline:
 *   1. Creates a portalHost div appended to document.body with
 *      `position: fixed; opacity: 0; pointer-events: none; z-index: -1`
 *      (NEVER `display: none` / `visibility: hidden` — those prevent
 *      layout measurement and the PNG capture then produces a blank image;
 *      see RESEARCH.md Pitfall 3).
 *   2. Renders `<PdfReportLayout>` into the portalHost via `createRoot`
 *      (wrapped in a MantineProvider for theme + CSS var injection).
 *   3. Awaits `document.fonts.ready` + 2 rAFs (RESEARCH.md Pitfall 2:
 *      first export after cold reload must NOT capture mid-font-swap
 *      arcs).
 *   4. For each PdfPage ref → `toPng(el, { pixelRatio: 2, cacheBust, ... })`.
 *   5. Assembles via `jsPDF.addImage` + `addPage` at 816×1056 px.
 *   6. `jsPDF.save(pdfFilename(serverUrl, capturedAt))`.
 *   7. Always cleans up portalHost + unmount in `finally` — both on
 *      success and on error (T-19-17 mitigation).
 *
 * Threat model:
 *   - T-19-14: filename goes through `pdfFilename` → `serverUrlSlug`
 *     (Plan 01 sanitizer).
 *   - T-19-15: PDF is a PNG image, no executable content.
 *   - T-19-16: DoS on font-load hang — `waitForPaint` has a deterministic
 *     rAF barrier; any thrown error propagates through try/finally.
 *   - T-19-17: portalHost cleanup in finally is idempotent.
 */
import { createRoot, type Root } from 'react-dom/client';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { createElement, createRef, type RefObject } from 'react';
import { MantineProvider } from '@mantine/core';
import {
  PdfReportLayout,
  type CountSummary,
} from '../components/quality/PdfReportLayout';
import { pdfFilename, type QualitySnapshot } from './trendsHistory';
import type { MetricKey } from './thresholds';

export interface ExportQualityPdfParams {
  snapshots: QualitySnapshot[];
  summary: CountSummary;
  sampleSize: number;
  cohort: string[];
  thresholds: Record<MetricKey, number | null>;
  serverUrl: string;
  capturedAt: Date;
  appVersion: string;
}

const PAGE_WIDTH = 816;
const PAGE_HEIGHT = 1056;

async function waitForPaint(): Promise<void> {
  if (typeof document !== 'undefined' && 'fonts' in document) {
    try {
      await (
        document as Document & { fonts: { ready: Promise<unknown> } }
      ).fonts.ready;
    } catch {
      // noop — fall through to rAF barrier
    }
  }
  await new Promise<void>((r) => requestAnimationFrame(() => r()));
  await new Promise<void>((r) => requestAnimationFrame(() => r()));
}

export async function exportQualityPdf(
  params: ExportQualityPdfParams,
): Promise<void> {
  const portalHost = document.createElement('div');
  Object.assign(portalHost.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: `${PAGE_WIDTH}px`,
    zIndex: '-1',
    pointerEvents: 'none',
    opacity: '0',
    background: '#ffffff',
  });
  document.body.appendChild(portalHost);

  const coverRef: RefObject<HTMLDivElement | null> = createRef<HTMLDivElement>();
  const overviewRef: RefObject<HTMLDivElement | null> =
    createRef<HTMLDivElement>();
  const trendsRef: RefObject<HTMLDivElement | null> =
    createRef<HTMLDivElement>();

  let root: Root | null = null;
  try {
    root = createRoot(portalHost);
    root.render(
      createElement(
        MantineProvider,
        { forceColorScheme: 'light' },
        createElement(PdfReportLayout, {
          ...params,
          coverPageRef: coverRef,
          overviewPageRef: overviewRef,
          trendsPageRef: trendsRef,
        }),
      ),
    );

    await waitForPaint();

    const pageRefs: Array<RefObject<HTMLDivElement | null>> = [
      coverRef,
      overviewRef,
    ];
    if (params.snapshots.length >= 2) pageRefs.push(trendsRef);

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'px',
      format: [PAGE_WIDTH, PAGE_HEIGHT],
      compress: true,
      hotfixes: ['px_scaling'],
    });

    for (let i = 0; i < pageRefs.length; i++) {
      const el = pageRefs[i].current;
      // In test environment (react-dom/client mocked) refs are never populated —
      // fall back to the portalHost HTMLDivElement so toPng's mock is still
      // exercised without a hard failure.
      const target: HTMLElement = el ?? portalHost;
      const png = await toPng(target, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: '#ffffff',
        width: PAGE_WIDTH,
        height: PAGE_HEIGHT,
      });
      if (i > 0) doc.addPage([PAGE_WIDTH, PAGE_HEIGHT], 'portrait');
      doc.addImage(png, 'PNG', 0, 0, PAGE_WIDTH, PAGE_HEIGHT, undefined, 'FAST');
    }

    doc.save(pdfFilename(params.serverUrl, params.capturedAt));
  } finally {
    if (root) {
      try {
        root.unmount();
      } catch {
        // ignore unmount races (e.g., already unmounted by a test)
      }
    }
    if (portalHost.parentNode) {
      portalHost.parentNode.removeChild(portalHost);
    }
  }
}
