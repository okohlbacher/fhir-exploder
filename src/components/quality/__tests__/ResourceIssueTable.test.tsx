/**
 * Phase 43 VAL-07 — ResourceIssueTable suggestion-row tests.
 *
 * Verifies the inline expandable "Did you mean?" rows for code-invalid
 * issues. Default-off (D-11): no suggestions Map → identical pre-43 DOM.
 *
 * Test cases:
 *   wire-1: opt-in OFF (no suggestions prop) → no chevron, no Collapse row
 *   wire-2: opt-in ON, code-invalid + suggestions → chevron renders
 *   wire-3: opt-in ON, non-code-invalid issue → no chevron
 *   wire-4: clicking chevron expands; columns Display | Code | Relation render;
 *           Tooltip wraps the Display cell
 *   wire-5: opt-in ON, but suggestions array empty for the rowKey → no chevron
 *   wire-6: striped table — collapse row carries data-collapse-row="true"
 *           and a transparent background (Pitfall 6)
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { MemoryRouter } from 'react-router-dom';
import { ResourceIssueTable } from '../ResourceIssueTable';
import type { NormalizedIssue } from '../../../quality/types';
import type { NearMissSuggestion } from '../../../quality/semanticNearMissWalker';

// jsdom polyfills (Mantine 8 needs ResizeObserver + matchMedia)
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
(globalThis as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
  MockResizeObserver as unknown as typeof ResizeObserver;

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

function renderTable(props: Parameters<typeof ResourceIssueTable>[0]) {
  return render(
    <MantineProvider>
      <MemoryRouter>
        <ResourceIssueTable {...props} />
      </MemoryRouter>
    </MantineProvider>,
  );
}

const SNOMED = 'http://snomed.info/sct';

const codeInvalidIssue: NormalizedIssue = {
  resourceId: 'Condition/c1',
  resourceType: 'Condition',
  field: 'Condition.code',
  description: 'code-invalid -- Bad SNOMED',
  severity: 'error',
  code: 'code-invalid',
};

const invariantIssue: NormalizedIssue = {
  resourceId: 'Patient/p1',
  resourceType: 'Patient',
  field: 'Patient.name',
  description: 'invariant -- profile constraint',
  severity: 'error',
  code: 'invariant',
};

const sampleSuggestions: NearMissSuggestion[] = [
  {
    system: SNOMED,
    code: 'GOOD-PARENT',
    display: 'Good Parent Concept',
    relation: 'parent',
    depth: 1,
  },
];

describe('ResourceIssueTable — Phase 43 VAL-07 suggestions (did-you-mean)', () => {
  it('Test wire-1 (default-off): no suggestions prop → no chevron, no Collapse row in the DOM', () => {
    renderTable({ issues: [codeInvalidIssue] });
    // Chevron is rendered as an ActionIcon with aria-label "Show suggestions"
    expect(
      screen.queryByRole('button', { name: /show suggestions/i }),
    ).toBeNull();
    // No data-collapse-row anywhere
    expect(document.querySelector('[data-collapse-row="true"]')).toBeNull();
  });

  it('Test wire-1b (default-off via empty Map): identical to default-off', () => {
    renderTable({
      issues: [codeInvalidIssue],
      suggestions: new Map(),
    });
    expect(
      screen.queryByRole('button', { name: /show suggestions/i }),
    ).toBeNull();
  });

  it('Test wire-2 (opt-in ON, code-invalid + suggestions): chevron renders next to the row', () => {
    const suggestions = new Map<string, NearMissSuggestion[]>();
    suggestions.set(
      `${codeInvalidIssue.resourceId}|${codeInvalidIssue.field}|${codeInvalidIssue.code}`,
      sampleSuggestions,
    );
    renderTable({ issues: [codeInvalidIssue], suggestions });
    expect(
      screen.getByRole('button', { name: /show suggestions/i }),
    ).toBeTruthy();
  });

  it('Test wire-3 (non-code-invalid): chevron does NOT render even when suggestions Map has unrelated entries', () => {
    const suggestions = new Map<string, NearMissSuggestion[]>();
    suggestions.set(
      'some-other-key|with|values',
      sampleSuggestions,
    );
    renderTable({ issues: [invariantIssue], suggestions });
    expect(
      screen.queryByRole('button', { name: /show suggestions/i }),
    ).toBeNull();
  });

  it('Test wire-4 (expansion): clicking chevron opens Collapse, renders Display | Code | Relation columns', () => {
    const suggestions = new Map<string, NearMissSuggestion[]>();
    suggestions.set(
      `${codeInvalidIssue.resourceId}|${codeInvalidIssue.field}|${codeInvalidIssue.code}`,
      sampleSuggestions,
    );
    renderTable({ issues: [codeInvalidIssue], suggestions });

    const chevron = screen.getByRole('button', { name: /show suggestions/i });
    fireEvent.click(chevron);

    // After click, the chevron's aria-label flips to "Hide suggestions"
    expect(
      screen.getByRole('button', { name: /hide suggestions/i }),
    ).toBeTruthy();
    // Columns Display, Code, Relation are present in the inner suggestion table
    expect(screen.getByText('Display')).toBeTruthy();
    // "Code" appears as a column header (one of multiple "Code" texts in the table)
    expect(screen.getAllByText('Code').length).toBeGreaterThan(0);
    expect(screen.getByText('Relation')).toBeTruthy();
    // Suggestion content present
    expect(screen.getByText('Good Parent Concept')).toBeTruthy();
    expect(screen.getByText('GOOD-PARENT')).toBeTruthy();
    expect(screen.getByText('parent')).toBeTruthy();
  });

  it('Test wire-5 (empty suggestions for the rowKey): chevron does NOT render', () => {
    const suggestions = new Map<string, NearMissSuggestion[]>();
    suggestions.set(
      `${codeInvalidIssue.resourceId}|${codeInvalidIssue.field}|${codeInvalidIssue.code}`,
      [], // empty array — silent fallback case
    );
    renderTable({ issues: [codeInvalidIssue], suggestions });
    expect(
      screen.queryByRole('button', { name: /show suggestions/i }),
    ).toBeNull();
  });

  it('Test wire-6 (Pitfall 6 striping): collapse row carries data-collapse-row="true" and transparent background', () => {
    const suggestions = new Map<string, NearMissSuggestion[]>();
    suggestions.set(
      `${codeInvalidIssue.resourceId}|${codeInvalidIssue.field}|${codeInvalidIssue.code}`,
      sampleSuggestions,
    );
    renderTable({ issues: [codeInvalidIssue], suggestions });
    const collapseRow = document.querySelector(
      '[data-collapse-row="true"]',
    ) as HTMLElement | null;
    expect(collapseRow).not.toBeNull();
    // Inline transparent background applied to the row
    const inlineBg = collapseRow?.style.background ?? '';
    expect(inlineBg).toBe('transparent');
  });
});
