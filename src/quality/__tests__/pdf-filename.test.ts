import { describe, it, expect } from 'vitest';
import { serverUrlSlug, pdfFilename } from '../trendsHistory';

describe('serverUrlSlug', () => {
  it('strips scheme + /fhir suffix and keeps host:port (dash-separated)', () => {
    expect(serverUrlSlug('http://localhost:8080/fhir')).toBe('localhost-8080');
  });

  it('strips https scheme + trailing /fhir/ and collapses dots to dashes only where unsafe', () => {
    // Note: dots inside a hostname are filesystem-safe across macOS/Linux/Windows,
    // so they survive. The test asserts the slug starts with the host component.
    const slug = serverUrlSlug('https://blaze.mii.example.org/fhir/');
    expect(slug).toBe('blaze.mii.example.org');
  });

  it('strips query string from the resulting slug', () => {
    const slug = serverUrlSlug('http://localhost:8080/fhir?foo=bar');
    expect(slug).not.toContain('?');
    expect(slug.startsWith('localhost-8080')).toBe(true);
  });

  it('returns "unknown-server" for empty input', () => {
    expect(serverUrlSlug('')).toBe('unknown-server');
  });

  it('truncates slugs longer than 60 chars to 60 chars max', () => {
    const veryLong = 'http://' + 'a'.repeat(120) + '.example.org/fhir';
    const slug = serverUrlSlug(veryLong);
    expect(slug.length).toBeLessThanOrEqual(60);
    expect(slug.length).toBeGreaterThan(0);
  });

  it('strips all characters from the set [:/\\?#&]', () => {
    const dirty = 'http://host:1234/path?x=1&y=2#frag';
    const slug = serverUrlSlug(dirty);
    for (const ch of [':', '/', '\\', '?', '#', '&']) {
      expect(slug).not.toContain(ch);
    }
  });

  it('handles backslashes (Windows path chars) by stripping them', () => {
    const slug = serverUrlSlug('http://host\\evil');
    expect(slug).not.toContain('\\');
  });

  it('handles a bare host (no scheme, no path)', () => {
    const slug = serverUrlSlug('localhost:8080');
    expect(slug).toBe('localhost-8080');
  });
});

describe('pdfFilename', () => {
  it('formats the exact filename for localhost @ 2026-04-14T18:30:42Z', () => {
    const name = pdfFilename('http://localhost:8080/fhir', new Date('2026-04-14T18:30:42Z'));
    expect(name).toBe('fhir-exploder-quality-report_localhost-8080_2026-04-14_183042.pdf');
  });

  it('always ends with .pdf', () => {
    const name = pdfFilename('http://anywhere/fhir', new Date());
    expect(name.endsWith('.pdf')).toBe(true);
  });

  it('always starts with fhir-exploder-quality-report_', () => {
    const name = pdfFilename('http://anywhere/fhir', new Date());
    expect(name.startsWith('fhir-exploder-quality-report_')).toBe(true);
  });

  it('uses the server slug (no unsafe chars from serverUrl in filename)', () => {
    const name = pdfFilename(
      'http://host:1234/fhir?x=1&y=2#frag',
      new Date('2026-04-14T18:30:42Z'),
    );
    for (const ch of [':', '/', '\\', '?', '#', '&']) {
      // ':' cannot appear in the slug section; '/' or '\' must NEVER appear anywhere
      // in the filename. '?' and '#' cannot appear anywhere.
      if (ch === '/' || ch === '\\' || ch === '?' || ch === '#' || ch === '&' || ch === ':') {
        expect(name).not.toContain(ch);
      }
    }
  });

  it('encodes date and time in YYYY-MM-DD_HHMMSS (UTC)', () => {
    const name = pdfFilename('http://h/fhir', new Date('2027-01-02T03:04:05Z'));
    expect(name).toContain('_2027-01-02_030405');
  });
});
