/**
 * pdfExport — Plan 19-03 Task 1.
 *
 * Verifies the off-screen PDF export orchestration with mocked html-to-image,
 * jspdf, and react-dom/client so we don't need real canvas/DOM rendering.
 *
 * Tests:
 *  1. Page count with 0 snapshots → 2 toPng / 2 addImage / 1 addPage
 *  2. Page count with 3 snapshots → 3 toPng / 3 addImage / 2 addPage
 *  3. save() called with locked filename regex
 *  4. Portal host removed from document.body on success
 *  5. Portal host removed from document.body on toPng error + promise rejects
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { MetricKey } from '../../quality/thresholds';
import type { QualitySnapshot } from '../../quality/trendsHistory';

// ---- Mocks must be declared BEFORE importing the module under test ----

// Collect spies on a stable object so tests can reset between runs.
const toPngMock = vi.fn<(el: Element, opts?: unknown) => Promise<string>>();
vi.mock('html-to-image', () => ({
  toPng: (el: Element, opts?: unknown) => toPngMock(el, opts),
}));

const addImageMock = vi.fn();
const addPageMock = vi.fn();
const saveMock = vi.fn();
const jsPDFCtor = vi.fn<(...args: unknown[]) => {
  addImage: typeof addImageMock;
  addPage: typeof addPageMock;
  save: typeof saveMock;
}>(() => ({
  addImage: addImageMock,
  addPage: addPageMock,
  save: saveMock,
}));
vi.mock('jspdf', () => ({
  jsPDF: function (this: unknown, ..._args: unknown[]) {
    return jsPDFCtor();
  },
}));

// Mock react-dom/client so we don't actually mount React in the jsdom tree.
// We still need the portal host DOM lifecycle (document.body.appendChild +
// removeChild) to be observable, so exportQualityPdf's createElement + portalHost
// logic runs for real.
const renderMock = vi.fn();
const unmountMock = vi.fn();
vi.mock('react-dom/client', () => ({
  createRoot: () => ({ render: renderMock, unmount: unmountMock }),
}));

// Mock rAF to resolve immediately so waitForPaint does not hang.
beforeEach(() => {
  toPngMock.mockReset();
  toPngMock.mockResolvedValue('data:image/png;base64,FAKE');
  addImageMock.mockReset();
  addPageMock.mockReset();
  saveMock.mockReset();
  jsPDFCtor.mockClear();
  renderMock.mockReset();
  unmountMock.mockReset();

  // Mock document.fonts.ready to resolve immediately.
  Object.defineProperty(document, 'fonts', {
    configurable: true,
    value: { ready: Promise.resolve() },
  });

  // Ensure requestAnimationFrame fires immediately.
  vi.stubGlobal(
    'requestAnimationFrame',
    (cb: FrameRequestCallback): number => {
      cb(0);
      return 0;
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// Import AFTER mocks are in place.
import { exportQualityPdf } from '../pdfExport';

const BASE_THRESHOLDS: Record<MetricKey, number | null> = {
  completeness: 80,
  coverage: 70,
  validation: 95,
  plausibility: 99,
  labRanges: 95,
  duplicates: 99,
  references: 98,
};

function mkSnapshot(id: string): QualitySnapshot {
  return {
    id,
    capturedAt: new Date('2026-04-14T18:30:42Z').toISOString(),
    serverUrl: 'http://localhost:8080/fhir',
    sampleSize: 100,
    resourceTypes: [],
    cohortId: null,
    scores: {
      completeness: 80,
      coverage: 70,
      validation: 95,
      plausibility: 99,
      labRanges: 95,
      duplicates: 99,
      references: 98,
    },
    thresholds: { ...BASE_THRESHOLDS },
  };
}

function baseParams(snapshots: QualitySnapshot[]) {
  return {
    snapshots,
    summary: {
      totalResources: 1234,
      distinctTypes: 15,
      totals: {
        completeness: 80,
        coverage: 70,
        validation: 95,
        plausibility: 99,
        labRanges: 95,
        duplicates: 99,
        references: 98,
      },
    },
    sampleSize: 100,
    resourceTypes: [] as string[],
    cohort: null,
    thresholds: BASE_THRESHOLDS,
    serverUrl: 'http://localhost:8080/fhir',
    capturedAt: new Date('2026-04-14T18:30:42Z'),
    appVersion: '1.2.3',
  };
}

describe('exportQualityPdf orchestration', () => {
  it('page count with 0 snapshots → 2 toPng, 2 addImage, 1 addPage', async () => {
    await exportQualityPdf(baseParams([]));
    expect(toPngMock).toHaveBeenCalledTimes(2);
    expect(addImageMock).toHaveBeenCalledTimes(2);
    expect(addPageMock).toHaveBeenCalledTimes(1);
    expect(saveMock).toHaveBeenCalledTimes(1);
  });

  it('page count with 3 snapshots → 3 toPng, 3 addImage, 2 addPage', async () => {
    await exportQualityPdf(
      baseParams([mkSnapshot('a'), mkSnapshot('b'), mkSnapshot('c')]),
    );
    expect(toPngMock).toHaveBeenCalledTimes(3);
    expect(addImageMock).toHaveBeenCalledTimes(3);
    expect(addPageMock).toHaveBeenCalledTimes(2);
    expect(saveMock).toHaveBeenCalledTimes(1);
  });

  it('save() is called with the locked filename pattern', async () => {
    await exportQualityPdf(baseParams([]));
    expect(saveMock).toHaveBeenCalledTimes(1);
    const filename = saveMock.mock.calls[0][0] as string;
    // Locked regex: `fhir-exploder-quality-report_<slug>_YYYY-MM-DD_HHMMSS.pdf`
    expect(filename).toMatch(
      /^fhir-exploder-quality-report_[a-z0-9.-]{1,60}_\d{4}-\d{2}-\d{2}_\d{6}\.pdf$/,
    );
    expect(filename).toContain('localhost-8080');
  });

  it('portal host is removed from document.body on success', async () => {
    const before = document.body.childElementCount;
    await exportQualityPdf(baseParams([]));
    // Portal host should have been appended then removed.
    expect(document.body.childElementCount).toBe(before);
    expect(unmountMock).toHaveBeenCalled();
  });

  it('portal host is removed on error AND promise rejects', async () => {
    toPngMock.mockRejectedValueOnce(new Error('toPng failed'));
    const before = document.body.childElementCount;
    await expect(exportQualityPdf(baseParams([]))).rejects.toThrow(
      /toPng failed/,
    );
    expect(document.body.childElementCount).toBe(before);
    expect(unmountMock).toHaveBeenCalled();
  });
});
