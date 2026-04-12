/**
 * Bundled MII StructureDefinition registry for Phase 05 completeness checks.
 *
 * Profiles are trimmed to the fields the completeness walker reads
 * (`url`, `name`, `type`, `snapshot.element[]` with `path`, `min`,
 * `mustSupport`). The full MII 2025 snapshots are NOT bundled — see
 * Pitfall 7 in 05-RESEARCH.md for the bundle-size rationale.
 *
 * Source: derived from the MII Kerndatensatz 2025 packages on Simplifier.
 * Assumption A1 (redistributability) is the author's responsibility.
 *
 * To update:
 * 1. Fetch the canonical StructureDefinition from Simplifier.
 * 2. Trim to `{ resourceType, url, name, type, snapshot: { element: [
 *    { path, min?, max?, mustSupport?, sliceName? } ... ] } }`.
 * 3. Replace the file under src/quality/profiles/.
 * 4. Leave the registry mapping below untouched unless adding a new type
 *    (also update BUNDLED_PROFILE_TYPES consumers).
 */
import type { StructureDefinition } from '@medplum/fhirtypes';
import condition from './Condition-diagnose.json';
import observation from './Observation-laborbefund.json';
import patient from './Patient-person.json';
import procedure from './Procedure-prozedur.json';
import medication from './MedicationStatement-medikation.json';
import encounter from './Encounter-fall.json';
import consent from './Consent-consent.json';

const REGISTRY: Record<string, StructureDefinition> = {
  Condition: condition as unknown as StructureDefinition,
  Observation: observation as unknown as StructureDefinition,
  Patient: patient as unknown as StructureDefinition,
  Procedure: procedure as unknown as StructureDefinition,
  MedicationStatement: medication as unknown as StructureDefinition,
  Encounter: encounter as unknown as StructureDefinition,
  Consent: consent as unknown as StructureDefinition,
};

export const BUNDLED_PROFILE_TYPES = Object.keys(REGISTRY) as readonly string[];

export function getProfileForType(resourceType: string): StructureDefinition | null {
  return REGISTRY[resourceType] ?? null;
}
