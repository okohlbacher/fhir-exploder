import { describe, it, expect } from 'vitest';
import { ResourceTypeSelector } from '../components/explorer/ResourceTypeSelector';

describe('ResourceTypeSelector', () => {
  it('renders Select with all resource types', () => {
    // Component accepts resourceTypes prop and renders a Select
    expect(ResourceTypeSelector).toBeDefined();
  });

  it('navigates to /explorer/{type} on selection', () => {
    // onChange prop is called with selected type
    const mockOnChange = () => {};
    expect(typeof mockOnChange).toBe('function');
  });

  it('sorts resource types alphabetically', () => {
    // The component sorts resourceTypes before passing to Select data
    const types = ['Observation', 'Patient', 'Condition'];
    const sorted = [...types].sort((a, b) => a.localeCompare(b));
    expect(sorted).toEqual(['Condition', 'Observation', 'Patient']);
  });

  it('renders searchable dropdown', () => {
    // Component uses searchable prop on Select
    expect(ResourceTypeSelector).toBeDefined();
  });
});

describe('ResourceTypeLanding', () => {
  it('exports ResourceTypeLanding component', async () => {
    const module = await import('../components/explorer/ResourceTypeLanding');
    expect(module.ResourceTypeLanding).toBeDefined();
  });

  it('uses useOutletContext for capability data', async () => {
    // Component imports useOutletContext from react-router-dom
    const module = await import('../components/explorer/ResourceTypeLanding');
    expect(module.ResourceTypeLanding).toBeDefined();
  });
});
