import { Anchor, Badge, Button, Code, Group, Modal, Stack, Table, Text, Tooltip } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import type { Resource } from '@medplum/fhirtypes';
import { toRecord } from '../../utils/fhir-helpers';
import { ReferenceLink } from './ReferenceLink';

interface ResourcePropertyTableProps {
  resource: Resource;
  /**
   * Phase 47 / READ-01 — parent resource for fragment-ref (`#contained-id`)
   * lookup. When undefined, defaults to `resource` itself (top-level call).
   * Pass-through so nested RenderValue calls keep the contained-resource
   * scope correct.
   */
  parentResource?: Resource;
}

/**
 * Keys to skip in the top-level display (metadata shown separately or irrelevant).
 *
 * `extension` is included here so resource-level extensions are rendered
 * exclusively by the bottom Extensions section in {@link HumanReadableView}
 * (UAT-FU-02 / D-08). Property-level extensions (e.g. `_birthDate.extension`)
 * are filtered separately via the `_`-prefix check in the consumer.
 */
const SKIP_KEYS = new Set(['resourceType', 'meta', 'text', 'extension']);

/** Order preference for common FHIR fields */
const FIELD_ORDER = [
  'id', 'identifier', 'active', 'status',
  'name', 'family', 'given', 'gender', 'birthDate',
  'code', 'category', 'type', 'class',
  'subject', 'patient', 'encounter',
  'effectiveDateTime', 'effectivePeriod', 'issued', 'recordedDate',
  'onsetDateTime', 'performedDateTime', 'authoredOn', 'date',
  'period', 'value', 'valueQuantity', 'valueCodeableConcept', 'valueString',
  'component', 'interpretation', 'referenceRange',
  'performer', 'author', 'recorder', 'asserter',
  'note', 'bodySite', 'method',
];

function sortKeys(keys: string[]): string[] {
  const orderMap = new Map(FIELD_ORDER.map((k, i) => [k, i]));
  return [...keys].sort((a, b) => {
    const oa = orderMap.get(a) ?? 999;
    const ob = orderMap.get(b) ?? 999;
    if (oa !== ob) return oa - ob;
    return a.localeCompare(b);
  });
}

/**
 * Renders a FHIR value as a readable component.
 * Handles: primitives, CodeableConcept, Coding, Reference, HumanName,
 * Identifier, Period, Quantity, arrays, and nested objects.
 */
function RenderValue({
  value,
  depth = 0,
  parentResource,
}: {
  value: unknown;
  depth?: number;
  parentResource?: Resource;
}): JSX.Element {
  if (value === null || value === undefined) {
    return <Text size="sm" c="dimmed">—</Text>;
  }

  if (typeof value === 'boolean') {
    return <Badge size="sm" color={value ? 'green' : 'gray'} variant="light">{String(value)}</Badge>;
  }

  if (typeof value === 'number') {
    return <Text size="sm">{value}</Text>;
  }

  if (typeof value === 'string') {
    // URLs
    if (value.startsWith('http://') || value.startsWith('https://')) {
      return <Anchor href={value} target="_blank" size="sm">{value}</Anchor>;
    }
    // Dates
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      return <Text size="sm">{value}</Text>;
    }
    return <Text size="sm">{value}</Text>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <Text size="sm" c="dimmed">—</Text>;
    if (value.length === 1) return <RenderValue value={value[0]} depth={depth} parentResource={parentResource} />;
    return (
      <Stack gap={4}>
        {value.map((item, i) => (
          <RenderValue key={i} value={item} depth={depth} parentResource={parentResource} />
        ))}
      </Stack>
    );
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;

    // Reference — Phase 47 READ-01: ReferenceLink resolves via session cache,
    // emits /explorer/Type/id href so existing handleReferenceClick interceptor
    // in ResourceDetailPage continues to handle navigation.
    if (obj.reference && typeof obj.reference === 'string') {
      return (
        <ReferenceLink
          reference={obj.reference as string}
          display={typeof obj.display === 'string' ? obj.display : undefined}
          parentResource={parentResource}
        />
      );
    }

    // CodeableConcept
    if (obj.coding || obj.text) {
      const codings = Array.isArray(obj.coding) ? obj.coding : [];
      const text = obj.text as string | undefined;
      return (
        <Stack gap={2}>
          {text && <Text size="sm" fw={500}>{text}</Text>}
          {codings.map((c: Record<string, unknown>, i: number) => (
            <Group key={i} gap="xs">
              {c.display && <Text size="sm">{c.display as string}</Text>}
              {c.code && <Code>{c.code as string}</Code>}
              {c.system && <Text size="xs" c="dimmed">{(c.system as string).replace('http://','')}</Text>}
            </Group>
          ))}
        </Stack>
      );
    }

    // Quantity (FHIR R4) — must fire BEFORE the Coding branch because UCUM-coded
    // Quantities carry { value, unit, system, code } and { system && code } would
    // otherwise win and render only the unit code, dropping the measured value.
    // (Phase 38.2: closes the rendering gap surfaced during the Phase 38.1 re-walk.)
    //
    // Detect Quantity by the presence of `obj.unit` (Coding does not have unit) OR
    // a numeric `obj.value` (Identifier.value is a string; Quantity.value is a number).
    const isQuantityShape =
      (typeof obj.unit === 'string') ||
      (typeof obj.value === 'number' && !obj.coding);
    if (isQuantityShape) {
      const hasValue = obj.value !== undefined && obj.value !== null;
      const hasUnit = typeof obj.unit === 'string' && obj.unit.length > 0;
      if (hasValue && hasUnit) {
        return <Text size="sm">{obj.value as number} {obj.unit as string}</Text>;
      }
      if (hasValue) {
        return <Text size="sm">{obj.value as number}</Text>;
      }
      // Unit-only or empty — render em-dash to match the null/undefined branch
      // (never a bare unit, which is meaningless on its own).
      return <Text size="sm" c="dimmed">—</Text>;
    }

    // Coding (standalone, not in CodeableConcept)
    if (obj.system && obj.code) {
      return (
        <Group gap="xs">
          {obj.display && <Text size="sm">{obj.display as string}</Text>}
          <Code>{obj.code as string}</Code>
          <Text size="xs" c="dimmed">{(obj.system as string).replace('http://','')}</Text>
        </Group>
      );
    }

    // HumanName
    if (obj.family || obj.given) {
      const parts = [
        obj.family as string,
        ...(Array.isArray(obj.given) ? obj.given : []),
      ].filter(Boolean);
      return (
        <Group gap="xs">
          <Text size="sm">{parts.join(', ')}</Text>
          {obj.use && <Badge size="xs" variant="light">{obj.use as string}</Badge>}
        </Group>
      );
    }

    // Identifier — system URL moves OFF the main row into a hover Tooltip.
    // Cursor `help` cue signals the additional info on hover. (UAT-FU-02 D-06)
    if (obj.value && (obj.system !== undefined || obj.type !== undefined)) {
      const valueCode = (
        <Code style={{ cursor: obj.system ? 'help' : undefined }}>
          {obj.value as string}
        </Code>
      );
      return (
        <Group gap="xs">
          {obj.system ? (
            <Tooltip label={obj.system as string} withArrow position="top">
              {valueCode}
            </Tooltip>
          ) : (
            valueCode
          )}
        </Group>
      );
    }

    // Period
    if (obj.start || obj.end) {
      return (
        <Text size="sm">
          {(obj.start as string)?.slice(0, 10) ?? '?'} — {(obj.end as string)?.slice(0, 10) ?? 'ongoing'}
        </Text>
      );
    }

    // Generic nested object — render as sub-table if shallow enough
    if (depth < 2) {
      const entries = Object.entries(obj).filter(([k]) => !k.startsWith('_'));
      if (entries.length === 0) return <Text size="sm" c="dimmed">—</Text>;
      return (
        <Table withRowBorders={false} verticalSpacing={2}>
          <Table.Tbody>
            {entries.map(([k, v]) => (
              <Table.Tr key={k}>
                <Table.Td style={{ width: 120, verticalAlign: 'top' }}>
                  <Text size="xs" c="dimmed" fw={500}>{k}</Text>
                </Table.Td>
                <Table.Td>
                  <RenderValue value={v} depth={depth + 1} parentResource={parentResource} />
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      );
    }

    // Too deeply nested — fall back to a [View] Modal trigger so the
    // inline JSON dump does not clutter the readable view. (UAT-FU-02 D-07)
    return <DeepJsonModal value={obj} title="JSON" />;
  }

  return <Text size="sm">{String(value)}</Text>;
}

/**
 * Renders a `[View]` Button that opens a Modal containing a pretty-printed
 * JSON dump of the given value. Replaces inline `<Code block>` JSON dumps in
 * the deeply-nested-object fallback path so the readable view stays clean
 * when address-extension or other complex nested data appears. (UAT-FU-02 D-07)
 */
function DeepJsonModal({ value, title = 'JSON' }: { value: unknown; title?: string }) {
  const [opened, { open, close }] = useDisclosure(false);
  return (
    <>
      <Button size="xs" variant="light" onClick={open}>View</Button>
      <Modal
        opened={opened}
        onClose={close}
        title={title}
        size="lg"
        closeButtonProps={{ 'aria-label': 'Close' }}
      >
        <Code block fz="xs" style={{ maxHeight: 500, overflowY: 'auto' }}>
          {JSON.stringify(value, null, 2)}
        </Code>
      </Modal>
    </>
  );
}

/**
 * Custom resource property table that renders FHIR resources without
 * depending on Medplum's schema system (which crashes on non-Medplum servers).
 *
 * Replaces Medplum's ResourceTable for the Human-readable and Clinical+Raw views.
 */
export function ResourcePropertyTable({ resource, parentResource }: ResourcePropertyTableProps) {
  const allKeys = Object.keys(resource).filter((k) => !SKIP_KEYS.has(k) && !k.startsWith('_'));
  const orderedKeys = sortKeys(allKeys);
  // Phase 47 READ-01: when no explicit parent passed, the resource is its own
  // parent for fragment-ref (#contained-id) lookups in nested RenderValue.
  const effectiveParent = parentResource ?? resource;

  return (
    <Stack gap="xs">
      {/* Resource type + meta header */}
      <Group gap="sm">
        <Badge size="lg" variant="light" color="blue">{resource.resourceType}</Badge>
        {toRecord(resource).id && (
          <Code>{toRecord(resource).id as string}</Code>
        )}
        {resource.meta?.lastUpdated && (
          <Text size="xs" c="dimmed">Last updated: {resource.meta.lastUpdated}</Text>
        )}
      </Group>

      <Table striped withTableBorder verticalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            <Table.Th style={{ width: 180 }}>Field</Table.Th>
            <Table.Th>Value</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {orderedKeys.map((key) => (
            <Table.Tr key={key}>
              <Table.Td style={{ verticalAlign: 'top' }}>
                <Text size="sm" fw={500}>{key}</Text>
              </Table.Td>
              <Table.Td>
                <RenderValue value={toRecord(resource)[key]} parentResource={effectiveParent} />
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Stack>
  );
}
