/**
 * ValidatorAuthSettingsModal — Plan 43-01 Task 6.
 *
 * Replaces the Wave 0 stub. Asserts the modal contract:
 *
 *   1. Save with non-empty input    → localStorage.setItem('validator.bearerToken.v1', ...)
 *   2. Save with empty input        → localStorage.removeItem('validator.bearerToken.v1')
 *   3. Clear button                 → localStorage.removeItem; field resets to ''
 *   4. Pre-fill on open             → input value reads existing localStorage token
 *   5. No settings.yaml roundtrip   → useSettings.setSettings is NEVER called
 *
 * The token NEVER touches the settings store (T-43-06 lock).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';

// jsdom polyfills (Mantine 8 needs ResizeObserver + matchMedia)
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

// useSettings spy — must NEVER be called (Test 5 / T-43-06).
const setSettingsSpy = vi.fn();
vi.mock('../../../hooks/useSettings', () => ({
  useSettings: () => ({
    settings: null,
    usingDefaults: false,
    loading: false,
    setSettings: setSettingsSpy,
  }),
}));

import { ValidatorAuthSettingsModal } from '../ValidatorAuthSettingsModal';

const KEY = 'validator.bearerToken.v1';

function renderModal(opened = true, onClose = vi.fn()) {
  return render(
    <MantineProvider>
      <Notifications />
      <ValidatorAuthSettingsModal
        opened={opened}
        onClose={onClose}
        validatorUrl="https://hapi.example.org/baseR4"
      />
    </MantineProvider>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
  setSettingsSpy.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ValidatorAuthSettingsModal — Plan 43-01 Task 6', () => {
  it('Test 1 — saves token to localStorage key validator.bearerToken.v1 on Save', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    const onClose = vi.fn();
    renderModal(true, onClose);

    const input = screen.getByLabelText('Bearer token') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'tok-XYZ' } });
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    expect(setItemSpy).toHaveBeenCalledWith(KEY, 'tok-XYZ');
    expect(window.localStorage.getItem(KEY)).toBe('tok-XYZ');
    expect(onClose).toHaveBeenCalled();
  });

  it('Test 2 — saves empty input → localStorage.removeItem called', () => {
    // Seed an existing token to prove "empty save = clear"
    window.localStorage.setItem(KEY, 'previous-token');
    const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem');
    const onClose = vi.fn();
    renderModal(true, onClose);

    // Clear the (pre-filled) input by typing empty
    const input = screen.getByLabelText('Bearer token') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    expect(removeItemSpy).toHaveBeenCalledWith(KEY);
    expect(window.localStorage.getItem(KEY)).toBeNull();
    expect(onClose).toHaveBeenCalled();
  });

  it('Test 3 — Clear button removes the localStorage key and resets input', () => {
    window.localStorage.setItem(KEY, 'tok-EXISTING');
    const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem');
    const onClose = vi.fn();
    renderModal(true, onClose);

    const input = screen.getByLabelText('Bearer token') as HTMLInputElement;
    expect(input.value).toBe('tok-EXISTING'); // pre-fill from Test 4 contract

    fireEvent.click(screen.getByRole('button', { name: /clear token/i }));

    expect(removeItemSpy).toHaveBeenCalledWith(KEY);
    expect(window.localStorage.getItem(KEY)).toBeNull();
    expect(input.value).toBe('');
    // Modal stays open after Clear (D-03: user may want to enter a new token).
    expect(onClose).not.toHaveBeenCalled();
  });

  it('Test 4 — opening with existing token pre-fills the input', () => {
    window.localStorage.setItem(KEY, 'tok-PREFILL');
    renderModal();

    const input = screen.getByLabelText('Bearer token') as HTMLInputElement;
    expect(input.value).toBe('tok-PREFILL');
  });

  it('Test 5 (T-43-06) — modal does NOT roundtrip the token through useSettings.setSettings', () => {
    renderModal();
    const input = screen.getByLabelText('Bearer token') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'tok-XYZ' } });
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));
    fireEvent.click(screen.getByRole('button', { name: /clear token/i }));

    expect(setSettingsSpy).not.toHaveBeenCalled();
  });

  it('Test 6 — saving fires the validator-bearer-token-changed event (probe-cache invalidation hint)', () => {
    const handler = vi.fn();
    window.addEventListener('validator-bearer-token-changed', handler);
    renderModal();
    const input = screen.getByLabelText('Bearer token') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'tok-NEW' } });
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    expect(handler).toHaveBeenCalled();
    window.removeEventListener('validator-bearer-token-changed', handler);
  });
});
