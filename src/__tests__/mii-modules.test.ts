import { describe, it, expect } from 'vitest';
import { MII_MODULES, type MiiModule } from '../utils/mii-modules';

describe('MII_MODULES configuration', () => {
  it('exports the 7 MII Kerndatensatz base modules', () => {
    expect(MII_MODULES).toHaveLength(7);
  });

  it('contains all expected module keys', () => {
    const keys = MII_MODULES.map((m) => m.key);
    expect(keys).toEqual([
      'person',
      'diagnose',
      'prozedur',
      'laborbefund',
      'medikation',
      'fall',
      'consent',
    ]);
  });

  it('every module has all required fields', () => {
    for (const mod of MII_MODULES) {
      expect(mod.key).toBeTypeOf('string');
      expect(mod.key.length).toBeGreaterThan(0);
      expect(mod.germanLabel).toBeTypeOf('string');
      expect(mod.germanLabel.length).toBeGreaterThan(0);
      expect(mod.fhirResourceType).toBeTypeOf('string');
      expect(mod.fhirResourceType.length).toBeGreaterThan(0);
      expect(mod.badgeColor).toBeTypeOf('string');
      expect(mod.badgeColor.length).toBeGreaterThan(0);
      expect(mod.patientSearchParam).toBeTypeOf('string');
      expect(mod.patientSearchParam.length).toBeGreaterThan(0);
    }
  });

  it('first module is Person -> Patient with blue badge (MII base module)', () => {
    expect(MII_MODULES[0]).toEqual({
      key: 'person',
      germanLabel: 'Person',
      fhirResourceType: 'Patient',
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
      badgeColor: 'gray',
      patientSearchParam: 'patient',
    };
    expect(sample.key).toBe('x');
  });
});
