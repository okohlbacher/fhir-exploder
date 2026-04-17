/**
 * FhirpathCriterionCard — Plan 22-03 Task 1 RTL tests (CHRT-05).
 *
 * Covers 22-UI-SPEC §S1 (card layout, copywriting contract) + §S7 (7 result
 * states + aria-live announcement). Mocks `@medplum/react-hooks` so
 * `dryRunCount` routes through a controllable `client.search` spy.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import type { ReactNode } from 'react';

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

// Mock the Medplum hook so dryRunCount routes through our spy.
const mockSearch = vi.fn();
vi.mock('@medplum/react-hooks', () => ({
  useMedplum: () => ({ search: mockSearch }),
}));

import { FhirpathCriterionCard } from './FhirpathCriterionCard';

beforeEach(() => {
  mockSearch.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function Wrap({ children }: { children: ReactNode }) {
  return (
    <MantineProvider>
      <Notifications />
      {children}
    </MantineProvider>
  );
}

async function flush(ms = 50) {
  await act(async () => {
    await new Promise((r) => setTimeout(r, ms));
  });
}

function renderCard(props?: {
  initialExpression?: string;
  onExpressionChange?: (v: string) => void;
  onValidated?: (tq: string | undefined) => void;
}) {
  const onExpressionChange = vi.fn(props?.onExpressionChange ?? (() => {}));
  const onValidated = vi.fn(props?.onValidated ?? (() => {}));
  render(
    <Wrap>
      <FhirpathCriterionCard
        initialExpression={props?.initialExpression}
        onExpressionChange={onExpressionChange}
        onValidated={onValidated}
      />
    </Wrap>,
  );
  return { onExpressionChange, onValidated };
}

describe('FhirpathCriterionCard', () => {
  it('renders Paper with Title "FHIRPath query (advanced)" and Textarea with maxLength=4096 monospace', () => {
    renderCard();
    expect(screen.getByText('FHIRPath query (advanced)')).toBeTruthy();
    const textarea = screen.getByLabelText(
      'FHIRPath expression',
    ) as HTMLTextAreaElement;
    expect(textarea).toBeTruthy();
    expect(textarea.getAttribute('maxlength')).toBe('4096');
    expect(textarea.getAttribute('placeholder')).toBe(
      'Patient.where(birthDate < @1960-01-01)',
    );
    // Mantine applies the `style` prop to a wrapping element; walk up to find the one
    // with monospace font. The plan's acceptance criterion requires the literal string
    // `style={{ fontFamily: 'monospace' }}` on the Textarea JSX (grep-verified separately).
    let el: HTMLElement | null = textarea;
    let found = false;
    for (let i = 0; i < 6 && el; i++) {
      if ((el.style?.fontFamily ?? '').includes('monospace')) {
        found = true;
        break;
      }
      el = el.parentElement;
    }
    expect(found).toBe(true);
  });

  it('Validate button is disabled when Textarea is empty', () => {
    renderCard();
    const btn = screen.getByRole('button', { name: /^validate$/i });
    expect(btn.hasAttribute('disabled')).toBe(true);
    expect(btn.getAttribute('title')).toBe(
      'Enter a FHIRPath expression to validate.',
    );
  });

  it('helper Anchor toggles Collapse and switches label', async () => {
    renderCard();
    const anchor = screen.getByRole('button', {
      name: /show supported syntax and examples/i,
    });
    expect(anchor).toBeTruthy();
    await act(async () => {
      fireEvent.click(anchor);
    });
    expect(
      screen.getByRole('button', {
        name: /hide supported syntax and examples/i,
      }),
    ).toBeTruthy();
  });

  it('expanded helper shows 4 resource sub-headings and all 12 examples', async () => {
    renderCard();
    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', {
          name: /show supported syntax and examples/i,
        }),
      );
    });
    // Sub-headings (checking they appear as text content in the card)
    expect(screen.getAllByText('Patient').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Condition').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Observation').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Encounter').length).toBeGreaterThanOrEqual(1);
    // A few Code examples — we sample 4 of the 12 examples to avoid brittleness on whitespace.
    expect(
      screen.getByText(/Patient\.where\(birthDate < @1960-01-01\)/),
    ).toBeTruthy();
    expect(
      screen.getByText(/Condition\.where\(code\.coding\.code = '44054006'\)/),
    ).toBeTruthy();
    expect(
      screen.getByText(/Observation\.where\(code\.coding\.code = '8480-6'\)/),
    ).toBeTruthy();
    expect(
      screen.getByText(/Encounter\.where\(class\.code = 'IMP'\)/),
    ).toBeTruthy();
  });

  it('Result row wrapper has role="status" and aria-live="polite"', () => {
    renderCard();
    const statuses = document.querySelectorAll('[role="status"]');
    // There may be multiple status regions (Notifications root, etc.) — at
    // least one should have aria-live="polite".
    const polite = Array.from(statuses).filter(
      (el) => el.getAttribute('aria-live') === 'polite',
    );
    expect(polite.length).toBeGreaterThanOrEqual(1);
  });

  it('pristine result row text is "Click Validate to check this expression."', () => {
    renderCard();
    expect(
      screen.getByText('Click Validate to check this expression.'),
    ).toBeTruthy();
  });

  it('after Validate with dryRunCount=142 shows "Matches 142 patients."', async () => {
    mockSearch.mockResolvedValue({
      resourceType: 'Bundle',
      total: 142,
    });
    const { onValidated } = renderCard();
    const textarea = screen.getByLabelText(
      'FHIRPath expression',
    ) as HTMLTextAreaElement;
    await act(async () => {
      fireEvent.change(textarea, {
        target: { value: "Patient.where(gender = 'female')" },
      });
    });
    const btn = screen.getByRole('button', { name: /^validate$/i });
    await act(async () => {
      fireEvent.click(btn);
    });
    await flush(100);
    expect(
      screen.getByText(/^Matches 142 patients\.$/),
    ).toBeTruthy();
    expect(onValidated).toHaveBeenCalled();
    const lastCallArg = onValidated.mock.calls.at(-1)?.[0];
    expect(typeof lastCallArg).toBe('string');
  });

  it('after Validate with dryRunCount=0 shows empty-cohort warning', async () => {
    mockSearch.mockResolvedValue({ resourceType: 'Bundle', total: 0 });
    renderCard();
    const textarea = screen.getByLabelText(
      'FHIRPath expression',
    ) as HTMLTextAreaElement;
    await act(async () => {
      fireEvent.change(textarea, {
        target: { value: "Patient.where(gender = 'female')" },
      });
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^validate$/i }));
    });
    await flush(100);
    expect(
      screen.getByText('Cohort would be empty (0 patients matched).'),
    ).toBeTruthy();
  });

  it('Validate with invalid expression shows translator error verbatim', async () => {
    const { onValidated } = renderCard();
    const textarea = screen.getByLabelText(
      'FHIRPath expression',
    ) as HTMLTextAreaElement;
    await act(async () => {
      fireEvent.change(textarea, {
        target: {
          value: "Patient.where(a = 'x' and b = 'y')",
        },
      });
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^validate$/i }));
    });
    await flush(100);
    expect(
      screen.getByText(
        'Expression must be a single Resource.where(...) call. Composition (and / or) is not supported.',
      ),
    ).toBeTruthy();
    // onValidated was cleared (called with undefined) on failure.
    expect(onValidated).toHaveBeenCalledWith(undefined);
  });

  it('editing after successful Validate reverts result row to pristine and clears translatedQuery', async () => {
    mockSearch.mockResolvedValue({ resourceType: 'Bundle', total: 7 });
    const { onValidated } = renderCard();
    const textarea = screen.getByLabelText(
      'FHIRPath expression',
    ) as HTMLTextAreaElement;
    await act(async () => {
      fireEvent.change(textarea, {
        target: { value: "Patient.where(gender = 'female')" },
      });
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^validate$/i }));
    });
    await flush(100);
    expect(screen.getByText(/^Matches 7 patients\.$/)).toBeTruthy();

    // Edit the expression — result row reverts to pristine.
    await act(async () => {
      fireEvent.change(textarea, {
        target: { value: "Patient.where(gender = 'male')" },
      });
    });
    expect(
      screen.getByText('Click Validate to check this expression.'),
    ).toBeTruthy();
    // onValidated called with undefined after successful validation + edit.
    expect(onValidated).toHaveBeenCalledWith(undefined);
  });

  it('calls onExpressionChange on every keystroke', async () => {
    const onExpressionChange = vi.fn();
    renderCard({ onExpressionChange });
    const textarea = screen.getByLabelText(
      'FHIRPath expression',
    ) as HTMLTextAreaElement;
    await act(async () => {
      fireEvent.change(textarea, { target: { value: 'P' } });
    });
    expect(onExpressionChange).toHaveBeenCalledWith('P');
  });
});
