import { describe, it, expect } from 'vitest';
import {
  MII_MODULES,
  type MiiModule,
  fhirResourceTypesOf,
  findModuleForType,
  getPatientSearchParamForType,
  getExtraQueryForType,
} from '../utils/mii-modules';

describe('MII_MODULES configuration', () => {
  it('exports the 7 MII Kerndatensatz base modules', () => {
    expect(MII_MODULES).toHaveLength(7);
  });

  it('contains all expected module keys (Phase 30 UAT-8 order)', () => {
    const keys = MII_MODULES.map((m) => m.key);
    expect(keys).toEqual([
      'person',
      'fall',
      'diagnose',
      'prozedur',
      'consent',
      'laborbefund',
      'medikation',
    ]);
  });

  it('every module has all required fields', () => {
    for (const mod of MII_MODULES) {
      expect(mod.key).toBeTypeOf('string');
      expect(mod.key.length).toBeGreaterThan(0);
      expect(mod.germanLabel).toBeTypeOf('string');
      expect(mod.germanLabel.length).toBeGreaterThan(0);
      // Phase 33-03 widen: fhirResourceType is string | string[].
      // For the 7 base modules all values remain narrow strings; for Phase 34
      // extension modules some are arrays. Assertion below accepts both.
      if (Array.isArray(mod.fhirResourceType)) {
        expect(mod.fhirResourceType.length).toBeGreaterThan(0);
        for (const t of mod.fhirResourceType) {
          expect(t).toBeTypeOf('string');
          expect(t.length).toBeGreaterThan(0);
        }
      } else {
        expect(mod.fhirResourceType).toBeTypeOf('string');
        expect(mod.fhirResourceType.length).toBeGreaterThan(0);
      }
      expect(mod.category).toBeTypeOf('string');
      expect(['base', 'extension']).toContain(mod.category);
      expect(mod.badgeColor).toBeTypeOf('string');
      expect(mod.badgeColor.length).toBeGreaterThan(0);
      expect(mod.patientSearchParam).toBeTypeOf('string');
      expect(mod.patientSearchParam.length).toBeGreaterThan(0);
    }
  });

  it('every Phase 33 module is tagged category: base (Phase 34 adds extensions)', () => {
    for (const mod of MII_MODULES) {
      expect(mod.category).toBe('base');
    }
  });

  it('first module is Person -> Patient with blue badge (MII base module)', () => {
    expect(MII_MODULES[0]).toEqual({
      key: 'person',
      germanLabel: 'Person',
      fhirResourceType: 'Patient',
      category: 'base',
      badgeColor: 'blue',
      patientSearchParam: '_id',
    });
  });

  it('Diagnose module uses Condition with teal badge', () => {
    const diagnose = MII_MODULES.find((m) => m.key === 'diagnose');
    expect(diagnose?.fhirResourceType).toBe('Condition');
    expect(diagnose?.badgeColor).toBe('teal');
    expect(diagnose?.patientSearchParam).toBe('patient');
  });

  it('Medikation module uses MedicationStatement with orange badge', () => {
    const medikation = MII_MODULES.find((m) => m.key === 'medikation');
    expect(medikation).toBeDefined();
    expect(medikation?.germanLabel).toBe('Medikation');
    expect(medikation?.fhirResourceType).toBe('MedicationStatement');
    expect(medikation?.badgeColor).toBe('orange');
    expect(medikation?.patientSearchParam).toBe('patient');
  });

  it('Prozedur module uses Procedure with violet badge', () => {
    const prozedur = MII_MODULES.find((m) => m.key === 'prozedur');
    expect(prozedur?.fhirResourceType).toBe('Procedure');
    expect(prozedur?.badgeColor).toBe('violet');
  });

  it('Laborbefund module uses Observation with cyan badge', () => {
    const labor = MII_MODULES.find((m) => m.key === 'laborbefund');
    expect(labor?.fhirResourceType).toBe('Observation');
    expect(labor?.badgeColor).toBe('cyan');
  });

  it('Fall module uses Encounter with indigo badge', () => {
    const fall = MII_MODULES.find((m) => m.key === 'fall');
    expect(fall?.fhirResourceType).toBe('Encounter');
    expect(fall?.badgeColor).toBe('indigo');
  });

  it('Consent module uses Consent with pink badge', () => {
    const consent = MII_MODULES.find((m) => m.key === 'consent');
    expect(consent?.fhirResourceType).toBe('Consent');
    expect(consent?.badgeColor).toBe('pink');
  });

  it('MiiModule type shape is exported', () => {
    // Type-level assertion — compile-time check via inference
    const sample: MiiModule = {
      key: 'x',
      germanLabel: 'X',
      fhirResourceType: 'Resource',
      category: 'base',
      badgeColor: 'gray',
      patientSearchParam: 'patient',
    };
    expect(sample.key).toBe('x');
  });

  it('MiiModule type shape accepts array fhirResourceType + extension category', () => {
    // Forward-compat test: Phase 34 multi-type extension module shape.
    // Proves that the widened interface accepts array fhirResourceType,
    // extension category, and both override maps without casts.
    const multiTypeExtension: MiiModule = {
      key: 'x-ext',
      germanLabel: 'X-Ext',
      fhirResourceType: ['ImagingStudy', 'DiagnosticReport'],
      category: 'extension',
      badgeColor: 'gray',
      patientSearchParam: 'patient',
      patientSearchParamOverrides: { DiagnosticReport: 'subject' },
      extraQueryByType: { Observation: 'category=laboratory' },
    };
    expect(multiTypeExtension.fhirResourceType).toHaveLength(2);
  });
});

describe('per-module patientSearchParam contract (D-17)', () => {
  // Table-driven per-module assertion. Adding a Phase-34 extension
  // module = adding a row. If a module uses patientSearchParamOverrides
  // (now available on the widened MiiModule interface as of plan 33-03),
  // add one row per overridden type (e.g. a multi-type extension module
  // with fhirResourceType: ['Observation', 'DiagnosticReport'] and
  // patientSearchParamOverrides: { DiagnosticReport: 'subject' } should
  // produce TWO rows: one for Observation → 'patient' (module-wide) and
  // one for DiagnosticReport → 'subject' (override).
  // Source of truth for current values: live-probe-verified MII_MODULES
  // entries (see .planning/phases/33-.../33-01-INVESTIGATION.md).
  const EXPECTED: Array<{ moduleKey: string; fhirResourceType: string; expectedParam: string }> = [
    { moduleKey: 'person',      fhirResourceType: 'Patient',             expectedParam: '_id' },
    { moduleKey: 'fall',        fhirResourceType: 'Encounter',           expectedParam: 'patient' },
    { moduleKey: 'diagnose',    fhirResourceType: 'Condition',           expectedParam: 'patient' },
    { moduleKey: 'prozedur',    fhirResourceType: 'Procedure',           expectedParam: 'patient' },
    { moduleKey: 'consent',     fhirResourceType: 'Consent',             expectedParam: 'patient' },
    { moduleKey: 'laborbefund', fhirResourceType: 'Observation',         expectedParam: 'patient' },
    { moduleKey: 'medikation',  fhirResourceType: 'MedicationStatement', expectedParam: 'patient' },
    // NOTE: update these expectedParam values when 33-03 introduces
    // patientSearchParamOverrides; until then, every row should match
    // the module-wide patientSearchParam.
  ];

  // Contract probes the real helper from src/utils/mii-modules (landed in
  // plan 33-02, MII-EXT-01). The helper encapsulates
  // patientSearchParamOverrides lookup once the schema widens in plan 33-03;
  // until then, every row here resolves to the module-wide
  // patientSearchParam and this table locks the per-module contract for
  // Phase 34's 14-module data drop.

  it.each(EXPECTED)(
    '$moduleKey / $fhirResourceType → patientSearchParam = $expectedParam',
    ({ moduleKey, fhirResourceType, expectedParam }) => {
      const mod = MII_MODULES.find((m) => m.key === moduleKey);
      expect(mod).toBeDefined();
      expect(mod!.fhirResourceType).toBe(fhirResourceType);
      expect(getPatientSearchParamForType(mod!, fhirResourceType)).toBe(expectedParam);
    },
  );

  it('every MII_MODULES entry has an EXPECTED row (prevents orphaned modules)', () => {
    const coveredKeys = new Set(EXPECTED.map((r) => r.moduleKey));
    for (const mod of MII_MODULES) {
      expect(coveredKeys.has(mod.key)).toBe(true);
    }
  });
});

describe('helpers (MII-EXT-01)', () => {
  describe('fhirResourceTypesOf', () => {
    it('normalises narrow-schema single string to one-element array', () => {
      const person = MII_MODULES.find((m) => m.key === 'person')!;
      expect(fhirResourceTypesOf(person)).toEqual(['Patient']);
    });
    it('returns array input as-is (forward-compat for plan 33-03 widen)', () => {
      const stub = {
        fhirResourceType: ['ImagingStudy', 'DiagnosticReport'],
      } as unknown as MiiModule;
      expect(fhirResourceTypesOf(stub)).toEqual(['ImagingStudy', 'DiagnosticReport']);
    });
  });

  describe('findModuleForType', () => {
    it('finds module by single type', () => {
      expect(findModuleForType('Condition')?.key).toBe('diagnose');
      expect(findModuleForType('Patient')?.key).toBe('person');
    });
    it('returns undefined for unknown type', () => {
      expect(findModuleForType('NonExistentType')).toBeUndefined();
    });
    it('accepts custom module array (multi-type fixture)', () => {
      const multi = [
        {
          key: 'bildgebung',
          germanLabel: 'Bildgebung',
          fhirResourceType: ['ImagingStudy', 'DiagnosticReport'] as unknown as string,
          badgeColor: 'cyan',
          patientSearchParam: 'patient',
        },
      ] as MiiModule[];
      expect(findModuleForType('DiagnosticReport', multi)?.key).toBe('bildgebung');
      expect(findModuleForType('ImagingStudy', multi)?.key).toBe('bildgebung');
    });
  });

  describe('getPatientSearchParamForType', () => {
    it('returns module-wide patientSearchParam when no override', () => {
      const person = MII_MODULES.find((m) => m.key === 'person')!;
      expect(getPatientSearchParamForType(person, 'Patient')).toBe('_id');
      const fall = MII_MODULES.find((m) => m.key === 'fall')!;
      expect(getPatientSearchParamForType(fall, 'Encounter')).toBe('patient');
    });
    it('overrides map beats module-wide value (forward-compat for plan 33-03)', () => {
      const stub = {
        key: 'x',
        germanLabel: 'X',
        fhirResourceType: 'TypeA',
        badgeColor: 'gray',
        patientSearchParam: 'patient',
        patientSearchParamOverrides: { TypeA: 'subject' },
      } as unknown as MiiModule;
      expect(getPatientSearchParamForType(stub, 'TypeA')).toBe('subject');
    });
  });

  describe('getExtraQueryForType', () => {
    it('returns module-wide extraQuery when set', () => {
      const labor = MII_MODULES.find((m) => m.key === 'laborbefund')!;
      expect(getExtraQueryForType(labor, 'Observation')).toBe('category=laboratory');
    });
    it('returns undefined (NOT empty string) when not set', () => {
      const person = MII_MODULES.find((m) => m.key === 'person')!;
      expect(getExtraQueryForType(person, 'Patient')).toBeUndefined();
    });
    it('extraQueryByType beats module-wide extraQuery (D-05)', () => {
      const stub = {
        key: 'x',
        germanLabel: 'X',
        fhirResourceType: 'TypeA',
        badgeColor: 'gray',
        patientSearchParam: 'patient',
        extraQuery: 'category=fallback',
        extraQueryByType: { TypeA: 'category=foo' },
      } as unknown as MiiModule;
      expect(getExtraQueryForType(stub, 'TypeA')).toBe('category=foo');
      expect(getExtraQueryForType(stub, 'TypeB')).toBe('category=fallback');
    });
  });
});
