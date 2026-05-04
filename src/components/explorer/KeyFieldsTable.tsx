/**
 * Summary-mode 2-column key-fields table (SHELL-02, D-05, D-06).
 *
 * Renders the output of getKeyFields() as a Mantine Table with a label column
 * (dimmed/sm, 180px) and a value column (sm). Values are plain Text strings;
 * undefined values render as an em dash. Generic-fallback rows (resource types
 * not in the 8-type registry) render the value in a monospace font as a visual
 * cue that the content is a best-effort JSON preview.
 */
import { Table, Text } from '@mantine/core';
import type { Resource } from '@medplum/fhirtypes';
import { getKeyFields } from '../../utils/keyFieldsRegistry';

/** The 8 R4 types with dedicated per-type field pickers. */
const BUNDLED_TYPED_RESOURCE_TYPES = new Set([
  'Patient',
  'Observation',
  'Condition',
  'Encounter',
  'MedicationStatement',
  'Procedure',
  'DiagnosticReport',
  'AllergyIntolerance',
]);

export interface KeyFieldsTableProps {
  resource: Resource;
}

export function KeyFieldsTable({ resource }: KeyFieldsTableProps) {
  const fields = getKeyFields(resource);
  const isGenericFallback = !BUNDLED_TYPED_RESOURCE_TYPES.has(resource.resourceType);

  return (
    <Table withTableBorder verticalSpacing="xs">
      <Table.Tbody>
        {fields.map((f) => (
          <Table.Tr key={f.label}>
            <Table.Td style={{ width: 180, fontWeight: 500 }}>
              <Text size="sm" c="dimmed">
                {f.label}
              </Text>
            </Table.Td>
            <Table.Td>
              {f.value === undefined ? (
                <Text size="sm" c="dimmed">
                  —
                </Text>
              ) : (
                <Text size="sm" ff={isGenericFallback ? 'monospace' : undefined}>
                  {f.value}
                </Text>
              )}
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}
