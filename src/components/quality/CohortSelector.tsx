/**
 * CohortSelector -- Dashboard-level resource type filter (Phase 16, I-05).
 *
 * MultiSelect for scoping quality analysis to specific resource types.
 * Selection persists in localStorage under `quality.cohort.v1`.
 */
import { MultiSelect, Text } from '@mantine/core';

export interface CohortSelectorProps {
  types: string[];
  value: string[];
  onChange: (types: string[]) => void;
}

export function CohortSelector({ types, value, onChange }: CohortSelectorProps) {
  return (
    <div>
      <MultiSelect
        label="Cohort"
        placeholder="All resource types"
        data={types}
        value={value}
        onChange={onChange}
        searchable
        clearable
        size="sm"
        style={{ maxWidth: 320 }}
      />
      <Text size="xs" c="dimmed" mt={4}>
        {value.length > 0
          ? `Scoped to: ${value.join(', ')}`
          : 'All resource types'}
      </Text>
    </div>
  );
}
