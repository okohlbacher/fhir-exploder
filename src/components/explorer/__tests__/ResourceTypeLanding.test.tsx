/**
 * ResourceTypeLanding tests — EXPL-01 (Plan 41-01).
 *
 * Regression suite for the hide-empty-resource-types Switch:
 *   - Default OFF (Switch unchecked, empty types SHOWN) — flips v1.5
 *     "hide-empty-by-default" behavior.
 *   - Toggle ON filters out `counts[type] === 0` rows.
 *   - State persists across re-renders via Mantine `useLocalStorage`
 *     under key `explorer.hideEmptyResourceTypes.v1`.
 *   - Synthea-zero set (AllergyIntolerance, Consent, Immunization,
 *     ServiceRequest, MedicationStatement) is hidden when toggle ON.
 *   - When no zero-count types exist, Switch is rendered but disabled.
 *   - Loading rows always render (filter ignores non-numeric counts).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { MemoryRouter } from 'react-router-dom';

import { ResourceTypeLanding } from '../ResourceTypeLanding';

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

// Mock useResourceCounts — the only external runtime dep we need to control.
const countsMock = vi.fn();
vi.mock('../../../hooks/useResourceCounts', () => ({
  useResourceCounts: (...args: unknown[]) => countsMock(...args),
}));

// Mock useOutletContext to return a minimal CapabilityStatement.
// parseResourceTypes() iterates `rest[0].resource[]` looking for `{ type: string }`.
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useOutletContext: () => ({
      capability: {
        resourceType: 'CapabilityStatement',
        rest: [
          {
            mode: 'server',
            resource: [
              { type: 'Patient' },
              { type: 'Consent' },
              { type: 'AllergyIntolerance' },
              { type: 'Immunization' },
              { type: 'ServiceRequest' },
              { type: 'MedicationStatement' },
              { type: 'Encounter' },
              { type: 'Observation' },
            ],
          },
        ],
      },
    }),
    useNavigate: () => vi.fn(),
  };
});

// Mock useMedplum so the component renders without a real client.
vi.mock('@medplum/react-hooks', () => ({
  useMedplum: () => ({}),
}));

function renderLanding() {
  return render(
    <MantineProvider>
      <MemoryRouter>
        <ResourceTypeLanding />
      </MemoryRouter>
    </MantineProvider>,
  );
}

/**
 * Mantine 8 `<Select searchable>` portals all option `<span>` elements
 * into the DOM (hidden via CSS in real browsers). In jsdom they show up
 * to text queries. These helpers scope queries to the visible
 * resource-type list (which lives outside `role="option"` containers).
 */
function getListItem(name: string): HTMLElement | null {
  const matches = screen.queryAllByText(name);
  for (const el of matches) {
    if (!el.closest('[role="option"]')) {
      return el;
    }
  }
  return null;
}

function expectListItemPresent(name: string): void {
  const el = getListItem(name);
  expect(el, `${name} should be in the visible list`).not.toBeNull();
}

function expectListItemAbsent(name: string): void {
  const el = getListItem(name);
  expect(el, `${name} should NOT be in the visible list`).toBeNull();
}

/**
 * Mantine renders Switch as `<input type="checkbox" role="switch">`.
 * Returns the input as an HTMLInputElement so callers can read
 * `.checked` / `.disabled` directly (avoids depending on optional
 * `@testing-library/jest-dom` matchers that aren't globally installed
 * in this project — see vitest.config.ts which has no setupFiles).
 */
function getSwitch(): HTMLInputElement {
  return screen.getByRole('switch', { name: /hide empty/i }) as HTMLInputElement;
}

describe('ResourceTypeLanding — EXPL-01 hide-empty toggle', () => {
  beforeEach(() => {
    window.localStorage.clear();
    countsMock.mockReset();
  });

  it('Test 1 — defaults to OFF and shows all types (including zero-count)', () => {
    countsMock.mockReturnValue({
      Patient: 100,
      Consent: 0,
      AllergyIntolerance: 0,
      Immunization: 0,
      ServiceRequest: 0,
      MedicationStatement: 0,
      Encounter: 5,
      Observation: 5,
    });
    renderLanding();
    expect(getSwitch().checked).toBe(false);
    expectListItemPresent('Patient');
    expectListItemPresent('Consent');
    expectListItemPresent('AllergyIntolerance');
  });

  it('Test 2 — clicking the Switch hides zero-count types', () => {
    countsMock.mockReturnValue({
      Patient: 100,
      Consent: 0,
      AllergyIntolerance: 0,
      Immunization: 0,
      ServiceRequest: 0,
      MedicationStatement: 0,
      Encounter: 5,
      Observation: 5,
    });
    renderLanding();
    fireEvent.click(getSwitch());
    expectListItemAbsent('Consent');
    expectListItemAbsent('AllergyIntolerance');
    expectListItemPresent('Patient');
  });

  it('Test 3 — initial state hydrates from localStorage', () => {
    window.localStorage.setItem(
      'explorer.hideEmptyResourceTypes.v1',
      JSON.stringify(true),
    );
    countsMock.mockReturnValue({
      Patient: 100,
      Consent: 0,
      Encounter: 5,
      Observation: 5,
      AllergyIntolerance: 0,
      Immunization: 0,
      ServiceRequest: 0,
      MedicationStatement: 0,
    });
    renderLanding();
    expect(getSwitch().checked).toBe(true);
    expectListItemAbsent('Consent');
    expectListItemPresent('Patient');
  });

  it('Test 4 — Synthea-zero set: 5 zero-count types hidden when toggle ON', () => {
    countsMock.mockReturnValue({
      AllergyIntolerance: 0,
      Consent: 0,
      Immunization: 0,
      ServiceRequest: 0,
      MedicationStatement: 0,
      Patient: 100,
      Encounter: 50,
      Observation: 80,
    });
    renderLanding();
    fireEvent.click(getSwitch());
    expectListItemAbsent('AllergyIntolerance');
    expectListItemAbsent('Consent');
    expectListItemAbsent('Immunization');
    expectListItemAbsent('ServiceRequest');
    expectListItemAbsent('MedicationStatement');
    expectListItemPresent('Patient');
    expectListItemPresent('Encounter');
    expectListItemPresent('Observation');
  });

  it('Test 5 — Switch is disabled when no zero-count types exist', () => {
    countsMock.mockReturnValue({
      Patient: 100,
      Encounter: 50,
      Observation: 80,
      Consent: 5,
      AllergyIntolerance: 1,
      Immunization: 1,
      ServiceRequest: 1,
      MedicationStatement: 1,
    });
    renderLanding();
    expect(getSwitch().disabled).toBe(true);
  });

  it('Test 6 — loading rows are not filtered out', () => {
    // countsReady=false because Encounter is loading. The filter guard
    // `countsReady && hideEmpty` short-circuits to NOT filter at all,
    // so all types render including Consent. This documents the
    // behavior: while ANY type is still loading, no filtering occurs
    // (preserves visibility per the existing pattern). Once counts
    // settle, the filter applies normally.
    countsMock.mockReturnValue({
      Patient: 100,
      Encounter: 'loading',
      Consent: 0,
      AllergyIntolerance: 0,
      Immunization: 0,
      ServiceRequest: 0,
      MedicationStatement: 0,
      Observation: 80,
    });
    renderLanding();
    fireEvent.click(getSwitch());
    // Encounter still rendered (loading state preserved).
    expectListItemPresent('Encounter');
    // Patient still rendered.
    expectListItemPresent('Patient');
  });
});
