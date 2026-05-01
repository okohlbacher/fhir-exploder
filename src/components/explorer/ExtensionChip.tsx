/**
 * ExtensionChip — inline `[+N extensions]` affordance for property-level
 * FHIR extensions.
 *
 * Phase 47 / READ-02 (D-06, D-07). Closed by default; click expands a list
 * of extensions inline below the property row with each extension's URL +
 * value rendered via the local {@link RenderValue} (NOT a modal). Per
 * UI-SPEC §Component 2:
 *
 *   - Closed: <Button variant="subtle" size="xs">+N extension(s)</Button>
 *   - Open:   list of <Code>{url}</Code> + <RenderValue value={ext.value*}/>
 *   - Nested: extension.extension[] recurses with `pl="md"` indent (D-07)
 *
 * Q4 (RESEARCH.md): For indexed-primitive extensions (`_given: [null, {ext}]`),
 * each indexed extension surfaces with an `[i]` prefix on the URL line so
 * users can locate which array slot the extension applies to.
 *
 * Q5 (RESEARCH.md): Reuses the local {@link RenderValue} (exported from
 * `ResourcePropertyTable`) — Medplum's `<ResourcePropertyDisplay>` is NOT
 * used because it crashes on non-Medplum servers (existing comment in
 * ResourcePropertyTable.tsx).
 *
 * Threats:
 *   - T-47-03 (XSS): all `value*` rendering routes through Mantine `<Text>` /
 *     `<Code>` text-node escaping; URL field is rendered as text inside
 *     `<Code>`, never as anchor `href`. NO raw-HTML injection sinks reachable.
 */
import { useId, useState } from 'react';
import { Button, Code, Group, Stack, Text } from '@mantine/core';
import { RenderValue, type CollectedExtension } from './ResourcePropertyTable';

export interface ExtensionChipProps {
  extensions: CollectedExtension[];
}

export function ExtensionChip({ extensions }: ExtensionChipProps): JSX.Element | null {
  // CRITICAL: hooks must run unconditionally before ANY early return (Rules of
  // Hooks). useId() also gives us a collision-free aria-controls target.
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const count = extensions.length;
  if (count === 0) return null;

  const label = count === 1 ? '1 extension' : `${count} extensions`;

  return (
    <Stack gap="xs" mt={0}>
      <Group gap={0}>
        <Button
          variant="subtle"
          size="xs"
          radius="sm"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={panelId}
        >
          {open ? '−' : '+'} {label}
        </Button>
      </Group>
      {open && (
        <Stack
          id={panelId}
          gap="xs"
          mt="xs"
          pl="md"
          style={{ borderLeft: '2px solid var(--mantine-color-gray-3)' }}
        >
          {extensions.map((c, i) => (
            <ExtensionRow key={i} collected={c} depth={0} />
          ))}
        </Stack>
      )}
    </Stack>
  );
}

interface ExtensionRowProps {
  collected: CollectedExtension;
  depth: number;
}

function ExtensionRow({ collected, depth }: ExtensionRowProps): JSX.Element {
  const { url, ext, index } = collected;
  const value = pickFirstValueX(ext);
  const nested = (ext.extension as Array<Record<string, unknown>> | undefined) ?? [];
  // 1-level indent per nesting level (D-07).
  const indent = depth > 0 ? 'md' : 0;

  return (
    <Stack gap={4} pl={indent}>
      <Group gap="xs" wrap="nowrap">
        {typeof index === 'number' && (
          <Text size="xs" c="dimmed">[{index}]</Text>
        )}
        <Code>{url}</Code>
      </Group>
      {value !== undefined && (
        <RenderValue value={value} />
      )}
      {nested.length > 0 &&
        nested.map((n, i) =>
          n &&
          typeof n === 'object' &&
          typeof (n as { url?: unknown }).url === 'string' ? (
            <ExtensionRow
              key={i}
              collected={{ url: (n as { url: string }).url, ext: n }}
              depth={depth + 1}
            />
          ) : null,
        )}
    </Stack>
  );
}

/**
 * Extract the first `value*` field from an Extension record. Skips `url`
 * and `extension` (nested-children container). Returns `undefined` when
 * no `value*` field is present (e.g. extension that only contains nested
 * children).
 */
function pickFirstValueX(ext: Record<string, unknown>): unknown {
  for (const [k, v] of Object.entries(ext)) {
    if (k === 'url') continue;
    if (k === 'extension') continue;
    if (k.startsWith('value')) return v;
  }
  return undefined;
}
