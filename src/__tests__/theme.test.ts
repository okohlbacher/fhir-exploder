import { describe, it, expect } from 'vitest';
import { theme } from '../theme';

describe('theme palette (Phase 34 MII-EXT-10)', () => {
  const NEW_PALETTE_KEYS = [
    'oncology',
    'imaging',
    'genetics',
    'pathology',
    'bioanalysis',
    'administration',
    'patient-reported',
  ] as const;

  const BASE_MANTINE_COLORS = [
    'blue', 'indigo', 'teal', 'violet', 'pink', 'cyan', 'orange',
  ] as const;

  it('theme.colors contains the 7 new MII extension palette keys', () => {
    const keys = Object.keys(theme.colors ?? {});
    expect(keys).toEqual(
      expect.arrayContaining(['gray', ...NEW_PALETTE_KEYS]),
    );
  });

  it.each(NEW_PALETTE_KEYS)('palette "%s" has exactly 10 shades (MantineColorsTuple contract)', (key) => {
    const tuple = theme.colors?.[key];
    expect(tuple).toBeDefined();
    expect(Array.isArray(tuple)).toBe(true);
    expect(tuple).toHaveLength(10);
  });

  it.each(NEW_PALETTE_KEYS)('palette "%s" shade-6 is a valid 7-char hex string', (key) => {
    const tuple = theme.colors?.[key];
    expect(tuple).toBeDefined();
    const shade6 = tuple![6];
    expect(shade6).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it.each(BASE_MANTINE_COLORS)('base Mantine color "%s" is NOT overridden in theme.colors (UNCHANGED invariant)', (color) => {
    // Per CONTEXT D-04: base 7 colors stay as Mantine defaults — not renamed,
    // not overridden. `theme.colors.blue` should be undefined (Mantine fills
    // from its built-in palette at runtime).
    expect(theme.colors?.[color]).toBeUndefined();
  });
});
