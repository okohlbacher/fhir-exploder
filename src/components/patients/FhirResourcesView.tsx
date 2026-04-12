import { Center, Text } from '@mantine/core';
import type { CapabilityStatement } from '@medplum/fhirtypes';

interface FhirResourcesViewProps {
  patientId: string;
  capability: CapabilityStatement;
}

/**
 * Placeholder -- full implementation arrives in Task 2 of plan 03-02.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function FhirResourcesView(_props: FhirResourcesViewProps) {
  return (
    <Center py="xl">
      <Text c="dimmed">FHIR Resources view (Task 2)</Text>
    </Center>
  );
}
