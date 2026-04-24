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
 * Per D-04, the plan-33-03 widen adds
 * `patientSearchParamOverrides?: Record<string, string>` to `MiiModule`;
 * this helper is ready for that now (checks for the optional map via a
 * type-cast) but works identically against the narrow schema.
 *
 * The `as unknown as { ... }` cast is deliberate: it lets plan 33-02 ship
 * WITHOUT widening the `MiiModule` interface. Plan 33-03 will remove the
 * cast by adding the optional fields to the interface directly.
 */
export function getPatientSearchParamForType(
  mod: MiiModule,
  type: string,
): string {
  const overrides = (mod as unknown as {
    patientSearchParamOverrides?: Record<string, string>;
  }).patientSearchParamOverrides;
  return overrides?.[type] ?? mod.patientSearchParam;
}

/**
 * Returns the extra query filter for a specific (module, type) pair.
 *
 * Per D-05: returns `string | undefined` (NOT `string` with empty
 * fallback). Callers conditionally append: `if (q) url += '&' + q;`.
 * Checks `extraQueryByType[type]` first (plan 33-03 widen), falls back
 * to the module-wide `extraQuery`. The cast is the same deliberate
 * forward-compat shim as `getPatientSearchParamForType`.
 */
export function getExtraQueryForType(
  mod: MiiModule,
  type: string,
): string | undefined {
  const byType = (mod as unknown as {
    extraQueryByType?: Record<string, string>;
  }).extraQueryByType;
  return byType?.[type] ?? mod.extraQuery;
}
