import { describe, it, expect } from 'vitest';
import { createTerminologyClient } from '../terminology/terminologyClient';
import type { AppSettings } from '../config/types';

// Minimal AppSettings stub — createTerminologyClient only reads settings.terminology.
function settingsWith(terminologyUrl: string | undefined): AppSettings {
  return {
    fhir: { serverUrl: '', auth: { mode: 'open' } },
    terminology: terminologyUrl === undefined ? undefined : { serverUrl: terminologyUrl },
  };
}

describe('createTerminologyClient', () => {
  it('returns null when terminology block is absent', () => {
    expect(createTerminologyClient(settingsWith(undefined))).toBeNull();
  });

  it('returns null when serverUrl is empty string', () => {
    expect(createTerminologyClient(settingsWith(''))).toBeNull();
  });

  it('returns null when serverUrl is whitespace-only', () => {
    expect(createTerminologyClient(settingsWith('   '))).toBeNull();
  });

  it('returns null without throwing when serverUrl is not parseable as a URL', () => {
    // CR-01 regression: an invalid-but-string URL used to throw TypeError from
    // new URL(...) and crash the TerminologyProvider's useMemo / useTerminologyHealth.
    expect(() => createTerminologyClient(settingsWith('not a url'))).not.toThrow();
    expect(createTerminologyClient(settingsWith('not a url'))).toBeNull();
  });

  it('returns null for a URL missing a scheme (e.g., "localhost:8080")', () => {
    // Common user-error: forgetting http:// — must not crash the provider tree.
    expect(() => createTerminologyClient(settingsWith('localhost:8080'))).not.toThrow();
    expect(createTerminologyClient(settingsWith('localhost:8080'))).toBeNull();
  });

  it('returns a MedplumClient for a well-formed URL', () => {
    const client = createTerminologyClient(settingsWith('https://tx.example/fhir'));
    expect(client).not.toBeNull();
  });
});
