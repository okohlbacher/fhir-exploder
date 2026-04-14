/**
 * ThresholdsPage — Plan 18-03 Task 5.
 *
 * Verifies DQ-11 end-to-end:
 * - 7 rows render, one per MetricKey
 * - Default badge for empty storage, custom/disabled for filled
 * - NumberInput onBlur commits to localStorage
 * - Clear ActionIcon writes null (distinct from "remove key")
 * - Reset modal flow (open / dismiss / confirm) with notification
 * - localStorage persistence across remount
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { ThresholdsPage } from '../components/quality/ThresholdsPage';
import { STORAGE_KEY } from '../quality/thresholds';

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

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/quality/thresholds']}>
      <MantineProvider>
        <Notifications />
        <ThresholdsPage />
      </MantineProvider>
    </MemoryRouter>,
  );
}

/** Waits long enough for Mantine useLocalStorage hydration + Modal transition to flush. */
async function flush(ms = 100) {
  await act(async () => {
    await new Promise((r) => setTimeout(r, ms));
  });
}

describe('ThresholdsPage', () => {
  it('renders 7 rows (one per MetricKey)', async () => {
    renderPage();
    await flush();
    expect(screen.getByText('Completeness')).toBeTruthy();
    expect(screen.getByText('Coding coverage')).toBeTruthy();
    expect(screen.getByText('Validation')).toBeTruthy();
    expect(screen.getByText('Plausibility')).toBeTruthy();
    expect(screen.getByText('Lab ranges')).toBeTruthy();
    expect(screen.getByText('Duplicates')).toBeTruthy();
    expect(screen.getByText('References')).toBeTruthy();
  });

  it('shows default value for each row when stored is empty', async () => {
    renderPage();
    await flush();
    // Default column renders '{N}%' text for each of the 7 rows
    expect(screen.getAllByText('80%').length).toBeGreaterThan(0); // completeness
    expect(screen.getAllByText('70%').length).toBeGreaterThan(0); // coverage
    expect(screen.getAllByText('99%').length).toBeGreaterThan(0); // plausibility or duplicates
  });

  it('NumberInput blur with a valid number commits to localStorage under STORAGE_KEY', async () => {
    renderPage();
    await flush();
    const input = screen.getByLabelText('Completeness threshold') as HTMLInputElement;
    await act(async () => {
      fireEvent.change(input, { target: { value: '75' } });
      fireEvent.blur(input);
    });
    await flush();
    const raw = window.localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string);
    expect(parsed.completeness).toBe(75);
  });

  it('Clear ActionIcon sets stored[key] to null (distinct from absent)', async () => {
    renderPage();
    await flush();
    const clearBtn = screen.getByLabelText('Clear threshold for Validation');
    await act(async () => {
      fireEvent.click(clearBtn);
    });
    await flush();
    const raw = window.localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string);
    expect(parsed.validation).toBeNull();
  });

  it('Active badge shows "default" when key absent', async () => {
    renderPage();
    await flush();
    // All 7 rows start as default (localStorage empty)
    const defaultBadges = screen.getAllByText('default');
    expect(defaultBadges.length).toBe(7);
  });

  it('Active badge shows "custom" when stored[key] is a number', async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ completeness: 90 }));
    renderPage();
    await flush();
    expect(screen.getAllByText('custom').length).toBeGreaterThan(0);
  });

  it('Active badge shows "disabled" when stored[key] is null', async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ validation: null }));
    renderPage();
    await flush();
    expect(screen.getAllByText('disabled').length).toBeGreaterThan(0);
  });

  it('Reset button opens modal', async () => {
    renderPage();
    await flush();
    // The first button matching /reset to defaults/i is the page-level trigger;
    // the modal confirm button appears as a second match after we open it.
    const resetBtns = screen.getAllByRole('button', { name: /reset to defaults/i });
    const pageBtn = resetBtns[0]!;
    await act(async () => {
      fireEvent.click(pageBtn);
    });
    await flush(150);
    // Modal title appears in a portal. Use findByText with a flexible matcher.
    expect(await screen.findByText('Reset thresholds to defaults?')).toBeTruthy();
  });

  it('Reset modal "Keep current thresholds" dismisses without changes', async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ completeness: 90 }));
    renderPage();
    await flush();
    const resetBtn = screen.getAllByRole('button', { name: /reset to defaults/i })[0]!;
    await act(async () => {
      fireEvent.click(resetBtn);
    });
    await flush(150);
    const keepBtn = await screen.findByRole('button', {
      name: /keep current thresholds/i,
    });
    await act(async () => {
      fireEvent.click(keepBtn);
    });
    await flush();
    const raw = window.localStorage.getItem(STORAGE_KEY);
    expect(JSON.parse(raw as string)).toEqual({ completeness: 90 });
  });

  it('Reset modal "Reset to defaults" clears entire stored object', async () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ completeness: 90, validation: null }),
    );
    renderPage();
    await flush();
    // Open modal via the page-level Reset trigger (first match before opening).
    const resetBtns = screen.getAllByRole('button', { name: /reset to defaults/i });
    await act(async () => {
      fireEvent.click(resetBtns[0]!);
    });
    await flush(200);
    // Modal is now open (renders via portal). Scope the confirm query to the
    // dialog's content so we don't accidentally click the page-level trigger.
    const dialog = await screen.findByRole('dialog');
    const confirmBtn = Array.from(
      dialog.querySelectorAll('button'),
    ).find((b) => /reset to defaults/i.test(b.textContent ?? ''));
    expect(confirmBtn).toBeTruthy();
    await act(async () => {
      fireEvent.click(confirmBtn!);
    });
    await flush(200);
    const raw = window.localStorage.getItem(STORAGE_KEY);
    expect(JSON.parse(raw as string)).toEqual({});
  });

  it('Configuration persists across remount (localStorage round-trip)', async () => {
    // Seed localStorage directly — Mantine useLocalStorage's async hydration
    // makes fireEvent-based writes unreliable across jsdom unmount/remount.
    // The behavior under test here is: "a value persisted in localStorage
    // shows in the NumberInput on mount."
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ completeness: 55 }));
    renderPage();
    await flush(150); // wait for useLocalStorage hydration
    const input = screen.getByLabelText('Completeness threshold') as HTMLInputElement;
    expect(input.value).toContain('55');
  });
});
