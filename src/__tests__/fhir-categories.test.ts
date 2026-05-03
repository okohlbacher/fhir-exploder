import { describe, it, expect } from 'vitest';
import { getResourceCategory, groupByCategory } from '../utils/fhir-categories';

describe('getResourceCategory', () => {
  it('returns Clinical for Condition', () => {
    expect(getResourceCategory('Condition')).toBe('Clinical');
  });

  it('returns Diagnostics for Observation', () => {
    expect(getResourceCategory('Observation')).toBe('Diagnostics');
  });

  it('returns Other for unknown resource types', () => {
    expect(getResourceCategory('NotARealResourceType')).toBe('Other');
  });
});

describe('groupByCategory', () => {
  it('groups items by their category field', () => {
    const items = [
      { category: 'Clinical', type: 'Condition' },
      { category: 'Diagnostics', type: 'Observation' },
      { category: 'Clinical', type: 'Procedure' },
    ];
    const grouped = groupByCategory(items);
    expect(grouped.get('Clinical')).toHaveLength(2);
    expect(grouped.get('Diagnostics')).toHaveLength(1);
    expect(grouped.get('Clinical')![0].type).toBe('Condition');
    expect(grouped.get('Clinical')![1].type).toBe('Procedure');
  });

  it('returns empty map for empty input', () => {
    const grouped = groupByCategory([]);
    expect(grouped.size).toBe(0);
  });
});
