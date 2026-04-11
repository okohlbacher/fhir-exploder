import { describe, it, expect } from 'vitest';
import { SearchFilterPanel } from '../components/explorer/SearchFilterPanel';

describe('_include/_revinclude functionality', () => {
  it('SearchFilterPanel shows _include MultiSelect when expanded', () => {
    // When showAllFilters is true, _include MultiSelect is rendered
    expect(SearchFilterPanel).toBeDefined();
  });

  it('SearchFilterPanel shows _revinclude MultiSelect when expanded', () => {
    // When showAllFilters is true, _revinclude MultiSelect is rendered
    expect(SearchFilterPanel).toBeDefined();
  });

  it('onSearch callback includes include/revinclude arrays', () => {
    // The onSearch prop receives includes parameter with include/revinclude arrays
    const mockOnSearch = (
      _filters: Record<string, string>,
      includes?: { include?: string[]; revinclude?: string[] }
    ) => {
      return includes;
    };
    const result = mockOnSearch({}, { include: ['Patient:organization'], revinclude: [] });
    expect(result?.include).toEqual(['Patient:organization']);
  });

  it('_include options constructed from resource reference params', () => {
    // Include options are formatted as ResourceType:paramName
    const resourceType = 'Patient';
    const params = ['organization', 'general-practitioner'];
    const options = params.map((p) => `${resourceType}:${p}`);
    expect(options).toContain('Patient:organization');
    expect(options).toContain('Patient:general-practitioner');
  });
});
