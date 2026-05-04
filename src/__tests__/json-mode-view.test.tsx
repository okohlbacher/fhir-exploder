import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import type { Resource } from '@medplum/fhirtypes';

// Polyfill ResizeObserver for jsdom (required by Mantine components)
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
(globalThis as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
  MockResizeObserver as unknown as typeof ResizeObserver;

// Polyfill matchMedia for jsdom (required by Mantine)
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

// Mock downloadString so we don't trigger actual file downloads
vi.mock('../utils/export', () => ({
  downloadString: vi.fn(),
}));

// Mock createStructuralBackend to control issue count in tests
vi.mock('../quality/structuralValidator', () => ({
  createStructuralBackend: vi.fn(() => ({
    validate: vi.fn().mockResolvedValue([]),
  })),
}));

// Mock getProfileForType to return non-null for Patient (profiled) and null for Appointment (unprofiled)
vi.mock('../quality/profiles', () => ({
  getProfileForType: vi.fn((resourceType: string) => {
    const profiled = new Set(['Patient', 'Condition', 'Observation', 'Encounter', 'Procedure', 'MedicationStatement', 'Consent']);
    return profiled.has(resourceType) ? { resourceType: 'StructureDefinition' } : null;
  }),
}));

import { JsonModeView } from '../components/explorer/JsonModeView';
import { downloadString } from '../utils/export';
import { createStructuralBackend } from '../quality/structuralValidator';

const mockDownloadString = vi.mocked(downloadString);
const mockCreateStructuralBackend = vi.mocked(createStructuralBackend);

const patientFixture: Resource = {
  resourceType: 'Patient',
  id: 'test-id',
  active: true,
  gender: 'female',
};

function renderJsonModeView(resource: Resource = patientFixture) {
  return render(
    <MantineProvider>
      <MemoryRouter>
        <JsonModeView resource={resource} />
      </MemoryRouter>
    </MantineProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default: validate returns empty (0 issues)
  mockCreateStructuralBackend.mockReturnValue({
    kind: 'structural' as const,
    validate: vi.fn().mockResolvedValue([]),
  });
  // Reset clipboard mock
  Object.assign(navigator, {
    clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
});

describe('JsonModeView (SHELL-04)', () => {
  it('renders Copy + Download + chip + Open in validator', async () => {
    await act(async () => {
      renderJsonModeView();
    });

    // Copy and Download buttons should be present
    expect(screen.getByRole('button', { name: /Copy/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Download/i })).toBeDefined();
    // "Open in validator" link
    expect(screen.getByText('Open in validator')).toBeDefined();
    // Chip should render (initially pending "…" or resolved "0 issues")
    // Either state is valid during render; we check it resolves in chip tests below
  });

  it('copy button', async () => {
    const clipboardWriteText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: clipboardWriteText },
    });

    await act(async () => {
      renderJsonModeView();
    });

    const copyBtn = screen.getByRole('button', { name: /Copy/i });
    await act(async () => {
      copyBtn.click();
    });

    expect(clipboardWriteText).toHaveBeenCalledWith(
      JSON.stringify(patientFixture, null, 2),
    );
  });

  it('download filename', async () => {
    await act(async () => {
      renderJsonModeView();
    });

    const downloadBtn = screen.getByRole('button', { name: /Download/i });
    await act(async () => {
      downloadBtn.click();
    });

    expect(mockDownloadString).toHaveBeenCalledWith(
      JSON.stringify(patientFixture, null, 2),
      'Patient-test-id.json',
      'application/json',
    );
  });

  it('chip 0 issues', async () => {
    mockCreateStructuralBackend.mockReturnValue({
      kind: 'structural' as const,
      validate: vi.fn().mockResolvedValue([]),
    });

    await act(async () => {
      renderJsonModeView();
    });

    await waitFor(() => {
      expect(screen.getByText('0 issues')).toBeDefined();
    });
  });

  it('chip N issues', async () => {
    const fakeIssue = { severity: 'error', code: 'invalid', diagnostics: 'bad field' };
    mockCreateStructuralBackend.mockReturnValue({
      kind: 'structural' as const,
      validate: vi.fn().mockResolvedValue([fakeIssue, fakeIssue, fakeIssue]),
    });

    await act(async () => {
      renderJsonModeView();
    });

    await waitFor(() => {
      expect(screen.getByText('3 issues')).toBeDefined();
    });
  });

  it('open in validator link', async () => {
    await act(async () => {
      renderJsonModeView();
    });

    const link = screen.getByText('Open in validator');
    expect(link.tagName.toLowerCase()).toBe('a');
    const href = link.getAttribute('href');
    expect(href).toBe('/quality');
  });

  it('chip Not validated for unprofiled type', async () => {
    const appointmentFixture = {
      resourceType: 'Appointment',
      id: 'apt-1',
      status: 'booked',
      participant: [],
    } as unknown as Resource;

    await act(async () => {
      renderJsonModeView(appointmentFixture);
    });

    // For unprofiled types, chip shows "Not validated" immediately (no async)
    expect(screen.getByText('Not validated')).toBeDefined();
  });
});
