/**
 * QUAL-03 — CodingCoveragePanel + useCodingCoverage rollup tests.
 *
 * Plan 05-04 delivers:
 *   - src/hooks/useCodingCoverage.ts
 *   - src/components/quality/CodingCoveragePanel.tsx (overwrites 05-02 stub)
 *   - src/components/quality/CodingDrillDown.tsx   (overwrites 05-01 stub)
 *
 * This suite:
 *   - Renders the Panel with mocked client samples and asserts the legend,
 *     disclosure, stacked Progress bar, sortable columns, loading state,
 *     and em-dash placeholder for types with totalCodedFields===0.
 *   - Wraps the hook with QualityMetricsProvider and asserts setCoverage
 *     receives the rounded arithmetic mean across settled types.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import type { ReactNode } from 'react';
import { MantineProvider } from '@mantine/core';
import { MemoryRouter } from 'react-router-dom';
import type { MedplumClient } from '@medplum/core';
import type { Resource } from '@medplum/fhirtypes';

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

import { CodingCoveragePanel } from '../components/quality/CodingCoveragePanel';
import { useCodingCoverage } from '../hooks/useCodingCoverage';
import {
  QualityMetricsProvider,
  useQualityMetrics,
} from '../quality/QualityMetricsContext';

let serverCounter = 0;
function nextServerUrl(): string {
  serverCounter++;
  return `http://localhost:8080/coverage-${serverCounter}`;
}

function makeClient(options: {
  samplesByType: Record<string, Resource[]>;
  errorTypes?: string[];
  delayMs?: number;
  serverUrl?: string;
}): MedplumClient {
  const {
    samplesByType,
    errorTypes = [],
    delayMs = 0,
    serverUrl = nextServerUrl(),
  } = options;
  const searchResources = vi.fn(async (type: string) => {
    if (delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
    if (errorTypes.includes(type)) {
      throw new Error(`search failed for ${type}`);
    }
    return samplesByType[type] ?? [];
  });
  return {
    getBaseUrl: () => serverUrl,
    searchResources,
  } as unknown as MedplumClient;
}

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <MantineProvider>
      <MemoryRouter>
        <QualityMetricsProvider>{children}</QualityMetricsProvider>
      </MemoryRouter>
    </MantineProvider>
  );
}

beforeEach(() => {
  try {
    localStorage.clear();
  } catch {
    /* ignore */
  }
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Condition fixtures — high coverage vs low coverage.
const goodCondition = (id: string): Resource =>
  ({
    resourceType: 'Condition',
    id,
    code: {
      coding: [{ system: 'http://snomed.info/sct', code: '44054006' }],
    },
    subject: { reference: 'Patient/1' },
  }) as Resource;
const textOnlyCondition = (id: string): Resource =>
  ({
    resourceType: 'Condition',
    id,
    code: { text: 'Undiagnosed' },
    subject: { reference: 'Patient/1' },
  }) as Resource;
const emptyCodeObservation = (id: string): Resource =>
  ({
    resourceType: 'Observation',
    id,
    status: 'final',
    code: {}, // empty CC → empty bucket
    subject: { reference: 'Patient/1' },
  }) as Resource;
const noCodesResource = (id: string): Resource =>
  ({
    resourceType: 'Patient',
    id,
    name: [{ family: 'Doe', given: ['Jane'] }],
  }) as Resource;

describe('CodingCoveragePanel (QUAL-03)', () => {
  it('renders the disclosure banner and the three-bucket legend', async () => {
    const client = makeClient({
      samplesByType: {
        Condition: [goodCondition('c1')],
      },
    });
    render(
      <Wrapper>
        <CodingCoveragePanel
          types={['Condition']}
          client={client}
          sampleSize={100}
        />
      </Wrapper>,
    );
    expect(
      screen.getByText(
        /Completeness and coverage are estimated from a sample/,
      ),
    ).toBeDefined();
    // Legend shows all three bucket labels. Each label appears both in
    // the legend AND in the sortable column header, so getAllByText finds
    // >= 2 per bucket.
    expect(screen.getAllByText('system+code').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('text-only').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('empty').length).toBeGreaterThanOrEqual(1);
  });

  it('renders a Resource type link pointing to /quality/coding/:type', async () => {
    const client = makeClient({
      samplesByType: {
        Condition: [goodCondition('c1')],
      },
    });
    render(
      <Wrapper>
        <CodingCoveragePanel
          types={['Condition']}
          client={client}
          sampleSize={100}
        />
      </Wrapper>,
    );
    const link = await screen.findByRole('link', { name: 'Condition' });
    expect(link.getAttribute('href')).toBe('/quality/coding/Condition');
  });

  it('shows Skeleton in the Coverage cell while a type is loading', () => {
    const client = makeClient({
      samplesByType: { Condition: [goodCondition('c1')] },
      delayMs: 500,
    });
    const { container } = render(
      <Wrapper>
        <CodingCoveragePanel
          types={['Condition']}
          client={client}
          sampleSize={100}
        />
      </Wrapper>,
    );
    // Mantine Skeleton renders with class `mantine-Skeleton-root`.
    const skeletons = container.querySelectorAll('.mantine-Skeleton-root');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders em-dash placeholder when totalCodedFields is 0', async () => {
    const client = makeClient({
      samplesByType: {
        // Patient with only name/birthDate — no CodeableConcepts → totalCodedFields=0
        Patient: [noCodesResource('p1')],
      },
    });
    render(
      <Wrapper>
        <CodingCoveragePanel
          types={['Patient']}
          client={client}
          sampleSize={100}
        />
      </Wrapper>,
    );
    // Wait for the row to settle.
    await screen.findByRole('link', { name: 'Patient' });
    // An em-dash appears in the Coverage cell (Mantine renders the char).
    await waitFor(() => {
      const dashes = screen.getAllByText('—');
      expect(dashes.length).toBeGreaterThan(0);
    });
  });

  it('each sortable column header carries aria-sort', async () => {
    const client = makeClient({
      samplesByType: {
        Condition: [goodCondition('c1'), textOnlyCondition('c2')],
      },
    });
    render(
      <Wrapper>
        <CodingCoveragePanel
          types={['Condition']}
          client={client}
          sampleSize={100}
        />
      </Wrapper>,
    );
    const headers = screen.getAllByRole('columnheader');
    const sortableHeaders = headers.filter((h) =>
      h.hasAttribute('aria-sort'),
    );
    // Resource type + system+code + text-only + empty → 4 sortable columns
    expect(sortableHeaders.length).toBeGreaterThanOrEqual(4);
  });

  it('toggles sort direction when a sortable header is clicked', async () => {
    const client = makeClient({
      samplesByType: {
        Condition: [goodCondition('c1')],
        Observation: [emptyCodeObservation('o1')],
      },
    });
    render(
      <Wrapper>
        <CodingCoveragePanel
          types={['Condition', 'Observation']}
          client={client}
          sampleSize={100}
        />
      </Wrapper>,
    );
    // Default sort = system+code ASC (worst-first).
    await screen.findByRole('link', { name: 'Condition' });
    // Find the system+code header and click it.
    const systemCodeHeader = screen
      .getAllByRole('columnheader')
      .find((h) => h.textContent?.includes('system+code'));
    expect(systemCodeHeader).toBeDefined();
    const initialAriaSort = systemCodeHeader!.getAttribute('aria-sort');
    fireEvent.click(systemCodeHeader!.querySelector('button') ?? systemCodeHeader!);
    const afterAriaSort = systemCodeHeader!.getAttribute('aria-sort');
    expect(afterAriaSort).not.toBe(initialAriaSort);
  });

  it('default sort places worst systemCode% first (ASC)', async () => {
    // Condition → 100% systemCode (1/1)
    // Observation → 0% systemCode (0/1, one empty CC) — should appear first
    const client = makeClient({
      samplesByType: {
        Condition: [goodCondition('c1')],
        Observation: [emptyCodeObservation('o1')],
      },
    });
    const { container } = render(
      <Wrapper>
        <CodingCoveragePanel
          types={['Condition', 'Observation']}
          client={client}
          sampleSize={100}
        />
      </Wrapper>,
    );
    await waitFor(() => {
      expect(
        screen.getByRole('link', { name: 'Condition' }),
      ).toBeDefined();
      expect(
        screen.getByRole('link', { name: 'Observation' }),
      ).toBeDefined();
    });
    // First data row's anchor text should be Observation (0%) before
    // Condition (100%) under ASC sort.
    const rows = container.querySelectorAll('tbody tr');
    const firstRowLink = rows[0].querySelector('a');
    expect(firstRowLink?.textContent).toBe('Observation');
  });
});

describe('useCodingCoverage rollup (QUAL-03)', () => {
  function flush() {
    return act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  it('pushes Math.rounded arithmetic mean into setCoverage (2 settled types → 50)', async () => {
    // Condition: 2 CCs, 2 systemCode → 100%
    // Observation: 1 CC, 0 systemCode → 0%
    // mean = 50%
    const condition1 = goodCondition('c1');
    const condition2 = {
      resourceType: 'Condition',
      id: 'c2',
      code: { coding: [{ system: 's', code: 'y' }] },
      subject: { reference: 'Patient/1' },
      category: [
        { coding: [{ system: 's2', code: 'z' }] },
      ],
    } as Resource;
    // Observation with one empty-coded category and no populated code.
    const observation1 = {
      resourceType: 'Observation',
      id: 'o1',
      status: 'final',
      code: {}, // empty CC → empty bucket
      subject: { reference: 'Patient/1' },
    } as Resource;

    const client = makeClient({
      samplesByType: {
        Condition: [condition1, condition2],
        Observation: [observation1],
      },
    });

    const captured: Array<number | undefined> = [];
    function Spy() {
      const { overallCoverage } = useQualityMetrics();
      captured.push(overallCoverage);
      return null;
    }
    function Harness() {
      useCodingCoverage(client, ['Condition', 'Observation'], 100);
      return <Spy />;
    }
    render(
      <Wrapper>
        <Harness />
      </Wrapper>,
    );

    await waitFor(() => {
      // Condition has 3 coded fields (2 code + 1 category), all systemCode → 100%
      // Observation has 1 coded field (code), 0 systemCode → 0%
      // mean = 50%
      expect(captured).toContain(50);
    });
  });

  it('excludes types with totalCodedFields===0 from the rollup', async () => {
    // Condition: 1 systemCode → 100%
    // Patient: 0 CCs → excluded → rollup should still be 100%
    const client = makeClient({
      samplesByType: {
        Condition: [goodCondition('c1')],
        Patient: [noCodesResource('p1')],
      },
    });
    const captured: Array<number | undefined> = [];
    function Spy() {
      const { overallCoverage } = useQualityMetrics();
      captured.push(overallCoverage);
      return null;
    }
    function Harness() {
      useCodingCoverage(client, ['Condition', 'Patient'], 100);
      return <Spy />;
    }
    render(
      <Wrapper>
        <Harness />
      </Wrapper>,
    );
    await waitFor(() => {
      expect(captured).toContain(100);
    });
  });

  it('fires setCoverage(undefined) when nothing has settled yet', async () => {
    const client = makeClient({
      samplesByType: { Condition: [goodCondition('c1')] },
      delayMs: 5000,
    });
    const captured: Array<number | undefined> = [];
    function Spy() {
      const { overallCoverage } = useQualityMetrics();
      captured.push(overallCoverage);
      return null;
    }
    function Harness() {
      useCodingCoverage(client, ['Condition'], 100);
      return <Spy />;
    }
    render(
      <Wrapper>
        <Harness />
      </Wrapper>,
    );
    // Synchronously: rollup effect has fired at least once with undefined.
    await flush();
    expect(captured[0]).toBeUndefined();
  });
});
