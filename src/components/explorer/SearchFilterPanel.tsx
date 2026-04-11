import { useState, useCallback, useEffect } from 'react';
import { Button, Group, MultiSelect, Paper, Stack, TextInput } from '@mantine/core';
import { getCuratedParams } from '../../utils/curated-params';

interface SearchFilterPanelProps {
  resourceType: string;
  allSearchParams: string[];
  onSearch: (
    filters: Record<string, string>,
    includes?: { include?: string[]; revinclude?: string[] }
  ) => void;
}

/**
 * Search filter panel with curated defaults and advanced toggle (D-02, D-03, D-13).
 * Shows curated params by default, "Show all filters" reveals full CapabilityStatement params.
 * Includes _include/_revinclude multi-selects in advanced mode.
 */
export function SearchFilterPanel({ resourceType, allSearchParams, onSearch }: SearchFilterPanelProps) {
  const [showAllFilters, setShowAllFilters] = useState(false);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [includeValues, setIncludeValues] = useState<string[]>([]);
  const [revincludeValues, setRevincludeValues] = useState<string[]>([]);

  // Reset filter state when resource type changes (WR-02)
  useEffect(() => {
    setFilterValues({});
    setIncludeValues([]);
    setRevincludeValues([]);
  }, [resourceType]);

  const curatedParams = getCuratedParams(resourceType, allSearchParams);
  const visibleParams = showAllFilters ? allSearchParams : curatedParams;

  // Construct potential _include options from params that look like references
  const includeOptions = allSearchParams
    .filter((p) => !p.startsWith('_'))
    .map((p) => `${resourceType}:${p}`);

  const revincludeOptions = allSearchParams
    .filter((p) => !p.startsWith('_'))
    .map((p) => `${resourceType}:${p}`);

  const handleFilterChange = useCallback((param: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [param]: value }));
  }, []);

  const handleSubmit = useCallback(() => {
    // Filter out empty values
    const activeFilters: Record<string, string> = {};
    for (const [key, value] of Object.entries(filterValues)) {
      if (value.trim()) {
        activeFilters[key] = value.trim();
      }
    }
    onSearch(activeFilters, {
      include: includeValues.length > 0 ? includeValues : undefined,
      revinclude: revincludeValues.length > 0 ? revincludeValues : undefined,
    });
  }, [filterValues, includeValues, revincludeValues, onSearch]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  return (
    <Paper p="md" bg="gray.0">
      <Stack gap="sm">
        <Group gap="sm" wrap="wrap">
          {visibleParams.map((param) => (
            <TextInput
              key={param}
              label={param}
              value={filterValues[param] ?? ''}
              onChange={(e) => handleFilterChange(param, e.currentTarget.value)}
              onKeyDown={handleKeyDown}
              size="sm"
              style={{ minWidth: 150, flex: '1 1 200px' }}
            />
          ))}
        </Group>

        {showAllFilters && (
          <Group gap="sm" wrap="wrap">
            <MultiSelect
              label="_include"
              data={includeOptions}
              value={includeValues}
              onChange={setIncludeValues}
              placeholder="Add _include paths..."
              searchable
              clearable
              style={{ minWidth: 250, flex: 1 }}
            />
            <MultiSelect
              label="_revinclude"
              data={revincludeOptions}
              value={revincludeValues}
              onChange={setRevincludeValues}
              placeholder="Add _revinclude paths..."
              searchable
              clearable
              style={{ minWidth: 250, flex: 1 }}
            />
          </Group>
        )}

        <Group justify="space-between">
          <Button
            variant="subtle"
            size="sm"
            onClick={() => setShowAllFilters((v) => !v)}
          >
            {showAllFilters ? 'Show fewer filters' : 'Show all filters'}
          </Button>
          <Button onClick={handleSubmit} size="sm">
            {`Search ${resourceType}`}
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
}
