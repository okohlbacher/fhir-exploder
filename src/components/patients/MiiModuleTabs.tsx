import { useState } from 'react';
import { Tabs, Text } from '@mantine/core';
import { MII_MODULES } from '../../utils/mii-modules';
import { ClinicalTimeline } from './ClinicalTimeline';
import { MiiModuleTab } from './MiiModuleTab';

interface MiiModuleTabsProps {
  patientId: string;
}

/**
 * MII Kerndatensatz module tab bar for a patient (D-05).
 *
 * Renders one tab per MII module (Diagnose, Prozedur, Laborbefund,
 * Medikation, Fall, Consent) plus a trailing "Zeitleiste" (Timeline)
 * placeholder that will be replaced in Plan 03 of this phase.
 *
 * Each tab label shows the German module name in semibold and the
 * underlying FHIR resource type in dimmed text below, matching the
 * 03-UI-SPEC Copywriting Contract.
 *
 * Tab panels are kept mounted (Mantine Tabs default + `keepMounted`
 * on panels) so switching tabs does not re-trigger FHIR searches --
 * mitigating Pitfall 4 (tab content re-fetching).
 */
export function MiiModuleTabs({ patientId }: MiiModuleTabsProps) {
  const [activeTab, setActiveTab] = useState<string | null>(MII_MODULES[0].key);

  return (
    <Tabs value={activeTab} onChange={setActiveTab} keepMounted variant="pills">
      <Tabs.List>
        {MII_MODULES.map((mod) => (
          <Tabs.Tab key={mod.key} value={mod.key}>
            <Text fw={600} size="sm">
              {mod.germanLabel}
            </Text>
            <Text size="xs" c="dimmed">
              {mod.fhirResourceType}
            </Text>
          </Tabs.Tab>
        ))}
        <Tabs.Tab value="timeline">
          <Text fw={600} size="sm">
            Zeitleiste
          </Text>
          <Text size="xs" c="dimmed">
            Timeline
          </Text>
        </Tabs.Tab>
      </Tabs.List>

      {MII_MODULES.map((mod) => (
        <Tabs.Panel key={mod.key} value={mod.key} keepMounted>
          <MiiModuleTab module={mod} patientId={patientId} />
        </Tabs.Panel>
      ))}
      <Tabs.Panel value="timeline" keepMounted>
        <ClinicalTimeline patientId={patientId} />
      </Tabs.Panel>
    </Tabs>
  );
}
