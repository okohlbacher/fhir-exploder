import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ExpertModeProvider, useExpertMode } from '../contexts/ExpertModeContext';

function Probe() {
  const { isExpert, toggle } = useExpertMode();
  return (
    <>
      <span data-testid="is-expert">{String(isExpert)}</span>
      <button data-testid="toggle" onClick={toggle}>toggle</button>
    </>
  );
}

describe('ExpertModeContext', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('defaults isExpert to false', () => {
    render(
      <ExpertModeProvider>
        <Probe />
      </ExpertModeProvider>,
    );
    expect(screen.getByTestId('is-expert').textContent).toBe('false');
  });

  it('toggle flips the value', () => {
    render(
      <ExpertModeProvider>
        <Probe />
      </ExpertModeProvider>,
    );
    act(() => screen.getByTestId('toggle').click());
    expect(screen.getByTestId('is-expert').textContent).toBe('true');
  });

  it('throws when useExpertMode is used outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow(/useExpertMode must be used within ExpertModeProvider/);
    spy.mockRestore();
  });
});
