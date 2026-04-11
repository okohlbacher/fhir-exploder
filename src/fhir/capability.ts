import type { CapabilityStatement, CapabilityStatementRestResource } from '@medplum/fhirtypes';
import { getResourceCategory } from '../utils/fhir-categories';

export interface ParsedResourceType {
  type: string;
  searchParams: string[];
  operations: string[];
  category: string;
}

/**
 * Parse a CapabilityStatement into an array of resource types with
 * their search parameters, operations, and FHIR category.
 */
export function parseResourceTypes(capabilityStatement: CapabilityStatement): ParsedResourceType[] {
  const restResources = capabilityStatement.rest?.[0]?.resource ?? [];

  return restResources.map((resource: CapabilityStatementRestResource) => ({
    type: resource.type ?? 'Unknown',
    searchParams: (resource.searchParam ?? []).map(sp => sp.name ?? '').filter(Boolean),
    operations: (resource.operation ?? []).map(op => op.name ?? '').filter(Boolean),
    category: getResourceCategory(resource.type ?? ''),
  }));
}
