/**
 * IPSPanel tests — Phase 44 Plan 44-02 (T-44-06).
 *
 * Replaces the Wave 0 it.skip stubs with real assertions:
 *   1. Panel mounts; Validate button + JsonInput render.
 *   2. Paste incomplete fixture + click Validate => ResourceIssueTable shows
 *      issue rows (T-44-06 wiring proof: JsonInput -> walker -> normalizer ->
 *      ResourceIssueTable is intact).
 *   3. Invalid JSON shows the error alert.
 *
 * Mocks (per RESEARCH §6 Pitfall 7 — dynamic JSON import double-cast):
 *   - getIpsProfileForUrl is mocked to return a stub StructureDefinition. The
 *     walker doesn't read the profile in v1.6, so a minimal stub suffices.
 *     This sidesteps jsdom's handling of the dynamic JSON import in
 *     IPS_REGISTRY (which works in vitest but is not a dependency we want
 *     this component test to share).
 *   - useOutletContext is left untouched because IPSPanel tolerates an
 *     undefined outlet (the server tab is simply disabled).
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { MemoryRouter } from 'react-router-dom';
import incompleteFixture from '../../../quality/__tests__/fixtures/ips/ips-bundle-incomplete.json';

// ----- jsdom polyfills required by Mantine 8 -----
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

beforeAll(() => {
  (
    globalThis as unknown as { ResizeObserver: typeof ResizeObserver }
  ).ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
  if (
    !(Element.prototype as unknown as { scrollIntoView?: () => void })
      .scrollIntoView
  ) {
    (
      Element.prototype as unknown as { scrollIntoView: () => void }
    ).scrollIntoView = function () {};
  }
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
});

// ----- mock getIpsProfileForUrl so the panel's first await resolves to a
// non-null stub, regardless of how vitest+jsdom handle the dynamic JSON
// import inside IPS_REGISTRY.
vi.mock('../../../quality/profiles/ips/getIpsProfileForUrl', () => ({
  IPS_COMPOSITION_PROFILE_URL:
    'http://hl7.org/fhir/uv/ips/StructureDefinition/Composition-uv-ips',
  getIpsProfileForUrl: vi.fn().mockResolvedValue({
    resourceType: 'StructureDefinition',
    url: 'http://hl7.org/fhir/uv/ips/StructureDefinition/Composition-uv-ips',
    name: 'CompositionUvIps',
    type: 'Composition',
  }),
}));

import IPSPanel from '../IPSPanel';

function renderPanel() {
  return render(
    <MantineProvider>
      <MemoryRouter>
        <IPSPanel />
      </MemoryRouter>
    </MantineProvider>,
  );
}

describe('IPSPanel (T-44-06)', () => {
  it('mounts and renders the Validate button + JsonInput on /quality/ips', () => {
    renderPanel();
    expect(screen.getByTestId('ips-panel')).toBeDefined();
    expect(screen.getByTestId('ips-validate-button')).toBeDefined();
    expect(screen.getByTestId('ips-paste-input')).toBeDefined();
  });

  it('paste incomplete fixture + click Validate => ResourceIssueTable shows >=2 rows', async () => {
    renderPanel();
    const input = screen.getByTestId('ips-paste-input') as HTMLTextAreaElement;
    fireEvent.change(input, {
      target: { value: JSON.stringify(incompleteFixture) },
    });
    fireEvent.click(screen.getByTestId('ips-validate-button'));

    await waitFor(
      () => {
        expect(screen.getByTestId('ips-results')).toBeDefined();
      },
      { timeout: 5000 },
    );

    // ResourceIssueTable renders 1 row per issue + 1 thead row.
    const tableRows = screen.getAllByRole('row');
    // Expect at least 1 thead + 2 issue rows = 3
    expect(tableRows.length).toBeGreaterThanOrEqual(3);
  });

  it('invalid JSON shows error alert', async () => {
    renderPanel();
    fireEvent.change(screen.getByTestId('ips-paste-input'), {
      target: { value: 'not json {' },
    });
    fireEvent.click(screen.getByTestId('ips-validate-button'));
    await waitFor(() => {
      expect(screen.getByText(/not valid JSON/i)).toBeDefined();
    });
  });
});
