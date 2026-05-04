import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useShortcuts } from '../useShortcuts';

describe('useShortcuts', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('fires registered handler when key pressed and no input focused', () => {
    const handler = vi.fn();
    renderHook(() => useShortcuts({ j: handler }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'j' }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does NOT fire when an INPUT element is focused', () => {
    const handler = vi.fn();
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    renderHook(() => useShortcuts({ j: handler }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'j' }));
    expect(handler).not.toHaveBeenCalled();
  });

  it('does NOT fire when TEXTAREA is focused', () => {
    const handler = vi.fn();
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    textarea.focus();
    renderHook(() => useShortcuts({ j: handler }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'j' }));
    expect(handler).not.toHaveBeenCalled();
  });

  it('does NOT fire when SELECT is focused', () => {
    const handler = vi.fn();
    const select = document.createElement('select');
    document.body.appendChild(select);
    select.focus();
    renderHook(() => useShortcuts({ j: handler }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'j' }));
    expect(handler).not.toHaveBeenCalled();
  });

  it('does NOT fire when enabled=false', () => {
    const handler = vi.fn();
    renderHook(() => useShortcuts({ j: handler }, false));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'j' }));
    expect(handler).not.toHaveBeenCalled();
  });

  it('removes the keydown listener on unmount', () => {
    const handler = vi.fn();
    const { unmount } = renderHook(() => useShortcuts({ j: handler }));
    unmount();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'j' }));
    expect(handler).not.toHaveBeenCalled();
  });
});
