import { createTheme } from '@mantine/core';

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
  },
  components: {
    Card: { defaultProps: { withBorder: true, radius: 'lg', padding: 'lg' } },
    Table: { defaultProps: { verticalSpacing: 'xs', horizontalSpacing: 'md' } },
    Button: { defaultProps: { size: 'sm', radius: 'md' } },
    Tabs: { defaultProps: { variant: 'pills' } },
  },
});
