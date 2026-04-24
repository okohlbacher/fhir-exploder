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

  /**
   * FHIR R4 resource type(s) queried for this module.
   *
   * Narrow-schema single string for simple 1:1 modules (e.g. Diagnose → Condition).
   * Array for multi-type modules in Phase 34 (e.g. Bildgebung →
   * ['ImagingStudy', 'DiagnosticReport']).
   *
   * Consumers MUST use `fhirResourceTypesOf(mod)` to normalise; direct
   * `=== resource.resourceType` comparisons are a type error against the union.
   */
  fhirResourceType: string | string[];

  /**
   * Classification used to partition tab/tile layout:
   *  - 'base'       — the 7 MII Kerndatensatz modules always visible
   *  - 'extension'  — MII extension modules (oncology, imaging, etc.)
   *                   shown inside a Collapse block / toggle
   *
   * REQUIRED. No default — every new module must explicitly declare
   * its category so layout partitions are deterministic.
   */
  category: 'base' | 'extension';

  /** Mantine color token used for badges and tab indicators. */
  badgeColor: string;

  /** Default FHIR search parameter used to scope queries to a patient. */
  patientSearchParam: string;

  /**
   * Per-type overrides for the patient search param (D-04).
   * Example: `{ Observation: 'subject', Condition: 'patient' }`.
   * Falls back to `patientSearchParam` when a type is not in the map.
   */
  patientSearchParamOverrides?: Record<string, string>;

  /**
   * Module-wide extra query appended to every search URL (e.g.
   * `category=laboratory`). String is appended verbatim (already
   * URL-encoded). Undefined means "no extra filter".
   */
  extraQuery?: string;

  /**
   * Per-type extra query overrides (D-04). Example for a multi-type module:
   * `{ Observation: 'category=laboratory', DiagnosticReport: undefined }`.
   * `getExtraQueryForType()` checks this map first, then falls back to
   * `extraQuery`.
   */
  extraQueryByType?: Record<string, string>;

  /**
   * Tabler icon component name (e.g. 'IconUser', 'IconRadioactive').
   *
   * Rendered at three sites per CONTEXT D-07:
   *   - ClinicalTimeline dot marker (14px)
   *   - MiiModuleTabs tab subtitle leading position (14px)
   *   - DashboardPage MII tile swatch (32px), Drawer header (20px)
   *
   * Stored as a string — not a React component — to keep `MII_MODULES`
   * JSON-serializable (useful for test fixtures and debugging) and to
   * avoid cyclic import concerns. Consumers use a local `ICON_MAP` object
   * keyed by this string to resolve to the Tabler component; missing key
   * or missing map entry renders no icon (defensive). See Plan 34-04 for
   * the 21-entry ICON_MAP definition.
   *
   * OPTIONAL in Phase 34-02 (schema-landing plan). Plan 34-04 populates
   * `icon` on all 21 modules (base 7 + extension 14) in a single data
   * commit; this split preserves D-26 no-broken-intermediate-states.
   */
  icon?: string;
}

// Order reflects the Phase 30 UAT feedback (test 8): surface administrative
// and case-level modules first (Person, Fall), then clinical detail
// (Diagnose, Prozedur), then governance / downstream (Consent), then the
// high-volume ancillary modules (Laborbefund, Medikation). Consumers that
// need alphabetical or domain-specific ordering should sort a local copy.
//
// Per-module patientSearchParam values verified against live Blaze + Synthea
// on 2026-04-24 (UAT-FU-06 investigation — see
// .planning/phases/33-mii-schema-foundation-extension-modules-collapse-ui/33-01-INVESTIGATION.md).
// All 7 base modules use `_id` (person) or `patient` (everything else);
// `subject=` was probed as an alternative and produced identical results where
// data exists (MedicationStatement on `pat-uka-001`) — no module-wide param
// change required. Consent/Medikation empty-panel UAT observation was a
// data-coverage reality on Synthea (0 Consent server-wide; 0 MedicationStatement
// for Synthea patients), not a param mismatch. The D-17 per-module contract
// test in src/__tests__/mii-modules.test.ts locks these values for Phase 34.
export const MII_MODULES: MiiModule[] = [
  {
    key: 'person',
    germanLabel: 'Person',
    fhirResourceType: 'Patient',
    category: 'base',
    badgeColor: 'blue',
    patientSearchParam: '_id',
    icon: 'IconUser',
  },
  {
    key: 'fall',
    germanLabel: 'Fall',
    fhirResourceType: 'Encounter',
    category: 'base',
    badgeColor: 'indigo',
    patientSearchParam: 'patient',
    icon: 'IconBedFlat',
  },
  {
    key: 'diagnose',
    germanLabel: 'Diagnose',
    fhirResourceType: 'Condition',
    category: 'base',
    badgeColor: 'teal',
    patientSearchParam: 'patient',
    icon: 'IconStethoscope',
  },
  {
    key: 'prozedur',
    germanLabel: 'Prozedur',
    fhirResourceType: 'Procedure',
    category: 'base',
    badgeColor: 'violet',
    patientSearchParam: 'patient',
    icon: 'IconMedicalCross',
  },
  {
    key: 'consent',
    germanLabel: 'Consent',
    fhirResourceType: 'Consent',
    category: 'base',
    badgeColor: 'pink',
    patientSearchParam: 'patient',
    // audit §2a primary 'IconFileSignature' not published in
    // @tabler/icons-react@3.41.x; UI-SPEC fallback IconFileCertificate used.
    // Same "signed/sealed document" silhouette — see src/utils/mii-icons.ts.
    icon: 'IconFileCertificate',
  },
  {
    key: 'laborbefund',
    germanLabel: 'Laborbefund',
    fhirResourceType: 'Observation',
    category: 'base',
    badgeColor: 'cyan',
    patientSearchParam: 'patient',
    // Observations cover labs, vital-signs, social-history, survey, etc.
    // Laborbefund (= "lab results" in the MII Kerndatensatz) only wants
    // the `laboratory` category — otherwise social-history entries like
    // "Tobacco smoking status" leak in.
    extraQuery: 'category=laboratory',
    icon: 'IconFlask',
  },
  {
    key: 'medikation',
    germanLabel: 'Medikation',
    fhirResourceType: 'MedicationStatement',
    category: 'base',
    badgeColor: 'orange',
    patientSearchParam: 'patient',
    icon: 'IconPill',
  },
  // ---------------------------------------------------------------------
  // Phase 34 MII-EXT-09 extension modules (D-01 alphabetical by German label).
  //
  // Each extension module:
  //   - category: 'extension' (Phase 33 partition key)
  //   - fhirResourceType: string or string[] from color-design-audit.md §1
  //     (multi-profile modules carry arrays per D-02 blocking-verify contract)
  //   - badgeColor: palette family from audit §2b (Phase 34-02 theme.ts)
  //   - icon: Tabler icon-name string from audit §2b (Plan 34-04 fallback
  //     candidates applied inline where the audit primary is not published
  //     in @tabler/icons-react@3.41.x; see src/utils/mii-icons.ts comments)
  //   - patientSearchParamOverrides: per-type divergence from R4 default
  //     (Specimen uses `subject`; ResearchStudy uses `enrollment`)
  // ---------------------------------------------------------------------
  {
    key: 'bildgebung',
    germanLabel: 'Bildgebung',
    fhirResourceType: ['ImagingStudy', 'DiagnosticReport'],
    category: 'extension',
    badgeColor: 'imaging',
    patientSearchParam: 'patient',
    icon: 'IconPhoto',
  },
  {
    key: 'biobank',
    germanLabel: 'Biobank',
    fhirResourceType: 'Specimen',
    category: 'extension',
    badgeColor: 'bioanalysis',
    patientSearchParam: 'patient',
    // Specimen has no `patient` search param in R4 — must use `subject`.
    // Source: color-design-audit.md §1 biobank row + RESEARCH P-02.
    patientSearchParamOverrides: { Specimen: 'subject' },
    icon: 'IconTestPipe',
  },
  {
    key: 'dokument',
    germanLabel: 'Dokument',
    fhirResourceType: 'DocumentReference',
    category: 'extension',
    badgeColor: 'administration',
    patientSearchParam: 'patient',
    icon: 'IconFileDescription',
  },
  {
    key: 'intensivmedizin',
    germanLabel: 'Intensivmedizin',
    // Multi-profile module (audit §1 secondary_types = ["Encounter", "Procedure"]).
    fhirResourceType: ['Observation', 'Encounter', 'Procedure'],
    category: 'extension',
    badgeColor: 'bioanalysis',
    patientSearchParam: 'patient',
    icon: 'IconBedFilled',
  },
  {
    key: 'kardiologie',
    germanLabel: 'Kardiologie',
    // Multi-profile module (audit §1 secondary_types = ["Procedure", "Condition"]).
    fhirResourceType: ['Observation', 'Procedure', 'Condition'],
    category: 'extension',
    badgeColor: 'administration',
    patientSearchParam: 'patient',
    icon: 'IconHeartbeat',
  },
  {
    key: 'mikrobiologie',
    germanLabel: 'Mikrobiologie',
    fhirResourceType: 'Observation',
    category: 'extension',
    badgeColor: 'pathology',
    patientSearchParam: 'patient',
    // audit §2b primary 'IconBacteria' not published in
    // @tabler/icons-react@3.41.x; UI-SPEC fallback IconVirus used.
    // Also mitigates HIGH color-collapse deuteranopia risk vs
    // molekulargenetik (audit §4d).
    icon: 'IconVirus',
  },
  {
    key: 'molekulargenetik',
    germanLabel: 'Molekulargenetik',
    fhirResourceType: 'Observation',
    category: 'extension',
    badgeColor: 'genetics',
    patientSearchParam: 'patient',
    icon: 'IconDna',
  },
  {
    key: 'mtb',
    germanLabel: 'MTB',
    // Multi-profile module (audit §1 secondary_types = ["Condition", "MedicationStatement"]).
    fhirResourceType: ['Observation', 'Condition', 'MedicationStatement'],
    category: 'extension',
    badgeColor: 'oncology',
    patientSearchParam: 'patient',
    icon: 'IconUsersGroup',
  },
  {
    key: 'onkologie',
    germanLabel: 'Onkologie',
    // Multi-profile module (audit §1 secondary_types =
    // ["Observation", "Procedure", "MedicationStatement"]).
    fhirResourceType: ['Condition', 'Observation', 'Procedure', 'MedicationStatement'],
    category: 'extension',
    badgeColor: 'oncology',
    patientSearchParam: 'patient',
    icon: 'IconRadioactive',
  },
  {
    key: 'pathologie',
    germanLabel: 'Pathologie',
    // Multi-profile module (audit §1 secondary_types =
    // ["DiagnosticReport", "Specimen"]).
    fhirResourceType: ['Observation', 'DiagnosticReport', 'Specimen'],
    category: 'extension',
    badgeColor: 'pathology',
    patientSearchParam: 'patient',
    // Specimen has no `patient` search param in R4 — must use `subject`.
    // Source: color-design-audit.md §1 pathologie row + RESEARCH P-02.
    patientSearchParamOverrides: { Specimen: 'subject' },
    icon: 'IconMicroscope',
  },
  {
    key: 'pro',
    germanLabel: 'PRO',
    fhirResourceType: 'Observation',
    category: 'extension',
    badgeColor: 'patient-reported',
    patientSearchParam: 'patient',
    // audit §2b primary 'IconQuestionnaire' not published in
    // @tabler/icons-react@3.41.x; UI-SPEC fallback IconListCheck used.
    // Also mitigates MEDIUM-HIGH color-collapse deuteranopia risk vs
    // seltene/IconPuzzle (audit §4d).
    icon: 'IconListCheck',
  },
  {
    key: 'seltene',
    germanLabel: 'Seltene Erkrankungen',
    fhirResourceType: 'Condition',
    category: 'extension',
    badgeColor: 'genetics',
    patientSearchParam: 'patient',
    icon: 'IconPuzzle',
  },
  {
    key: 'studie',
    germanLabel: 'Studie',
    fhirResourceType: 'ResearchStudy',
    category: 'extension',
    badgeColor: 'imaging',
    patientSearchParam: 'patient',
    // ResearchStudy has no direct `patient` param in R4 — scope via
    // `enrollment=Patient/{id}` (chain to ResearchSubject). Source:
    // color-design-audit.md §1 studie row + RESEARCH P-02.
    patientSearchParamOverrides: { ResearchStudy: 'enrollment' },
    icon: 'IconClipboardData',
  },
  {
    key: 'symptom',
    germanLabel: 'Symptom',
    fhirResourceType: 'Observation',
    category: 'extension',
    badgeColor: 'patient-reported',
    patientSearchParam: 'patient',
    icon: 'IconMoodSmile',
  },
];

// ---------------------------------------------------------------------------
// MII-EXT-01 helpers (plan 33-02, D-01 / D-04 / D-05)
//
// These helpers encapsulate every read pattern that today touches
// `mod.fhirResourceType` or builds a per-module URL. They are intentionally
// shipped BEFORE the schema widen in plan 33-03 so the call-site sweep is
// a pure refactor — behavior is identical to before under the narrow
// (single-string) schema. Once plan 33-03 widens `fhirResourceType` to
// `string | string[]` and adds the optional `patientSearchParamOverrides` /
// `extraQueryByType` maps, the helpers start exercising the array /
// override branches without any additional call-site changes.
// ---------------------------------------------------------------------------

/**
 * Returns the list of FHIR resource types this module covers.
 *
 * Normalises the narrow-schema single string to a one-element array so
 * downstream code can always iterate. Once plan 33-03 widens
 * `fhirResourceType` to `string | string[]`, the array branch activates
 * transparently (no call-site changes needed).
 */
export function fhirResourceTypesOf(mod: MiiModule): string[] {
  const t = mod.fhirResourceType;
  return Array.isArray(t) ? t : [t];
}

/**
 * Finds the module that owns a given FHIR resource type.
 *
 * Replaces the inline `MII_MODULES.find(m => m.fhirResourceType === type)`
 * pattern at `ClinicalTimeline.tsx:85-86` (D-15) and matches multi-type
 * modules via `Array.includes()` once plan 33-03 lands. The `modules`
 * parameter defaults to `MII_MODULES`; tests and downstream call sites
 * that want to scope the lookup (e.g. to only base modules or a custom
 * fixture) can pass their own array.
 */
export function findModuleForType(
  type: string,
  modules: MiiModule[] = MII_MODULES,
): MiiModule | undefined {
  return modules.find((m) => fhirResourceTypesOf(m).includes(type));
}

/**
 * Returns the patient search param for a specific (module, type) pair.
 *
 * Falls back to module-wide `patientSearchParam` when no override exists.
 * Per D-04, `MiiModule.patientSearchParamOverrides?: Record<string, string>`
 * holds the per-type overrides; this helper consumes the map directly now
 * that plan 33-03 has widened the interface (the plan-33-02 forward-compat
 * cast has been removed).
 */
export function getPatientSearchParamForType(
  mod: MiiModule,
  type: string,
): string {
  return mod.patientSearchParamOverrides?.[type] ?? mod.patientSearchParam;
}

/**
 * Returns the extra query filter for a specific (module, type) pair.
 *
 * Per D-05: returns `string | undefined` (NOT `string` with empty
 * fallback). Callers conditionally append: `if (q) url += '&' + q;`.
 * Checks `extraQueryByType[type]` first, falls back to the module-wide
 * `extraQuery`. The plan-33-02 forward-compat cast has been removed now
 * that plan 33-03 widens the interface with the optional map.
 */
export function getExtraQueryForType(
  mod: MiiModule,
  type: string,
): string | undefined {
  return mod.extraQueryByType?.[type] ?? mod.extraQuery;
}
