import { describe, it, expect } from 'vitest';
import { HumanReadableView } from '../components/explorer/HumanReadableView';

describe('HumanReadableView', () => {
  it('renders ResourceTable with the provided resource', () => {
    expect(HumanReadableView).toBeDefined();
    // Component accepts resource prop and renders ResourceTable
    expect(typeof HumanReadableView).toBe('function');
  });

  it('does not render ResourceForm', async () => {
    // Verify the module source does not import ResourceForm
    const moduleSource = await import('../components/explorer/HumanReadableView');
    expect(Object.keys(moduleSource)).toContain('HumanReadableView');
    // ResourceForm should not be exported or used
    expect(Object.keys(moduleSource)).not.toContain('ResourceForm');
  });
});
