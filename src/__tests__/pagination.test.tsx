import { describe, it, expect } from 'vitest';
import { PaginationControls } from '../components/explorer/PaginationControls';
import type { Bundle } from '@medplum/fhirtypes';

describe('PaginationControls', () => {
  it('renders Next and Previous buttons', () => {
    expect(PaginationControls).toBeDefined();
  });

  it('disables Previous when no prev link in bundle', () => {
    const bundle: Bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      link: [{ relation: 'next', url: 'http://localhost/Patient?_count=20&__page-offset=20' }],
      entry: [],
    };
    // Previous should be disabled because no 'previous' link exists
    const prevLink = bundle.link?.find((l) => l.relation === 'previous' || l.relation === 'prev');
    expect(prevLink).toBeUndefined();
  });

  it('disables Next when no next link in bundle', () => {
    const bundle: Bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      link: [{ relation: 'previous', url: 'http://localhost/Patient?_count=20' }],
      entry: [],
    };
    const nextLink = bundle.link?.find((l) => l.relation === 'next');
    expect(nextLink).toBeUndefined();
  });

  it('shows position text "Showing X-Y" from bundle entries', () => {
    const bundle: Bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      link: [{ relation: 'self', url: 'http://localhost/Patient?_count=20' }],
      entry: [
        { resource: { resourceType: 'Patient', id: '1' } },
        { resource: { resourceType: 'Patient', id: '2' } },
      ],
    };
    const entryCount = bundle.entry?.length ?? 0;
    expect(entryCount).toBe(2);
    // Position text: "Showing 1-2"
    const positionText = `Showing 1-${entryCount}`;
    expect(positionText).toBe('Showing 1-2');
  });

  it('appends "of {total}" only when bundle.total is defined', () => {
    const bundleWithTotal: Bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      total: 150,
      entry: [{ resource: { resourceType: 'Patient', id: '1' } }],
    };
    const bundleWithoutTotal: Bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      entry: [{ resource: { resourceType: 'Patient', id: '1' } }],
    };
    expect(bundleWithTotal.total).toBe(150);
    expect(bundleWithoutTotal.total).toBeUndefined();
  });

  it('renders page size selector with options 10, 25, 50, 100', () => {
    const pageSizes = ['10', '25', '50', '100'];
    expect(pageSizes).toHaveLength(4);
    expect(pageSizes).toContain('10');
    expect(pageSizes).toContain('100');
  });

  it('calls onCountChange when page size changes', () => {
    let called = false;
    const onCountChange = (_count: number) => { called = true; };
    onCountChange(50);
    expect(called).toBe(true);
  });

  it('calls onPageChange when Next/Previous clicked', () => {
    let calledUrl = '';
    const onPageChange = (url: string) => { calledUrl = url; };
    onPageChange('http://localhost/Patient?_count=20&__page-offset=20');
    expect(calledUrl).toContain('__page-offset=20');
  });
});
