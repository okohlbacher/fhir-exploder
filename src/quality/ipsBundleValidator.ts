/**
 * src/quality/ipsBundleValidator.ts — Phase 44, Plan 44-02 (IPS-01).
 *
 * Pure-function bundle walker for the HL7 IPS Composition profile
 * (hl7.fhir.uv.ips@2.0.0).
 *
 * Walks `bundle.entry[0].resource as Composition` against the 16 IPS
 * section slices (3 required + 13 optional). Emits OperationOutcomeIssue[]
 * per D-09 severity rules:
 *   - Required section absent       -> severity:error,       code:required
 *   - Section present, entry empty  -> severity:warning,     code:incomplete
 *   - Section entry unresolvable    -> severity:information, code:incomplete
 *   - Bundle.type != 'document'     -> severity:error,       code:structure
 *   - Bundle.resourceType wrong     -> severity:error,       code:structure (BAIL)
 *   - No Composition entry          -> severity:error,       code:required (BAIL)
 *
 * Section path expression format (D-11): `Composition.section[<idx>].title`
 * Missing section path uses sliceName (no real index): `Composition.section[?slice='<sliceName>'].title`
 *
 * Scope notes:
 *   - Top-level sections only (no recursion into Composition.section.section[])
 *     per RESEARCH A6.
 *   - Bundle.entry slicing (entry[1] = Patient, etc.) is OUT of scope per
 *     RESEARCH A5 — only `bundle.type === 'document'` and Composition
 *     existence are checked as malformed-bundle defenses.
 *
 * IPS-2.0.0 catalogue note: the 16-section LOINC catalogue below is
 * hard-coded because Phase 34's trim() drops `patternCodeableConcept` from
 * snapshot.element[] (RESEARCH §6 Pitfall 5). If you bump the IPS pin in
 * scripts/fetch-ips-profiles.mjs, re-verify the catalogue against the new
 * package's snapshot.element[] section slices.
 *
 * Threats:
 *   T-44-02 (malformed bundle defense)        — guarded by missing-Composition + wrong-resourceType BAILS
 *   T-44-03 (reference integrity)             — unresolvable refs surface as severity:information (NOT silent)
 *   T-44-04 (regression coverage)             — three-fixture test in the sibling test file
 */
import type {
  Bundle,
  Composition,
  OperationOutcomeIssue,
  StructureDefinition,
} from '@medplum/fhirtypes';

export interface IpsSectionSlice {
  sliceName: string;
  title: string; // free-text from RESEARCH §1; NOT fixed by the profile
  loincCode: string; // patternCodeableConcept.coding[0].code (slicing discriminator)
  required: boolean; // min === 1 in IPS-2.0.0
}

/**
 * IPS-2.0.0 Composition profile section slices.
 * Source: hl7.fhir.uv.ips@2.0.0 / StructureDefinition-Composition-uv-ips.json
 * Verified 2026-04-30 (44-RESEARCH.md §3).
 */
export const IPS_SECTION_SLICES: IpsSectionSlice[] = [
  { sliceName: 'sectionProblems',          title: 'Problems',                   loincCode: '11450-4',  required: true  },
  { sliceName: 'sectionAllergies',         title: 'Allergies and Intolerances', loincCode: '48765-2',  required: true  },
  { sliceName: 'sectionMedications',       title: 'Medication Summary',         loincCode: '10160-0',  required: true  },
  { sliceName: 'sectionImmunizations',     title: 'Immunizations',              loincCode: '11369-6',  required: false },
  { sliceName: 'sectionResults',           title: 'Results',                    loincCode: '30954-2',  required: false },
  { sliceName: 'sectionProceduresHx',      title: 'History of Procedures',      loincCode: '47519-4',  required: false },
  { sliceName: 'sectionMedicalDevices',    title: 'Medical Devices',            loincCode: '46264-8',  required: false },
  { sliceName: 'sectionAdvanceDirectives', title: 'Advance Directives',         loincCode: '42348-3',  required: false },
  { sliceName: 'sectionAlerts',            title: 'Alerts',                     loincCode: '104605-1', required: false },
  { sliceName: 'sectionFunctionalStatus',  title: 'Functional Status',          loincCode: '47420-5',  required: false },
  { sliceName: 'sectionPastProblems',      title: 'History of Past Problems',   loincCode: '11348-0',  required: false },
  { sliceName: 'sectionPregnancyHx',       title: 'History of Pregnancy',       loincCode: '10162-6',  required: false },
  { sliceName: 'sectionPatientStory',      title: 'Patient Story',              loincCode: '81338-6',  required: false },
  { sliceName: 'sectionPlanOfCare',        title: 'Plan of Care',               loincCode: '18776-5',  required: false },
  { sliceName: 'sectionSocialHistory',     title: 'Social History',             loincCode: '29762-2',  required: false },
  { sliceName: 'sectionVitalSigns',        title: 'Vital Signs',                loincCode: '8716-3',   required: false },
];

const LOINC_SYSTEM = 'http://loinc.org';

/**
 * Validate an IPS bundle against the IPS Composition profile.
 *
 * @param bundle - The Bundle resource to validate (must be type='document').
 * @param ipsProfile - The IPS Composition StructureDefinition (currently unused;
 *   threaded for forward-compat with derive-from-SD walker).
 * @returns Flat OperationOutcomeIssue[] suitable for normalizeOperationOutcomeIssue.
 */
export function validateIpsBundle(
  bundle: Bundle,
  // ipsProfile is threaded through the signature for forward-compat with a
  // derive-from-SD walker; v1.6 uses the hard-coded IPS_SECTION_SLICES catalogue
  // because Phase 34 trim() drops patternCodeableConcept (RESEARCH §6 Pitfall 5).
  // Underscore prefix signals "intentionally unused" to TS noUnusedParameters.
  _ipsProfile: StructureDefinition,
): OperationOutcomeIssue[] {
  const issues: OperationOutcomeIssue[] = [];

  // Step 1: top-level shape checks (malformed-bundle defense — T-44-02).
  if (bundle?.resourceType !== 'Bundle') {
    issues.push({
      severity: 'error',
      code: 'structure',
      details: { text: 'Input is not a FHIR Bundle (resourceType missing or wrong)' },
      expression: ['Bundle'],
    });
    return issues;
  }

  if (bundle.type !== 'document') {
    issues.push({
      severity: 'error',
      code: 'structure',
      details: {
        text: `IPS requires Bundle.type = 'document', got '${bundle.type ?? '(missing)'}'`,
      },
      expression: ['Bundle.type'],
    });
    // continue — may still find a Composition
  }

  // Step 2: locate Composition.
  const entries = bundle.entry ?? [];
  const compositionEntry =
    entries[0]?.resource?.resourceType === 'Composition'
      ? entries[0]
      : entries.find((e) => e?.resource?.resourceType === 'Composition');

  if (!compositionEntry?.resource) {
    issues.push({
      severity: 'error',
      code: 'required',
      details: {
        text: 'IPS bundle must contain a Composition resource (none found in bundle.entry[])',
      },
      expression: ['Bundle.entry'],
    });
    return issues;
  }

  const composition: Composition = compositionEntry.resource as Composition;
  const sections = composition.section ?? [];

  // Step 3: index sections by LOINC code (the slicing discriminator).
  const sectionsByLoinc = new Map<
    string,
    Array<{ section: (typeof sections)[number]; index: number }>
  >();
  sections.forEach((section, idx) => {
    const codings = section.code?.coding ?? [];
    for (const coding of codings) {
      if (coding.system === LOINC_SYSTEM && coding.code) {
        const list = sectionsByLoinc.get(coding.code) ?? [];
        list.push({ section, index: idx });
        sectionsByLoinc.set(coding.code, list);
      }
    }
  });

  // Step 4: build resource-resolution index (T-44-03 — handles relative + fullUrl).
  const resolveIndex = new Map<string, unknown>();
  for (const e of entries) {
    if (e?.resource?.resourceType && e.resource.id) {
      resolveIndex.set(`${e.resource.resourceType}/${e.resource.id}`, e.resource);
    }
    if (e?.fullUrl) {
      resolveIndex.set(e.fullUrl, e.resource);
    }
  }

  // Step 5: walk each IPS section slice.
  for (const slice of IPS_SECTION_SLICES) {
    const matches = sectionsByLoinc.get(slice.loincCode) ?? [];

    if (matches.length === 0) {
      if (slice.required) {
        issues.push({
          severity: 'error',
          code: 'required',
          details: {
            text: `Required section '${slice.title}' (LOINC ${slice.loincCode}) is missing`,
          },
          expression: [`Composition.section[?slice='${slice.sliceName}'].title`],
        });
      }
      continue;
    }

    for (const { section, index } of matches) {
      const expressionBase = `Composition.section[${index}]`;

      const entryRefs = section.entry ?? [];
      if (entryRefs.length === 0) {
        issues.push({
          severity: 'warning',
          code: 'incomplete',
          details: { text: `Section '${slice.title}' is present but has no entries` },
          expression: [`${expressionBase}.title`],
        });
        continue;
      }

      for (const ref of entryRefs) {
        const refStr = ref?.reference;
        if (!refStr) continue;
        const resolved = resolveIndex.get(refStr);
        if (!resolved) {
          issues.push({
            severity: 'information',
            code: 'incomplete',
            details: {
              text: `Section '${slice.title}' references unresolvable resource ${refStr}`,
            },
            expression: [`${expressionBase}.title`],
          });
        }
      }
    }
  }

  return issues;
}
