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
import {
  EmptyExtensionsProvider,
  useEmptyExtensionsCoordinator,
} from '../../hooks/useEmptyExtensionsCoordinator';
import { useMiiExtensionCounts } from '../../hooks/useMiiExtensionCounts';
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
  count,
  isEmpty,
}: {
  primary: string;
  secondary: string;
  active: boolean;
  iconKey?: string;
  // Phase 42 (MII-EXT-15): both optional so base 7 callers don't change
  // (D-04 base exemption). `count===undefined` → no `(N)` suffix and no
  // testid (matches D-03 no-placeholder contract). `isEmpty` is the
  // resolved `count===0` flag; only true once the per-module fan-out
  // resolves to zero.
  count?: number;
  isEmpty?: boolean;
}) {
  // Plan 34-04 MII-EXT-11 render site: 14px leading icon beside the
  // primary German label. Icon inherits the pill's text color via
  // currentColor so active (white) vs inactive (muted) states come for
  // free. Unknown / missing iconKey -> null (no icon rendered).
  const Icon = resolveMiiIcon(iconKey);
  // Phase 42 D-01: append `(${count})` once the count resolves; while it
  // is undefined (still fetching) render the bare label per D-03.
  const primaryWithCount =
    count !== undefined ? `${primary} (${count})` : primary;
  // Phase 42 D-06 + Pitfall #5: dim the OUTER content `<div>`, NOT the
  // surrounding `<Tabs.Tab>`. Mantine 8's active-pill background indicator
  // stacks under <Tabs.Tab>'s style; opacity on the tab dims the active
  // indicator on a clicked-into 0-count tab. Mirroring MiiModuleTab.tsx
  // line 143 `style={{ opacity: 0.55 }}` on inner content keeps the
  // active indicator fully visible while still dimming the label text.
  // The fragment <></> is replaced by a single host <div> so we have a
  // stable element for `data-testid`, `data-empty`, and the conditional
  // opacity style.
  return (
    <div
      // Phase 42 D-04: only the EXTENSION render site passes `count`,
      // so the testid is present only there. Base 7 + Zeitleiste pass
      // no count → no testid (silent default of `undefined`).
      data-testid={count !== undefined ? 'extension-tab-pill' : undefined}
      data-empty={isEmpty ? 'true' : 'false'}
      style={isEmpty ? { opacity: 0.55 } : undefined}
    >
      <Group gap="xs" wrap="nowrap" align="center">
        {Icon ? <Icon size={14} /> : null}
        <Text fw={600} size="sm">
          {primaryWithCount}
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
    </div>
  );
}

export function MiiModuleTabs({ patientId }: MiiModuleTabsProps) {
  // Mount the EmptyExtensionsProvider keyed on patientId so the
  // per-patient hide-empty toggle + per-(patientId, moduleKey) emptiness
  // signals from MiiModuleTab children (Plan 34-05) hydrate at the right
  // scope. Re-keying on patient change forces a fresh subtree (and a
  // fresh emptyMap) when the user navigates to a different patient.
  return (
    <EmptyExtensionsProvider key={patientId} patientId={patientId}>
      <MiiModuleTabsInner patientId={patientId} />
    </EmptyExtensionsProvider>
  );
}

function MiiModuleTabsInner({ patientId }: MiiModuleTabsProps) {
  // Partition once per render. `m.category` is REQUIRED on every module,
  // so the partition is exhaustive: every module falls into exactly one
  // bucket. Phase 33 data has 7 'base' + 0 'extension'; Phase 34 adds 14
  // 'extension' entries.
  const baseModules = MII_MODULES.filter((m) => m.category === 'base');
  const extensionModules = MII_MODULES.filter((m) => m.category === 'extension');

  // Plan 34-05: per-patient hide-empties state from the coordinator.
  const { hideEmpty, setHideEmpty, emptyCount, emptyModuleKeys } =
    useEmptyExtensionsCoordinator();

  // Phase 42 (MII-EXT-15): pre-probe extension-module counts. Hook is
  // called HERE — INSIDE EmptyExtensionsProvider (line 109) — so its
  // internal useEmptyExtensionsCoordinator() call resolves to the real
  // (non-no-op) reportEmptiness callback. Calling from the outer
  // MiiModuleTabs would silently use the no-op fallback (lines 143-153
  // of useEmptyExtensionsCoordinator.tsx) and reportEmptiness would do
  // nothing — Pitfall #1.
  const extensionCounts = useMiiExtensionCounts(patientId);

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

  // Plan 34-05: when hideEmpty is true, filter empty extension modules OUT
  // of the pill list. Panels still render unconditionally below (Phase 33
  // D-11 invariant: extension panels OMIT keepMounted, so only the active
  // one is mounted at any time — filtering pills doesn't unmount anything
  // that wasn't already dormant). We do NOT filter Tabs.Panel registrations
  // because the parent Tabs control needs every value to resolve activeTab.
  const visibleExtensionModules = hideEmpty
    ? extensionModules.filter((m) => !emptyModuleKeys.includes(m.key))
    : extensionModules;

  return (
    // Plan 34-05 (Rule 3 fix to make D-11 actually work): Mantine's <Tabs>
    // root component defaults `keepMounted: true`, which OR-overrides every
    // child <Tabs.Panel keepMounted={false}>. Phase 33 D-11 intended to
    // lazy-mount extension panels by omitting `keepMounted` on them, but
    // because the root default is `true`, that omission is a no-op — all
    // 14 extension panels mount eagerly. Forcing `keepMounted={false}` at
    // the root restores per-panel opt-in semantics: base 7 + Timeline
    // continue to opt in (their <Tabs.Panel keepMounted> declarations
    // below), extension panels (no keepMounted prop) lazy-mount as
    // intended. This is the prerequisite for the visited-and-empty count
    // contract in Plan 34-05.
    <Tabs value={activeTab} onChange={setActiveTab} variant="pills" keepMounted={false}>
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
          <Group gap="md" mt="sm" align="center">
            <UnstyledButton
              onClick={toggleExtension}
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

            {/* Plan 34-05 (D-18): Hide/Show N empty modules toggle.
                Label flips based on current state; N counts only
                visited-and-empty extensions (Option B of RESEARCH §Plan
                34-05 — the publisher pattern preserves Phase 33 D-11
                lazy-mount). Hidden entirely when emptyCount === 0. */}
            {emptyCount > 0 && (
              <UnstyledButton
                onClick={() => setHideEmpty(!hideEmpty)}
                aria-pressed={hideEmpty}
              >
                <Text size="xs" c="dimmed" style={{ textDecoration: 'underline' }}>
                  {hideEmpty
                    ? `Show ${emptyCount} empty modules`
                    : `Hide ${emptyCount} empty modules`}
                </Text>
              </UnstyledButton>
            )}
          </Group>

          <Collapse in={extensionOpened}>
            {/* Extension tabs live in their own secondary Tabs.List inside
                the Collapse so they only render when the section is
                expanded, sharing the parent Tabs' activeTab state.
                Plan 34-05: render `visibleExtensionModules` (== extensionModules
                when hideEmpty=false; filtered subset otherwise). */}
            <Tabs.List mt="xs">
              {visibleExtensionModules.map((mod) => {
                // Phase 42 D-01 + D-06: per-module count from the pre-probe.
                // `count` is `undefined` while fetching; once resolved, a
                // count of 0 flips `isEmpty` true so the pill content dims.
                const count = extensionCounts[mod.key];
                const isEmpty = count === 0;
                return (
                  <Tabs.Tab key={mod.key} value={mod.key}>
                    <TabPillLabel
                      primary={mod.germanLabel}
                      secondary={fhirResourceTypesOf(mod).join(' / ')}
                      active={activeTab === mod.key}
                      iconKey={mod.icon}
                      count={count}
                      isEmpty={isEmpty}
                    />
                  </Tabs.Tab>
                );
              })}
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
