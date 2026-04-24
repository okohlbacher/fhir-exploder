import { useEffect, useState } from 'react';
import {
  Collapse,
  Group,
  Tabs,
  Text,
  UnstyledButton,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import { MII_MODULES, fhirResourceTypesOf } from '../../utils/mii-modules';
import { resolveMiiIcon } from '../../utils/mii-icons';
import { ClinicalTimeline } from './ClinicalTimeline';
import { MiiModuleTab } from './MiiModuleTab';

interface MiiModuleTabsProps {
  patientId: string;
}

/**
 * MII Kerndatensatz module tab bar for a patient (Phase 33, MII-EXT-04 / MII-EXT-05).
 *
 * Renders the 7 base MII module tabs (Person, Fall, Diagnose, Prozedur,
 * Consent, Laborbefund, Medikation) plus the trailing "Zeitleiste" (Timeline)
 * tab at the top. Any extension modules (`category: 'extension'`) are
 * partitioned out of the main `<Tabs.List>` and rendered inside a Collapse
 * block beneath with their own secondary `<Tabs.List>`. Because the whole
 * component is a SINGLE `<Tabs>` parent, `activeTab` state stays unified
 * across base + extension + timeline.
 *
 * Phase 33 ships the structural partition; `MII_MODULES` contains zero
 * `category: 'extension'` rows today, so the Collapse section is length-
 * guarded and does NOT render. Phase 34 ships the 14 extension module
 * entries that activate the Collapse without any further component change.
 *
 * Collapse state (D-09): session-only via the Mantine `useDisclosure` hook
 * seeded closed — defaults CLOSED, resets on every patient mount. No
 * localStorage. Matches Dashboard MII section's no-persistence convention.
 *
 * Deep-link auto-expand (D-10): when the active tab matches an extension
 * module key (e.g. `/patients/:id?tab=onkologie`), the Collapse opens once
 * via Mantine's default transition. The guard on `!extensionOpened`
 * prevents re-opening if the user manually closes the Collapse while an
 * extension tab is active.
 *
 * Selective `keepMounted` (D-11): base 7 `Tabs.Panel`s and the timeline
 * panel keep `keepMounted` to preserve the v1.4 "no re-fetch on tab switch"
 * property for the most-used tabs. Extension `Tabs.Panel`s OMIT
 * `keepMounted` so only the active extension tab's `Promise.all` fan-out
 * ever fires — bounding Phase 34's concurrent-fetch storm to one extension
 * tab at a time.
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
  iconKey,
}: {
  primary: string;
  secondary: string;
  active: boolean;
  iconKey?: string;
}) {
  // Plan 34-04 MII-EXT-11 render site: 14px leading icon beside the
  // primary German label. Icon inherits the pill's text color via
  // currentColor so active (white) vs inactive (muted) states come for
  // free. Unknown / missing iconKey -> null (no icon rendered).
  const Icon = resolveMiiIcon(iconKey);
  return (
    <>
      <Group gap="xs" wrap="nowrap" align="center">
        {Icon ? <Icon size={14} /> : null}
        <Text fw={600} size="sm">
          {primary}
        </Text>
      </Group>
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
  // Partition once per render. `m.category` is REQUIRED on every module,
  // so the partition is exhaustive: every module falls into exactly one
  // bucket. Phase 33 data has 7 'base' + 0 'extension'; Phase 34 adds 14
  // 'extension' entries.
  const baseModules = MII_MODULES.filter((m) => m.category === 'base');
  const extensionModules = MII_MODULES.filter((m) => m.category === 'extension');

  // Default to the first base module. The `?? null` guards against an
  // empty MII_MODULES array (defensive — never hit in practice since
  // the constant always has ≥ 7 base entries).
  const [activeTab, setActiveTab] = useState<string | null>(
    baseModules[0]?.key ?? null,
  );

  // D-09: session-only Collapse state. No localStorage key. Defaults CLOSED;
  // resets to CLOSED on every MiiModuleTabs mount (patient change).
  const [extensionOpened, { toggle: toggleExtension }] = useDisclosure(false);

  // D-10: deep-link auto-expand. If the URL query param pre-selects an
  // extension tab (e.g. `/patients/:id?tab=onkologie`), open the Collapse
  // once so the active tab is visible. Guard on `!extensionOpened` so
  // manually closing after the auto-expand does NOT re-open on the next
  // effect run.
  useEffect(() => {
    if (
      activeTab &&
      extensionModules.some((m) => m.key === activeTab) &&
      !extensionOpened
    ) {
      toggleExtension();
    }
  }, [activeTab, extensionModules, extensionOpened, toggleExtension]);

  return (
    <Tabs value={activeTab} onChange={setActiveTab} variant="pills">
      {/* Base: existing flat layout unchanged (7 pills + Zeitleiste). */}
      <Tabs.List>
        {baseModules.map((mod) => (
          <Tabs.Tab key={mod.key} value={mod.key}>
            <TabPillLabel
              primary={mod.germanLabel}
              secondary={fhirResourceTypesOf(mod).join(' / ')}
              active={activeTab === mod.key}
              iconKey={mod.icon}
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

      {/* Extension: Collapse below the base row. Length-guarded so Phase 33
          renders nothing (extension partition is structurally present but
          visually empty). Phase 34's data drop flips this on. */}
      {extensionModules.length > 0 && (
        <>
          <UnstyledButton
            onClick={toggleExtension}
            mt="sm"
            aria-expanded={extensionOpened}
          >
            <Group gap="xs">
              {extensionOpened ? (
                <IconChevronDown size={14} />
              ) : (
                <IconChevronRight size={14} />
              )}
              <Text size="sm" c="dimmed">
                Extension modules ({extensionModules.length})
              </Text>
            </Group>
          </UnstyledButton>
          <Collapse in={extensionOpened}>
            {/* Extension tabs live in their own secondary Tabs.List inside
                the Collapse so they only render when the section is
                expanded, sharing the parent Tabs' activeTab state. */}
            <Tabs.List mt="xs">
              {extensionModules.map((mod) => (
                <Tabs.Tab key={mod.key} value={mod.key}>
                  <TabPillLabel
                    primary={mod.germanLabel}
                    secondary={fhirResourceTypesOf(mod).join(' / ')}
                    active={activeTab === mod.key}
                    iconKey={mod.icon}
                  />
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Collapse>
        </>
      )}

      {/* Panels: D-11 selective keepMounted. Base 7 + timeline retain it so
          tab switches among the most-used tabs never re-fetch. Extension
          panels OMIT keepMounted so only the active extension tab's
          Promise.all fan-out is mounted at a time — capping the concurrent
          FHIR-fetch storm Phase 34's 14 modules would otherwise introduce. */}
      {baseModules.map((mod) => (
        <Tabs.Panel key={mod.key} value={mod.key} keepMounted>
          <MiiModuleTab module={mod} patientId={patientId} />
        </Tabs.Panel>
      ))}
      {extensionModules.map((mod) => (
        <Tabs.Panel key={mod.key} value={mod.key}>
          <MiiModuleTab module={mod} patientId={patientId} />
        </Tabs.Panel>
      ))}
      <Tabs.Panel value="timeline" keepMounted>
        <ClinicalTimeline patientId={patientId} />
      </Tabs.Panel>
    </Tabs>
  );
}
