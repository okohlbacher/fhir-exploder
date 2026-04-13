/**
 * ResourceIssueTable tests -- Phase 15, Plan 02, Task 2.
 *
 * Covers rendering, resource links, severity badges, field paths,
 * pagination at 50 items, severity filter, field filter, initialFieldFilter
 * prop, empty state, and filter-empty state.
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { MemoryRouter } from 'react-router-dom';
import {
  ResourceIssueTable,
  type ResourceIssueTableProps,
} from '../components/quality/ResourceIssueTable';
import type { NormalizedIssue, IssueSeverity } from '../quality/types';

// ----- jsdom polyfills required by Mantine 8 -----
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

beforeAll(() => {
  (
    globalThis as unknown as { ResizeObserver: typeof ResizeObserver }
  ).ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

  if (
    !(Element.prototype as unknown as { scrollIntoView?: () => void })
      .scrollIntoView
  ) {
    (
      Element.prototype as unknown as { scrollIntoView: () => void }
    ).scrollIntoView = function () {};
  }

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

// ----- helpers -----

function makeIssues(count: number): NormalizedIssue[] {
  return Array.from({ length: count }, (_, i) => ({
    resourceId: `Patient/p${i}`,
    resourceType: 'Patient',
    field: i % 2 === 0 ? 'name' : 'birthDate',
    description: `Issue ${i}`,
    severity: (
      i % 3 === 0 ? 'error' : i % 3 === 1 ? 'warning' : 'info'
    ) as IssueSeverity,
  }));
}

function renderTable(props: Partial<ResourceIssueTableProps> = {}) {
  const defaults: ResourceIssueTableProps = {
    issues: makeIssues(3),
    ...props,
  };
  return render(
    <MantineProvider>
      <MemoryRouter>
        <ResourceIssueTable {...defaults} />
      </MemoryRouter>
    </MantineProvider>,
  );
}

// ----- tests -----

describe('ResourceIssueTable', () => {
  it('renders empty state when no issues', () => {
    renderTable({ issues: [] });
    expect(screen.getByText('No issues found')).toBeTruthy();
    expect(
      screen.getByText(/All sampled resources passed/),
    ).toBeTruthy();
  });

  it('renders table rows with resource links', () => {
    renderTable({ issues: makeIssues(3) });
    // All 3 resources should be visible
    expect(screen.getByText('Patient/p0')).toBeTruthy();
    expect(screen.getByText('Patient/p1')).toBeTruthy();
    expect(screen.getByText('Patient/p2')).toBeTruthy();
  });

  it('resource links point to /explorer/{type}/{id}', () => {
    renderTable({ issues: makeIssues(3) });
    const link = screen.getByText('Patient/p0').closest('a');
    expect(link).toBeTruthy();
    expect(link!.getAttribute('href')).toBe('/explorer/Patient/p0');
  });

  it('renders severity badges', () => {
    renderTable({
      issues: [
        {
          resourceId: 'Patient/a1',
          resourceType: 'Patient',
          field: 'name',
          description: 'Error issue',
          severity: 'error',
        },
        {
          resourceId: 'Patient/a2',
          resourceType: 'Patient',
          field: 'name',
          description: 'Warning issue',
          severity: 'warning',
        },
        {
          resourceId: 'Patient/a3',
          resourceType: 'Patient',
          field: 'name',
          description: 'Info issue',
          severity: 'info',
        },
      ],
    });
    // Badge text co-exists with Select option text, so use getAllByText
    expect(screen.getAllByText('error').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('warning').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('info').length).toBeGreaterThanOrEqual(1);
    // Verify the badge elements specifically exist within the table
    const badges = document.querySelectorAll('.mantine-Badge-label');
    const badgeTexts = Array.from(badges).map((b) => b.textContent);
    expect(badgeTexts).toContain('error');
    expect(badgeTexts).toContain('warning');
    expect(badgeTexts).toContain('info');
  });

  it('renders field paths', () => {
    renderTable({
      issues: [
        {
          resourceId: 'Patient/a1',
          resourceType: 'Patient',
          field: 'Condition.code',
          description: 'test',
          severity: 'error',
        },
      ],
    });
    expect(screen.getByText('Condition.code')).toBeTruthy();
  });

  it('paginates at 50 items', () => {
    renderTable({ issues: makeIssues(60) });
    // Should show "Showing 1--50 of 60 issues"
    expect(screen.getByText(/Showing 1--50 of 60 issues/)).toBeTruthy();
    // Pagination control should be present
    // Mantine Pagination renders buttons with page numbers
    expect(screen.getByRole('button', { name: '2' })).toBeTruthy();
  });

  it('severity filter shows only matching issues', () => {
    const issues = [
      {
        resourceId: 'Patient/e1',
        resourceType: 'Patient',
        field: 'name',
        description: 'Error one',
        severity: 'error' as IssueSeverity,
      },
      {
        resourceId: 'Patient/w1',
        resourceType: 'Patient',
        field: 'name',
        description: 'Warning one',
        severity: 'warning' as IssueSeverity,
      },
      {
        resourceId: 'Patient/i1',
        resourceType: 'Patient',
        field: 'name',
        description: 'Info one',
        severity: 'info' as IssueSeverity,
      },
    ];
    renderTable({ issues });

    // Initially all 3 descriptions visible
    expect(screen.getByText('Error one')).toBeTruthy();
    expect(screen.getByText('Warning one')).toBeTruthy();
    expect(screen.getByText('Info one')).toBeTruthy();

    // Open severity select and choose 'error'
    const select = screen.getByRole('textbox', { name: 'Filter by severity' });
    fireEvent.click(select);
    // Mantine Select renders options -- find by role
    const options = screen.getAllByRole('option');
    const errorOption = options.find(
      (o) => o.getAttribute('value') === 'error',
    );
    expect(errorOption).toBeTruthy();
    fireEvent.click(errorOption!);

    // Only error description visible
    expect(screen.getByText('Error one')).toBeTruthy();
    expect(screen.queryByText('Warning one')).toBeNull();
    expect(screen.queryByText('Info one')).toBeNull();
  });

  it('field filter narrows by substring match', () => {
    const issues = [
      {
        resourceId: 'Patient/a1',
        resourceType: 'Patient',
        field: 'birthDate',
        description: 'Date issue',
        severity: 'error' as IssueSeverity,
      },
      {
        resourceId: 'Patient/a2',
        resourceType: 'Patient',
        field: 'name',
        description: 'Name issue',
        severity: 'warning' as IssueSeverity,
      },
    ];
    renderTable({ issues });

    const input = screen.getByLabelText('Filter by field path');
    fireEvent.change(input, { target: { value: 'birthDate' } });

    expect(screen.getByText('Date issue')).toBeTruthy();
    expect(screen.queryByText('Name issue')).toBeNull();
  });

  it('initialFieldFilter pre-populates field filter', () => {
    const issues = [
      {
        resourceId: 'Patient/a1',
        resourceType: 'Patient',
        field: 'name',
        description: 'Name issue',
        severity: 'error' as IssueSeverity,
      },
      {
        resourceId: 'Patient/a2',
        resourceType: 'Patient',
        field: 'birthDate',
        description: 'Date issue',
        severity: 'warning' as IssueSeverity,
      },
    ];
    renderTable({ issues, initialFieldFilter: 'name' });

    const input = screen.getByLabelText(
      'Filter by field path',
    ) as HTMLInputElement;
    expect(input.value).toBe('name');
    // Only name issues should be visible
    expect(screen.getByText('Name issue')).toBeTruthy();
    expect(screen.queryByText('Date issue')).toBeNull();
  });

  it('filter-empty state shows "No matching issues"', () => {
    const issues = [
      {
        resourceId: 'Patient/a1',
        resourceType: 'Patient',
        field: 'name',
        description: 'test',
        severity: 'error' as IssueSeverity,
      },
    ];
    renderTable({ issues });

    const input = screen.getByLabelText('Filter by field path');
    fireEvent.change(input, { target: { value: 'zzzznonexistent' } });

    expect(screen.getByText(/No matching issues/)).toBeTruthy();
  });

  it('filter change resets page to 1', () => {
    renderTable({ issues: makeIssues(60) });

    // Go to page 2
    const page2Btn = screen.getByRole('button', { name: '2' });
    fireEvent.click(page2Btn);
    expect(screen.getByText(/Showing 51--60/)).toBeTruthy();

    // Change severity filter -- should reset to page 1
    const select = screen.getByRole('textbox', { name: 'Filter by severity' });
    fireEvent.click(select);
    const options = screen.getAllByRole('option');
    const errorOption = options.find(
      (o) => o.getAttribute('value') === 'error',
    );
    expect(errorOption).toBeTruthy();
    fireEvent.click(errorOption!);

    // Should be on page 1 (showing from 1)
    expect(screen.getByText(/Showing 1--/)).toBeTruthy();
  });
});
