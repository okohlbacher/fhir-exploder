import { useState, useCallback, useEffect } from 'react';
import { Button, Group, MultiSelect, Paper, Select, Stack, TextInput } from '@mantine/core';
import { getCuratedParams } from '../../utils/curated-params';

interface SearchFilterPanelProps {
  resourceType: string;
  allSearchParams: string[];
  /** Active filters from URL state — used to pre-fill inputs on bookmark restore */
  activeFilters?: Record<string, string>;
  onSearch: (
    filters: Record<string, string>,
    includes?: { include?: string[]; revinclude?: string[] }
  ) => void;
}

/**
 * Known value sets for categorical FHIR search parameters.
 * Params listed here render as Select dropdowns instead of text inputs.
 */
const CATEGORICAL_VALUES: Record<string, { value: string; label: string }[]> = {
  status: [
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' },
    { value: 'entered-in-error', label: 'Entered in Error' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'draft', label: 'Draft' },
    { value: 'unknown', label: 'Unknown' },
    { value: 'on-hold', label: 'On Hold' },
    { value: 'stopped', label: 'Stopped' },
    { value: 'preliminary', label: 'Preliminary' },
    { value: 'final', label: 'Final' },
    { value: 'amended', label: 'Amended' },
  ],
  gender: [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' },
    { value: 'unknown', label: 'Unknown' },
  ],
  'clinical-status': [
    { value: 'active', label: 'Active' },
    { value: 'recurrence', label: 'Recurrence' },
    { value: 'relapse', label: 'Relapse' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'remission', label: 'Remission' },
    { value: 'resolved', label: 'Resolved' },
  ],
  category: [
    { value: 'vital-signs', label: 'Vital Signs' },
    { value: 'laboratory', label: 'Laboratory' },
    { value: 'imaging', label: 'Imaging' },
    { value: 'procedure', label: 'Procedure' },
    { value: 'survey', label: 'Survey' },
    { value: 'social-history', label: 'Social History' },
    { value: 'exam', label: 'Exam' },
    { value: 'therapy', label: 'Therapy' },
    { value: 'activity', label: 'Activity' },
  ],
  class: [
    { value: 'IMP', label: 'Inpatient (IMP)' },
    { value: 'AMB', label: 'Ambulatory (AMB)' },
    { value: 'EMER', label: 'Emergency (EMER)' },
    { value: 'HH', label: 'Home Health (HH)' },
    { value: 'VR', label: 'Virtual (VR)' },
    { value: 'SS', label: 'Short Stay (SS)' },
  ],
};

/** Reference-type params get a special placeholder */
const REFERENCE_PARAMS = new Set([
  'patient', 'subject', 'encounter', 'performer', 'author',
  'requester', 'recorder', 'asserter', 'practitioner', 'organization',
]);

function getPlaceholder(param: string): string | undefined {
  if (REFERENCE_PARAMS.has(param)) return 'ID or prefix* for wildcard';
  if (param === 'identifier') return 'ID, prefix*, or system|value';
  if (param === 'code') return 'Code or system|code';
  if (param === 'date') return 'YYYY-MM-DD or geYYYY-MM-DD';
  return undefined;
}

/**
 * Search filter panel with curated defaults and advanced toggle.
 *
 * Automatically renders Select dropdowns for known categorical params
 * (status, gender, clinical-status, category, class) and TextInputs
 * for everything else. Reference params get wildcard-aware placeholders.
 */
export function SearchFilterPanel({ resourceType, allSearchParams, activeFilters, onSearch }: SearchFilterPanelProps) {
  const [showAllFilters, setShowAllFilters] = useState(false);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [includeValues, setIncludeValues] = useState<string[]>([]);
  const [revincludeValues, setRevincludeValues] = useState<string[]>([]);

  // Initialize filter inputs from URL state (bookmark restore) or reset on type change
  useEffect(() => {
    setFilterValues(activeFilters ?? {});
    setIncludeValues([]);
    setRevincludeValues([]);
  }, [resourceType, activeFilters]);

  const curatedParams = getCuratedParams(resourceType, allSearchParams);
  const visibleParams = showAllFilters ? allSearchParams : curatedParams;

  const includeOptions = allSearchParams
    .filter((p) => !p.startsWith('_'))
    .map((p) => `${resourceType}:${p}`);

  const revincludeOptions: string[] = [];

  const handleFilterChange = useCallback((param: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [param]: value }));
  }, []);

  const handleSubmit = useCallback(() => {
    const active: Record<string, string> = {};
    for (const [key, value] of Object.entries(filterValues)) {
      if (value.trim()) {
        active[key] = value.trim();
      }
    }
    onSearch(active, {
      include: includeValues.length > 0 ? includeValues : undefined,
      revinclude: revincludeValues.length > 0 ? revincludeValues : undefined,
    });
  }, [filterValues, includeValues, revincludeValues, onSearch]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleSubmit();
    },
    [handleSubmit]
  );

  return (
    <Paper p="md" bg="gray.0">
      <Stack gap="sm">
        <Group gap="sm" wrap="wrap">
          {visibleParams.map((param) => {
            const categoricalData = CATEGORICAL_VALUES[param];

            if (categoricalData) {
              return (
                <Select
                  key={param}
                  label={param}
                  placeholder="All"
                  data={categoricalData}
                  value={filterValues[param] || null}
                  onChange={(val) => handleFilterChange(param, val ?? '')}
                  clearable
                  searchable
                  size="sm"
                  style={{ minWidth: 140, flex: '0 1 180px' }}
                />
              );
            }

            return (
              <TextInput
                key={param}
                label={param}
                placeholder={getPlaceholder(param)}
                value={filterValues[param] ?? ''}
                onChange={(e) => handleFilterChange(param, e.currentTarget.value)}
                onKeyDown={handleKeyDown}
                size="sm"
                style={{ minWidth: 150, flex: '1 1 200px' }}
              />
            );
          })}
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
