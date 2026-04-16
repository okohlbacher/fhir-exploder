/**
 * FhirpathCriterionCard — Plan 22-03 Task 1 (CHRT-05).
 *
 * The 4th builder card on `/quality/cohorts`. A controlled Textarea +
 * Validate button, with its own per-card validation state (pristine /
 * validating / success / empty / truncated / translation-error /
 * server-error / timeout) rendered in an aria-live result row.
 *
 * Copy and layout locked verbatim in 22-UI-SPEC.md §S1 + §S7.
 *
 * Threat mitigations (22-PLAN.md §threat_model):
 *   - T-22-01 (FHIRPath injection): translator rejects anything outside
 *     the D-02 subset BEFORE we issue a search. The Textarea `maxLength`
 *     of 4096 caps the input size.
 *   - T-22-02 (URL injection): `dryRunCount` passes a params object to
 *     `client.search(...)` — no string concatenation.
 *
 * Pitfalls mitigated:
 *   - Pitfall 3 (10s validate timeout): `AbortController` + 10s
 *     `setTimeout` aborts in-flight validate if the server stalls.
 *   - Pitfall 5 (stale cache): parent `onValidated(undefined)` is fired
 *     whenever the user edits after a successful validate so the form
 *     re-gates Save on re-validate.
 */
import {
  Anchor,
  Button,
  Code,
  Collapse,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
  Textarea,
  Title,
} from '@mantine/core';
import { IconAlertTriangle, IconCheck } from '@tabler/icons-react';
import { useMedplum } from '@medplum/react-hooks';
import { useCallback, useId, useRef, useState } from 'react';
import type { JSX } from 'react';
import {
  TranslationError,
  dryRunCount,
  translateFhirpath,
  translatedQueryToFhirSearchUrl,
} from '../../quality/fhirpathTranslator';

export interface FhirpathCriterionCardProps {
  /** Initial expression (for Edit mode pre-fill). Empty string = no criterion. */
  initialExpression?: string;
  /**
   * Fires on every keystroke with the current Textarea value. Parent
   * stores this as the source of truth for building the FhirpathCriterion
   * entry in the criteria array. When empty, parent should omit the
   * criterion.
   */
  onExpressionChange: (expression: string) => void;
  /**
   * Fires with the translated FHIR search URL on successful validate;
   * fires with `undefined` on failure OR when the user edits after a
   * successful validate (cache-invalidation signal to parent).
   */
  onValidated: (translatedQuery: string | undefined) => void;
}

type ResultState =
  | { kind: 'pristine' }
  | { kind: 'validating' }
  | { kind: 'success'; count: number }
  | { kind: 'empty' }
  | { kind: 'truncated'; count: number }
  | { kind: 'translation-error'; message: string }
  | { kind: 'server-error' }
  | { kind: 'timeout' };

const VALIDATE_TIMEOUT_MS = 10_000;
const TRUNCATION_THRESHOLD = 10_000;

export function FhirpathCriterionCard(
  props: FhirpathCriterionCardProps,
): JSX.Element {
  const medplum = useMedplum();
  const [expression, setExpression] = useState(props.initialExpression ?? '');
  const [result, setResult] = useState<ResultState>({ kind: 'pristine' });
  const [helperOpen, setHelperOpen] = useState(false);
  const helperId = useId();
  // Tracks the exact expression that last produced a success/empty/truncated
  // result, so subsequent edits revert the row to pristine.
  const lastValidatedRef = useRef<string>('');
  const abortRef = useRef<AbortController | null>(null);

  const { onExpressionChange, onValidated } = props;

  const handleExpressionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const v = e.currentTarget.value;
      setExpression(v);
      onExpressionChange(v);
      // If user edited after a terminal validate result, revert + invalidate.
      if (v !== lastValidatedRef.current) {
        setResult((prev) => {
          if (
            prev.kind === 'success' ||
            prev.kind === 'empty' ||
            prev.kind === 'truncated' ||
            prev.kind === 'translation-error' ||
            prev.kind === 'server-error' ||
            prev.kind === 'timeout'
          ) {
            return { kind: 'pristine' };
          }
          return prev;
        });
        if (lastValidatedRef.current !== '') {
          onValidated(undefined);
          lastValidatedRef.current = '';
        }
      }
    },
    [onExpressionChange, onValidated],
  );

  const handleValidate = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setResult({ kind: 'validating' });
    const timeoutId = window.setTimeout(
      () => controller.abort(),
      VALIDATE_TIMEOUT_MS,
    );
    try {
      const tq = translateFhirpath(expression);
      const url = translatedQueryToFhirSearchUrl(tq);
      const n = await dryRunCount(medplum, tq);
      if (controller.signal.aborted) return;
      lastValidatedRef.current = expression;
      onValidated(url);
      if (n === 0) {
        setResult({ kind: 'empty' });
      } else if (n > TRUNCATION_THRESHOLD) {
        setResult({ kind: 'truncated', count: n });
      } else {
        setResult({ kind: 'success', count: n });
      }
    } catch (err) {
      if (controller.signal.aborted) {
        setResult({ kind: 'timeout' });
        onValidated(undefined);
        return;
      }
      if (err instanceof TranslationError) {
        setResult({ kind: 'translation-error', message: err.message });
      } else {
        setResult({ kind: 'server-error' });
      }
      onValidated(undefined);
    } finally {
      window.clearTimeout(timeoutId);
      abortRef.current = null;
    }
  }, [expression, medplum, onValidated]);

  const validating = result.kind === 'validating';
  const validateDisabled = expression.trim().length === 0 || validating;

  return (
    <Paper withBorder radius="sm" p="md">
      <Stack gap="md">
        <Title order={4}>FHIRPath query (advanced)</Title>
        <Text size="sm" c="dimmed">
          Optional. Define this cohort&apos;s criterion as a FHIRPath
          expression. Combines with the criteria above using
          AND-intersection.
        </Text>
        <Textarea
          label="FHIRPath expression"
          placeholder="Patient.where(birthDate < @1960-01-01)"
          description={
            <>
              Single <Code>Resource.where(field op literal)</Code> expression.
              Composition (and / or), nested where, and function calls
              (exists, first, count) are not supported. Maximum 4,096
              characters.
            </>
          }
          autosize
          minRows={4}
          maxRows={12}
          maxLength={4096}
          style={{ fontFamily: 'monospace' }}
          value={expression}
          onChange={handleExpressionChange}
        />
        <Group justify="space-between" align="center" wrap="wrap">
          <Anchor
            component="button"
            type="button"
            onClick={() => setHelperOpen((o) => !o)}
            aria-expanded={helperOpen}
            aria-controls={helperId}
          >
            {helperOpen
              ? 'Hide supported syntax and examples'
              : 'Show supported syntax and examples'}
          </Anchor>
          <Button
            variant="filled"
            color="blue"
            leftSection={<IconCheck size={16} />}
            loading={validating}
            disabled={validateDisabled}
            title={
              expression.trim().length === 0
                ? 'Enter a FHIRPath expression to validate.'
                : undefined
            }
            onClick={handleValidate}
          >
            Validate
          </Button>
        </Group>
        <div role="status" aria-live="polite">
          {renderResultRow(result)}
        </div>
        <Collapse in={helperOpen} id={helperId}>
          <Stack gap="sm">
            <Text size="sm" fw={500}>
              Supported syntax
            </Text>
            <Text size="xs" c="dimmed">
              Each criterion is a single{' '}
              <Code>Resource.where(field op literal)</Code> expression.
              Operators: <Code>=</Code>, <Code>!=</Code>, <Code>&lt;</Code>,{' '}
              <Code>&lt;=</Code>, <Code>&gt;</Code>, <Code>&gt;=</Code>.
              Literals: dates <Code>@YYYY-MM-DD</Code>, strings{' '}
              <Code>&apos;text&apos;</Code>, integers, decimals, booleans.
            </Text>
            <Stack gap="xs">
              <Text size="xs" fw={500}>
                Patient
              </Text>
              <Stack gap={4}>
                <Code>Patient.where(birthDate &lt; @1960-01-01)</Code>
                <Code>Patient.where(gender = &apos;female&apos;)</Code>
                <Code>Patient.where(active = true)</Code>
              </Stack>
            </Stack>
            <Stack gap="xs">
              <Text size="xs" fw={500}>
                Condition
              </Text>
              <Stack gap={4}>
                <Code>
                  Condition.where(code.coding.code =
                  &apos;44054006&apos;)
                </Code>
                <Code>Condition.where(recordedDate &gt;= @2024-01-01)</Code>
              </Stack>
            </Stack>
            <Stack gap="xs">
              <Text size="xs" fw={500}>
                Observation
              </Text>
              <Stack gap={4}>
                <Code>
                  Observation.where(code.coding.code =
                  &apos;8480-6&apos;)
                </Code>
                <Code>
                  Observation.where(effectiveDateTime &gt;= @2024-01-01)
                </Code>
              </Stack>
            </Stack>
            <Stack gap="xs">
              <Text size="xs" fw={500}>
                Encounter
              </Text>
              <Stack gap={4}>
                <Code>Encounter.where(period.start &gt;= @2024-01-01)</Code>
                <Code>Encounter.where(class.code = &apos;IMP&apos;)</Code>
              </Stack>
            </Stack>
            <Text size="xs" c="dimmed">
              Field-only matching (no system filtering). For system-scoped
              Condition codes use the Condition code criterion above.
            </Text>
          </Stack>
        </Collapse>
      </Stack>
    </Paper>
  );
}

function renderResultRow(result: ResultState): JSX.Element {
  switch (result.kind) {
    case 'pristine':
      return (
        <Text size="xs" c="dimmed">
          Click Validate to check this expression.
        </Text>
      );
    case 'validating':
      return (
        <Group gap="xs">
          <Loader size="xs" />
          <Text size="xs" c="dimmed">
            Validating…
          </Text>
        </Group>
      );
    case 'success':
      return (
        <Group gap="xs">
          <IconCheck size={14} color="green" />
          <Text size="xs" c="green.7">
            Matches {result.count.toLocaleString('en-US')} patients.
          </Text>
        </Group>
      );
    case 'empty':
      return (
        <Group gap="xs">
          <IconAlertTriangle size={14} color="yellow" />
          <Text size="xs" c="yellow.8">
            Cohort would be empty (0 patients matched).
          </Text>
        </Group>
      );
    case 'truncated':
      return (
        <Group gap="xs">
          <IconAlertTriangle size={14} color="yellow" />
          <Text size="xs" c="yellow.8">
            Matches more than 10,000 patients — only the first 10,000 will be
            analyzed. Add more criteria to narrow the cohort.
          </Text>
        </Group>
      );
    case 'translation-error':
      return (
        <Group gap="xs">
          <IconAlertTriangle size={14} color="red" />
          <Text size="xs" c="red.7">
            {result.message}
          </Text>
        </Group>
      );
    case 'server-error':
      return (
        <Text size="xs" c="red.7">
          Could not validate against the server. Check your connection or try
          again.
        </Text>
      );
    case 'timeout':
      return (
        <Text size="xs" c="yellow.8">
          Validation timed out. Your expression may be valid but the server
          can&apos;t count results quickly. Try Save anyway, or refine the
          criterion.
        </Text>
      );
  }
}
