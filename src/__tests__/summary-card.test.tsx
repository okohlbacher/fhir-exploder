/**
 * SummaryCard breach props — Wave 0 stub.
 *
 * Replaced in Task 3 with real assertions. Covers the 8 test IDs from
 * 18-VALIDATION.md for the breach primitive added in Plan 18-03.
 */
import { describe, it, beforeEach } from 'vitest';

beforeEach(() => {
  window.localStorage.clear();
});

describe('SummaryCard breach props', () => {
  it.todo('renders ring with color blue.6 when breached is false/undefined');
  it.todo('renders ring with color red.6 when breached=true');
  it.todo('renders value Text with color red.6 when breached=true');
  it.todo('renders "threshold: {N}%" annotation when breached=true AND threshold is provided');
  it.todo('does NOT render threshold annotation when breached=false');
  it.todo('renders as button when onClick is provided (Card component="button")');
  it.todo('calls onClick when clicked');
  it.todo('applies aria-label when ariaLabel prop is provided');
});
