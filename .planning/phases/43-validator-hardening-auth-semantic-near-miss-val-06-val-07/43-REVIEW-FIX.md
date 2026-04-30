---
phase: 43-validator-hardening-auth-semantic-near-miss-val-06-val-07
fixed_at: 2026-04-30T12:10:00Z
review_path: .planning/phases/43-validator-hardening-auth-semantic-near-miss-val-06-val-07/43-REVIEW.md
iteration: 1
findings_in_scope: 2
fixed: 2
skipped: 0
status: all_fixed
---

# Phase 43: Code Review Fix Report

**Fixed at:** 2026-04-30T12:10:00Z
**Source review:** .planning/phases/43-validator-hardening-auth-semantic-near-miss-val-06-val-07/43-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 2 (Critical + Warning; 4 Info findings out of scope per fix_scope=critical_warning)
- Fixed: 2
- Skipped: 0

## Fixed Issues

### WR-01: `VALIDATOR_BEARER_TOKEN_KEY` duplicated as a literal in three locations

**Files modified:** `src/components/settings/ValidatorAuthSettingsModal.tsx`, `src/hooks/useConformanceRun.ts`
**Commit:** 20ebb45
**Applied fix:** Imported the exported `VALIDATOR_BEARER_TOKEN_KEY` constant from `src/quality/cascadingValidator.ts` (single source of truth) into both consumers. Removed the duplicate `const VALIDATOR_BEARER_TOKEN_KEY = 'validator.bearerToken.v1'` declaration from `ValidatorAuthSettingsModal.tsx`. Replaced the inline literal at `useConformanceRun.ts:215` with the imported constant. The unrelated `TOKEN_CHANGED_EVENT = 'validator-bearer-token-changed'` const in the modal was left intact (different concern, not flagged). Test files retain their local literals as a regression check that the wire-format key string did not change unintentionally, per REVIEW.md guidance. Display strings in `SettingsPage.tsx` and the modal's `description=` prop also retain the literal because they are user-visible documentation showing where the token is stored.

Verification: TypeScript scoped check clean for both files; 33/33 tests passing in `cascadingValidator.test.ts` + `ValidatorAuthSettingsModal.test.tsx`.

### WR-02: `extSerialized` IIFE reads `localStorage` on every render of `useConformanceRun`

**Files modified:** `src/hooks/useConformanceRun.ts`
**Commit:** 7feb49c
**Applied fix:** Replaced the IIFE with `useMemo(..., [settings, bearerSignatureBump])`. Added `useMemo` to the React import. The token-length read (`window.localStorage.getItem(VALIDATOR_BEARER_TOKEN_KEY)`) stays inside the memo body so it re-evaluates on every memo invalidation; the `bearerSignatureBump` state — already bumped by the `validator-bearer-token-changed` event listener — is the dep that ensures token rotation invalidates the memo and propagates to the downstream `useEffect([extSerialized])` that calls `clearProbeCache`. The T-43-04 mitigation (rotation invalidates probe cache) remains intact because the bump-listener pattern still drives invalidation; the only change is that the localStorage read no longer fires on unrelated re-renders. Added an inline comment documenting the WR-02 rationale and the rotation-signature contract.

Verification: TypeScript scoped check clean; 65/65 tests passing in `src/hooks`; 32/32 tests passing in `cascadingValidator.test.ts` + `ValidationPanel.phi-gate.integration.test.tsx` (the bearer-rotation regression suite — T-43-04 mitigation locked).

## Skipped Issues

None — both in-scope warnings were applied cleanly.

## Out-of-Scope Findings (Info, not addressed)

The following 4 Info findings were not in scope (`fix_scope=critical_warning`). They are documented here for reference; future iterations or manual cleanup can address them:

- **IN-01** — `auth-banner-4` test uses fragile `not.toContain('"a"')` heuristic; recommend swapping to a `leak-canary-*` distinctive credential string.
- **IN-02** — `ResourceIssueTable` row React keys embed page-relative index; recommend absolute row position for stable reconciliation across pagination.
- **IN-03** — `extractCodingsAtPath` documented limitation around FHIRPath `where()` filters; deferred to a future phase per docstring.
- **IN-04** — `walkNearMisses` `totalNodes` accounting comment could be clearer about what it counts.

---

_Fixed: 2026-04-30T12:10:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
