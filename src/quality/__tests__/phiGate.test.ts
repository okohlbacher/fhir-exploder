import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PHI_ACK_KEY_PREFIX, phiAckKey, isPhiAcknowledged } from '../phiGate';

describe('phiGate', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('Test 1: key format with null external uses legacy "none" suffix', () => {
    expect(phiAckKey('http://localhost:8080/fhir', null)).toBe(
      `${PHI_ACK_KEY_PREFIX}:http://localhost:8080/fhir|none`,
    );
  });

  it('Test 2: key format embeds the external URL verbatim', () => {
    expect(phiAckKey('http://localhost:8080/fhir', 'https://hapi.fhir.org/baseR4')).toBe(
      `${PHI_ACK_KEY_PREFIX}:http://localhost:8080/fhir|https://hapi.fhir.org/baseR4`,
    );
  });

  it('Test 3: gate defaults to false with empty localStorage', () => {
    expect(isPhiAcknowledged('http://s/', 'https://v/')).toBe(false);
  });

  it('Test 4: gate accepts plain "true" and JSON.stringify(true) forms', () => {
    const k = phiAckKey('http://s/', 'https://v/');
    window.localStorage.setItem(k, 'true');
    expect(isPhiAcknowledged('http://s/', 'https://v/')).toBe(true);

    window.localStorage.clear();
    window.localStorage.setItem(k, JSON.stringify(true));
    expect(isPhiAcknowledged('http://s/', 'https://v/')).toBe(true);
  });

  it('Test 5 (REGRESSION — D-09 contract): gate read does not trigger any fetch', () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(new Response('{}'));
    const result = isPhiAcknowledged('http://s/', 'https://v/');
    expect(result).toBe(false);
    expect(fetchSpy).toHaveBeenCalledTimes(0);
  });

  it('Test 6: key-scope is robust — pipe character does not collide', () => {
    expect(phiAckKey('http://a/fhir', 'https://v/')).not.toBe(
      phiAckKey('http://a/fhir|https', '://v/'),
    );
  });
});
