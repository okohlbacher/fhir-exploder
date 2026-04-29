/**
 * MiiModuleTabs hide-empty toggle tests — Plan 34-05 Task 1 (MII-EXT-14).
 *
 * Locks the per-patient empty-state toggle contract:
 *   10. Toggle hidden when no extension modules have been visited + emptied.
 *   11. Toggle reads "Hide N empty modules" once ≥1 visited extension is empty.
 *   12. Click flips state; localStorage roundtrip; label swaps to "Show N".
 *   13. Hydrated hide=true on mount → "Show N" label + empty pills filtered.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';

// Polyfill ResizeObserver for jsdom (required by Mantine components).
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
(globalThis as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
  MockResizeObserver as unknown as typeof ResizeObserver;

// Polyfill matchMedia for jsdom (required by Mantine).
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

// --- Mocks --------------------------------------------------------------

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

const mocks = vi.hoisted(() => ({
  client: null as null | {
    get: ReturnType<typeof vi.fn>;
    fhirUrl: (s: string) => { toString: () => string };
  },
}));

vi.mock('@medplum/react-hooks', () => ({
  useMedplum: () => mocks.client,
}));

// ClinicalTimeline pulls in its own dependencies; stub it to keep the
// rendering surface focused on MiiModuleTabs.
vi.mock('../ClinicalTimeline', () => ({
  ClinicalTimeline: () => null,
}));

import { MiiModuleTabs } from '../MiiModuleTabs';

const STORAGE_KEY = 'patients.hideEmptyExtensions.v1';

function makeEmptyClient() {
  return {
    get: vi.fn(() =>
      Promise.resolve({ resourceType: 'Bundle', entry: [] }),
    ),
    fhirUrl: (s: string) => ({ toString: () => s }),
  };
}

/**
 * Phase 42 (MII-EXT-15): test client whose `client.get` parses the FHIR
 * resource type out of the URL (`${type}?...`) and returns a Bundle with
 * `total = perTypeCount[type] ?? 0`. Used by the pre-probe-counts tests to
 * exercise the per-type sum (D-02), zero-count dimming (D-06), and the
 * coordinator-feed contract (D-05) at the component level.
 */
function makeCountClient(perTypeCount: Record<string, number>) {
  return {
    get: vi.fn((url: string) => {
      // URL pattern from useMiiExtensionCounts:
      //   `${type}?${param}=Patient/${patientId}&_summary=count&_count=0`
      const m = url.match(/^([A-Z][A-Za-z]+)\?/);
      const type = m?.[1] ?? '';
      const total = perTypeCount[type] ?? 0;
      return Promise.resolve({
        resourceType: 'Bundle',
        type: 'searchset',
        total,
        entry: [],
      });
    }),
    fhirUrl: (s: string) => ({ toString: () => s }),
  };
}

function renderTabs(patientId: string) {
  return render(
    <MantineProvider>
      <MiiModuleTabs patientId={patientId} />
    </MantineProvider>,
  );
}

beforeEach(() => {
  mockNavigate.mockReset();
  mocks.client = makeEmptyClient();
  localStorage.clear();
});

afterEach(() => {
  mocks.client = null;
  localStorage.clear();
});

describe('MiiModuleTabs hide-empty toggle (MII-EXT-14, Plan 34-05)', () => {
  // Phase 42 (MII-EXT-15) note: pre-probe-extension-module-counts now
  // populates emptyMap on patient mount via useMiiExtensionCounts → the
  // toggle is accurate WITHOUT requiring a tab click. The Phase-34 tests
  // below were originally written against the click-required model; they
  // have been updated to reflect the Phase-42 D-05 contract while
  // preserving the original assertions about toggle text, click-flip,
  // localStorage roundtrip, and hide-filtering.

  it('when extension modules have non-zero counts, toggle button is NOT rendered', async () => {
    // To exercise the "toggle hidden" branch under Phase 42, every extension
    // module must resolve to a NON-ZERO count (so emptyCount === 0).
    mocks.client = makeCountClient({
      // Cover every FHIR type referenced by any extension module so each
      // extension's per-module sum is > 0. Values are arbitrary > 0.
      Condition: 1,
      Observation: 1,
      Procedure: 1,
      MedicationStatement: 1,
      ImagingStudy: 1,
      DiagnosticReport: 1,
      Specimen: 1,
      DocumentReference: 1,
      MolecularSequence: 1,
      ResearchStudy: 1,
      QuestionnaireResponse: 1,
      Substance: 1,
    });

    await act(async () => {
      renderTabs('p-fresh');
    });

    // Wait for the pre-probe to resolve before asserting toggle absence.
    await waitFor(() => {
      // Onkologie has 4 types × 1 each = 4 → label includes "(4)".
      expect(screen.getByText(/Onkologie \(4\)/)).toBeTruthy();
    });

    expect(screen.queryByText(/Hide \d+ empty modules/)).toBeNull();
    expect(screen.queryByText(/Show \d+ empty modules/)).toBeNull();
  });

  it('when extension modules are empty, toggle reads "Hide N empty modules" without any tab click', async () => {
    await act(async () => {
      renderTabs('p-with-empties');
    });

    // Expand the Collapse to expose the toggle:
    const collapseToggle = screen.getByText(/Extension modules \(\d+\)/);
    await act(async () => {
      fireEvent.click(collapseToggle);
    });

    // Phase 42 D-05: pre-probe resolves all 14 modules to 0; toggle MUST
    // be present without any tab click.
    const toggle = await screen.findByText(/Hide \d+ empty modules/);
    expect(toggle).toBeTruthy();
  });

  it('clicking toggle flips state; button re-renders as "Show N"; localStorage reflects', async () => {
    await act(async () => {
      renderTabs('p-toggle');
    });
    const collapseToggle = screen.getByText(/Extension modules \(\d+\)/);
    await act(async () => {
      fireEvent.click(collapseToggle);
    });
    // Phase 42: pre-probe populates emptyMap automatically; no Onkologie
    // click needed.
    const hideBtn = await screen.findByText(/Hide \d+ empty modules/);
    await act(async () => {
      fireEvent.click(hideBtn);
    });
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
      expect(stored['p-toggle']).toBe(true);
    });
    const showBtn = await screen.findByText(/Show \d+ empty modules/);
    expect(showBtn).toBeTruthy();
  });

  it('hydrated hide=true on mount → toggle reads "Show N" + empty extension pills filtered out', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ 'p-hidden': true }));
    await act(async () => {
      renderTabs('p-hidden');
    });
    const collapseToggle = screen.getByText(/Extension modules \(\d+\)/);
    await act(async () => {
      fireEvent.click(collapseToggle);
    });
    // Phase 42: pre-probe registers all 14 modules as empty automatically.
    const showBtn = await screen.findByText(/Show \d+ empty modules/);
    expect(showBtn).toBeTruthy();
    // Onkologie pill (and its `(0)` count variant) should be filtered out
    // of the Collapse once its emptiness is published + hide flag is on.
    await waitFor(() => {
      expect(screen.queryByText(/Onkologie/)).toBeNull();
    });
  });
});

describe('Phase 42 (MII-EXT-15) — pre-probe counts on extension tabs', () => {
  it('count appends to extension tab labels', async () => {
    // Onkologie module aggregates Condition + Observation + Procedure +
    // MedicationStatement (4 types). Bildgebung aggregates ImagingStudy +
    // DiagnosticReport (2 types). After resolve, the labels should read
    // "Onkologie (11)" (5+3+2+1) and "Bildgebung (6)" (4+2).
    mocks.client = makeCountClient({
      Condition: 5,
      Observation: 3,
      Procedure: 2,
      MedicationStatement: 1,
      ImagingStudy: 4,
      DiagnosticReport: 2,
    });

    await act(async () => {
      renderTabs('p-counts');
    });

    // Expand the Collapse so the extension pills render.
    const collapseToggle = screen.getByText(/Extension modules \(\d+\)/);
    await act(async () => {
      fireEvent.click(collapseToggle);
    });

    await waitFor(() => {
      expect(screen.getByText(/Onkologie \(11\)/)).toBeTruthy();
    });
    expect(screen.getByText(/Bildgebung \(6\)/)).toBeTruthy();
  });

  it('no placeholder while fetching', async () => {
    // Hanging promise: resolve never fires, so counts stay undefined and
    // the label MUST be just "Onkologie" (no parens, no Loader, no skeleton).
    mocks.client = {
      get: vi.fn(() => new Promise<unknown>(() => {})),
      fhirUrl: (s: string) => ({ toString: () => s }),
    };

    const { unmount } = render(
      <MantineProvider>
        <MiiModuleTabs patientId="p-fetching" />
      </MantineProvider>,
    );

    const collapseToggle = screen.getByText(/Extension modules \(\d+\)/);
    await act(async () => {
      fireEvent.click(collapseToggle);
    });

    // The bare label exists (no count appended), and no count-suffix variant
    // is anywhere in the DOM.
    expect(screen.getByText('Onkologie')).toBeTruthy();
    expect(screen.queryByText(/Onkologie \(/)).toBeNull();

    // Cleanup so the never-resolving promise doesn't leak between tests.
    unmount();
  });

  it('base exemption — base tabs receive no count or testid', async () => {
    // Even with high counts mocked for the base modules' resource types,
    // the base 7 tabs (Person, Fall, …) must NOT render `Person (999)`
    // and MUST NOT carry `data-testid="extension-tab-pill"`.
    mocks.client = makeCountClient({
      Patient: 999,
      Encounter: 999,
      Condition: 999,
      Procedure: 999,
      Consent: 999,
      Observation: 999,
      MedicationStatement: 999,
      ImagingStudy: 999,
      DiagnosticReport: 999,
    });

    await act(async () => {
      renderTabs('p-base');
    });

    // Expand so extension pills are present too.
    const collapseToggle = screen.getByText(/Extension modules \(\d+\)/);
    await act(async () => {
      fireEvent.click(collapseToggle);
    });

    await waitFor(() => {
      // Wait until at least one extension tab has its count rendered.
      expect(screen.getByText(/Onkologie \(\d+\)/)).toBeTruthy();
    });

    // Base 7 must remain bare: "Person", "Fall", "Diagnose", "Prozedur",
    // "Consent", "Laborbefund", "Medikation".
    expect(screen.getByText('Person')).toBeTruthy();
    expect(screen.queryByText(/Person \(/)).toBeNull();
    expect(screen.queryByText(/Fall \(/)).toBeNull();
    expect(screen.queryByText(/Diagnose \(/)).toBeNull();
    expect(screen.queryByText(/Prozedur \(/)).toBeNull();
    expect(screen.queryByText(/Consent \(/)).toBeNull();
    expect(screen.queryByText(/Laborbefund \(/)).toBeNull();
    expect(screen.queryByText(/Medikation \(/)).toBeNull();

    // Exactly 14 extension-tab-pill testids (one per extension module).
    const pills = screen.queryAllByTestId('extension-tab-pill');
    expect(pills.length).toBe(14);
  });

  it('dim on zero — opacity 0.55 + data-empty=true', async () => {
    // All zeros for Onkologie's 4 types (Condition/Observation/Procedure/
    // MedicationStatement); ImagingStudy + DiagnosticReport non-zero so
    // Bildgebung resolves to count > 0 (NOT dimmed).
    mocks.client = makeCountClient({
      Condition: 0,
      Observation: 0,
      Procedure: 0,
      MedicationStatement: 0,
      ImagingStudy: 4,
      DiagnosticReport: 2,
    });

    await act(async () => {
      renderTabs('p-dim');
    });

    const collapseToggle = screen.getByText(/Extension modules \(\d+\)/);
    await act(async () => {
      fireEvent.click(collapseToggle);
    });

    await waitFor(() => {
      expect(screen.getByText(/Onkologie \(0\)/)).toBeTruthy();
      expect(screen.getByText(/Bildgebung \(6\)/)).toBeTruthy();
    });

    // Find the Onkologie pill via its label, then walk up to the testid host.
    const onkologieLabel = screen.getByText(/Onkologie \(0\)/);
    const onkologiePill = onkologieLabel.closest(
      '[data-testid="extension-tab-pill"]',
    ) as HTMLElement;
    expect(onkologiePill).toBeTruthy();
    expect(onkologiePill.getAttribute('data-empty')).toBe('true');
    expect(onkologiePill.style.opacity).toBe('0.55');

    // Bildgebung (count=6) must be data-empty="false" with no opacity-0.55
    // dimming on its content host.
    const bildgebungLabel = screen.getByText(/Bildgebung \(6\)/);
    const bildgebungPill = bildgebungLabel.closest(
      '[data-testid="extension-tab-pill"]',
    ) as HTMLElement;
    expect(bildgebungPill).toBeTruthy();
    expect(bildgebungPill.getAttribute('data-empty')).toBe('false');
    expect(bildgebungPill.style.opacity).not.toBe('0.55');
  });

  it('pre-probe feeds toggle — Hide N modules accurate without click', async () => {
    // All 14 extension modules resolve to count=0 — the pre-probe should
    // populate emptyMap WITHOUT any extension tab being clicked.
    mocks.client = makeEmptyClient();

    await act(async () => {
      renderTabs('p-toggle-mount');
    });

    // Expand the Collapse to expose the toggle.
    const collapseToggle = screen.getByText(/Extension modules \(\d+\)/);
    await act(async () => {
      fireEvent.click(collapseToggle);
    });

    // The pre-probe should resolve all 14 → "Hide 14 empty modules".
    // No extension tab click required.
    await waitFor(() => {
      expect(screen.getByText(/Hide 14 empty modules/)).toBeTruthy();
    });
  });

  it('idempotency — pre-probe + post-visit publisher do not double-count', async () => {
    // After the pre-probe resolves 14 empty modules, clicking into one of
    // them fires Phase 34's post-visit publisher with `isEmpty=true` for
    // that same key. The coordinator's reportEmptiness de-dupes (line 106
    // of useEmptyExtensionsCoordinator.tsx), so the count must stay at 14
    // — not 15, not 28.
    mocks.client = makeEmptyClient();

    await act(async () => {
      renderTabs('p-idem');
    });

    const collapseToggle = screen.getByText(/Extension modules \(\d+\)/);
    await act(async () => {
      fireEvent.click(collapseToggle);
    });

    await waitFor(() => {
      expect(screen.getByText(/Hide 14 empty modules/)).toBeTruthy();
    });

    // Click into Onkologie — Phase 34's MiiModuleTab will run its own
    // publisher for the same module, with isEmpty=true.
    const onkologieLabel = await screen.findByText(/Onkologie/);
    await act(async () => {
      fireEvent.click(onkologieLabel);
    });

    // Count must still read 14 (no double-count, no infinite loop).
    await waitFor(() => {
      expect(screen.getByText(/Hide 14 empty modules/)).toBeTruthy();
    });
    expect(screen.queryByText(/Hide 15 empty modules/)).toBeNull();
    expect(screen.queryByText(/Hide 28 empty modules/)).toBeNull();
  });
});
