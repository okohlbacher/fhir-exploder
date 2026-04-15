/**
 * ResourceTypeSelector — dashboard-level resource-type filter (Phase 21,
 * CHRT-04, UI-SPEC §S8). Previously named `CohortSelector`; renamed in Plan
 * 21-04 to end the long-standing misnomer — this control filters by resource
 * type, not by cohort. A separate cohort selector + builder live elsewhere
 * in the /quality toolbar (Plan 21-05 / 21-06).
 *
 * MultiSelect for scoping quality analysis to specific resource types.
 * Selection persists in localStorage under `quality.resourceTypes.v1` (see
 * `src/quality/cohorts.ts#RESOURCE_TYPES_STORAGE_KEY`). A one-shot migration
 * effect in `QualityLayout.tsx` copies the pre-Phase-21 `quality.cohort.v1`
 * key to `quality.resourceTypes.v1` on first mount, so existing users don't
 * lose their selection.
 *
 * Threat T-21-10: label/helper strings are plain React text. Mantine's
 * MultiSelect renders them via its standard text path (no
 * `dangerouslySetInnerHTML`), so there is no XSS surface introduced by the
 * rename.
 */
import { MultiSelect, Text } from '@mantine/core';

export interface ResourceTypeSelectorProps {
  types: string[];
  value: string[];
  onChange: (types: string[]) => void;
}

export function ResourceTypeSelector({
  types,
  value,
  onChange,
}: ResourceTypeSelectorProps) {
  return (
    <div>
      <MultiSelect
        label="Resource types"
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
          ? `Filtering to: ${value.join(', ')}`
          : 'All resource types'}
      </Text>
    </div>
  );
}
