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
  it('exports 21 MII Kerndatensatz modules (7 base + 14 extension)', () => {
    expect(MII_MODULES).toHaveLength(21);
  });

  it('contains all expected module keys (base 7 + extension 14 alphabetical per D-01)', () => {
    const keys = MII_MODULES.map((m) => m.key);
    expect(keys).toEqual([
      // Base 7 (Phase 30 UAT-8 order — UNCHANGED)
      'person',
      'fall',
      'diagnose',
      'prozedur',
      'consent',
      'laborbefund',
      'medikation',
      // Extension 14 (D-01 alphabetical by German label: Bildgebung → Symptom)
      'bildgebung',
      'biobank',
      'dokument',
      'intensivmedizin',
      'kardiologie',
      'mikrobiologie',
      'molekulargenetik',
      'mtb',
      'onkologie',
      'pathologie',
      'pro',
      'seltene',
      'studie',
      'symptom',
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
      // Phase 34 MII-EXT-11: every module populates `icon` with a non-empty string.
      expect(mod.icon).toBeTypeOf('string');
      expect(mod.icon!.length).toBeGreaterThan(0);
    }
  });

  it('all 7 base modules are tagged category: base (Phase 34 partition invariant)', () => {
    const baseModules = MII_MODULES.filter((m) => m.category === 'base');
    expect(baseModules).toHaveLength(7);
    for (const mod of baseModules) {
      expect(mod.category).toBe('base');
    }
  });

  it('all 14 extension modules are tagged category: extension (Phase 34 partition invariant)', () => {
    const extensionModules = MII_MODULES.filter((m) => m.category === 'extension');
    expect(extensionModules).toHaveLength(14);
    for (const mod of extensionModules) {
      expect(mod.category).toBe('extension');
    }
  });

  it('every extension module uses a badgeColor from the Phase 34 palette or a base Mantine color', () => {
    const VALID_EXTENSION_PALETTES = [
      'oncology', 'imaging', 'genetics', 'pathology',
      'bioanalysis', 'administration', 'patient-reported',
    ];
    const VALID_BASE_COLORS = [
      'blue', 'indigo', 'teal', 'violet', 'pink', 'cyan', 'orange',
    ];
    const VALID = [...VALID_EXTENSION_PALETTES, ...VALID_BASE_COLORS];
    const extensionModules = MII_MODULES.filter((m) => m.category === 'extension');
    for (const mod of extensionModules) {
      expect(VALID).toContain(mod.badgeColor);
    }
  });

  it('first module is Person -> Patient with blue badge (MII base module)', () => {
    // Phase 34-04 adds icon field; assert on individual fields instead of
    // shape-equality so the test tolerates the append-only icon column.
    const person = MII_MODULES[0];
    expect(person.key).toBe('person');
    expect(person.germanLabel).toBe('Person');
    expect(person.fhirResourceType).toBe('Patient');
    expect(person.category).toBe('base');
    expect(person.badgeColor).toBe('blue');
    expect(person.patientSearchParam).toBe('_id');
    expect(person.icon).toBe('IconUser');
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

  it('MiiModule type shape accepts optional icon field (Phase 34-02 schema landing)', () => {
    const moduleWithIcon: MiiModule = {
      key: 'x-icon',
      germanLabel: 'X-Icon',
      fhirResourceType: 'Resource',
      category: 'extension',
      badgeColor: 'oncology',
      patientSearchParam: 'patient',
      icon: 'IconRadioactive',
    };
    expect(moduleWithIcon.icon).toBe('IconRadioactive');

    // Icon is optional — module without icon still compiles
    const moduleWithoutIcon: MiiModule = {
      key: 'x-no-icon',
      germanLabel: 'X-No-Icon',
      fhirResourceType: 'Resource',
      category: 'base',
      badgeColor: 'gray',
      patientSearchParam: 'patient',
    };
    expect(moduleWithoutIcon.icon).toBeUndefined();
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
    // Base 7 (Phase 33 — UNCHANGED)
    { moduleKey: 'person',      fhirResourceType: 'Patient',             expectedParam: '_id' },
    { moduleKey: 'fall',        fhirResourceType: 'Encounter',           expectedParam: 'patient' },
    { moduleKey: 'diagnose',    fhirResourceType: 'Condition',           expectedParam: 'patient' },
    { moduleKey: 'prozedur',    fhirResourceType: 'Procedure',           expectedParam: 'patient' },
    { moduleKey: 'consent',     fhirResourceType: 'Consent',             expectedParam: 'patient' },
    { moduleKey: 'laborbefund', fhirResourceType: 'Observation',         expectedParam: 'patient' },
    { moduleKey: 'medikation',  fhirResourceType: 'MedicationStatement', expectedParam: 'patient' },
    // Extension 14 (Phase 34 D-02/D-03 — one row per (module, type) pair from
    // color-design-audit.md §1. Multi-profile modules emit one row per member
    // type (6 known multi-profile modules: bildgebung, intensivmedizin,
    // kardiologie, mtb, onkologie, pathologie). Override-driven rows below
    // (biobank/Specimen → subject; pathologie/Specimen → subject;
    // studie/ResearchStudy → enrollment) are the R4-spec-derived exceptions
    // captured by patientSearchParamOverrides on their MII_MODULES entries.
    { moduleKey: 'bildgebung',       fhirResourceType: 'ImagingStudy',        expectedParam: 'patient' },
    { moduleKey: 'bildgebung',       fhirResourceType: 'DiagnosticReport',    expectedParam: 'patient' },
    { moduleKey: 'biobank',          fhirResourceType: 'Specimen',            expectedParam: 'subject' },
    { moduleKey: 'dokument',         fhirResourceType: 'DocumentReference',   expectedParam: 'patient' },
    { moduleKey: 'intensivmedizin',  fhirResourceType: 'Observation',         expectedParam: 'patient' },
    { moduleKey: 'intensivmedizin',  fhirResourceType: 'Encounter',           expectedParam: 'patient' },
    { moduleKey: 'intensivmedizin',  fhirResourceType: 'Procedure',           expectedParam: 'patient' },
    { moduleKey: 'kardiologie',      fhirResourceType: 'Observation',         expectedParam: 'patient' },
    { moduleKey: 'kardiologie',      fhirResourceType: 'Procedure',           expectedParam: 'patient' },
    { moduleKey: 'kardiologie',      fhirResourceType: 'Condition',           expectedParam: 'patient' },
    { moduleKey: 'mikrobiologie',    fhirResourceType: 'Observation',         expectedParam: 'patient' },
    { moduleKey: 'molekulargenetik', fhirResourceType: 'Observation',         expectedParam: 'patient' },
    { moduleKey: 'mtb',              fhirResourceType: 'Observation',         expectedParam: 'patient' },
    { moduleKey: 'mtb',              fhirResourceType: 'Condition',           expectedParam: 'patient' },
    { moduleKey: 'mtb',              fhirResourceType: 'MedicationStatement', expectedParam: 'patient' },
    { moduleKey: 'onkologie',        fhirResourceType: 'Condition',           expectedParam: 'patient' },
    { moduleKey: 'onkologie',        fhirResourceType: 'Observation',         expectedParam: 'patient' },
    { moduleKey: 'onkologie',        fhirResourceType: 'Procedure',           expectedParam: 'patient' },
    { moduleKey: 'onkologie',        fhirResourceType: 'MedicationStatement', expectedParam: 'patient' },
    { moduleKey: 'pathologie',       fhirResourceType: 'Observation',         expectedParam: 'patient' },
    { moduleKey: 'pathologie',       fhirResourceType: 'DiagnosticReport',    expectedParam: 'patient' },
    { moduleKey: 'pathologie',       fhirResourceType: 'Specimen',            expectedParam: 'subject' },
    { moduleKey: 'pro',              fhirResourceType: 'Observation',         expectedParam: 'patient' },
    { moduleKey: 'seltene',          fhirResourceType: 'Condition',           expectedParam: 'patient' },
    { moduleKey: 'studie',           fhirResourceType: 'ResearchStudy',       expectedParam: 'enrollment' },
    { moduleKey: 'symptom',          fhirResourceType: 'Observation',         expectedParam: 'patient' },
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
      // Phase 34 multi-profile modules ship `fhirResourceType` as an array
      // (D-02). Assert the type membership via fhirResourceTypesOf() so both
      // narrow-schema (string) and wide-schema (array) modules pass.
      expect(fhirResourceTypesOf(mod!)).toContain(fhirResourceType);
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

describe('findModuleForType with multi-type module (MII-EXT-08 timeline regression)', () => {
  // Prepends a Bildgebung-shaped multi-type module to the real MII_MODULES
  // array. Plan 33-02's helper test already proved `findModuleForType` resolves
  // both member types to the stub; this block locks the TIMELINE-specific
  // invariant: both member types must return the SAME germanLabel + badgeColor
  // so the ClinicalTimeline renders a consistent badge regardless of which
  // multi-type member triggered the row. Also includes a shadow-guard so
  // prepending an extension stub cannot mask a base module's lookup — Phase 34
  // will drop ~14 extension modules into MII_MODULES, and module ordering must
  // not break the base lookup chain.
  const MULTI_TYPE_FIXTURE: MiiModule[] = [
    {
      key: 'bildgebung-stub',
      germanLabel: 'Bildgebung',
      fhirResourceType: ['ImagingStudy', 'DiagnosticReport'],
      category: 'extension',
      badgeColor: 'cyan',
      patientSearchParam: 'patient',
    },
    ...MII_MODULES,
  ];

  it('multi-type module: both member types resolve to same germanLabel', () => {
    const a = findModuleForType('ImagingStudy', MULTI_TYPE_FIXTURE);
    const b = findModuleForType('DiagnosticReport', MULTI_TYPE_FIXTURE);
    expect(a?.germanLabel).toBe('Bildgebung');
    expect(b?.germanLabel).toBe('Bildgebung');
  });

  it('multi-type module: both member types resolve to same badgeColor (D-15)', () => {
    const a = findModuleForType('ImagingStudy', MULTI_TYPE_FIXTURE);
    const b = findModuleForType('DiagnosticReport', MULTI_TYPE_FIXTURE);
    expect(a?.badgeColor).toBe('cyan');
    expect(b?.badgeColor).toBe('cyan');
  });

  it('base module still resolves when multi-type fixture is prepended (shadow-guard)', () => {
    expect(findModuleForType('Condition', MULTI_TYPE_FIXTURE)?.key).toBe('diagnose');
    expect(findModuleForType('Patient', MULTI_TYPE_FIXTURE)?.key).toBe('person');
  });
});
