/**
 * deuteranopia.test.tsx — Phase 40 / DEUT-01 color-vision discriminability gate.
 *
 * Headless deuteranopia simulation under Vitest: applies the Machado 2009
 * matrix at severity 1.0 to all 21 MII module adjacent pairs and asserts
 * ΔE2000 perceptual distance ≥ MIN_DELTA_E_DEUTERANOPIA (5.0) on the 13
 * cross-family pairs. Within-family pairs (8 of 21) share badgeColor by
 * Phase 33 D-09 design invariant — they are documented as exempt from the
 * color-only gate; their disambiguation is delivered by icon shape per the
 * paper analysis in `.planning/research/color-design-audit.md` §4b.
 *
 * **OUT OF SCOPE.** This test asserts color-only discriminability. Icon-shape
 * discriminability is intentionally NOT covered — paper analysis in
 * `.planning/research/color-design-audit.md` §4b/§4c remains authoritative
 * for icon claims (see Phase 40 CONTEXT D-07).
 *
 * **Sources cited:**
 * - Machado et al. 2009, "A Physiologically-based Model for Simulation of
 *   Color Vision Deficiency", IEEE TVCG 15(6), DOI 10.1109/TVCG.2009.113.
 *   Matrix at severity 1.0 (full deuteranopia) per Phase 40 CONTEXT D-02.
 * - Sharma et al. 2005, "The CIEDE2000 color-difference formula:
 *   Implementation notes, supplementary test data, and mathematical
 *   observations", Color Research and Application 30(1), 21-30.
 * - `.planning/milestones/v1.5-phases/37-phase-34-uat-empirical-capture-deuteranopia-tti/37-EMPIRICAL.md`
 *   §1+§2 — authoritative ordered 21-pair list.
 *
 * **Pair scope (21 = 7 §1 + 14 §2):**
 *   §1 within-family (7 pairs): same badgeColor, different icon shape. By
 *   Phase 33 D-09 invariant they share a palette family — color-only ΔE2000
 *   would be 0. Documented as exempt; icon-shape paper analysis stands.
 *   §2 cross-family (14 pairs): final tab-order adjacency. 13 are color-gated
 *   at ΔE2000 ≥ 5.0; pair #16 in PAIRS (mtb ↔ onkologie, EMPIRICAL.md §2 row 9)
 *   is also within-family by badgeColor (both `oncology`) and is therefore
 *   marked `withinFamily: true` and exempted.
 *
 * **Borderline pairs (named it() blocks for failure attribution):**
 *   - PAIRS.id 14: mikrobiologie ↔ molekulargenetik (EMPIRICAL.md §2 row 7,
 *     paper risk: HIGH — pathology-violet vs genetics-grape both shift
 *     bluish-purple under deuteranopia).
 *   - PAIRS.id 19: pro ↔ seltene (EMPIRICAL.md §2 row 12, paper risk:
 *     MEDIUM-HIGH — patient-reported-pink vs genetics-grape).
 *
 * The other 11 cross-family pairs run under a single `it.each(otherCrossFamily)`
 * block with the failure message embedding the pair label and measured ΔE2000.
 */

/* eslint-disable @typescript-eslint/no-magic-numbers */

import { describe, it, expect } from 'vitest';

import {
  MIN_DELTA_E_DEUTERANOPIA,
  deltaE2000,
  simulateDeuteranopia,
  srgbToLab,
} from '../../utils/colorVision';
import { MII_MODULES } from '../../utils/mii-modules';
import { theme } from '../../theme';

/**
 * Mantine v8 stock palette shade-6 hex values for base-7 modules.
 *
 * Cannot be read at runtime from `theme.colors` — Mantine resolves stock
 * palettes (blue, indigo, teal, violet, pink, cyan, orange) internally;
 * `theme.colors` only contains the 7 custom MII palettes. The hex values
 * below are locked from Mantine v8 source. If Mantine 9 ships in a later
 * phase, regenerate from `@mantine/core` internals.
 */
const BASE_MANTINE_SHADE_6: Record<string, string> = {
  blue: '#228be6',
  indigo: '#4c6ef5',
  teal: '#12b886',
  violet: '#7950f2',
  pink: '#e64980',
  cyan: '#15aabf',
  orange: '#fd7e14',
};

/**
 * Resolve a module's `badgeColor` token to its rendered shade-6 hex.
 *
 * Custom palettes (oncology, imaging, genetics, pathology, bioanalysis,
 * administration, patient-reported) live in `theme.colors`; base palettes
 * are looked up in `BASE_MANTINE_SHADE_6` above.
 */
function getModuleShade6Hex(badgeColor: string): string {
  if (badgeColor in BASE_MANTINE_SHADE_6) {
    return BASE_MANTINE_SHADE_6[badgeColor];
  }
  const tuple = (theme.colors as Record<string, readonly string[] | undefined>)[
    badgeColor
  ];
  if (tuple === undefined) {
    throw new Error(
      `getModuleShade6Hex: badgeColor '${badgeColor}' is neither a base ` +
        `Mantine token nor a key in theme.colors. Update BASE_MANTINE_SHADE_6 ` +
        `or theme.colors before adding new modules.`,
    );
  }
  // shade index 6 = primaryShade per theme.ts.
  const hex = tuple[6];
  if (typeof hex !== 'string') {
    throw new Error(
      `getModuleShade6Hex: theme.colors['${badgeColor}'][6] is not a string`,
    );
  }
  return hex;
}

/**
 * Parse a `#rrggbb` hex string to an integer RGB triple.
 *
 * Throws on invalid input. Used to bridge Mantine palette tokens (hex strings)
 * to the integer-RGB inputs that `simulateDeuteranopia` and `srgbToLab` expect.
 */
function hexToRgb(hex: string): [number, number, number] {
  const match = /^#([0-9a-fA-F]{6})$/.exec(hex);
  if (match === null) {
    throw new Error(`hexToRgb: '${hex}' is not a #rrggbb string`);
  }
  const v = parseInt(match[1], 16);
  return [(v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff];
}

type Pair = {
  /** Contiguous fixture id (1..21) — independent of EMPIRICAL.md §2 row. */
  id: number;
  /** Source section in 37-EMPIRICAL.md (§1 within-family, §2 cross-family). */
  section: '§1' | '§2';
  /** Human-readable label, e.g. 'mikrobiologie ↔ molekulargenetik'. */
  label: string;
  moduleAKey: string;
  moduleBKey: string;
  /**
   * True if both modules share the same Mantine `badgeColor` token (color
   * collision by Phase 33 D-09 design invariant — disambiguation by icon
   * shape, not color). Exempts the pair from the ΔE2000 ≥ 5.0 gate per D-07.
   */
  withinFamily: boolean;
};

/**
 * 21 adjacent MII module pairs from 37-EMPIRICAL.md §1 + §2.
 *
 * Ordering invariant: ids 1..21 contiguous; §1 (within-family) ids 1..7
 * mirror EMPIRICAL.md §1 rows 1..7; §2 (cross-family) ids 8..21 mirror
 * EMPIRICAL.md §2 rows 1..14 in declaration order.
 *
 * Pair-id mapping (§2 row → PAIRS.id): row N → id 7+N. So:
 *   §2 row 7  (mikrobiologie ↔ molekulargenetik, HIGH)         = PAIRS.id 14
 *   §2 row 9  (mtb ↔ onkologie, both oncology family)          = PAIRS.id 16
 *   §2 row 12 (pro ↔ seltene, MEDIUM-HIGH)                     = PAIRS.id 19
 *
 * Pair #16 (mtb ↔ onkologie) is in §2 by tab-adjacency but its color pair
 * behaves like §1 (both `oncology` badgeColor); marked `withinFamily: true`.
 */
const PAIRS: readonly Pair[] = [
  // §1 within-family (7 pairs — share badgeColor by D-09 design invariant)
  { id: 1, section: '§1', label: 'onkologie ↔ mtb', moduleAKey: 'onkologie', moduleBKey: 'mtb', withinFamily: true },
  { id: 2, section: '§1', label: 'bildgebung ↔ studie', moduleAKey: 'bildgebung', moduleBKey: 'studie', withinFamily: true },
  { id: 3, section: '§1', label: 'molekulargenetik ↔ seltene', moduleAKey: 'molekulargenetik', moduleBKey: 'seltene', withinFamily: true },
  { id: 4, section: '§1', label: 'pathologie ↔ mikrobiologie', moduleAKey: 'pathologie', moduleBKey: 'mikrobiologie', withinFamily: true },
  { id: 5, section: '§1', label: 'biobank ↔ intensivmedizin', moduleAKey: 'biobank', moduleBKey: 'intensivmedizin', withinFamily: true },
  { id: 6, section: '§1', label: 'kardiologie ↔ dokument', moduleAKey: 'kardiologie', moduleBKey: 'dokument', withinFamily: true },
  { id: 7, section: '§1', label: 'symptom ↔ pro', moduleAKey: 'symptom', moduleBKey: 'pro', withinFamily: true },
  // §2 cross-family (14 pairs — final tab order, EMPIRICAL.md §2 rows 1..14)
  { id: 8, section: '§2', label: 'medikation ↔ bildgebung', moduleAKey: 'medikation', moduleBKey: 'bildgebung', withinFamily: false },
  { id: 9, section: '§2', label: 'bildgebung ↔ biobank', moduleAKey: 'bildgebung', moduleBKey: 'biobank', withinFamily: false },
  { id: 10, section: '§2', label: 'biobank ↔ dokument', moduleAKey: 'biobank', moduleBKey: 'dokument', withinFamily: false },
  { id: 11, section: '§2', label: 'dokument ↔ intensivmedizin', moduleAKey: 'dokument', moduleBKey: 'intensivmedizin', withinFamily: false },
  { id: 12, section: '§2', label: 'intensivmedizin ↔ kardiologie', moduleAKey: 'intensivmedizin', moduleBKey: 'kardiologie', withinFamily: false },
  { id: 13, section: '§2', label: 'kardiologie ↔ mikrobiologie', moduleAKey: 'kardiologie', moduleBKey: 'mikrobiologie', withinFamily: false },
  { id: 14, section: '§2', label: 'mikrobiologie ↔ molekulargenetik', moduleAKey: 'mikrobiologie', moduleBKey: 'molekulargenetik', withinFamily: false }, // BORDERLINE #7 (HIGH risk)
  { id: 15, section: '§2', label: 'molekulargenetik ↔ mtb', moduleAKey: 'molekulargenetik', moduleBKey: 'mtb', withinFamily: false },
  { id: 16, section: '§2', label: 'mtb ↔ onkologie', moduleAKey: 'mtb', moduleBKey: 'onkologie', withinFamily: true }, // both oncology family
  { id: 17, section: '§2', label: 'onkologie ↔ pathologie', moduleAKey: 'onkologie', moduleBKey: 'pathologie', withinFamily: false },
  { id: 18, section: '§2', label: 'pathologie ↔ pro', moduleAKey: 'pathologie', moduleBKey: 'pro', withinFamily: false },
  { id: 19, section: '§2', label: 'pro ↔ seltene', moduleAKey: 'pro', moduleBKey: 'seltene', withinFamily: false }, // BORDERLINE #12 (MEDIUM-HIGH risk)
  { id: 20, section: '§2', label: 'seltene ↔ studie', moduleAKey: 'seltene', moduleBKey: 'studie', withinFamily: false },
  { id: 21, section: '§2', label: 'studie ↔ symptom', moduleAKey: 'studie', moduleBKey: 'symptom', withinFamily: false },
] as const;

describe('Phase 40 / DEUT-01 — PAIRS fixture sanity checks', () => {
  it('PAIRS contains exactly 21 entries', () => {
    expect(PAIRS).toHaveLength(21);
  });

  it('PAIRS ids are unique 1..21', () => {
    const ids = PAIRS.map((p) => p.id);
    expect(new Set(ids).size).toBe(21);
    expect(Math.min(...ids)).toBe(1);
    expect(Math.max(...ids)).toBe(21);
  });

  it('every moduleAKey + moduleBKey resolves in MII_MODULES (no typos)', () => {
    const keys = new Set(MII_MODULES.map((m) => m.key));
    for (const pair of PAIRS) {
      expect(keys.has(pair.moduleAKey), `pair #${pair.id} ${pair.label}: moduleAKey '${pair.moduleAKey}' not in MII_MODULES`).toBe(true);
      expect(keys.has(pair.moduleBKey), `pair #${pair.id} ${pair.label}: moduleBKey '${pair.moduleBKey}' not in MII_MODULES`).toBe(true);
    }
  });

  it("getModuleShade6Hex resolves mikrobiologie → '#6741d9' (pathology shade-6 per primaryShade=6)", () => {
    // theme.ts pathology tuple index 6 is '#6741d9' (not '#714eda' which is
    // index 5). The plan's <interfaces> block called out `#714eda` based on
    // a colloquial "shade-6 region" reading; the actual shade-6 per
    // `primaryShade: 6` in createTheme() is '#6741d9'. Locked to the runtime
    // behavior of theme.ts so any palette refactor surfaces here.
    const mod = MII_MODULES.find((m) => m.key === 'mikrobiologie');
    expect(mod).toBeDefined();
    expect(getModuleShade6Hex(mod!.badgeColor)).toBe('#6741d9');
  });

  it("getModuleShade6Hex resolves person → '#228be6' (Mantine blue shade-6)", () => {
    const mod = MII_MODULES.find((m) => m.key === 'person');
    expect(mod).toBeDefined();
    expect(getModuleShade6Hex(mod!.badgeColor)).toBe('#228be6');
  });

  it('hexToRgb parses #714eda correctly', () => {
    expect(hexToRgb('#714eda')).toEqual([113, 78, 218]);
  });

  it('pair #14 is mikrobiologie ↔ molekulargenetik (BORDERLINE #7 — HIGH risk per EMPIRICAL.md §2 row 7)', () => {
    const pair = PAIRS.find((p) => p.id === 14);
    expect(pair).toBeDefined();
    expect(pair!.label).toContain('mikrobiologie ↔ molekulargenetik');
    expect(pair!.withinFamily).toBe(false);
  });

  it('pair #19 is pro ↔ seltene (BORDERLINE #12 — MEDIUM-HIGH risk per EMPIRICAL.md §2 row 12)', () => {
    const pair = PAIRS.find((p) => p.id === 19);
    expect(pair).toBeDefined();
    expect(pair!.label).toContain('pro ↔ seltene');
    expect(pair!.withinFamily).toBe(false);
  });

  it('within-family count is 8 (7 §1 entries + pair #16 mtb ↔ onkologie)', () => {
    const within = PAIRS.filter((p) => p.withinFamily);
    expect(within).toHaveLength(8);
  });

  it('cross-family count is 13 (14 §2 entries minus pair #16 mtb ↔ onkologie)', () => {
    const cross = PAIRS.filter((p) => !p.withinFamily);
    expect(cross).toHaveLength(13);
  });
});

// Re-export internal helpers for Task 4+5 to use (they extend this file).
// The export-via-test-file convention is used here because Vitest auto-discovers
// .test.tsx; keeping helpers private to the file avoids leaking PAIRS into the
// production bundle.
export { PAIRS, getModuleShade6Hex, hexToRgb, BASE_MANTINE_SHADE_6 };
export type { Pair };

// Touch deltaE2000 + simulateDeuteranopia + srgbToLab + MIN_DELTA_E_DEUTERANOPIA
// imports so Task 3 doesn't trigger lint warnings about unused imports while
// Task 4 (which uses them) is still pending. Task 4 wires the actual assertions.
void deltaE2000;
void simulateDeuteranopia;
void srgbToLab;
void MIN_DELTA_E_DEUTERANOPIA;
