/**
 * SortableTh — shared sortable table header cell for the Quality panels.
 *
 * Extracted from the byte-identical definitions previously duplicated in
 * CompletenessPanel.tsx:76-101 and CodingCoveragePanel.tsx:91-116
 * (QDDEP-05 / Plan 25-02). Renders a Mantine Table.Th with aria-sort
 * and an UnstyledButton whose icon reflects the current sort direction.
 */
import type React from 'react';
import { Group, Table, Text, UnstyledButton } from '@mantine/core';
import {
  IconChevronDown,
  IconChevronUp,
  IconSelector,
} from '@tabler/icons-react';

export interface SortableThProps {
  children: React.ReactNode;
  active: boolean;
  dir: 'asc' | 'desc';
  onClick: () => void;
}

export function SortableTh({
  children,
  active,
  dir,
  onClick,
}: SortableThProps): JSX.Element {
  const ariaSort = !active ? 'none' : dir === 'asc' ? 'ascending' : 'descending';
  const Icon = !active ? IconSelector : dir === 'asc' ? IconChevronUp : IconChevronDown;
  return (
    <Table.Th aria-sort={ariaSort}>
      <UnstyledButton onClick={onClick}>
        <Group gap={4} wrap="nowrap">
          <Text fw={600} size="sm">
            {children}
          </Text>
          <Icon size={14} />
        </Group>
      </UnstyledButton>
    </Table.Th>
  );
}

export default SortableTh;
