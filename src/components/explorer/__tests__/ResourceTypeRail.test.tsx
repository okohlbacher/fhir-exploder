/**
 * ResourceTypeRail tests — EXPL-01 (UAT-driven inline addition, 2026-04-29).
 *
 * Phase 41 originally shipped EXPL-01 only on the right-hand
 * `ResourceTypeLanding` page. UAT Test 1 surfaced that the left-rail
 * (240-px navigation sidebar) needed a parallel "Hide empty" Switch.
 * The fix added a Switch sharing the same localStorage key
 * `explorer.hideEmptyResourceTypes.v1`, default ON.
 *
 * Regression contract:
 *   - Switch renders inside the rail header with default ON (checked).
 *   - Toggling the Switch flips localStorage and hides/shows zero-count rows.
 *   - When localStorage already has `false`, Switch hydrates as unchecked.
 *   - Synthea-zero-set types (AllergyIntolerance, Consent, Immunization,
 *     ServiceRequest, MedicationStatement) are hidden by default.
 *   - Switch is disabled when no zero-count types exist.
 *   - Loading rows are not filtered out (countsReady gate).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { MemoryRouter } from 'react-router-dom';
import type { CapabilityStatement } from '@medplum/fhirtypes';
import type { MedplumClient } from '@medplum/core';

import { ResourceTypeRail } from '../ResourceTypeRail';

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

const countsMock = vi.fn();
vi.mock('../../../hooks/useResourceCounts', () => ({
  useResourceCounts: (...args: unknown[]) => countsMock(...args),
}));

const capability: CapabilityStatement = {
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
} as CapabilityStatement;

const stubClient = {} as MedplumClient;

function renderRail() {
  return render(
    <MantineProvider>
      <MemoryRouter>
        <ResourceTypeRail capability={capability} client={stubClient} />
      </MemoryRouter>
    </MantineProvider>,
  );
}

function getRailItem(name: string): HTMLElement | null {
  const matches = screen.queryAllByText(name);
  for (const el of matches) {
    if (!el.closest('[role="option"]')) return el;
  }
  return null;
}

function expectRailItemPresent(name: string): void {
  expect(getRailItem(name), `${name} should be in the rail`).not.toBeNull();
}

function expectRailItemAbsent(name: string): void {
  expect(getRailItem(name), `${name} should NOT be in the rail`).toBeNull();
}

function getSwitch(): HTMLInputElement {
  return screen.getByRole('switch', { name: /hide empty/i }) as HTMLInputElement;
}

describe('ResourceTypeRail — EXPL-01 hide-empty Switch (UAT-added rail twin)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    countsMock.mockReset();
  });

  it('Test 1 — defaults to ON and hides zero-count types', () => {
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
    renderRail();
    expect(getSwitch().checked).toBe(true);
    expectRailItemPresent('Patient');
    expectRailItemAbsent('Consent');
    expectRailItemAbsent('AllergyIntolerance');
  });

  it('Test 2 — toggling the Switch off reveals zero-count types', () => {
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
    renderRail();
    fireEvent.click(getSwitch());
    expectRailItemPresent('Consent');
    expectRailItemPresent('AllergyIntolerance');
    expectRailItemPresent('Patient');
  });

  it('Test 3 — initial state hydrates from localStorage (OFF override)', () => {
    window.localStorage.setItem(
      'explorer.hideEmptyResourceTypes.v1',
      JSON.stringify(false),
    );
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
    renderRail();
    expect(getSwitch().checked).toBe(false);
    expectRailItemPresent('Consent');
    expectRailItemPresent('Patient');
  });

  it('Test 4 — Synthea-zero set: 5 zero-count types hidden by default', () => {
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
    renderRail();
    expect(getSwitch().checked).toBe(true);
    expectRailItemAbsent('AllergyIntolerance');
    expectRailItemAbsent('Consent');
    expectRailItemAbsent('Immunization');
    expectRailItemAbsent('ServiceRequest');
    expectRailItemAbsent('MedicationStatement');
    expectRailItemPresent('Patient');
    expectRailItemPresent('Encounter');
    expectRailItemPresent('Observation');
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
    renderRail();
    expect(getSwitch().disabled).toBe(true);
  });

  it('Test 6 — loading rows are not filtered out (countsReady gate)', () => {
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
    renderRail();
    // Default ON, but Encounter is still loading so filter is short-circuited.
    expectRailItemPresent('Encounter');
    expectRailItemPresent('Patient');
    expectRailItemPresent('Consent');
  });
});
