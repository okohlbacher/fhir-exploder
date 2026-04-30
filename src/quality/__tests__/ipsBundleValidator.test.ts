/**
 * src/quality/__tests__/ipsBundleValidator.test.ts — Phase 44, Plan 44-02 (IPS-01).
 *
 * Replaces the Wave 0 it.skip stubs from Plan 44-01 with real assertions for
 * T-44-02 (malformed-bundle defense), T-44-03 (reference integrity),
 * T-44-04 (three-fixture regression), plus severity classification (D-09)
 * and expression-path-format (D-11).
 */
import { describe, it, expect } from 'vitest';
import { validateIpsBundle, IPS_SECTION_SLICES } from '../ipsBundleValidator';
import type { Bundle, StructureDefinition } from '@medplum/fhirtypes';

import completeFixture from './fixtures/ips/ips-bundle-complete.json';
import incompleteFixture from './fixtures/ips/ips-bundle-incomplete.json';
import malformedFixture from './fixtures/ips/ips-bundle-malformed.json';

// Stand-in StructureDefinition (walker doesn't consult it in v1.6).
const STUB_PROFILE = {
  resourceType: 'StructureDefinition',
  url: 'http://example/foo',
  name: 'Foo',
  type: 'Composition',
} as unknown as StructureDefinition;

describe('validateIpsBundle (T-44-02..04 + severity + expression-path)', () => {
  describe('handles-missing-composition (T-44-02)', () => {
    it('returns severity:error when bundle has no entry[]', () => {
      const bundle = { resourceType: 'Bundle', type: 'document', entry: [] } as Bundle;
      expect(() => validateIpsBundle(bundle, STUB_PROFILE)).not.toThrow();
      const issues = validateIpsBundle(bundle, STUB_PROFILE);
      const composition = issues.find(
        (i) => i.code === 'required' && i.expression?.[0] === 'Bundle.entry',
      );
      expect(composition).toBeDefined();
      expect(composition?.severity).toBe('error');
    });

    it('returns severity:error when bundle.entry contains only non-Composition resources', () => {
      const bundle = {
        resourceType: 'Bundle',
        type: 'document',
        entry: [{ resource: { resourceType: 'Patient', id: 'p1' } }],
      } as Bundle;
      const issues = validateIpsBundle(bundle, STUB_PROFILE);
      expect(
        issues.some(
          (i) => i.code === 'required' && i.expression?.[0] === 'Bundle.entry',
        ),
      ).toBe(true);
    });

    it('returns severity:error and BAILS when resourceType is wrong', () => {
      const bundle = { resourceType: 'Patient' } as unknown as Bundle;
      const issues = validateIpsBundle(bundle, STUB_PROFILE);
      expect(issues.length).toBe(1);
      expect(issues[0].code).toBe('structure');
      expect(issues[0].expression?.[0]).toBe('Bundle');
    });
  });

  describe('resolves-references (T-44-03)', () => {
    it('flags unresolvable references as severity:information', () => {
      const bundle: Bundle = {
        resourceType: 'Bundle',
        type: 'document',
        entry: [
          {
            resource: {
              resourceType: 'Composition',
              status: 'final',
              type: { coding: [{ system: 'http://loinc.org', code: '60591-5' }] },
              date: '2026-04-30',
              author: [{ reference: 'Practitioner/p' }],
              title: 'IPS',
              section: [
                {
                  title: 'Problems',
                  code: { coding: [{ system: 'http://loinc.org', code: '11450-4' }] },
                  entry: [{ reference: 'Condition/does-not-exist' }],
                },
                {
                  title: 'Allergies',
                  code: { coding: [{ system: 'http://loinc.org', code: '48765-2' }] },
                  entry: [{ reference: 'AllergyIntolerance/a1' }],
                },
                {
                  title: 'Medications',
                  code: { coding: [{ system: 'http://loinc.org', code: '10160-0' }] },
                  entry: [{ reference: 'urn:uuid:med-1' }],
                },
              ],
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
          {
            fullUrl: 'urn:uuid:med-1',
            resource: {
              resourceType: 'MedicationStatement',
              id: 'm1',
              status: 'active',
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any,
          },
          {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            resource: { resourceType: 'AllergyIntolerance', id: 'a1' } as any,
          },
        ],
      };
      const issues = validateIpsBundle(bundle, STUB_PROFILE);
      const infoIssues = issues.filter((i) => i.severity === 'information');
      expect(infoIssues).toHaveLength(1);
      expect(infoIssues[0].details?.text).toMatch(/Condition\/does-not-exist/);
      // Resolvable references (relative AND fullUrl) produce NO info issues
      expect(
        issues.some((i) => i.details?.text?.includes('AllergyIntolerance/a1')),
      ).toBe(false);
      expect(
        issues.some((i) => i.details?.text?.includes('urn:uuid:med-1')),
      ).toBe(false);
    });
  });

  describe('three-fixtures regression (T-44-04)', () => {
    it('complete fixture => 0 issues', () => {
      const issues = validateIpsBundle(completeFixture as unknown as Bundle, STUB_PROFILE);
      expect(issues).toEqual([]);
    });

    it('incomplete fixture => >=2 issues with at least 1 error (missing Allergies) and 1 warning (empty Medications)', () => {
      const issues = validateIpsBundle(incompleteFixture as unknown as Bundle, STUB_PROFILE);
      expect(issues.length).toBeGreaterThanOrEqual(2);
      const missingAllergies = issues.find(
        (i) =>
          i.severity === 'error' &&
          i.code === 'required' &&
          /Allergies/i.test(i.details?.text ?? ''),
      );
      const emptyMedications = issues.find(
        (i) =>
          i.severity === 'warning' &&
          i.code === 'incomplete' &&
          /Medication/i.test(i.details?.text ?? ''),
      );
      expect(missingAllergies).toBeDefined();
      expect(emptyMedications).toBeDefined();
    });

    it('malformed fixture => >=2 issues including bundle.type and missing Composition', () => {
      const issues = validateIpsBundle(malformedFixture as unknown as Bundle, STUB_PROFILE);
      expect(issues.length).toBeGreaterThanOrEqual(2);
      const wrongType = issues.find(
        (i) =>
          i.severity === 'error' &&
          i.code === 'structure' &&
          i.expression?.[0] === 'Bundle.type',
      );
      const missingComposition = issues.find(
        (i) =>
          i.severity === 'error' &&
          i.code === 'required' &&
          i.expression?.[0] === 'Bundle.entry',
      );
      expect(wrongType).toBeDefined();
      expect(missingComposition).toBeDefined();
    });
  });

  describe('severity-classification (D-09)', () => {
    it('only emits severity values: error | warning | information', () => {
      const issues = [
        ...validateIpsBundle(incompleteFixture as unknown as Bundle, STUB_PROFILE),
        ...validateIpsBundle(malformedFixture as unknown as Bundle, STUB_PROFILE),
      ];
      const allowed = new Set(['error', 'warning', 'information']);
      for (const i of issues) {
        expect(allowed.has(i.severity ?? '')).toBe(true);
      }
    });
  });

  describe('expression-path-format (D-11)', () => {
    it('every issue.expression[0] matches one of the documented forms', () => {
      const issues = [
        ...validateIpsBundle(incompleteFixture as unknown as Bundle, STUB_PROFILE),
        ...validateIpsBundle(malformedFixture as unknown as Bundle, STUB_PROFILE),
      ];
      const ALLOWED = [
        /^Bundle$/,
        /^Bundle\.type$/,
        /^Bundle\.entry$/,
        /^Composition\.section\[\d+\]\.title$/,
        /^Composition\.section\[\?slice='[A-Za-z]+'\]\.title$/,
      ];
      for (const i of issues) {
        const expr = i.expression?.[0] ?? '';
        const matched = ALLOWED.some((r) => r.test(expr));
        expect(
          matched,
          `expression '${expr}' must match one of the documented forms`,
        ).toBe(true);
      }
    });
  });

  describe('profile-not-loaded graceful fallback', () => {
    it('does NOT throw when ipsProfile is null', () => {
      // ipsProfile param is unused in v1.6 — walker uses hard-coded catalogue.
      expect(() =>
        validateIpsBundle(
          completeFixture as unknown as Bundle,
          null as unknown as StructureDefinition,
        ),
      ).not.toThrow();
    });
  });

  describe('catalogue invariants', () => {
    it('embeds 16 sections (3 required + 13 optional)', () => {
      expect(IPS_SECTION_SLICES.length).toBe(16);
      expect(IPS_SECTION_SLICES.filter((s) => s.required).length).toBe(3);
      expect(IPS_SECTION_SLICES.filter((s) => !s.required).length).toBe(13);
    });
  });
});
