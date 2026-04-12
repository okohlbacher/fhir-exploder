import type { TerminologyHealth } from './types';

/**
 * Shared status map for sidebar + Settings page. Copy and color tokens
 * are locked by UI-SPEC C-1 / C-2 Copywriting Contract. Keep the label
 * strings prefixed with `Terminology: ` — Settings strips the prefix
 * when rendering inline beneath its own "Status" field label.
 */
export const TERMINOLOGY_STATUS_CONFIG: Record<
  TerminologyHealth,
  { color: string; label: string; pulse: boolean }
> = {
  unknown: { color: '#adb5bd', label: 'Terminology: Checking…', pulse: true },
  ok: { color: '#40c057', label: 'Terminology: Reachable', pulse: false },
  unreachable: { color: '#fa5252', label: 'Terminology: Unreachable', pulse: false },
  'not-configured': {
    color: '#adb5bd',
    label: 'Terminology: Not configured',
    pulse: false,
  },
};
