import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Component, type ReactNode } from 'react';
import { TerminologyProvider } from '../contexts/TerminologyContext';
import { useTerminology } from '../hooks/useTerminology';
import type { AppSettings } from '../config/types';

/**
 * React swallows the thrown error and logs to console.error by default in
 * test env. We use an error boundary to capture the thrown message so we
 * can assert on it without needing to patch console.
 */
class ErrorCatcher extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return <div data-testid="err">{this.state.error.message}</div>;
    }
    return this.props.children;
  }
}

function CacheSizeProbe() {
  const resolver = useTerminology();
  return <div data-testid="size">{resolver.cache.size()}</div>;
}

function NullSettingsProbe() {
  const resolver = useTerminology();
  // Resolve a coding that's missing code so the resolver short-circuits before
  // touching the (null) client; we only care that no throw happens.
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  resolver.resolveCoding({ system: 'http://snomed.info/sct' });
  return <div data-testid="ok">ready</div>;
}

const SETTINGS: AppSettings = {
  fhir: {
    serverUrl: 'https://fhir.example/fhir',
    auth: { mode: 'open' },
  },
  terminology: {
    serverUrl: 'https://tx.example/fhir',
  },
};

beforeEach(() => {
  if (typeof localStorage !== 'undefined') localStorage.clear();
});

describe('TerminologyContext / useTerminology', () => {
  it('useTerminology throws outside provider', () => {
    render(
      <ErrorCatcher>
        <CacheSizeProbe />
      </ErrorCatcher>,
    );
    const msg = screen.getByTestId('err').textContent ?? '';
    expect(msg).toContain('TerminologyProvider');
  });

  it('TerminologyProvider exposes resolver with configured serverUrl', () => {
    render(
      <TerminologyProvider settings={SETTINGS}>
        <CacheSizeProbe />
      </TerminologyProvider>,
    );
    expect(screen.getByTestId('size').textContent).toBe('0');
  });

  it('TerminologyProvider with null settings exposes a resolver with null client (no throw)', () => {
    render(
      <TerminologyProvider settings={null}>
        <NullSettingsProbe />
      </TerminologyProvider>,
    );
    expect(screen.getByTestId('ok').textContent).toBe('ready');
  });
});
