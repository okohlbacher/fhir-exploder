---
phase: 43-validator-hardening-auth-semantic-near-miss-val-06-val-07
reviewed: 2026-04-30T00:00:00Z
depth: standard
files_reviewed: 20
files_reviewed_list:
  - public/settings.yaml
  - src/components/quality/ResourceIssueTable.tsx
  - src/components/quality/ValidationPanel.tsx
  - src/components/quality/__tests__/ResourceIssueTable.test.tsx
  - src/components/quality/__tests__/ValidationPanel.phi-gate.integration.test.tsx
  - src/components/quality/__tests__/ValidationPanel.test.tsx
  - src/components/settings/SettingsPage.tsx
  - src/components/settings/ValidatorAuthSettingsModal.tsx
  - src/components/settings/__tests__/ValidatorAuthSettingsModal.test.tsx
  - src/config/__tests__/settings.test.ts
  - src/config/settings.ts
  - src/config/types.ts
  - src/hooks/useConformanceRun.ts
  - src/quality/__tests__/cascadingValidator.test.ts
  - src/quality/__tests__/normalizers.test.ts
  - src/quality/__tests__/semanticNearMissWalker.test.ts
  - src/quality/cascadingValidator.ts
  - src/quality/normalizers.ts
  - src/quality/semanticNearMissWalker.ts
  - src/quality/types.ts
findings:
  critical: 0
  warning: 2
  info: 4
  total: 6
status: issues_found
---

# Phase 43: Code Review Report

**Reviewed:** 2026-04-30T00:00:00Z
**Depth:** standard
**Files Reviewed:** 20
**Status:** issues_found

## Summary

Phase 43 implements VAL-06 (HTTP authentication for the external validator cascade) and VAL-07 (semantic near-miss "Did you mean?" suggestions). The implementation is high quality — all phase-specific invariants are upheld:

- **PHI gate ordering invariant** holds: `isPhiAcknowledged()` runs first; Authorization header build is sandwiched between the gate and `AbortController` allocation. Tests 22 (unit) and D/E (integration) lock the ordering.
- **Bearer token isolation** holds: `validator.bearerToken.v1` appears only in `cascadingValidator.ts`, `useConformanceRun.ts` (length read for cache-invalidation), `ValidatorAuthSettingsModal.tsx`, `SettingsPage.tsx` (display label), and tests. NOT in `types.ts`, `settings.ts`, or `public/settings.yaml`.
- **Credential leak vectors** are sealed: the `notify()` payload type explicitly excludes credential fields; the Authorization header is a local in `tryExternal`, never attached to objects that cross the notify boundary. Test 20 dumps `notify.mock.calls` and asserts none of `secret` / `alice` / token / b64(secret) appear.
- **Walker bounds** are enforced: `MAX_DEPTH=3`, `MAX_NODES=50`, `MAX_SUGGESTIONS=10`. BFS uses a visited Set keyed by `${system}|${code}` to defeat SNOMED `Is a` cycles. Per-axis branching prevents ancestor/descendant intermixing.
- **Default-off** for `semanticNearMisses` is enforced by a triple-condition gate in `validateWithCascade`. Walker is never invoked when the flag is absent or false.
- **Cache reuse**: walker uses `resolver.lookupDisplay` (Phase 4's cached resolver). No parallel cache.
- **Silent fallback**: walker returns `[]` on null client or any `$lookup` error; never throws to caller.

The 2 warnings and 4 info items below are minor maintainability and robustness observations — none compromise the phase's security or correctness invariants.

## Warnings

### WR-01: `VALIDATOR_BEARER_TOKEN_KEY` duplicated as a literal in three locations

**File:** `src/components/settings/ValidatorAuthSettingsModal.tsx:40`, `src/quality/cascadingValidator.ts:58`, `src/hooks/useConformanceRun.ts:215`
**Issue:** The bearer-token storage key string `'validator.bearerToken.v1'` is declared three times (twice as a `const`, once as an inline literal in `useConformanceRun.ts`). `cascadingValidator.ts` exports `VALIDATOR_BEARER_TOKEN_KEY`, but the modal and the hook do not import it — they redeclare or hardcode the literal. A future rename (e.g., `v2`) requires touching all three sites; missing one would silently break either token rotation, the cascade fetch, or the modal save.
**Fix:** Import the shared constant in both consumers.
```ts
// src/components/settings/ValidatorAuthSettingsModal.tsx
import { VALIDATOR_BEARER_TOKEN_KEY } from '../../quality/cascadingValidator';
// remove local `const VALIDATOR_BEARER_TOKEN_KEY = 'validator.bearerToken.v1';`

// src/hooks/useConformanceRun.ts (line 215)
import { VALIDATOR_BEARER_TOKEN_KEY } from '../quality/cascadingValidator';
// then:
bearerLen = (window.localStorage.getItem(VALIDATOR_BEARER_TOKEN_KEY) ?? '').length;
```
Test files can keep their local literal as a regression check that the wire-format key string didn't change unintentionally.

### WR-02: `extSerialized` IIFE reads `localStorage` on every render of `useConformanceRun`

**File:** `src/hooks/useConformanceRun.ts:209-221`
**Issue:** `extSerialized` is computed via an IIFE in the function body, which runs on every render. When auth type is `bearer` it calls `localStorage.getItem('validator.bearerToken.v1')` synchronously. For a typical Validation tab session this is cheap, but: (1) it triggers Storage IPC on every render even when the dependency hasn't changed, and (2) it makes hook order subtly dependent on render frequency. The `bearerSignatureBump` state is the proper invalidation signal — the per-render `getItem` is redundant once `bearerSignatureBump` flips.
**Fix:** Memoize via `useMemo` so the read only happens when `settings` or `bearerSignatureBump` changes:
```ts
const extSerialized = useMemo(() => {
  const ext = settings?.validation?.externalValidator;
  if (!ext) return JSON.stringify(null);
  let bearerLen = 0;
  if (ext.auth?.type === 'bearer' && typeof window !== 'undefined') {
    try {
      bearerLen = (window.localStorage.getItem('validator.bearerToken.v1') ?? '').length;
    } catch {
      bearerLen = 0;
    }
  }
  return JSON.stringify({ ...ext, _bearerLen: bearerLen, _bump: bearerSignatureBump });
}, [settings, bearerSignatureBump]);
```
Behavior is unchanged because the existing `useEffect` dep on `extSerialized` already collapses to value-equality semantics; this just stops doing the work eagerly on unrelated re-renders.

## Info

### IN-01: `auth-banner-4` test uses an over-loose `not.toContain('"a"')` check

**File:** `src/components/quality/__tests__/ValidationPanel.test.tsx:241-243`
**Issue:** The credential-leak assertion in test `auth-banner-4` checks `expect(html).not.toContain('"a"')` to ensure the username `a` doesn't appear. Because `a` is a single letter, this assertion is fragile — any future Mantine attribute or icon SVG containing the literal `"a"` substring would falsely flag a leak (or worse, the test could pass while a real leak hides because the rendered DOM contains `>a<` rather than `"a"`). The intent is good (T-43-07 lock) but the implementation is heuristic.
**Fix:** Use a longer, distinctive credential string and assert against that:
```ts
auth: { type: 'basic', username: 'leak-canary-username', password: 'leak-canary-password' },
// ...
expect(html).not.toContain('leak-canary-password');
expect(html).not.toContain('leak-canary-username');
```

### IN-02: `ResourceIssueTable` row React key embeds page-relative index

**File:** `src/components/quality/ResourceIssueTable.tsx:260`
**Issue:** `key={`${rowKey}|${i}`}` uses the page-relative index `i`. When the user paginates, different pages reuse `i = 0..49`, so two issues with identical `(resourceId, field, code)` triples on different pages would briefly share a key. In practice this does not cause incorrect render because `Table.Tbody` re-renders the whole list on page change, but it does defeat React's incremental reconciliation when filters or sort change in place.
**Fix:** Use the absolute row position so keys are stable across pagination:
```ts
const absoluteRow = (page - 1) * PAGE_SIZE + i;
return (
  <Fragment key={`${rowKey}|${absoluteRow}`}>
    {/* ... */}
  </Fragment>
);
```
Alternatively, drop `i` entirely and add a tie-break to the sort so duplicate `rowKey` values get a deterministic ordinal.

### IN-03: `extractCodingsAtPath` does not handle `where()` / FHIRPath filters

**File:** `src/quality/cascadingValidator.ts:347-419`
**Issue:** Documented limitation: paths produced by some validators (notably IG-Publisher under specific configurations) include FHIRPath fragments like `Observation.component.where(code.coding.code='abc')`. The current parser silently returns `[]` for such inputs (which is the documented "no near-miss applicable" fallthrough), so behavior is correct — but a SNOMED-flavored deployment could see legitimate `code-invalid` issues without "Did you mean?" suggestions when the validator emits FHIRPath-style expressions.
**Fix:** No code change required for v1.6 (deferred to a future phase per docstring). Consider adding a single fixture test to `cascadingValidator.test.ts` that supplies a `where()`-bearing expression and asserts `extractCodingsAtPath` returns `[]` (locking the silent-fallthrough contract so a future "let's add where() support" change is observable).

### IN-04: `walkNearMisses` `totalNodes` accounting reserves "1 for the seed" but the seed is never added to result

**File:** `src/quality/semanticNearMissWalker.ts:96-112`
**Issue:** The comment on line 96 says `totalNodes = 1 // 1 for the seed`, but the seed (`invalidCode`) is only used for fetching neighbors; it never enters `ancestors` or `descendants`. The accounting is consistent (we processed one $lookup, so charging one node-budget against the seed is reasonable), but a reader unfamiliar with the design may expect `MAX_NODES` to bound result length rather than fetched-node count. The comment could be clearer about what `totalNodes` actually counts (BFS processing budget across both axes, not result size).
**Fix:** Tighten the comment for clarity:
```ts
// BFS processing budget. Counts nodes processed across both axes (parents
// + children) plus the seed $lookup. Defends against pathological
// hierarchies. Result size is bounded separately by MAX_SUGGESTIONS.
let totalNodes = 1; // the seed $lookup we already issued above
```

---

_Reviewed: 2026-04-30T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
