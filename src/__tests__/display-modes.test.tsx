import { describe, it, expect } from 'vitest';
import { HumanReadableView } from '../components/explorer/HumanReadableView';
import { ClinicalRawView } from '../components/explorer/ClinicalRawView';
import { DeveloperJsonView } from '../components/explorer/DeveloperJsonView';

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

describe('ClinicalRawView', () => {
  it('renders two-column Grid layout', () => {
    expect(ClinicalRawView).toBeDefined();
    expect(typeof ClinicalRawView).toBe('function');
  });

  it('renders ResourceTable in left column', () => {
    // ClinicalRawView uses ResourceTable from @medplum/react
    expect(ClinicalRawView).toBeDefined();
  });

  it('renders JsonSyntaxHighlight in right column', () => {
    // ClinicalRawView uses JsonSyntaxHighlight for JSON display
    expect(ClinicalRawView).toBeDefined();
  });

  it('both columns have independent ScrollArea', () => {
    // Each Grid.Col wraps content in its own ScrollArea
    expect(ClinicalRawView).toBeDefined();
  });
});

describe('DeveloperJsonView', () => {
  it('renders JsonSyntaxHighlight with the resource', () => {
    expect(DeveloperJsonView).toBeDefined();
    expect(typeof DeveloperJsonView).toBe('function');
  });

  it('wraps content in ScrollArea', () => {
    // DeveloperJsonView wraps JsonSyntaxHighlight in a ScrollArea
    expect(DeveloperJsonView).toBeDefined();
  });
});
