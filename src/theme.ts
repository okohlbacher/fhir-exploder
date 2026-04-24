import { createTheme, type MantineColorsTuple } from '@mantine/core';

/**
 * FHIR Exploder theme — Phase 30 layout redesign.
 *
 * Derived from the handoff at
 * `.planning/phases/30-layout-redesign/handoff/INSTRUCTIONS.md` (Step 0).
 * Runtime design tokens live in `src/styles/tokens.css` and are imported once
 * at app entry (`src/main.tsx`). Mantine reads its palette from this object;
 * component styles can pick up `var(--font-mono)`, `var(--accent)`, etc.
 *
 * Font loading: IBM Plex Sans / Mono are fetched from Google Fonts via a
 * `<link>` in `index.html`. Falls back to ui-sans-serif / ui-monospace if the
 * CDN is unreachable (e.g. offline local-first use).
 */

// MII extension module palette (Phase 34, MII-EXT-10, CONTEXT D-04).
// Names locked by ROADMAP — DO NOT rename (oncology, imaging, genetics,
// pathology, bioanalysis, administration, patient-reported).
// Seed hexes chosen + contrast-audited in
// .planning/research/color-design-audit.md §3a. Shade 6 is the primary render
// shade (primaryShade: 6); shade 1 is reserved for hover washes (audit-locked
// hex values used verbatim). Base 7 Mantine color tokens (blue, indigo, teal,
// violet, pink, cyan, orange) are UNCHANGED — they resolve to Mantine's stock
// palette at runtime.
//
// Full 10-shade arrays generated from each shade-6 seed via the Mantine
// Colors Generator algorithm (HSL lightness ladder around shade 6, monotonic
// decrease for shades 7/8/9). All 7 palettes clear WCAG AA per audit §3b.
const oncology: MantineColorsTuple = [
  '#f6f1f1',
  '#ffe3e3',
  '#e9c2c2',
  '#e19797',
  '#da6a6a',
  '#d64545',
  '#c92a2a',
  '#a31f1f',
  '#861818',
  '#681212',
];
const imaging: MantineColorsTuple = [
  '#b0cfd4',
  '#e3fafc',
  '#6ccadb',
  '#37c3dd',
  '#19adc9',
  '#1091a9',
  '#0b7285',
  '#075d6c',
  '#054c59',
  '#033b45',
];
const genetics: MantineColorsTuple = [
  '#f2edf3',
  '#f8f0fc',
  '#dcc0e3',
  '#cb97d8',
  '#bb6ece',
  '#b04cc8',
  '#9c36b5',
  '#7e2993',
  '#672178',
  '#50185d',
];
const pathology: MantineColorsTuple = [
  '#f6f6f9',
  '#edf2ff',
  '#d6ceee',
  '#b4a4e5',
  '#9177de',
  '#714eda',
  '#6741d9',
  '#4a23bf',
  '#3b1b9c',
  '#2d1479',
];
const bioanalysis: MantineColorsTuple = [
  '#a0ccbf',
  '#e6fcf5',
  '#57d8b1',
  '#22daa2',
  '#14b584',
  '#0c956b',
  '#087050',
  '#055b41',
  '#034b35',
  '#023a29',
];
const administration: MantineColorsTuple = [
  '#f6f6f9',
  '#e7f5ff',
  '#cdd4ee',
  '#a2b0e6',
  '#758be0',
  '#4c68dc',
  '#3b5bdb',
  '#1f3fbf',
  '#18339c',
  '#122679',
];
const patientReported: MantineColorsTuple = [
  '#f2eaed',
  '#fff0f6',
  '#e7b8c8',
  '#e08ca9',
  '#da5f8a',
  '#d73970',
  '#c2255c',
  '#9e1b49',
  '#81153b',
  '#640f2d',
];

export const theme = createTheme({
  fontFamily: '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif',
  fontFamilyMonospace: '"IBM Plex Mono", ui-monospace, monospace',
  primaryColor: 'indigo',
  primaryShade: 6,
  defaultRadius: 'md',
  radius: { sm: '4px', md: '6px', lg: '10px' },
  colors: {
    // Keep Mantine's indigo; override greys with warm neutrals (tokens.css
    // exposes the same ramp as CSS vars for non-Mantine components).
    gray: [
      '#fafaf8',
      '#f5f4f1',
      '#ecebe7',
      '#dedcd6',
      '#c5c3bc',
      '#9a9791',
      '#6e6b66',
      '#504d48',
      '#35332f',
      '#1c1b18',
    ],
    // Phase 34 MII extension module palettes (MII-EXT-10 / CONTEXT D-04).
    // Kebab-case theme.colors key uses camelCase const per RESEARCH K-01.
    oncology,
    imaging,
    genetics,
    pathology,
    bioanalysis,
    administration,
    'patient-reported': patientReported,
  },
  components: {
    Card: { defaultProps: { withBorder: true, radius: 'lg', padding: 'lg' } },
    Table: { defaultProps: { verticalSpacing: 'xs', horizontalSpacing: 'md' } },
    Button: { defaultProps: { size: 'sm', radius: 'md' } },
    Tabs: { defaultProps: { variant: 'pills' } },
  },
});
