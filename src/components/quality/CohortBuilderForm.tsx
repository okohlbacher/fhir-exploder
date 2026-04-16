/**
 * CohortBuilderForm — Plan 21-05 (Phase 21 CHRT-01 / CHRT-02).
 *   Extended in Plan 22-03 (Phase 22 CHRT-05 / CHRT-07) with:
 *     - 4th criterion card (FhirpathCriterionCard)
 *     - `mode: 'create' | 'edit'` + `initialCohort?` + `onDiscard?` +
 *       `onSave?(payload)` props for Edit-mode wiring inside EditCohortModal
 *
 * Four-criterion cohort authoring form with Save modal (Create mode only):
 *   - Encounter date range (DatePickerInput, range mode)
 *   - Condition code (TextInput pair: Code system + Code)
 *   - Patient references (Textarea with live parsed-count helper + 10k cap Alert)
 *   - FHIRPath programmatic criterion (Paper card with Textarea + Validate)
 *
 * Consumes the Plan 21-02 hook `useCohorts()` for Create-mode persistence.
 * The caller (CohortsPage or EditCohortModal) must wrap this component in
 * `<DatesProvider>` per UI-SPEC §S3 / §S5.
 *
 * Copy + layout locked verbatim in 21-UI-SPEC.md §S3 + §S4 + §S5 and
 * 22-UI-SPEC.md §S1 + §S2. Every user-visible string in this file
 * corresponds to a row in the respective §Copywriting Contract (no
 * inferred language).
 *
 * Threat mitigations (21-PLAN.md §threat_model + 22-PLAN.md §threat_model):
 *   - T-21-01 (XSS): every displayed value renders via React text nodes; no
 *     inner-HTML injection primitives, no `eval`, no `new Function`.
 *   - T-21-02 (DoS paste overflow): Textarea `maxLength={1_048_576}` caps
 *     raw input at 1 MB; `parsePatientRefs` caps parsed IDs at 10 000;
 *     `useDebouncedValue(raw, 150)` avoids re-parsing on every keystroke.
 *   - T-21-06 (quota): `useCohorts.addCohort` throws on QuotaExceededError
 *     after surfacing a red toast; the form's save handler catches and
 *     shows a fallback "Save failed" toast.
 *   - T-21-14 (duplicate name): `existingNames.includes(name.trim())` check
 *     runs before `addCohort` delegation.
 *   - T-22-01 (FHIRPath injection): FhirpathCriterionCard translator rejects
 *     anything outside the D-02 subset. Save button in Edit mode gates on
 *     `fhirpathTranslatedQuery` being set (validate must have succeeded).
 */
import {
  Alert,
  Button,
  Group,
  Modal,
  Stack,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useDebouncedValue, useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconAlertTriangle, IconDeviceFloppy } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import type { JSX } from 'react';
import {
  parsePatientRefs,
  type CohortCriterion,
  type CohortDefinition,
  type ConditionCodeCriterion,
  type DateRangeCriterion,
  type FhirpathCriterion,
  type ReferenceListCriterion,
} from '../../quality/cohorts';
import { useCohorts } from '../../hooks/useCohorts';
import { FhirpathCriterionCard } from './FhirpathCriterionCard';

export interface CohortBuilderFormProps {
  /** Other saved cohort names; used for T-21-14 uniqueness check. */
  existingNames: string[];
  /** Fired after a successful Create-mode save (parent may refocus / reset). */
  onSaved: () => void;
  /**
   * Form mode. `'create'` (default) opens a Save-name modal on Save click
   * (Phase 21); `'edit'` calls `onSave` directly with the current
   * `{ name, criteria }` payload (the enclosing EditCohortModal supplies
   * the name context so no modal is opened).
   */
  mode?: 'create' | 'edit';
  /**
   * When `mode === 'edit'`, pre-populates all four criterion sections
   * from this cohort's `criteria` + reuses its `name` on save. Ignored
   * in Create mode.
   */
  initialCohort?: CohortDefinition;
  /** When `mode === 'edit'`, called when the user clicks Discard. */
  onDiscard?: () => void;
  /**
   * When `mode === 'edit'`, called on Save-changes click with the edited
   * payload (name reused from `initialCohort.name`; criteria freshly built).
   */
  onSave?: (input: { name: string; criteria: CohortCriterion[] }) => void;
}

/**
 * Cap enforced by `parsePatientRefs` — keep in sync with D-06. Also used
 * to detect truncation for the §S5 warning Alert.
 */
const PATIENT_REF_CAP = 10_000;

function toIsoDate(d: Date | string | null): string | null {
  if (!d) return null;
  // Mantine 8 DatePickerInput may emit either Date objects or ISO date
  // strings depending on the `valueFormat` / internal normalisation. Accept
  // both so the serializer is forgiving.
  if (typeof d === 'string') return d.slice(0, 10);
  // toISOString() → "YYYY-MM-DDT00:00:00.000Z"; slice the date half.
  return d.toISOString().slice(0, 10);
}

function buildCriteriaList(args: {
  dateRange: [Date | string | null, Date | string | null];
  codeSystem: string;
  code: string;
  parsedRefs: string[];
  fhirpathExpression: string;
  fhirpathTranslatedQuery: string | undefined;
}): CohortCriterion[] {
  const criteria: CohortCriterion[] = [];
  const [start, end] = args.dateRange;
  if (start || end) {
    criteria.push({
      type: 'date-range',
      start: toIsoDate(start),
      end: toIsoDate(end),
    });
  }
  const sys = args.codeSystem.trim();
  const code = args.code.trim();
  if (sys && code) {
    criteria.push({ type: 'condition-code', system: sys, code });
  }
  if (args.parsedRefs.length > 0) {
    criteria.push({ type: 'reference-list', patientIds: args.parsedRefs });
  }
  if (args.fhirpathExpression.trim().length > 0) {
    const fc: FhirpathCriterion = {
      type: 'fhirpath',
      expression: args.fhirpathExpression.trim(),
    };
    if (args.fhirpathTranslatedQuery !== undefined) {
      fc.translatedQuery = args.fhirpathTranslatedQuery;
    }
    criteria.push(fc);
  }
  return criteria;
}

export function CohortBuilderForm(
  props: CohortBuilderFormProps,
): JSX.Element {
  const mode = props.mode ?? 'create';
  const isEdit = mode === 'edit';
  const initialCohort = props.initialCohort;

  // Derive initial per-criterion values from initialCohort (Edit mode).
  const initialDateRange = initialCohort?.criteria.find(
    (c): c is DateRangeCriterion => c.type === 'date-range',
  );
  const initialConditionCode = initialCohort?.criteria.find(
    (c): c is ConditionCodeCriterion => c.type === 'condition-code',
  );
  const initialReferenceList = initialCohort?.criteria.find(
    (c): c is ReferenceListCriterion => c.type === 'reference-list',
  );
  const initialFhirpath = initialCohort?.criteria.find(
    (c): c is FhirpathCriterion => c.type === 'fhirpath',
  );

  // ----- form state -----
  const [dateRange, setDateRange] = useState<
    [Date | string | null, Date | string | null]
  >([initialDateRange?.start ?? null, initialDateRange?.end ?? null]);
  const [codeSystem, setCodeSystem] = useState(
    initialConditionCode?.system ?? '',
  );
  const [code, setCode] = useState(initialConditionCode?.code ?? '');
  const [refText, setRefText] = useState(
    initialReferenceList ? initialReferenceList.patientIds.join('\n') : '',
  );
  const [debouncedRef] = useDebouncedValue(refText, 150);
  const parsedRefs = useMemo(
    () => parsePatientRefs(debouncedRef),
    [debouncedRef],
  );
  const truncated = parsedRefs.length === PATIENT_REF_CAP;

  // ----- FHIRPath state -----
  // NOTE: translatedQuery is NOT pre-populated from
  // initialFhirpath.translatedQuery — UI-SPEC §S2 Edit-mode form
  // initialisation mandates the user MUST click Validate to re-confirm
  // before Save commits. We pre-populate `expression` but NOT the cache.
  const [fhirpathExpression, setFhirpathExpression] = useState(
    initialFhirpath?.expression ?? '',
  );
  const [fhirpathTranslatedQuery, setFhirpathTranslatedQuery] = useState<
    string | undefined
  >(undefined);

  // ----- modal state (Create mode only) -----
  const [saveModalOpen, saveModalCtrl] = useDisclosure(false);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { addCohort } = useCohorts();

  // ----- derived -----
  const hasDateRange = Boolean(dateRange[0]) || Boolean(dateRange[1]);
  const hasCode = codeSystem.trim() !== '' && code.trim() !== '';
  const hasRefs = parsedRefs.length >= 1;
  const hasFhirpath = fhirpathExpression.trim().length > 0;
  const hasAtLeastOneCriterion = hasDateRange || hasCode || hasRefs || hasFhirpath;

  // Save gate: if FHIRPath expression is present but unvalidated, block save.
  const fhirpathNeedsValidate =
    hasFhirpath && fhirpathTranslatedQuery === undefined;

  const saveDisabled = !hasAtLeastOneCriterion || fhirpathNeedsValidate;
  const saveDisabledTooltip = !hasAtLeastOneCriterion
    ? 'Add at least one criterion to save.'
    : fhirpathNeedsValidate
      ? 'Click Validate on the FHIRPath card before saving.'
      : undefined;

  // ----- handlers -----
  const resetForm = (): void => {
    setDateRange([null, null]);
    setCodeSystem('');
    setCode('');
    setRefText('');
    setName('');
    setNameError(null);
    setFhirpathExpression('');
    setFhirpathTranslatedQuery(undefined);
  };

  const handleOpenSave = (): void => {
    setNameError(null);
    setName('');
    saveModalCtrl.open();
  };

  const handleCloseSave = (): void => {
    if (submitting) return;
    saveModalCtrl.close();
    setName('');
    setNameError(null);
  };

  const handleConfirmSave = (): void => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('Name required.');
      return;
    }
    if (props.existingNames.includes(trimmed)) {
      setNameError(
        'A cohort with this name already exists. Choose a different name.',
      );
      return;
    }
    setSubmitting(true);
    try {
      const criteria = buildCriteriaList({
        dateRange,
        codeSystem,
        code,
        parsedRefs,
        fhirpathExpression,
        fhirpathTranslatedQuery,
      });
      const saved = addCohort({ name: trimmed, criteria });
      notifications.show({
        color: 'blue',
        title: 'Cohort saved',
        message: `"${saved.name}" is now available in the dashboard's Active cohort dropdown.`,
        autoClose: 2500,
      });
      resetForm();
      saveModalCtrl.close();
      props.onSaved();
    } catch {
      // useCohorts already surfaced a red toast on QuotaExceededError; this
      // catch-all covers any other throw (e.g. serialization failure).
      notifications.show({
        color: 'red',
        title: 'Save failed',
        message:
          'Could not save cohort to browser storage. Your browser may be in private mode or out of space.',
        autoClose: 6000,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSave = (): void => {
    if (!isEdit || !initialCohort || !props.onSave) return;
    const criteria = buildCriteriaList({
      dateRange,
      codeSystem,
      code,
      parsedRefs,
      fhirpathExpression,
      fhirpathTranslatedQuery,
    });
    props.onSave({ name: initialCohort.name, criteria });
  };

  // ----- parsed-count helper text -----
  let parsedHelper: string;
  if (parsedRefs.length === 0) {
    parsedHelper = 'No IDs parsed yet.';
  } else if (truncated) {
    parsedHelper =
      '10,000 unique patient IDs parsed (cap reached — additional IDs ignored).';
  } else if (parsedRefs.length === 1) {
    parsedHelper = '1 unique patient ID parsed.';
  } else {
    parsedHelper = `${parsedRefs.length} unique patient IDs parsed.`;
  }

  return (
    <Stack gap="md">
      {/* --- Encounter date range --- */}
      <DatePickerInput
        type="range"
        label="Encounter date range"
        description="Patients with at least one Encounter whose period falls in this range."
        placeholder="Select start and end date"
        valueFormat="DD MMM YYYY"
        numberOfColumns={2}
        clearable
        value={dateRange}
        onChange={(v) =>
          setDateRange(
            v as [Date | string | null, Date | string | null],
          )
        }
      />

      {/* --- Condition code pair --- */}
      <Stack gap="xs">
        <Text size="sm" fw={500}>
          Condition code
        </Text>
        <Text size="xs" c="dimmed">
          Patients with at least one Condition resource matching this code.
        </Text>
        <Group grow wrap="wrap">
          <TextInput
            label="Code system"
            placeholder="http://snomed.info/sct"
            value={codeSystem}
            onChange={(e) => setCodeSystem(e.currentTarget.value)}
          />
          <TextInput
            label="Code"
            placeholder="44054006"
            value={code}
            onChange={(e) => setCode(e.currentTarget.value)}
          />
        </Group>
      </Stack>

      {/* --- Reference list Textarea --- */}
      <Textarea
        label="Patient references"
        description="Paste Patient references or bare IDs, separated by commas, spaces, or newlines. Maximum 10,000 IDs."
        placeholder={'Patient/abc-123, Patient/xyz-456\nor bare IDs, one per line'}
        autosize
        minRows={4}
        maxRows={12}
        maxLength={1_048_576}
        value={refText}
        onChange={(e) => setRefText(e.currentTarget.value)}
      />
      <Text size="xs" c={truncated ? 'yellow.8' : 'dimmed'}>
        {parsedHelper}
      </Text>

      {/* --- Truncation Alert (S5) --- */}
      {truncated && (
        <Alert
          color="yellow"
          icon={<IconAlertTriangle size={16} />}
          title="Cohort truncated to 10,000 patients"
        >
          This cohort&apos;s criteria resolve to more than 10,000 patients.
          Only the first 10,000 will be analyzed. Add more criteria to narrow
          the cohort, or use FHIRPath (coming in Phase 22) for larger cohorts.
        </Alert>
      )}

      {/* --- FHIRPath criterion card (Plan 22-03 S1) --- */}
      <FhirpathCriterionCard
        initialExpression={fhirpathExpression}
        onExpressionChange={setFhirpathExpression}
        onValidated={setFhirpathTranslatedQuery}
      />

      {/* --- Save / Discard button row --- */}
      {isEdit ? (
        <Group justify="flex-end" gap="sm">
          <Button
            variant="default"
            onClick={props.onDiscard}
          >
            Discard
          </Button>
          <Button
            variant="filled"
            color="blue"
            leftSection={<IconDeviceFloppy size={16} />}
            disabled={saveDisabled}
            title={saveDisabledTooltip}
            onClick={handleEditSave}
          >
            Save changes
          </Button>
        </Group>
      ) : (
        <Group justify="flex-end">
          <Button
            variant="filled"
            color="blue"
            leftSection={<IconDeviceFloppy size={16} />}
            disabled={saveDisabled}
            title={saveDisabledTooltip}
            onClick={handleOpenSave}
          >
            {/* Ellipsis indicates modal per Apple HIG and UI-SPEC §S3 */}
            Save cohort…
          </Button>
        </Group>
      )}

      {/* --- Save modal (S4) — Create mode only; in-body heading --- */}
      {!isEdit && (
        <Modal
          opened={saveModalOpen}
          onClose={handleCloseSave}
          centered
          size="md"
          radius="sm"
          closeOnClickOutside={!submitting}
          closeOnEscape={!submitting}
          aria-labelledby="save-cohort-modal-heading"
        >
          <Stack gap="md">
            <Text fw={600} size="sm" id="save-cohort-modal-heading">
              Save cohort
            </Text>
            <Text size="sm">
              Name this cohort so you can activate it later from the dashboard.
            </Text>
            <TextInput
              label="Cohort name"
              placeholder="e.g. Diabetic adults 2024"
              description="Must be unique across your saved cohorts."
              error={nameError}
              value={name}
              onChange={(e) => {
                setName(e.currentTarget.value);
                if (nameError) setNameError(null);
              }}
            />
            <Group justify="flex-end" gap="sm">
              <Button
                variant="default"
                onClick={handleCloseSave}
                disabled={submitting}
              >
                Discard
              </Button>
              <Button
                variant="filled"
                color="blue"
                loading={submitting}
                onClick={handleConfirmSave}
              >
                Save cohort
              </Button>
            </Group>
          </Stack>
        </Modal>
      )}
    </Stack>
  );
}
