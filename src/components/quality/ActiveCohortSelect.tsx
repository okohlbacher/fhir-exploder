/**
 * ActiveCohortSelect -- dashboard toolbar dropdown for activating a saved
 * patient cohort (Plan 21-06 Task 6.1, CHRT-03).
 *
 * Renders a Mantine `<Select>` labelled "Active cohort" with:
 *   - Placeholder option "No cohort -- all patients"
 *   - One option per saved cohort (sorted by createdAt ASC)
 *   - Helper text below the Select per UI-SPEC S6 (4 states)
 *   - Skeleton gate while useCohorts is hydrating (Pitfall 1)
 *   - onChange fires toast with 2500ms autoClose
 *
 * Threat T-21-03: toast messages use cohort NAME + COUNT only, never
 * patient IDs. T-21-15: onChange is user-initiated only (no effect-driven
 * toast spam).
 */
import { Select, Skeleton, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useCohorts } from '../../hooks/useCohorts';

export interface ActiveCohortSelectProps {
  /** Resolved patient count from QualityOverviewPage's resolver effect. */
  resolvedPatientCount: number | null;
  /** Current resolution status. */
  resolutionStatus: 'idle' | 'resolving' | 'failed';
}

export function ActiveCohortSelect({
  resolvedPatientCount,
  resolutionStatus,
}: ActiveCohortSelectProps) {
  const { cohorts, activeCohortId, activeCohort, hydrated, activateCohort } =
    useCohorts();

  if (!hydrated) {
    return <Skeleton height={36} width={240} />;
  }

  const data = [
    { value: '', label: 'No cohort \u2014 all patients' },
    ...cohorts
      .slice()
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      )
      .map((c) => ({ value: c.id, label: c.name })),
  ];

  const handleChange = (value: string | null) => {
    const selectedId = value || null;
    activateCohort(selectedId);

    if (selectedId) {
      const selected = cohorts.find((c) => c.id === selectedId);
      const name = selected?.name ?? 'Cohort';
      // Patient count may not yet be resolved at the time of activation --
      // the toast fires immediately, but the count populates in the helper
      // text once resolution completes.
      const countMsg =
        resolvedPatientCount != null
          ? `${name}: ${resolvedPatientCount.toLocaleString()} patients. Metrics will reflect the new scope on next recompute.`
          : `${name} selected. Metrics will reflect the new scope on next recompute.`;
      notifications.show({
        color: 'blue',
        title: 'Cohort activated',
        message: countMsg,
        autoClose: 2500,
      });
    } else {
      notifications.show({
        color: 'blue',
        title: 'Cohort cleared',
        message: 'Panels now analyze all patients.',
        autoClose: 2500,
      });
    }
  };

  // Helper text -- 4 states per UI-SPEC S6
  let helperText: string;
  let helperColor: string | undefined;

  if (!activeCohort) {
    helperText = 'Analyzing all patients.';
    helperColor = undefined; // default "dimmed"
  } else if (resolutionStatus === 'resolving') {
    helperText = 'Resolving cohort\u2026';
    helperColor = undefined; // "dimmed"
  } else if (resolutionStatus === 'failed') {
    helperText = 'Could not resolve cohort. Panels running unscoped.';
    helperColor = 'red';
  } else if (resolvedPatientCount != null) {
    // Active + idle + count known
    helperText = `${activeCohort.name} \u00B7 ${resolvedPatientCount.toLocaleString()} patients`;
    helperColor = undefined;
  } else {
    // Active + idle but count not yet available (shouldn't normally happen)
    helperText = 'Analyzing all patients.';
    helperColor = undefined;
  }

  return (
    <div>
      <Select
        label="Active cohort"
        placeholder="No cohort \u2014 all patients"
        data={data}
        value={activeCohortId ?? ''}
        onChange={handleChange}
        style={{ maxWidth: 320 }}
        size="sm"
      />
      <Text size="xs" c={helperColor ?? 'dimmed'} mt={4}>
        {helperText}
      </Text>
    </div>
  );
}
