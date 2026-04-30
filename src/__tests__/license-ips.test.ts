/**
 * T-44-05: license-compliance grep test for HL7 IPS attribution.
 *
 * Bundling third-party FHIR profiles requires keeping LICENSE +
 * ATTRIBUTION in sync with the upstream package. CC0-1.0 doesn't
 * legally require attribution but our convention (matching Phase 34
 * MII pattern) is to record provenance for every bundled IG.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..', '..');
const LICENSE_PATH = path.join(ROOT, 'LICENSE');
const ATTRIBUTION_PATH = path.join(
  ROOT,
  'src',
  'quality',
  'profiles',
  'ips',
  'ATTRIBUTION.md',
);

describe('license-ips (T-44-05)', () => {
  const license = fs.readFileSync(LICENSE_PATH, 'utf-8');
  const attribution = fs.readFileSync(ATTRIBUTION_PATH, 'utf-8');

  it('LICENSE root mentions hl7.fhir.uv.ips', () => {
    expect(license).toMatch(/hl7\.fhir\.uv\.ips/);
  });

  it('LICENSE root mentions CC0-1.0', () => {
    expect(license).toMatch(/CC0-1\.0/);
  });

  it('LICENSE root pins the bundled version (2.0.0)', () => {
    expect(license).toMatch(/2\.0\.0/);
  });

  it('ATTRIBUTION.md exists and contains version pin 2.0.0', () => {
    expect(attribution).toMatch(/2\.0\.0/);
    expect(attribution).toMatch(/hl7\.fhir\.uv\.ips/);
    expect(attribution).toMatch(/CC0-1\.0/);
  });

  it('ATTRIBUTION.md links to the upstream package source', () => {
    expect(attribution).toMatch(/packages\.fhir\.org\/hl7\.fhir\.uv\.ips/);
  });
});
