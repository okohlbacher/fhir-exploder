import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import {
  Alert,
  Anchor,
  Breadcrumbs,
  SegmentedControl,
  Skeleton,
  Stack,
  Text,
} from '@mantine/core';
import { useMedplum } from '@medplum/react-hooks';
import { PatientHeader } from '@medplum/react';
import type { Patient } from '@medplum/fhirtypes';
import { MiiModuleTabs } from './MiiModuleTabs';
import { FhirResourcesView } from './FhirResourcesView';
import type { PatientsOutletContext } from './PatientsLayout';

type ViewMode = 'mii' | 'fhir';

/**
 * Extract a human-readable display name from a Patient resource.
 * Falls back to `Patient/{id}` if no HumanName is present.
 */
function extractPatientName(patient: Patient | undefined, patientId: string): string {
  if (!patient) return `Patient/${patientId}`;
  const first = patient.name?.[0];
  if (!first) return `Patient/${patientId}`;
  const given = (first.given ?? []).join(' ').trim();
  const family = first.family ?? '';
  const full = [given, family].filter(Boolean).join(' ').trim();
  return full.length > 0 ? full : `Patient/${patientId}`;
}

/**
 * Patient detail page at `/patients/:patientId` (D-03, D-04, D-09, D-10).
 *
 * Renders:
 *   - Breadcrumbs: Patients > {patient name}
 *   - PatientHeader banner (Medplum) with name, DOB, gender, identifiers
 *   - SegmentedControl toggle: "MII Modules" / "FHIR Resources" (D-09)
 *     defaulting to MII Modules (D-10)
 *   - Tab container showing either MII module tabs or the FHIR Resources view
 *
 * Security note (T-03-03): `patientId` from URL params is passed to
 * `client.readResource('Patient', patientId)`. MedplumClient validates via
 * the HTTP response; invalid/unknown IDs surface as an error state with the
 * UI-SPEC "Patient not found" copy.
 */
export function PatientDetailPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const client = useMedplum();
  const { capability } = useOutletContext<PatientsOutletContext>();

  const [patient, setPatient] = useState<Patient | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | undefined>(undefined);
  // D-10: Default view is MII Modules.
  const [viewMode, setViewMode] = useState<ViewMode>('mii');

  useEffect(() => {
    if (!patientId) {
      setError('Invalid URL: missing patient ID.');
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(undefined);
    setPatient(undefined);

    client
      .readResource('Patient', patientId)
      .then((res) => {
        if (cancelled) return;
        setPatient(res as Patient);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          err instanceof Error && err.message.toLowerCase().includes('not found')
            ? `Patient not found: Patient/${patientId} does not exist on this server.`
            : `Failed to load patient: Could not retrieve Patient/${patientId}. Check your connection and try again.`;
        setError(message);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [client, patientId]);

  const displayName = useMemo(
    () => extractPatientName(patient, patientId ?? ''),
    [patient, patientId]
  );

  if (!patientId) {
    return (
      <Alert color="red" title="Invalid URL">
        Missing patient ID in the URL.
      </Alert>
    );
  }

  return (
    <Stack gap="lg" p="md">
      <Breadcrumbs>
        <Anchor onClick={() => navigate('/patients')} size="sm">
          Patients
        </Anchor>
        <Text size="sm" fw={600}>
          {displayName}
        </Text>
      </Breadcrumbs>

      {loading && (
        <Stack gap="sm">
          <Skeleton height={80} />
          <Skeleton height={40} />
          <Skeleton height={40} />
          <Skeleton height={40} />
        </Stack>
      )}

      {error && (
        <Alert
          color="red"
          title={
            error.startsWith('Patient not found')
              ? 'Patient not found'
              : 'Failed to load patient'
          }
        >
          {error}
        </Alert>
      )}

      {!loading && !error && patient && (
        <>
          <PatientHeader patient={patient} />

          <SegmentedControl
            value={viewMode}
            onChange={(val) => setViewMode(val as ViewMode)}
            data={[
              { label: 'MII Modules', value: 'mii' },
              { label: 'FHIR Resources', value: 'fhir' },
            ]}
          />

          {viewMode === 'mii' ? (
            <MiiModuleTabs patientId={patientId} />
          ) : (
            <FhirResourcesView patientId={patientId} capability={capability} />
          )}
        </>
      )}
    </Stack>
  );
}
