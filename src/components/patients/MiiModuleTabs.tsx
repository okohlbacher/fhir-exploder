import { useState } from 'react';
import { Tabs, Text } from '@mantine/core';
import { MII_MODULES, fhirResourceTypesOf } from '../../utils/mii-modules';
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
/**
 * Render a module pill label with the German name on top and the FHIR
 * resource type below. Phase 30 UAT-18 revealed that the default
 * `c="dimmed"` subtitle becomes unreadable against the solid indigo
 * background of the active pill; swap the subtitle colour to inherit
 * from the tab when active so it picks up the pill's own text colour.
 */
function TabPillLabel({
  primary,
  secondary,
  active,
}: {
  primary: string;
  secondary: string;
  active: boolean;
}) {
  return (
    <>
      <Text fw={600} size="sm">
        {primary}
      </Text>
      <Text
        size="xs"
        c={active ? 'inherit' : 'dimmed'}
        // Active state uses inherit from the pill (white on indigo,
        // still visible); add a slight opacity to nudge it back toward
        // "secondary text" treatment without killing contrast.
        style={active ? { opacity: 0.85 } : undefined}
      >
        {secondary}
      </Text>
    </>
  );
}

export function MiiModuleTabs({ patientId }: MiiModuleTabsProps) {
  const [activeTab, setActiveTab] = useState<string | null>(MII_MODULES[0].key);

  return (
    <Tabs value={activeTab} onChange={setActiveTab} keepMounted variant="pills">
      <Tabs.List>
        {MII_MODULES.map((mod) => (
          <Tabs.Tab key={mod.key} value={mod.key}>
            <TabPillLabel
              primary={mod.germanLabel}
              secondary={fhirResourceTypesOf(mod).join(' / ')}
              active={activeTab === mod.key}
            />
          </Tabs.Tab>
        ))}
        <Tabs.Tab value="timeline">
          <TabPillLabel
            primary="Zeitleiste"
            secondary="Timeline"
            active={activeTab === 'timeline'}
          />
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
