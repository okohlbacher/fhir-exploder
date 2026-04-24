/**
 * metrics-isolation.test.tsx — EFF-R14-04 per-tile render isolation proof.
 *
 * Asserts that after a single setCompleteness(42), only the Completeness
 * MetricTile re-renders (phase === 'update'), not the other 6. This is
 * the load-bearing test for the Phase 32 value proposition: per-metric
 * contexts eliminate the monolithic re-render cascade that Option A was
 * designed to solve (v1.5 REQUIREMENTS.md EFF-R14-01..06).
 *
 * Pitfalls guarded (per 32-RESEARCH.md):
 * - Pitfall 1: we filter on `phase === 'update'` only. Mount phase is
 *   universal across all 7 tiles; counting it would mask the isolation.
 * - Pitfall 2: we do NOT wrap in React's strict-mode boundary. That mode
 *   double-invokes every render, which would make the "exactly 1 update"
 *   assertion fail.
 * - A1 sanity: we assert at least one onRender callback fired total, so a
 *   silent-no-op (e.g., if Vitest ever turned off React's dev build) would
 *   not pass this test silently.
 */
import { describe, it, expect, vi } from 'vitest';
import { Profiler, useEffect, type ProfilerOnRenderCallback, type ReactNode } from 'react';
import { render, act } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { MemoryRouter } from 'react-router-dom';
import { QualityMetricsProviders, useCompletenessRollup } from '../quality/metrics';
import { MetricTile } from '../components/quality/MetricTile';
import type { MetricKey } from '../quality/thresholds';
import {
  IconCircleCheck,
  IconClipboardCheck,
  IconCopy,
  IconLanguage,
  IconLink,
  IconMicroscope,
  IconShieldCheck,
} from '@tabler/icons-react';

// Polyfill window.matchMedia for jsdom (required by Mantine; project convention).
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

const METRIC_ORDER: MetricKey[] = [
  'completeness',
  'coverage',
  'validation',
  'plausibility',
  'labRanges',
  'duplicates',
  'references',
];

// Static icon mapping (mirrors production OverviewStrip.tsx METRIC_ICONS).
const ICONS: Record<MetricKey, ReactNode> = {
  completeness: <IconCircleCheck size={18} />,
  coverage: <IconLanguage size={18} />,
  validation: <IconShieldCheck size={18} />,
  plausibility: <IconClipboardCheck size={18} />,
  labRanges: <IconMicroscope size={18} />,
  duplicates: <IconCopy size={18} />,
  references: <IconLink size={18} />,
};

// Harness captures the setCompleteness setter for the test to drive.
function Harness({ onSetter }: { onSetter: (s: (v: number | undefined) => void) => void }) {
  const { set } = useCompletenessRollup();
  useEffect(() => {
    onSetter(set);
  }, [set, onSetter]);
  return null;
}

describe('QualityMetrics per-tile render isolation (EFF-R14-04)', () => {
  it('setCompleteness(42) re-renders ONLY the Completeness tile', () => {
    const updateCounts = new Map<string, number>();
    let totalCallbacks = 0;

    const onRender: ProfilerOnRenderCallback = (id, phase) => {
      totalCallbacks += 1;
      if (phase === 'update') {
        updateCounts.set(id, (updateCounts.get(id) ?? 0) + 1);
      }
    };

    let setCompleteness!: (v: number | undefined) => void;

    // Render WITHOUT React's strict-mode boundary (Pitfall 2 guard).
    render(
      <MantineProvider>
        <MemoryRouter>
          <QualityMetricsProviders>
            <Harness onSetter={(s) => { setCompleteness = s; }} />
            {METRIC_ORDER.map((key) => (
              <Profiler key={key} id={key} onRender={onRender}>
                <MetricTile metricKey={key} icon={ICONS[key]} />
              </Profiler>
            ))}
          </QualityMetricsProviders>
        </MemoryRouter>
      </MantineProvider>,
    );

    // Sanity: at least one onRender fired during mount (A1 guard).
    expect(totalCallbacks).toBeGreaterThan(0);

    // Clear any mount/update that happened during harness-effect setter capture.
    // (The Harness's useEffect also triggers a commit; that's NOT what we're
    //  measuring.) Defensive clear before the act() that drives the real
    //  setter call.
    updateCounts.clear();

    // Trigger exactly one setCompleteness update.
    act(() => {
      setCompleteness(42);
    });

    // The Completeness tile's Profiler should have recorded exactly one
    // update-phase commit. The other 6 tiles should have recorded zero.
    expect(updateCounts.get('completeness') ?? 0).toBe(1);
    expect(updateCounts.get('coverage') ?? 0).toBe(0);
    expect(updateCounts.get('validation') ?? 0).toBe(0);
    expect(updateCounts.get('plausibility') ?? 0).toBe(0);
    expect(updateCounts.get('labRanges') ?? 0).toBe(0);
    expect(updateCounts.get('duplicates') ?? 0).toBe(0);
    expect(updateCounts.get('references') ?? 0).toBe(0);
  });
});
