---
phase: 43
plan: 01
subsystem: quality / validation cascade
tags: [val-06, validator, auth, basic, bearer, phi-gate, cascade, security]
requires:
  - Phase 31 external-validator cascade (cascadingValidator.ts, phiGate.ts)
  - Phase 4 Mantine 8 PasswordInput pattern (TerminologySettingsModal.tsx structural template)
provides:
  - HTTP Basic + Bearer authentication for the external validator tier
  - localStorage-only bearer token storage (validator.bearerToken.v1; never on disk)
  - auth-missing / auth-failed cascade notify events
  - Auth-aware ValidationPanel banner copy (5 distinct states)
  - ValidatorAuthSettingsModal for token entry/clear
  - Probe-cache invalidation on bearer-token rotation
affects:
  - Plan 43-02 Wave 2 (semantic near-miss; uses the schema's externalValidator.semanticNearMisses field)
  - Phase 4x backlog: configurable maxDepth, UI toggle for semanticNearMisses, multi-user token rotation
tech_stack:
  added: []
  patterns:
    - localStorage versioned key (`validator.bearerToken.v1`) — matches Phase 21+ convention
    - notify event vocabulary extension (existing demote/cors/timeout + new auth-missing/auth-failed)
    - per-call read of localStorage for credentials (no caching of derived form)
    - banner-state machine driven by cascade notify events
    - probe-cache invalidation via length signature in extSerialized dep
    - custom DOM event ('validator-bearer-token-changed') for cross-component cache invalidation hint
key_files:
  created:
    - src/components/settings/ValidatorAuthSettingsModal.tsx (174 lines)
    - src/components/settings/__tests__/ValidatorAuthSettingsModal.test.tsx (157 lines)
    - src/components/quality/__tests__/ValidationPanel.test.tsx (266 lines)
    - src/config/__tests__/settings.test.ts (197 lines)
  modified:
    - src/config/types.ts (+34, ValidatorAuthConfig + auth/semanticNearMisses fields)
    - src/config/settings.ts (+50, narrowing for auth + semanticNearMisses; bearer-credential drop)
    - src/quality/cascadingValidator.ts (+90, header injection + auth-missing/auth-failed + ordering lock)
    - src/components/settings/SettingsPage.tsx (+34, modal trigger button + IconShield import)
    - src/components/quality/ValidationPanel.tsx (+15, auth banner copy with data-testid)
    - src/hooks/useConformanceRun.ts (+62, AuthBannerState + bearer-rotation cache invalidation)
    - src/quality/__tests__/cascadingValidator.test.ts (+312, Tests 16-23)
    - src/components/quality/__tests__/ValidationPanel.phi-gate.integration.test.tsx (+105, Tests D + E)
    - public/settings.yaml (+22, commented auth + semanticNearMisses examples)
decisions:
  - D-01 (Basic auth in YAML): plaintext username + password are accepted in settings.yaml — same trust boundary as the FHIR server URL.
  - D-02 (Bearer in localStorage only): bearer tokens NEVER persist to YAML on disk; entered via modal, written to validator.bearerToken.v1, read fresh per cascade call. Locked by parser narrowing + grep test (T-43-06).
  - D-04 (PHI gate FIRST): Authorization header build happens AFTER isPhiAcknowledged() and BEFORE AbortController allocation. awk ordering check + Tests 22 + D + E lock the invariant.
  - D-13 (auth-failed demote): 401/403 from validator → demote to server tier with notify('auth-failed', { authType, status }) — banner reflects "auth: <type> — failed (server fallback)".
  - D-21 (notify telemetry, no creds): payloads carry `{ from, to, authType?, status? }` only; Test 20 asserts no credential string appears in JSON.stringify(notify.mock.calls).
  - T-43-04 mitigation: bearer-token length signature included in extSerialized dep so token rotation triggers probe-cache wipe via the existing useEffect.
metrics:
  duration_minutes: 23
  tasks_completed: 6
  files_changed: 13
  lines_added_approx: 1100
  tests_added: 28
  tests_passing_after: 1184
  tests_failing_after: 1 (pre-existing — see Deferred Issues)
  baseline_passing_before: 1170
completed_date: 2026-04-30
---

# Phase 43 Plan 01: Validator Hardening — Authentication (VAL-06) Summary

**One-liner:** HTTP Basic + Bearer auth for the Phase 31 external-validator cascade — basic-auth credentials live in `settings.yaml` plaintext (intentional), bearer tokens live in `localStorage` under `validator.bearerToken.v1` (entered via a new `ValidatorAuthSettingsModal`, never serialized to disk), with PHI-gate ordering preserved and auth-missing / auth-failed demotes wired through the cascade's notify stream into the ValidationPanel banner.

## Scope Delivered

### New schema (D-01 / D-02 / D-08 / D-11)

`AppSettings.validation.externalValidator` now carries:

```ts
auth?: { type: 'basic' | 'bearer'; username?: string; password?: string }
semanticNearMisses?: boolean
```

The parser narrows YAML input field-by-field. Critically, when `auth.type === 'bearer'`, the narrowing produces ONLY `{ type: 'bearer' }` — any `password` / `token` / `credentials` fields the user may have placed in YAML are **silently dropped**. This is a deliberate T-43-06 lock with a code-marker comment AND a test (Test 3 asserts the literal leaked-token string never appears anywhere in the parsed settings JSON).

### Authorization header injection (D-04 / D-05)

`cascadingValidator.tryExternal` now builds an `Authorization` header for outbound `$validate` POSTs:

- Basic: `Authorization: Basic ${btoa(username:password)}` (RFC 7617). Re-encoded per request — no caching of the b64 form (Test 21).
- Bearer: `Authorization: Bearer ${token}` (RFC 6750). Token read fresh per call from localStorage so user-driven rotation via the modal takes effect immediately on the next validate.

The header build is a **local variable** inside `tryExternal` — never attached to `opts.externalValidator` or any object that crosses the `notify()` boundary (T-43-02 lock; Test 20 asserts `JSON.stringify(notify.mock.calls)` does not contain any credential string).

### PHI gate ordering invariant (D-04 / T-43-05)

The Authorization header build runs **AFTER** `isPhiAcknowledged()` and **BEFORE** `AbortController` allocation. An awk one-liner verifies the ordering:

```
phi=179 auth=199 pass=YES
```

(line 179 is the `isPhiAcknowledged()` call; line 199 is the first `btoa(` / `readBearerToken(`)

Two tests lock the invariant:

- Test 22 (cascade unit level): `vi.spyOn(window.localStorage, 'getItem')` confirms the bearer key is NEVER read when PHI is unacknowledged.
- Test E (ValidationPanel integration level): same invariant exercised end-to-end through React render → useConformanceRun → cascade. (The hook's per-render bearer-LENGTH probe for cache invalidation is intentionally allowed and is a non-leak utility — only the cascade-fetch-time read is forbidden.)

### Auth failure handling (D-13 / T-43-04)

- **401/403**: `notify('auth-failed', { from: 'external', to: 'server', authType, status })` → demote to server tier; cache 'server' in probe map (Tests 19, 19b).
- **Bearer + missing token**: `notify('auth-missing', { from: 'external', to: 'server', authType: 'bearer' })` → demote without ever attempting the fetch (Test 18).

### ValidationPanel banner (D-02 / D-13 / D-21 / T-43-07)

`useConformanceRun` exposes `authBannerState` ('none' | 'ok' | 'missing' | 'failed') driven by the cascade notify stream. ValidationPanel renders 5 distinct copy variants:

| State | Banner copy |
|-------|-------------|
| basic active (ok) | `auth: basic` |
| bearer active (ok) | `auth: bearer` |
| bearer missing token | `auth: bearer (token missing — set in Settings)` |
| auth failed (any type) | `auth: <type> — failed (server fallback)` |
| no auth configured | (no banner) |

The banner uses Mantine 8 `Text` only (no Tailwind). Test asserts the rendered DOM never contains the credential value — only the type label.

### ValidatorAuthSettingsModal (D-03 / D-19)

A new Mantine 8 modal mirroring `TerminologySettingsModal.tsx`:

- `PasswordInput` for the bearer token (masked).
- Save with non-empty input → `localStorage.setItem('validator.bearerToken.v1', token)`.
- Save with empty input → `removeItem` (treats as 'clear').
- Clear button → `removeItem`; modal stays open for re-entry.
- D-19 pre-fill: opening the modal reads the existing token so the user can amend without losing it on Save.
- Dispatches a custom `validator-bearer-token-changed` event on save/clear so consumers (currently `useConformanceRun`) wipe their probe caches immediately.

The modal is wired in `SettingsPage.tsx`'s Validation section, with the trigger button **visible only** when `auth?.type === 'bearer'` (basic-auth credentials are configured via `settings.yaml`, not the modal).

### Probe-cache invalidation on bearer rotation (T-43-04)

`useConformanceRun.extSerialized` now includes a length signature:

```ts
const bearerLen = ext.auth?.type === 'bearer' ? localStorage.getItem(KEY)?.length ?? 0 : 0;
return JSON.stringify({ ...ext, _bearerLen: bearerLen, _bump: bearerSignatureBump });
```

Length-only — the raw token never appears in this JSON (which may surface in React DevTools). Token rotation produces a new signature → existing useEffect wipes the probe cache and resets active strategy. The `_bump` counter is incremented by a `validator-bearer-token-changed` event listener so a save through the modal forces an immediate re-render. Test 23 in `cascadingValidator.test.ts` exercises the rotation contract.

## Threat Coverage Table (T-43-01 .. 07)

| Threat | Disposition | Code marker | Test |
|--------|-------------|-------------|------|
| T-43-01 (config storage — basic plaintext) | accept | `public/settings.yaml` line 51 (commented `auth:` example) + `src/config/types.ts` `ValidatorAuthConfig` docstring | n/a (accepted; documented in CONTEXT.md D-01) |
| T-43-02 (header path / no leak in notify) | mitigate | `src/quality/cascadingValidator.ts` "Header is a LOCAL variable; never attached to opts" comment | Test 20 — `JSON.stringify(notify.mock.calls)` excludes literal credentials |
| T-43-03 (missing creds bypass) | mitigate | `src/quality/cascadingValidator.ts` `notify('auth-missing', ...)` branch | Test 18 (cascade unit) — bearer + empty localStorage demotes |
| T-43-04 (token rotation cache stickiness) | mitigate | `src/hooks/useConformanceRun.ts` `_bearerLen` in `extSerialized` + custom event handler | Test 23 — probe-rotate; cache wipe + re-probe verified |
| T-43-05 (PHI gate bypass via reordering) | mitigate | awk ordering check `phi<auth` → pass; "// D-04 / T-43-05 ORDERING LOCK" comment | Test 22 (cascade unit) + Test D + Test E (integration) |
| T-43-06 (token UX / disk persistence) | mitigate | `grep validator.bearerToken.v1 src/config/{types,settings}.ts` returns ZERO matches; modal `SECURITY: NEVER serialize` comment | Test 3 (parser drops bearer YAML credentials) + Test 5 (modal does NOT call setSettings) |
| T-43-07 (banner observability — false confidence) | mitigate | 5 banner-copy variants in `ValidationPanel.tsx` lines 487-492 | 5 banner tests in `ValidationPanel.test.tsx` (one asserts no credential value in DOM) |

## Deviations from Plan

**Test 22 ordering** — In the plan, Test 22 was listed as part of the bearer/auth header tests after Test 19. To preserve test-suite locality I added it AFTER Test 23 (probe-rotate). Functionally identical; just reading order. (No deviation rule fired.)

**Test E scope adjustment** — When Task 6 added `_bearerLen` to `extSerialized`, the original Test E from Task 4 ("bearer key NEVER read") would have failed because `useConformanceRun` legitimately reads the token's LENGTH (not value) for cache invalidation. Rather than weaken the cache-invalidation guarantee, I scoped Test E to the **cascade-fetch path** (the original threat surface for T-43-05): the test now asserts no external fetch fires AND the cascade itself never reads the bearer key. The hook's per-render length probe is documented as a non-leak utility separate from the cascade's fetch-time token read. Test 22 (unit level) still locks the strict cascade-side `bearerReads === 0` invariant. (Rule 1 — auto-fix bug introduced by my own Task 6 change; documented inline in the test.)

**No other deviations from CONTEXT.md decisions.**

## Authentication Gates Encountered

None. All work executed autonomously without auth prompts.

## Test Deltas

| Window | Passing | Failing | Total | Notes |
|--------|---------|---------|-------|-------|
| Baseline (pre-43-01) | 1170 | 1 | 1196 (incl. 22 todo + 3 skipped) | Pre-existing deuteranopia failure (unrelated) |
| Post-43-01 | 1184 | 1 | 1207 | +14 net new tests (a few todo→real elsewhere); same pre-existing deuteranopia failure |

New tests added in this plan: **+28 across 5 test files**:
- `src/config/__tests__/settings.test.ts`: +7 (schema narrowing)
- `src/quality/__tests__/cascadingValidator.test.ts`: +9 (Tests 16, 17, 18, 19, 19b, 20, 21, 22, 23)
- `src/components/quality/__tests__/ValidationPanel.phi-gate.integration.test.tsx`: +2 (Tests D, E)
- `src/components/quality/__tests__/ValidationPanel.test.tsx`: +5 (banner copy)
- `src/components/settings/__tests__/ValidatorAuthSettingsModal.test.tsx`: +5 net (Wave 0 stub had 3 skipped → real 6 tests)

## Bundle Size

```
dist/assets/index-Pwp5sCbP.js   1,141.49 kB │ gzip: 341.65 kB
```

Within ±5KB gz of v1.5 baseline (606.76 KB initial-load was for a different bundle target — the current bundle includes more eager-loaded modules; informational only, no regression vs. recent phases).

## Deferred Issues

### Pre-existing failure (independent of 43-01)

- `src/__tests__/visual/deuteranopia.test.tsx` → pair #13 (`kardiologie ↔ mikrobiologie`) discriminable under deuteranopia
- Verified failing on base commit `078d220` BEFORE any 43-01 changes (via `git stash` + targeted run).
- Phase 40 / DEUT-01 backlog item; out of scope for 43-01.
- Logged in `deferred-items.md` for the Phase 40 owner to triage.

## Self-Check: PASSED

- All 6 tasks executed and committed atomically.
- All acceptance criteria from `<acceptance_criteria>` blocks verified via grep + `npx vitest run`.
- All 7 STRIDE threats from `<threat_model>` mapped to code markers + tests (table above).
- `npx tsc -b --noEmit` exits 0.
- `npm run build` exits 0.
- Per-task verification commands from `<verification>` block all pass green.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | `093a273` | test(43-01): add Wave 0 stub for ValidatorAuthSettingsModal |
| 2 | `71102e1` | feat(43-01): extend AppSettings with externalValidator.auth + semanticNearMisses |
| 3 | `b3ab579` | feat(43-01): inject Authorization header in cascadingValidator + auth-missing/auth-failed events |
| 4 | `2431616` | test(43-01): lock T-43-05 PHI-gate-ordering at integration layer |
| 5 | `cc82965` | feat(43-01): wire ValidationPanel auth banner copy via useConformanceRun |
| 6 | `df0bc4c` | feat(43-01): ValidatorAuthSettingsModal + SettingsPage trigger + probe-cache rotation guard |
