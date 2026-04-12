/**
 * MII Kerndatensatz module configuration.
 *
 * Defines the six MII (Medizininformatik-Initiative) Kerndatensatz modules
 * used as a navigation lens for patient clinical data. Each module maps a
 * German clinical label to a FHIR R4 resource type, a Mantine badge color
 * (consistent with 03-UI-SPEC Color Map), and the FHIR search parameter
 * used to scope searches to a specific patient.
 *
 * Used across:
 *  - Patient detail MII tabs
 *  - Clinical timeline type badges
 *  - FHIR Resources view for cross-referencing module labels
 */
export interface MiiModule {
  /** Stable key used for tab state and URL identifiers (lowercase, ASCII). */
  key: string;
  /** Primary German label displayed in tabs and badges. */
  germanLabel: string;
  /** FHIR R4 resource type queried for this module. */
  fhirResourceType: string;
  /** Mantine color token used for badges and tab indicators. */
  badgeColor: string;
  /**
   * FHIR search parameter used to scope queries to a patient.
   * Most types use `patient`; kept as a per-module field so we can adapt
   * per type without scattering conditionals through the UI.
   */
  patientSearchParam: string;
}

export const MII_MODULES: MiiModule[] = [
  {
    key: 'diagnose',
    germanLabel: 'Diagnose',
    fhirResourceType: 'Condition',
    badgeColor: 'teal',
    patientSearchParam: 'patient',
  },
  {
    key: 'prozedur',
    germanLabel: 'Prozedur',
    fhirResourceType: 'Procedure',
    badgeColor: 'violet',
    patientSearchParam: 'patient',
  },
  {
    key: 'laborbefund',
    germanLabel: 'Laborbefund',
    fhirResourceType: 'Observation',
    badgeColor: 'cyan',
    patientSearchParam: 'patient',
  },
  {
    key: 'medikation',
    germanLabel: 'Medikation',
    fhirResourceType: 'MedicationStatement',
    badgeColor: 'orange',
    patientSearchParam: 'patient',
  },
  {
    key: 'fall',
    germanLabel: 'Fall',
    fhirResourceType: 'Encounter',
    badgeColor: 'indigo',
    patientSearchParam: 'patient',
  },
  {
    key: 'consent',
    germanLabel: 'Consent',
    fhirResourceType: 'Consent',
    badgeColor: 'pink',
    patientSearchParam: 'patient',
  },
];
