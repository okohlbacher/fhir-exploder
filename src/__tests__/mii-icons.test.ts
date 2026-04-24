import { describe, it, expect } from 'vitest';
import { ICON_MAP, resolveMiiIcon } from '../utils/mii-icons';
import { IconRadioactive, IconUser } from '@tabler/icons-react';

describe('ICON_MAP (MII-EXT-11)', () => {
  // UI-SPEC-documented fallbacks applied for 3 audit §2a/§2b primaries that
  // are not published in @tabler/icons-react@3.41.x:
  //   consent       : IconFileSignature → IconFileCertificate
  //   mikrobiologie : IconBacteria      → IconVirus
  //   pro           : IconQuestionnaire → IconListCheck
  const EXPECTED_KEYS = [
    // Base 7
    'IconUser',
    'IconBedFlat',
    'IconStethoscope',
    'IconMedicalCross',
    'IconFileCertificate',
    'IconFlask',
    'IconPill',
    // Extension 14
    'IconRadioactive',
    'IconUsersGroup',
    'IconPhoto',
    'IconClipboardData',
    'IconDna',
    'IconPuzzle',
    'IconMicroscope',
    'IconVirus',
    'IconTestPipe',
    'IconBedFilled',
    'IconHeartbeat',
    'IconFileDescription',
    'IconMoodSmile',
    'IconListCheck',
  ] as const;

  it('exports exactly 21 icon keys (7 base + 14 extension)', () => {
    expect(Object.keys(ICON_MAP)).toHaveLength(21);
  });

  it.each(EXPECTED_KEYS)('ICON_MAP has key "%s"', (key) => {
    expect(ICON_MAP[key]).toBeDefined();
    // Tabler icons are forwardRef components; typeof is 'object' (forwardRef)
    // or 'function' depending on the icon wrapping — accept both.
    const t = typeof ICON_MAP[key];
    expect(t === 'object' || t === 'function').toBe(true);
  });

  it('ICON_MAP["IconRadioactive"] === the direct @tabler/icons-react import (no typo)', () => {
    expect(ICON_MAP['IconRadioactive']).toBe(IconRadioactive);
    expect(ICON_MAP['IconUser']).toBe(IconUser);
  });
});

describe('resolveMiiIcon (MII-EXT-11)', () => {
  it('returns the component for known keys', () => {
    expect(resolveMiiIcon('IconUser')).toBe(IconUser);
    expect(resolveMiiIcon('IconRadioactive')).toBe(IconRadioactive);
  });

  it('returns null for undefined', () => {
    expect(resolveMiiIcon(undefined)).toBeNull();
  });

  it('returns null for null', () => {
    expect(resolveMiiIcon(null)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(resolveMiiIcon('')).toBeNull();
  });

  it('returns null for unknown keys (defensive — no crash)', () => {
    expect(resolveMiiIcon('IconDoesNotExist')).toBeNull();
    expect(resolveMiiIcon('NotAnIcon')).toBeNull();
  });
});
