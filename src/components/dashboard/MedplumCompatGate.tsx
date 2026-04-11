import { useEffect, useState } from 'react';
import { Alert, Loader, Stack, Text } from '@mantine/core';
import { IconCircleCheck, IconAlertTriangle } from '@tabler/icons-react';
import type { MedplumClient } from '@medplum/core';
import type { Resource, ResourceType } from '@medplum/fhirtypes';
import { MedplumProvider } from '@medplum/react';
import { ResourceTable } from '@medplum/react';

interface MedplumCompatGateProps {
  client: MedplumClient;
  resourceTypes?: string[];
}

type GateState =
  | { status: 'loading' }
  | { status: 'success'; resource: Resource }
  | { status: 'error'; message: string };

/** Preferred types to try fetching for the compatibility gate */
const PREFERRED_TYPES = ['Patient', 'Observation', 'Condition', 'Encounter', 'CapabilityStatement'];

export function MedplumCompatGate({ client, resourceTypes }: MedplumCompatGateProps) {
  const [state, setState] = useState<GateState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      // Build ordered list of types to try
      const typesToTry: string[] = [];
      if (resourceTypes && resourceTypes.length > 0) {
        // Try preferred types first if available, then fall back to first available
        for (const pref of PREFERRED_TYPES) {
          if (resourceTypes.includes(pref)) {
            typesToTry.push(pref);
          }
        }
        // Add remaining types not already in the list
        for (const rt of resourceTypes) {
          if (!typesToTry.includes(rt)) {
            typesToTry.push(rt);
          }
        }
      } else {
        typesToTry.push(...PREFERRED_TYPES);
      }

      for (const resourceType of typesToTry) {
        try {
          const results = await client.searchResources(resourceType as ResourceType, { _count: '1' });
          if (results.length > 0) {
            if (!cancelled) {
              setState({ status: 'success', resource: results[0] });
            }
            return;
          }
        } catch {
          // Try next type
        }
      }

      if (!cancelled) {
        setState({
          status: 'error',
          message: 'Could not fetch any resource from the server to verify compatibility.',
        });
      }
    }

    verify();
    return () => { cancelled = true; };
  }, [client, resourceTypes?.join(',')]);

  if (state.status === 'loading') {
    return (
      <Stack align="center" py="md" gap="xs">
        <Loader size="sm" />
        <Text size="sm" c="dimmed">Verifying Medplum compatibility...</Text>
      </Stack>
    );
  }

  if (state.status === 'error') {
    return (
      <Alert
        variant="light"
        color="orange"
        icon={<IconAlertTriangle size={20} />}
        title="Medplum component rendering failed"
      >
        {state.message} This is a warning, not a blocker -- the rest of the app works, but Phase 2 may
        have issues with Medplum React components.
      </Alert>
    );
  }

  return (
    <Stack gap="md">
      <Alert
        variant="light"
        color="green"
        icon={<IconCircleCheck size={20} />}
        title="Medplum compatibility verified"
      >
        Successfully rendered a {state.resource.resourceType} resource using Medplum React components.
      </Alert>
      <MedplumProvider medplum={client}>
        <ResourceTable value={state.resource} />
      </MedplumProvider>
    </Stack>
  );
}
