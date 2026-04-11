import { Select } from '@mantine/core';

interface ResourceTypeSelectorProps {
  resourceTypes: string[];
  currentType: string;
  onChange: (type: string) => void;
}

/**
 * Searchable dropdown for switching between resource types (D-06).
 * Shown at the top of the search results page for quick type switching.
 */
export function ResourceTypeSelector({ resourceTypes, currentType, onChange }: ResourceTypeSelectorProps) {
  const sortedTypes = [...resourceTypes].sort((a, b) => a.localeCompare(b));

  return (
    <Select
      data={sortedTypes}
      value={currentType}
      onChange={(value) => {
        if (value) {
          onChange(value);
        }
      }}
      placeholder="Select resource type..."
      searchable
      size="sm"
      aria-label="Resource type selector"
    />
  );
}
