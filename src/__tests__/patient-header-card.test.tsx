/**
 * Phase 59 FIX-08 — $everything button icon swap (ICON-01).
 *
 * IconShareplay (Apple SharePlay icon — semantically a TV/screen-share icon)
 * is replaced by IconExternalLink, which correctly signals "opens in a new tab".
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import type { Patient } from '@medplum/fhirtypes';
import { PatientHeaderCard } from '../components/patients/PatientHeaderCard';

// ----- jsdom polyfill required by Mantine 8 MantineProvider color-scheme -----
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

const STUB_PATIENT: Patient = {
  resourceType: 'Patient',
  id: 'p1',
  name: [{ family: 'Doe', given: ['Jane'] }],
};

function renderCard() {
  return render(
    <MantineProvider>
      <MemoryRouter>
        <PatientHeaderCard patient={STUB_PATIENT} />
      </MemoryRouter>
    </MantineProvider>,
  );
}

describe('PatientHeaderCard — FIX-08 $everything icon swap', () => {
  it('renders IconExternalLink on the $everything ActionIcon (not IconShareplay)', () => {
    renderCard();
    const icon = screen.getByTestId('everything-external-link-icon');
    expect(icon).toBeInTheDocument();
  });

  it('preserves the $everything ActionIcon aria-label', () => {
    renderCard();
    const button = screen.getByLabelText('Open Patient $everything in a new tab');
    expect(button).toBeInTheDocument();
  });
});
