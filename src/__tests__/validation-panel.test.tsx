/**
 * QUAL-04 — ValidationPanel UI test.
 *
 * Wave 2 Plan 05 creates `src/components/quality/ValidationPanel.tsx`:
 *   - batch runner (configurable batch size from settings.validation.batchSize)
 *   - progress indicator while validating
 *   - cancel button that halts the queue
 *   - issue list grouped by severity (error / warning / information)
 */
import { describe, it, expect } from 'vitest';
// @ts-expect-error — Wave 2 Plan 05 creates this component.
import { ValidationPanel } from '../components/quality/ValidationPanel';

describe('ValidationPanel (QUAL-04)', () => {
  it.todo('renders a "Start validation" button when idle');
  it.todo('shows progress (N of M) while running');
  it.todo('stops on cancel — queue halts, already-validated resources retain their issues');
  it.todo('groups issues by severity with colored Mantine badges');
  it.todo('shows info banner when validation.validatorUrl is absent (structural-only)');

  it('is exported from src/components/quality/ValidationPanel', () => {
    expect(typeof ValidationPanel).toBe('function');
  });
});
