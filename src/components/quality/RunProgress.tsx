/**
 * RunProgress — shared running-progress chrome for Quality module panels
 * and drill-downs (QDDEP-06 / Plan 25-02).
 *
 * Renders the Mantine Stack+Text+Progress composition that was duplicated
 * across 9 sites (5 drill-downs + 4 panels). Returns null when the run is
 * not in `running` status, so callers can render it unconditionally.
 *
 * Prop-shape decision (per plan <interfaces> PROP-SHAPE DECISION):
 *   Accepts `run.progress.{current,total}` (matches what the single-run
 *   async hook from Phase 24 FOUND-04 already emits). D-17 wording
 *   "processed/total" is treated as wording-only drift; implementing
 *   `current/total` gives a zero-transformation drop-in at all 9 sites.
 */
import { Progress, Stack, Text } from '@mantine/core';

export interface RunProgressProps {
  run: {
    progress: { current: number; total: number };
    status: string;
  };
  /** Human-readable prefix, e.g. "Checking Observation" or "Matching patients". */
  label: string;
}

export function RunProgress({ run, label }: RunProgressProps): JSX.Element | null {
  if (run.status !== 'running') return null;
  const { current, total } = run.progress;
  const value = total <= 0 ? 0 : Math.round((current * 100) / total);
  return (
    <Stack gap="xs" aria-live="polite">
      <Text size="sm">
        {label} ({current}/{total})...
      </Text>
      <Progress value={value} animated />
    </Stack>
  );
}

export default RunProgress;
