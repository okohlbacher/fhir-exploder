/**
 * TrendsPanel — Plan 19-02 Task 2.
 *
 * Verifies:
 *  1. Hydration skeletons → empty state
 *  2. Single-snapshot state text
 *  3. 7 mini-charts render with ≥2 snapshots
 *  4. Overlay switch replaces grid
 *  5. Overlay switch disabled <2 snapshots
 *  6. Include-other-servers filter
 *  7. Include-other-servers disabled with one server
 *  8. Filtered-empty state secondary line
 *  9. Clear history modal flow + notification
 * 10. Clear history disabled with 0 snapshots
 * 11. Soft warning at >500 snapshots
 * 12. TrendMiniChart compact mode strips chrome
 * 13. Include other servers renders distinguishable dot shapes per server (UI-SPEC I-07)
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { Notifications, notifications } from '@mantine/notifications';
import type { ReactNode } from 'react';
import { TrendsPanel } from '../components/quality/TrendsPanel';
import { TrendMiniChart } from '../components/quality/TrendMiniChart';
import {
  TRENDS_STORAGE_KEY,
  type QualitySnapshot,
} from '../quality/trendsHistory';
import type { MetricKey } from '../quality/thresholds';

// ----- jsdom polyfills required by Mantine 8 -----

class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
(globalThis as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
  MockResizeObserver as unknown as typeof ResizeObserver;

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function flush(ms = 50) {
  await act(async () => {
    await new Promise((r) => setTimeout(r, ms));
  });
}

function mkSnap(
  id: string,
  serverUrl = 'http://a/fhir',
  scoreOverride?: Partial<Record<MetricKey, number | null>>,
): QualitySnapshot {
  const allScores: Record<MetricKey, number | null> = {
    completeness: 80,
    coverage: 70,
    validation: 95,
    plausibility: 99,
    labRanges: 95,
    duplicates: 99,
    references: 98,
  };
  return {
    id,
    capturedAt: new Date(Date.parse('2026-04-14T12:00:00Z') + Number(id.length) * 1000).toISOString(),
    serverUrl,
    sampleSize: 100,
    cohort: [],
    scores: { ...allScores, ...scoreOverride },
    thresholds: {
      completeness: 80,
      coverage: 70,
      validation: 95,
      plausibility: 99,
      labRanges: 95,
      duplicates: 99,
      references: 98,
    },
  };
}

function seed(snapshots: QualitySnapshot[]) {
  window.localStorage.setItem(TRENDS_STORAGE_KEY, JSON.stringify(snapshots));
}

function renderPanel(serverUrl = 'http://a/fhir', ui?: ReactNode) {
  return render(
    <MantineProvider>
      <Notifications />
      {ui ?? <TrendsPanel serverUrl={serverUrl} />}
    </MantineProvider>,
  );
}

describe('TrendsPanel', () => {
  it('renders hydration skeletons then empty state', async () => {
    seed([]);
    renderPanel();
    // After hydration: empty state copy appears.
    await flush();
    expect(screen.getByText('No snapshots yet')).toBeTruthy();
    expect(
      screen.getByText('Click Capture snapshot to record the current metrics.'),
    ).toBeTruthy();
  });

  it('renders single-snapshot state', async () => {
    seed([mkSnap('a')]);
    renderPanel();
    await flush();
    expect(screen.getByText('1 snapshot captured')).toBeTruthy();
    expect(
      screen.getByText('Capture at least one more to see trends.'),
    ).toBeTruthy();
  });

  it('renders 7 mini-charts with ≥2 snapshots', async () => {
    seed([mkSnap('a'), mkSnap('b'), mkSnap('c')]);
    renderPanel();
    await flush();
    // All 7 metric label strings are present in the DOM (as header-strip text)
    for (const label of [
      'Completeness',
      'Coding coverage',
      'Validation',
      'Plausibility',
      'Lab ranges',
      'Duplicates',
      'References',
    ]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
  });

  it('Overlay switch replaces grid with overlay chart', async () => {
    seed([mkSnap('a'), mkSnap('b'), mkSnap('c')]);
    renderPanel();
    await flush();
    // Toggle Overlay switch on (has accessible name from its visual label)
    const overlaySwitch = screen.getByRole('switch', {
      name: /overlay all metrics/i,
    });
    await act(async () => {
      fireEvent.click(overlaySwitch);
    });
    await flush();
    // Overlay has test-id we render on the root
    expect(screen.getByTestId('trend-overlay-chart')).toBeTruthy();
  });

  it('Overlay switch disabled when <2 snapshots', async () => {
    seed([mkSnap('a')]);
    renderPanel();
    await flush();
    const overlaySwitch = screen.getByRole('switch', {
      name: /overlay all metrics/i,
    });
    expect((overlaySwitch as HTMLInputElement).disabled).toBe(true);
  });

  it('Include other servers switch filters', async () => {
    seed([
      mkSnap('a1', 'http://a/fhir'),
      mkSnap('a2', 'http://a/fhir'),
      mkSnap('b1', 'http://b/fhir'),
      mkSnap('b2', 'http://b/fhir'),
    ]);
    renderPanel('http://a/fhir');
    await flush();
    // Default OFF: only current-server (2 snapshots) render — 7 minicharts.
    // Each mini-chart has a VisuallyHidden accessibility summary
    // "Completeness across 2 snapshots. Latest value: X%."
    const completenessSummary = screen.getAllByText(/Completeness across 2 snapshots/i);
    expect(completenessSummary.length).toBeGreaterThan(0);
    // Toggle include-other-servers on
    const includeSwitch = screen.getByRole('switch', {
      name: /include.*other/i,
    });
    await act(async () => {
      fireEvent.click(includeSwitch);
    });
    await flush();
    const completenessSummary4 = screen.getAllByText(
      /Completeness across 4 snapshots/i,
    );
    expect(completenessSummary4.length).toBeGreaterThan(0);
  });

  it('Include other servers switch disabled with one server', async () => {
    seed([mkSnap('a1'), mkSnap('a2'), mkSnap('a3')]);
    renderPanel();
    await flush();
    const includeSwitch = screen.getByRole('switch', {
      name: /include.*other/i,
    });
    expect((includeSwitch as HTMLInputElement).disabled).toBe(true);
  });

  it('Filtered-empty state shows secondary line', async () => {
    seed([mkSnap('b1', 'http://b/fhir'), mkSnap('b2', 'http://b/fhir')]);
    renderPanel('http://a/fhir');
    await flush();
    expect(
      screen.getByText(
        /You have 2 snapshot\(s\) from other servers\. Toggle 'Include other servers' above to see them\./,
      ),
    ).toBeTruthy();
  });

  it('Clear history modal flow', async () => {
    const showSpy = vi.spyOn(notifications, 'show');
    seed([mkSnap('a'), mkSnap('b')]);
    renderPanel();
    await flush();
    // Click Clear history button
    const clearBtn = screen.getByRole('button', { name: /^Clear history$/i });
    await act(async () => {
      fireEvent.click(clearBtn);
    });
    await flush(150);
    // Modal title
    expect(await screen.findByText('Clear all snapshots?')).toBeTruthy();
    // Click confirm button — the RED "Clear history" button inside the dialog
    const dialog = await screen.findByRole('dialog');
    const confirmBtn = Array.from(
      dialog.querySelectorAll('button'),
    ).find((b) => /^Clear history$/i.test((b.textContent ?? '').trim()));
    expect(confirmBtn).toBeTruthy();
    await act(async () => {
      fireEvent.click(confirmBtn!);
    });
    await flush(150);
    // Snapshots are gone — empty state text reappears.
    expect(screen.getByText('No snapshots yet')).toBeTruthy();
    // Notification fired
    expect(
      showSpy.mock.calls.some((call) => {
        const arg = call[0] as { title?: string } | undefined;
        return arg?.title === 'History cleared';
      }),
    ).toBe(true);
  });

  it('Clear history disabled when 0 snapshots', async () => {
    seed([]);
    renderPanel();
    await flush();
    const clearBtn = screen.getByRole('button', { name: /^Clear history$/i });
    expect((clearBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it('Soft warning renders above grid at >500 snapshots', async () => {
    const many: QualitySnapshot[] = [];
    for (let i = 0; i < 501; i++) {
      many.push(mkSnap(`s${i}`));
    }
    seed(many);
    renderPanel();
    await flush();
    expect(screen.getByText('Many snapshots stored')).toBeTruthy();
  });

  it('TrendMiniChart compact mode strips chrome', async () => {
    const snapA = mkSnap('a');
    const snapB = mkSnap('b');
    const { container } = renderPanel(
      'http://a/fhir',
      <TrendMiniChart
        metric="completeness"
        snapshots={[snapA, snapB]}
        includeOtherServers={false}
        compact
      />,
    );
    await flush();
    // No header-strip label text in compact mode
    expect(screen.queryByText('Completeness')).toBeNull();
    // No VisuallyHidden summary in compact mode
    expect(screen.queryByText(/Completeness across/i)).toBeNull();
    // Card root uses width 120 (inline style)
    const cards = container.querySelectorAll('[data-compact="true"]');
    expect(cards.length).toBeGreaterThan(0);
    const firstCard = cards[0] as HTMLElement;
    expect(firstCard.style.width).toContain('120');
  });

  it('Include other servers renders distinguishable dot shapes per server (UI-SPEC I-07)', async () => {
    seed([
      mkSnap('a1', 'http://a/fhir'),
      mkSnap('a2', 'http://a/fhir'),
      mkSnap('b1', 'http://b/fhir'),
      mkSnap('b2', 'http://b/fhir'),
    ]);
    const { container } = renderPanel('http://a/fhir');
    await flush();
    // Toggle include-other-servers on
    const includeSwitch = screen.getByRole('switch', {
      name: /include.*other/i,
    });
    await act(async () => {
      fireEvent.click(includeSwitch);
    });
    await flush();
    // Query all elements with data-server-shape — across all mini-charts.
    const dots = container.querySelectorAll('[data-server-shape]');
    const shapes = new Set(
      Array.from(dots).map((el) => (el as HTMLElement).getAttribute('data-server-shape')),
    );
    // At least 2 distinct shapes present (one per server).
    expect(shapes.size).toBeGreaterThanOrEqual(2);
  });
});
