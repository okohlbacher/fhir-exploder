import { Button, Code, Modal, ScrollArea, Stack, Table, Text } from '@mantine/core';
import { useState } from 'react';
import type { Resource } from '@medplum/fhirtypes';
import { useResolvedResource } from '../../hooks/useResolvedResource';
import { ResourcePropertyTable } from './ResourcePropertyTable';

export interface HumanReadableViewProps {
  resource: Resource;
}

/**
 * Human-readable display mode using a custom ResourcePropertyTable.
 *
 * Renders all properties of a FHIR resource in a structured table
 * with proper data type formatting (HumanName, CodeableConcept, etc.).
 *
 * Wraps the resource in {@link useResolvedResource} so Coding.display
 * values are progressively enriched from the terminology server without
 * spinners or layout shift (D-12 / UI-SPEC C-3). On resolver failure
 * the raw `resource` remains visible (TERM-03 / V-14).
 *
 * UAT-FU-02 D-08: Mounts the bottom {@link ExtensionsSection} after the
 * property table so resource-level `extension[]` entries render in a
 * deduped table with per-row [View] Modal triggers — the section silently
 * hides when no extensions are present.
 */
export function HumanReadableView({ resource }: HumanReadableViewProps) {
  const resolved = useResolvedResource(resource);
  const display = resolved ?? resource;
  return (
    <ScrollArea h="calc(100vh - 250px)">
      <Stack gap="md">
        <ResourcePropertyTable resource={display} />
        <ExtensionsSection resource={display} />
      </Stack>
    </ScrollArea>
  );
}

/** FHIR Extension shape used by the bottom Extensions section. */
interface ExtensionShape {
  url: string;
  [k: string]: unknown;
}

/**
 * Bottom Extensions section for `HumanReadableView`. Collects ALL
 * `Resource.extension[]` entries into a deduped table (first occurrence
 * wins on duplicate URLs) and renders a per-row [View] Button that opens
 * a Modal showing the full extension JSON.
 *
 * Silent hide when `resource.extension` is undefined or empty — there is
 * no "No extensions" copy by design (UI-SPEC §States Matrix; D-08).
 *
 * Property-level extensions (e.g. `_birthDate.extension`) are NOT part of
 * `Resource.extension[]` and stay inline in their property row — this
 * section only handles resource-level extensions.
 */
function ExtensionsSection({ resource }: { resource: Resource }) {
  const extensions = (resource as unknown as Record<string, unknown>).extension as
    | ExtensionShape[]
    | undefined;
  const [openUrl, setOpenUrl] = useState<string | null>(null);

  if (!extensions || extensions.length === 0) return null;

  // Dedupe by url; keep first occurrence. Duplicates silently dropped per D-08.
  const seen = new Set<string>();
  const unique: ExtensionShape[] = [];
  for (const ext of extensions) {
    if (seen.has(ext.url)) continue;
    seen.add(ext.url);
    unique.push(ext);
  }

  // URL fragment trim heuristic (RESEARCH A3 + UI-SPEC §Copywriting):
  // last 2 path segments joined by '/'.
  const trim = (url: string) => url.split('/').slice(-2).join('/');
  const opened = unique.find((e) => e.url === openUrl);

  return (
    <Stack gap="xs">
      <Text fw={600} size="sm">Extensions</Text>
      <Table withTableBorder verticalSpacing="xs">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>URL fragment</Table.Th>
            <Table.Th>Value summary</Table.Th>
            <Table.Th style={{ width: 80 }} aria-hidden></Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {unique.map((ext) => (
            <Table.Tr key={ext.url}>
              <Table.Td>
                <Text size="xs" ff="monospace">{trim(ext.url)}</Text>
              </Table.Td>
              <Table.Td>
                <Text size="sm">{summarizeExtension(ext)}</Text>
              </Table.Td>
              <Table.Td>
                <Button size="xs" variant="light" onClick={() => setOpenUrl(ext.url)}>
                  View
                </Button>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      <Modal
        opened={openUrl !== null}
        onClose={() => setOpenUrl(null)}
        title={openUrl ? trim(openUrl) : ''}
        size="lg"
        closeButtonProps={{ 'aria-label': 'Close' }}
      >
        {opened && (
          <Code block fz="xs" style={{ maxHeight: 500, overflowY: 'auto' }}>
            {JSON.stringify(opened, null, 2)}
          </Code>
        )}
      </Modal>
    </Stack>
  );
}

/**
 * Build a one-line summary for the Value summary column. Returns the first
 * `value*` field as `"valueX: <stringified>"`, or `(complex)` for object
 * values, or `(no value)` when no `value*` field is present.
 */
function summarizeExtension(ext: ExtensionShape): string {
  for (const [k, v] of Object.entries(ext)) {
    if (k === 'url') continue;
    if (k.startsWith('value')) {
      if (typeof v === 'object' && v !== null) return '(complex)';
      return `${k}: ${String(v)}`;
    }
  }
  return '(no value)';
}
