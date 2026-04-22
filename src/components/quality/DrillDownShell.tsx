/**
 * DrillDownShell — unified chrome for Quality drill-down sub-pages
 * (QDDEP-02 / Plan 25-03).
 *
 * Consolidates the Back/Title/Progress/Error-alert/Empty-alert/Issues-table
 * stanza that was duplicated across 5 symmetric drill-downs (Plausibility,
 * LabRanges, Duplicates, References, Completeness) and is PARTIAL-wrapped
 * by CodingDrillDown (D-07 / 25-CONTEXT.md) — the latter passes
 * `issues={[]}` for chrome-only reuse and renders its bespoke per-path
 * coverage body as a sibling.
 *
 * Props interface (per D-05 ≤6 REQUIRED props):
 *   Required (5):  title, backHref, run, issues, emptyMessage
 *   Optional (2):  errorMessage?, progressLabel?
 *
 * The 7th `progressLabel?` is optional (defaults to "Running"); the ≤6 cap
 * applies to required props only per the planner brief (RESEARCH.md
 * Focus Area 2 Open Question 2) — the running-state progress text
 * ("Checking {type}", "Matching patients", ...) cannot collapse into
 * `title` without showing persistent drift during non-running states.
 *
 * Composition contract with 25-02 primitives:
 *   - RunProgress renders nothing unless run.status === 'running'; callers
 *     can pass any AsyncRunStatus (including 'idle') without null-guarding.
 *   - ResourceIssueTable handles empty-state rendering too, but the shell
 *     explicitly surfaces the green "no issues" alert when complete+empty
 *     because the existing drill-downs gated that alert separately.
 */
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button, Stack, Title } from '@mantine/core';
import { IconAlertTriangle, IconArrowLeft, IconCheck } from '@tabler/icons-react';

import { RunProgress } from './RunProgress';
import { ResourceIssueTable } from './ResourceIssueTable';
import type { AsyncRunStatus } from '../../hooks/internal/asyncRunReducer';
import type { NormalizedIssue } from '../../quality/types';

export interface DrillDownShellProps {
  /** Drill-down title text shown in the H2 header. */
  title: string;
  /** Back link href (currently always `/quality`). */
  backHref: string;
  /** Full run state — status + progress — matching RunProgress's shape. */
  run: { status: AsyncRunStatus; progress: { current: number; total: number } };
  /**
   * Normalized issues to render in the issues table. Pass `[]` if the
   * drill-down renders a bespoke body as a sibling (CodingDrillDown pattern).
   */
  issues: NormalizedIssue[];
  /** Error message to display when run.status === 'error'. */
  errorMessage?: string;
  /** Empty-state text shown when run.status === 'complete' and issues.length === 0. */
  emptyMessage: string;
  /**
   * Text prefix for the running-state progress label
   * (e.g., "Checking Observation", "Matching patients"). Defaults to "Running".
   */
  progressLabel?: string;
}

export function DrillDownShell(props: DrillDownShellProps): JSX.Element {
  const {
    title,
    backHref,
    run,
    issues,
    errorMessage,
    emptyMessage,
    progressLabel,
  } = props;

  const backRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    backRef.current?.focus();
  }, []);

  return (
    <Stack gap="md" p="xl">
      <Button
        variant="subtle"
        leftSection={<IconArrowLeft size={16} />}
        component={Link}
        to={backHref}
        ref={backRef}
      >
        Back
      </Button>

      <Title order={2}>{title}</Title>

      <RunProgress run={run} label={progressLabel ?? 'Running'} />

      {run.status === 'error' && (
        <Alert variant="light" color="red" icon={<IconAlertTriangle size={20} />}>
          {errorMessage ?? 'Unknown error'}
        </Alert>
      )}

      {run.status === 'complete' && issues.length === 0 && (
        <Alert variant="light" color="green" icon={<IconCheck size={20} />}>
          {emptyMessage}
        </Alert>
      )}

      {(run.status === 'complete' || run.status === 'cancelled') &&
        issues.length > 0 && <ResourceIssueTable issues={issues} />}
    </Stack>
  );
}

export default DrillDownShell;
