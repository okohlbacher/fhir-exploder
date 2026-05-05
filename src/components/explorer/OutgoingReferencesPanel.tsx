/**
 * OutgoingReferencesPanel — Phase 57 / LENS-02.
 *
 * Renders the "Outgoing References" panel for any non-Patient resource that has
 * at least one outgoing FHIR Reference. Pure render over the synchronous walker
 * `extractOutgoingReferences(resource)` (Plan 01). No fetch, no async state — per
 * row resolution + Cmd+click peek are owned by <ReferenceLink>.
 *
 * Returns null when the walker yields zero refs (no empty card per UI-SPEC §Copywriting)
 * or when resource.resourceType === 'Patient' (PatientRelatedResources already covers
 * that surface — defense in depth; ResourceDetailPage also guards at mount).
 *
 * Title text "Outgoing References" is locked per CONTEXT D-02 + UI-SPEC line 89.
 */
import { Group, Stack, Text, Title } from '@mantine/core';
import type { Resource } from '@medplum/fhirtypes';
import { extractOutgoingReferences } from '../../utils/extractOutgoingReferences';
import { ReferenceLink } from './ReferenceLink';

export interface OutgoingReferencesPanelProps {
  resource: Resource;
}

export function OutgoingReferencesPanel({ resource }: OutgoingReferencesPanelProps) {
  if (resource.resourceType === 'Patient') return null;
  const refs = extractOutgoingReferences(resource);
  if (refs.length === 0) return null;
  return (
    <div>
      <Title order={5} mb="sm">Outgoing References</Title>
      <Stack gap="xs">
        {refs.map((ref, idx) => (
          <Group key={`${ref.path}#${idx}`} gap="xs" wrap="nowrap">
            <Text size="sm" c="dimmed" ff="monospace">{ref.path}</Text>
            <ReferenceLink reference={ref.reference} display={ref.display} parentResource={resource} />
          </Group>
        ))}
      </Stack>
    </div>
  );
}
