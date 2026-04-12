import { useState, useCallback } from 'react';
import { Box, Code, Group, Text, UnstyledButton } from '@mantine/core';
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react';

interface JsonTreeViewProps {
  data: unknown;
  /** Root-level nodes start expanded. Default: true */
  defaultExpanded?: boolean;
}

interface NodeProps {
  label: string;
  value: unknown;
  depth: number;
  defaultOpen: boolean;
}

const INDENT = 20;

function JsonValue({ value }: { value: unknown }): JSX.Element {
  if (value === null) return <Text span size="sm" c="dimmed" ff="monospace">null</Text>;
  if (value === undefined) return <Text span size="sm" c="dimmed" ff="monospace">undefined</Text>;
  if (typeof value === 'boolean')
    return <Text span size="sm" c="violet" ff="monospace">{String(value)}</Text>;
  if (typeof value === 'number')
    return <Text span size="sm" c="blue" ff="monospace">{value}</Text>;
  if (typeof value === 'string') {
    // Truncate very long strings
    const display = value.length > 120 ? value.slice(0, 120) + '...' : value;
    return <Text span size="sm" c="green.8" ff="monospace">"{display}"</Text>;
  }
  return <Text span size="sm" ff="monospace">{String(value)}</Text>;
}

function CollapsibleNode({ label, value, depth, defaultOpen }: NodeProps) {
  const [open, setOpen] = useState(defaultOpen);

  const toggle = useCallback(() => setOpen((v) => !v), []);

  const isArray = Array.isArray(value);
  const isObject = typeof value === 'object' && value !== null;

  // Leaf node — render inline
  if (!isObject) {
    return (
      <Group gap={4} pl={depth * INDENT} py={2} wrap="nowrap">
        <Box w={16} /> {/* spacer to align with collapsible nodes */}
        <Text size="sm" fw={500} ff="monospace" c="red.7">{label}:</Text>
        <JsonValue value={value} />
      </Group>
    );
  }

  const entries = isArray
    ? (value as unknown[]).map((v, i) => [String(i), v] as const)
    : Object.entries(value as Record<string, unknown>);

  const count = entries.length;
  const bracket = isArray ? `[${count}]` : `{${count}}`;

  return (
    <div>
      <UnstyledButton onClick={toggle} w="100%">
        <Group gap={4} pl={depth * INDENT} py={2} wrap="nowrap"
          style={{ borderRadius: 4 }}
          className="json-tree-row"
        >
          {open
            ? <IconChevronDown size={14} color="var(--mantine-color-gray-5)" />
            : <IconChevronRight size={14} color="var(--mantine-color-gray-5)" />
          }
          <Text size="sm" fw={500} ff="monospace" c="red.7">{label}</Text>
          <Text size="xs" c="dimmed" ff="monospace">{bracket}</Text>
          {!open && count <= 3 && !isArray && (
            <Text size="xs" c="dimmed" ff="monospace" truncate style={{ maxWidth: 400 }}>
              {entries.map(([k, v]) =>
                typeof v === 'string' ? `${k}: "${v.slice(0, 30)}"` :
                typeof v === 'number' || typeof v === 'boolean' ? `${k}: ${v}` : `${k}: ...`
              ).join(', ')}
            </Text>
          )}
        </Group>
      </UnstyledButton>
      {open && entries.map(([key, val]) => (
        <CollapsibleNode
          key={key}
          label={key}
          value={val}
          depth={depth + 1}
          defaultOpen={depth < 0} // children start collapsed
        />
      ))}
    </div>
  );
}

/**
 * Interactive collapsible JSON tree viewer.
 *
 * Top-level keys are expanded by default. Nested objects/arrays are collapsed
 * and can be expanded by clicking. Leaf values are color-coded by type.
 */
export function JsonTreeView({ data, defaultExpanded = true }: JsonTreeViewProps) {
  if (typeof data !== 'object' || data === null) {
    return <Code block>{JSON.stringify(data, null, 2)}</Code>;
  }

  const entries = Array.isArray(data)
    ? (data as unknown[]).map((v, i) => [String(i), v] as const)
    : Object.entries(data as Record<string, unknown>);

  return (
    <Box
      style={{ fontFamily: 'var(--mantine-font-family-monospace)' }}
      // Hover effect for rows
      mod={{ 'json-tree': true }}
    >
      <style>{`
        .json-tree-row:hover {
          background: var(--mantine-color-gray-0);
        }
      `}</style>
      {entries.map(([key, val]) => (
        <CollapsibleNode
          key={key}
          label={key}
          value={val}
          depth={0}
          defaultOpen={defaultExpanded}
        />
      ))}
    </Box>
  );
}
