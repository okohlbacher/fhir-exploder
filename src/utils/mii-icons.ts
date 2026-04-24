/**
 * ICON_MAP for MII module icon rendering (Phase 34, MII-EXT-11).
 *
 * MiiModule.icon stores a string key (e.g. 'IconRadioactive') rather than
 * a component reference per CONTEXT D-07 + RESEARCH K-03:
 *   - Keeps MII_MODULES JSON-serializable (test fixtures + debugging)
 *   - Avoids cyclic import concerns between data + component layers
 *   - Preserves tree-shaking by explicit named imports in this map
 *
 * All 21 icons are eagerly imported here by name. Tabler's per-icon
 * subpath exports mean the bundle still ships only these 21 icons,
 * not the full 6000+ icon library.
 *
 * Consumers:
 *   - ClinicalTimeline.tsx (14px dot marker)
 *   - MiiModuleTabs.tsx (14px tab subtitle leading)
 *   - DashboardPage.tsx (32px MII tile swatch + 20px Drawer header)
 *
 * Fallback: resolveMiiIcon returns null for missing/undefined keys so
 * consumers render no icon rather than crashing — same pattern as the
 * Phase 33 D-14 swatch fallback.
 */
import {
  IconUser,
  IconBedFlat,
  IconStethoscope,
  IconMedicalCross,
  IconFileCertificate,
  IconFlask,
  IconPill,
  IconRadioactive,
  IconUsersGroup,
  IconPhoto,
  IconClipboardData,
  IconDna,
  IconPuzzle,
  IconMicroscope,
  IconVirus,
  IconTestPipe,
  IconBedFilled,
  IconHeartbeat,
  IconFileDescription,
  IconMoodSmile,
  IconListCheck,
  type IconProps,
} from '@tabler/icons-react';
import type { ComponentType } from 'react';

export const ICON_MAP: Record<string, ComponentType<IconProps>> = {
  // Base 7 (CONTEXT D-08). Three audit §2a names that did not exist as
  // exports in @tabler/icons-react@3.41.x were swapped to UI-SPEC fallback
  // candidates with preserved semantics; see inline comments.
  IconUser,
  IconBedFlat,
  IconStethoscope,
  IconMedicalCross,
  // consent: audit §2a primary 'IconFileSignature' not published in this
  // release of @tabler/icons-react; swapped to IconFileCertificate (same
  // "signed/sealed document" silhouette).
  IconFileCertificate,
  IconFlask,
  IconPill,
  // Extension 14 (audit §2b; UI-SPEC-locked fallbacks applied where the
  // primary pick is not published in @tabler/icons-react@3.41.x).
  IconRadioactive,      // onkologie
  IconUsersGroup,       // mtb
  IconPhoto,            // bildgebung
  IconClipboardData,    // studie
  IconDna,              // molekulargenetik
  IconPuzzle,           // seltene
  IconMicroscope,       // pathologie
  // mikrobiologie: audit §2b primary 'IconBacteria' not published; UI-SPEC
  // documented fallback IconVirus used (polyhedral+spike silhouette; also
  // helps paper §4d HIGH deuteranopia pair vs molekulargenetik/IconDna).
  IconVirus,
  IconTestPipe,         // biobank
  IconBedFilled,        // intensivmedizin
  IconHeartbeat,        // kardiologie
  IconFileDescription,  // dokument
  IconMoodSmile,        // symptom
  // pro: audit §2b primary 'IconQuestionnaire' not published; UI-SPEC
  // documented fallback IconListCheck used (unambiguous linear-list shape;
  // also helps paper §4d MEDIUM-HIGH deuteranopia pair vs seltene/IconPuzzle).
  IconListCheck,
};

/**
 * Resolve a module's `icon` string to a React component.
 *
 * Returns null for undefined, null, empty string, or unknown keys so
 * consumers can gate rendering defensively:
 *
 *   const Icon = resolveMiiIcon(module.icon);
 *   return Icon ? <Icon size={14} /> : null;
 *
 * This intentionally does NOT throw on missing keys — Phase 34's data
 * drop populates all 21 entries, but a future schema evolution that
 * ships a new module without an icon should degrade gracefully.
 */
export function resolveMiiIcon(
  key: string | undefined | null,
): ComponentType<IconProps> | null {
  if (!key) return null;
  return ICON_MAP[key] ?? null;
}
