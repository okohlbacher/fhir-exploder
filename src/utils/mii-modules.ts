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
  /**
   * Optional additional query parameters appended to every search for this
   * module. Example: `category=laboratory` to narrow the Laborbefund tab
   * from ALL Observations to only lab results (excludes vital-signs,
   * social-history, survey observations which would otherwise appear and
   * mislead users — e.g. "Tobacco smoking status" under Lab values).
   *
   * String is appended verbatim (already URL-encoded). Leave undefined
   * when no extra filter applies.
   */
  extraQuery?: string;
}

// Order reflects the Phase 30 UAT feedback (test 8): surface administrative
// and case-level modules first (Person, Fall), then clinical detail
// (Diagnose, Prozedur), then governance / downstream (Consent), then the
// high-volume ancillary modules (Laborbefund, Medikation). Consumers that
// need alphabetical or domain-specific ordering should sort a local copy.
export const MII_MODULES: MiiModule[] = [
  {
    key: 'person',
    germanLabel: 'Person',
    fhirResourceType: 'Patient',
    badgeColor: 'blue',
    patientSearchParam: '_id',
  },
  {
    key: 'fall',
    germanLabel: 'Fall',
    fhirResourceType: 'Encounter',
    badgeColor: 'indigo',
    patientSearchParam: 'patient',
  },
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
    key: 'consent',
    germanLabel: 'Consent',
    fhirResourceType: 'Consent',
    badgeColor: 'pink',
    patientSearchParam: 'patient',
  },
  {
    key: 'laborbefund',
    germanLabel: 'Laborbefund',
    fhirResourceType: 'Observation',
    badgeColor: 'cyan',
    patientSearchParam: 'patient',
    // Observations cover labs, vital-signs, social-history, survey, etc.
    // Laborbefund (= "lab results" in the MII Kerndatensatz) only wants
    // the `laboratory` category — otherwise social-history entries like
    // "Tobacco smoking status" leak in.
    extraQuery: 'category=laboratory',
  },
  {
    key: 'medikation',
    germanLabel: 'Medikation',
    fhirResourceType: 'MedicationStatement',
    badgeColor: 'orange',
    patientSearchParam: 'patient',
  },
];
