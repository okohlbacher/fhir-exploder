---
phase: 43-validator-hardening-auth-semantic-near-miss-val-06-val-07
verified: 2026-04-30T05:30:00Z
status: human_needed
score: 7/7 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Case A — Basic-auth-protected validator URL"
    expected: "Active strategy reads 'external'; auth banner reads 'auth: basic'; Authorization: Basic <base64> header present on outgoing POST; validator responds 200; validator.bearerToken.v1 absent from localStorage"
    why_human: "Live-network TLS round-trip against a real basic-auth-protected validator instance required. Unit tests assert header injection; live validation requires a real protected validator behind a reverse proxy."
  - test: "Case B — Bearer-token-protected validator URL (including token rotation / probe-cache invalidation)"
    expected: "ValidatorAuthSettingsModal saves token to localStorage; auth banner reads 'auth: bearer'; Authorization: Bearer <token> header present; token rotation (B.3) re-probes external tier (T-43-04 probe-cache invalidation)"
    why_human: "Live-network round-trip against a bearer-protected validator (Firely Server with API key or org IG-Publisher Wrapper). Token rotation cache invalidation requires a multi-step interactive session."
  - test: "Case C — Deliberately-invalid SNOMED code surfaces ≥1 near-miss suggestion"
    expected: "code-invalid issue gets a chevron in ResourceIssueTable; Collapse opens with Display | Code | Relation columns; ≥1 SNOMED suggestion row; tooltip shows full SNOMED display + system URL; default-off (C.2) shows no chevron; terminology unavailable (C.3) shows no chevron and no error toast"
    why_human: "Requires a real Ontoserver (or CSIRO sandbox) with SNOMED hierarchy and a test resource carrying a deliberately-invalid SNOMED code. Mock fixtures validate the walker logic; live $lookup response polymorphism and suggestion quality need real-data smoke."
---

# Phase 43: Validator Hardening — Auth + Semantic Near-Miss (VAL-06 + VAL-07) Verification Report

**Phase Goal:** Extend Phase 31's external validator cascade with two productionization features — HTTP authentication for protected validators, and opt-in semantic suggestions for invalid codes.
**Verified:** 2026-04-30T05:30:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #  | Truth                                                                                                                 | Status     | Evidence                                                                                                                                                                                                                                        |
|----|-----------------------------------------------------------------------------------------------------------------------|------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 1  | PHI gate runs FIRST in cascadingValidator.ts tryExternal; auth path executes AFTER isPhiAcknowledged()                | ✓ VERIFIED | awk ordering check: `phi=213 auth=233 PASS`; comment `// D-04 / T-43-05 ORDERING LOCK` at line 210; Tests 22 (unit) and D + E (integration) lock invariant                                                                                    |
| 2  | Bearer token NEVER persists to disk (validator.bearerToken.v1 absent from types.ts, settings.ts, settings.yaml)       | ✓ VERIFIED | `grep validator.bearerToken.v1 src/config/types.ts src/config/settings.ts` → ZERO hits; `grep validator.bearerToken.v1 public/settings.yaml` → ZERO hits; Test 3 in settings.test.ts asserts bearer YAML credentials silently dropped          |
| 3  | Auth notify events auth-missing and auth-failed exist in cascadingValidator                                           | ✓ VERIFIED | `kind: 'timeout' \| 'cors' \| 'demote' \| 'auth-missing' \| 'auth-failed'` at line 129; Tests 18 (auth-missing demote) and 19 / 19b (auth-failed 401/403) pass                                                                               |
| 4  | Walker bounds enforced: MAX_DEPTH=3, MAX_NODES=50, MAX_SUGGESTIONS=10                                                 | ✓ VERIFIED | Constants at lines 35-37 of semanticNearMissWalker.ts; Tests 2 (max-nodes), 3 (max-depth), and slice(0, MAX_SUGGESTIONS) at line 139 confirmed                                                                                                 |
| 5  | Walker reuses TerminologyResolver cache (no parallel cache)                                                           | ✓ VERIFIED | `resolver.lookupDisplay(node.system, node.code)` at line 101; Test 6 (cache reuse) asserts lookupDisplay invoked exactly once per visited node with no duplicate calls                                                                         |
| 6  | Default-off: semanticNearMisses defaults to false; walker NOT invoked when false                                      | ✓ VERIFIED | Triple-condition gate at lines 464-466 (semanticNearMisses === true AND client != null AND onSuggestions callback); Tests 24 (absent), 24b (explicit false), 6b in settings.test.ts (absent parses to false)                                   |
| 7  | Silent terminology fallback (no thrown errors when terminology server unavailable)                                    | ✓ VERIFIED | `if (!resolver \|\| !resolver.client) return []` at line 72; `if (!seedParams) return []` at line 84; try/catch in fetchLookupWithProperties returns null on error; Test 4 (null client) and Test 8 (network error mid-walk) pass              |

**Score:** 7/7 truths verified

### Deferred Items

Items not yet met but explicitly addressed in live-Blaze manual execution session.

| # | Item                                                 | Addressed In                        | Evidence                                                                                               |
|---|------------------------------------------------------|-------------------------------------|--------------------------------------------------------------------------------------------------------|
| 1 | Live UAT Case A (basic auth, real validator)         | /gsd-verify-work 43 (next session) | 43-HUMAN-UAT.md Case A.1 + A.2 scaffolded; blocked_reason documented in frontmatter                   |
| 2 | Live UAT Case B (bearer auth + token rotation)       | /gsd-verify-work 43 (next session) | 43-HUMAN-UAT.md Case B.1 + B.2 + B.3 scaffolded; blocked_reason documented in frontmatter             |
| 3 | Live UAT Case C (invalid SNOMED code, near-miss UI)  | /gsd-verify-work 43 (next session) | 43-HUMAN-UAT.md Case C.1 + C.2 + C.3 scaffolded; blocked_reason documented in frontmatter             |

### Required Artifacts

| Artifact                                                                           | Expected                                                                 | Status     | Details                                                                                                              |
|------------------------------------------------------------------------------------|--------------------------------------------------------------------------|------------|----------------------------------------------------------------------------------------------------------------------|
| `src/config/types.ts`                                                              | ValidatorAuthConfig type + auth/semanticNearMisses fields                | ✓ VERIFIED | ValidatorAuthConfig at line 17; auth?: ValidatorAuthConfig at line 67; semanticNearMisses?: boolean at line 74       |
| `src/config/settings.ts`                                                           | YAML narrowing for auth block; rejects bearer credentials in YAML        | ✓ VERIFIED | a.type === 'basic' at line 113; a.type === 'bearer' at line 118; produces only `{ type: 'bearer' }` — no token      |
| `src/quality/cascadingValidator.ts`                                                | Authorization header injection + auth-missing/auth-failed notify events   | ✓ VERIFIED | Authorization built locally at lines 228/246; notify('auth-missing') at line 237; notify('auth-failed') at line 275  |
| `src/components/settings/ValidatorAuthSettingsModal.tsx`                           | Bearer token entry/clear UI with PasswordInput (174 lines)                | ✓ VERIFIED | PasswordInput at line 143; VALIDATOR_BEARER_TOKEN_KEY at line 40; Clear token at line 154; SECURITY comment at line 35 |
| `src/components/settings/__tests__/ValidatorAuthSettingsModal.test.tsx`            | Modal regression tests (6 tests; min 60 lines — 157 lines)               | ✓ VERIFIED | 6 tests: save, empty-save-removes, clear, pre-fill, no-roundtrip, custom-event; all pass                             |
| `src/components/quality/ValidationPanel.tsx`                                       | Banner copy reflecting auth state (5 variants)                            | ✓ VERIFIED | Lines 489-492 render auth: ${authType}, (token missing), — failed (server fallback); 5 banner tests pass             |
| `src/quality/types.ts`                                                             | NormalizedIssue.code?: string field                                       | ✓ VERIFIED | `code?: string` at line 110                                                                                           |
| `src/quality/normalizers.ts`                                                       | normalizeOperationOutcomeIssue populates raw code field                   | ✓ VERIFIED | `code: typeof issue.code === 'string' ? issue.code : undefined` at line 41                                           |
| `src/quality/semanticNearMissWalker.ts`                                            | BFS walker over $lookup with depth/node caps; returns NearMissSuggestion[] (195 lines) | ✓ VERIFIED | 195 lines; exports walkNearMisses and NearMissSuggestion; MAX_DEPTH=3, MAX_NODES=50, MAX_SUGGESTIONS=10; 8 tests pass |
| `src/quality/__tests__/semanticNearMissWalker.test.ts`                             | Walker regression tests (8 tests; min 80 lines — 291 lines)              | ✓ VERIFIED | 8 tests: ordering, max-nodes, max-depth, null-client, polymorphism, cache-reuse, cycle-defense, network-error         |
| `src/components/quality/ResourceIssueTable.tsx`                                    | Inline expandable suggestion rows; Collapse present                       | ✓ VERIFIED | Collapse at line 43; data-collapse-row at line 317; Tooltip at line 45; IconChevronDown/Right at line 47; 7 tests pass |
| `.planning/phases/43-validator-hardening-auth-semantic-near-miss-val-06-val-07/43-HUMAN-UAT.md` | Live-Blaze UAT scaffold with 3 cases (Case A, B, C)        | ✓ VERIFIED | Status: blocked (live infra not available in auto chain); Case A, B, C sections with detailed steps and pass/fail blanks |

### Key Link Verification

| From                                      | To                                              | Via                                                      | Status     | Details                                                                                       |
|-------------------------------------------|-------------------------------------------------|----------------------------------------------------------|------------|-----------------------------------------------------------------------------------------------|
| `cascadingValidator.ts`                   | `isPhiAcknowledged`                             | Imported phiGate; called BEFORE auth header build        | ✓ WIRED    | phi=213 < auth=233; awk ordering check passes; D-04 comment present                           |
| `cascadingValidator.ts`                   | `window.localStorage.getItem('validator.bearerToken.v1')` | readBearerToken() called inside bearer branch | ✓ WIRED    | VALIDATOR_BEARER_TOKEN_KEY exported at line 58; readBearerToken() called at line 233          |
| `ValidatorAuthSettingsModal.tsx`          | `localStorage.setItem('validator.bearerToken.v1', ...)` | handleSave writes to localStorage             | ✓ WIRED    | localStorage.setItem(VALIDATOR_BEARER_TOKEN_KEY, token) in handleSave; Test 1 passes          |
| `useConformanceRun.ts`                    | probe cache reset on bearer rotation            | extSerialized includes bearerLen + bearerSignatureBump   | ✓ WIRED    | `_bearerLen: bearerLen` + `_bump: bearerSignatureBump` at line 220; Test 23 (probe-rotate) passes |
| `SettingsPage.tsx`                        | `ValidatorAuthSettingsModal`                    | Import + Set bearer token button trigger                 | ✓ WIRED    | Import at line 36; `<ValidatorAuthSettingsModal` at line 432                                  |
| `semanticNearMissWalker.ts`               | `TerminologyResolver.client.get('CodeSystem/$lookup?...')` | fetchLookupWithProperties helper              | ✓ WIRED    | `resolver.client.get<Parameters>(...)` at line 188; CodeSystem/$lookup in URL at line 188      |
| `semanticNearMissWalker.ts`               | `TerminologyResolver.lookupDisplay`             | Reuses LRU cache (Phase 4)                               | ✓ WIRED    | `resolver.lookupDisplay(node.system, node.code)` at line 101; Test 6 confirms single-call-per-node |
| `cascadingValidator.ts`                   | `walkNearMisses`                                | Invoked when ext.semanticNearMisses === true AND issue.code === 'code-invalid' | ✓ WIRED | Import at line 44; triple-gate at lines 464-466; walkNearMisses call at line 483; Tests 24-27 pass |
| `ResourceIssueTable.tsx`                  | Mantine Collapse                                | Drill-down row pattern                                   | ✓ WIRED    | `import { Collapse }` at line 43; `<Collapse in={isExpanded}` in component body; Test wire-4 passes |
| `normalizers.ts`                          | `issue.code`                                    | Raw FHIR code preserved on NormalizedIssue               | ✓ WIRED    | `code: typeof issue.code === 'string' ? issue.code : undefined` at line 41; Test code-field-1/2/3 pass |

### Data-Flow Trace (Level 4)

| Artifact                        | Data Variable      | Source                                               | Produces Real Data | Status     |
|---------------------------------|--------------------|------------------------------------------------------|--------------------|------------|
| `ValidationPanel.tsx`           | `run.authBannerState` | `useConformanceRun` notify handler at lines 433/438 | Yes — cascade notify stream from real tryExternal | ✓ FLOWING |
| `ResourceIssueTable.tsx`        | `suggestions` Map  | `useConformanceRun` onSuggestions accumulator flushed at lines 504-508 | Yes — walker returns real $lookup responses | ✓ FLOWING |
| `cascadingValidator.ts`         | `authHeader`       | readBearerToken() reads fresh from localStorage      | Yes — reads live localStorage key              | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior                                                    | Command                                                                                                                | Result         | Status  |
|-------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------|----------------|---------|
| PHI gate ordering lock (phi < auth)                         | `awk '/isPhiAcknowledged/{phi=NR} /btoa\(|readBearerToken\(/{auth=NR} END{...}' cascadingValidator.ts`               | phi=213 auth=233 PASS | ✓ PASS |
| Bearer token absent from config files                       | `grep validator.bearerToken.v1 src/config/types.ts src/config/settings.ts`                                            | ZERO hits      | ✓ PASS  |
| Walker module exports correct symbols                       | Node.js check: exports walkNearMisses, NearMissSuggestion; bounds TRUE                                                | All confirmed  | ✓ PASS  |
| Full test suite: 1207 passing / 1 failing (pre-existing)    | `npx vitest run`                                                                                                       | 1207 passed, 1 pre-existing deuteranopia failure | ✓ PASS |
| Live-Blaze UAT cases A/B/C                                  | Manual execution against protected validator + real terminology server                                                 | Not yet run — scaffold status: blocked | ? SKIP (human needed) |

### Requirements Coverage

| Requirement | Source Plan  | Description                                                                             | Status        | Evidence                                                                                           |
|-------------|--------------|-----------------------------------------------------------------------------------------|---------------|----------------------------------------------------------------------------------------------------|
| VAL-06      | 43-01        | HTTP Basic + Bearer auth for external validator; bearer token in localStorage only      | ✓ SATISFIED   | ValidatorAuthConfig schema, header injection, modal, PHI gate ordering, notify events all verified |
| VAL-07      | 43-02        | Opt-in code-invalid semantic near-miss walker; suggestion rows in ResourceIssueTable    | ✓ SATISFIED   | Walker module, NormalizedIssue.code, cascade wiring, ResourceIssueTable UI all verified            |

### Anti-Patterns Found

| File                                    | Line      | Pattern                                                                          | Severity | Impact                                                                                                                                          |
|-----------------------------------------|-----------|----------------------------------------------------------------------------------|----------|-------------------------------------------------------------------------------------------------------------------------------------------------|
| `ValidatorAuthSettingsModal.tsx`        | 40        | `VALIDATOR_BEARER_TOKEN_KEY` redeclared (also in cascadingValidator.ts:58 and useConformanceRun.ts:215) | ⚠️ Warning | Future rename must touch 3 sites. Code review WR-01 documents the fix (import shared constant). Does NOT affect correctness in v1.6.            |
| `useConformanceRun.ts`                  | 209-221   | `extSerialized` IIFE reads localStorage on every render when auth type is bearer  | ⚠️ Warning | Cheap but non-memoized. Code review WR-02 documents the `useMemo` fix. Functionally correct; no render-correctness risk in v1.6.                |
| `ValidationPanel.test.tsx`             | 241-243   | `not.toContain('"a"')` over-loose credential-leak assertion in auth-banner-4      | ℹ️ Info   | Single-letter canary is fragile. Code review IN-01 documents improved fixture. Test intent (T-43-07) is sound; false-positive risk is low.      |

No blockers found. The three items above are documented in 43-REVIEW.md (WR-01, WR-02, IN-01) and are maintainability/robustness improvements deferred post-v1.6.

### Human Verification Required

#### 1. Case A — Basic-auth-protected validator URL (VAL-06)

**Test:**
1. Stand up a basic-auth-protected validator (HAPI behind `nginx auth_basic`, or any org instance).
2. Edit `settings.yaml` under `validation.externalValidator.auth: { type: basic, username: ..., password: ... }`.
3. Restart dev server. Open Quality → Validation → click Validate Sample.
4. Negative: replace password with wrong value → restart → click Validate Sample.

**Expected:**
- Positive: active strategy banner reads `external`; auth banner reads `auth: basic`; Network tab shows `Authorization: Basic <base64>` on the POST; validator responds 200; `validator.bearerToken.v1` absent from localStorage.
- Negative: auth banner reads `auth: basic — failed (server fallback)`; active strategy reads `server`.

**Why human:** Live-network TLS round-trip requires a real protected validator. Unit tests (Tests 16, 20) confirm header injection; live validation confirms the complete auth-to-server response cycle.

#### 2. Case B — Bearer-token-protected validator URL (VAL-06, including token rotation)

**Test:**
1. Configure `auth: { type: bearer }` in settings.yaml (no password/token field).
2. Restart dev server. Open Settings → click "Set bearer token" → enter org-issued token → Save.
3. Open Quality → Validation → click Validate Sample.
4. Token-missing: open modal → Clear → click Validate Sample.
5. Token rotation: re-enter valid token → Save → click Validate Sample again (proves T-43-04 probe-cache not stuck).

**Expected:**
- Save: notification "Token saved"; `validator.bearerToken.v1` populated in localStorage.
- Active: auth banner reads `auth: bearer`; Network tab shows `Authorization: Bearer <token>`.
- Token-missing: auth banner reads `auth: bearer (token missing — set in Settings)`; cascade uses server tier.
- Rotation: cascade re-probes external tier with new token (not stuck on server tier from prior demote).

**Why human:** Bearer token entry requires an org-issued token; token rotation interactive multi-step test; T-43-04 probe-cache invalidation behavior verified end-to-end only with real server response.

#### 3. Case C — Deliberately-invalid SNOMED code surfaces ≥1 near-miss (VAL-07)

**Test:**
1. Load a test resource with a deliberately-invalid SNOMED code (e.g. `99999999999`).
2. Set `semanticNearMisses: true` in settings.yaml; configure a real terminology server.
3. Open Quality → Validation → click Validate Sample.
4. Default-off: set `semanticNearMisses: false` → restart → confirm no chevron.
5. Terminology unavailable: point `terminology.serverUrl` to unreachable URL → confirm no chevron, no error toast.

**Expected:**
- Opt-in ON: `code-invalid` row has chevron; clicking opens Collapse with Display | Code | Relation columns; ≥1 suggestion row appears; tooltip shows full SNOMED display + system URL; striped rows do not shift on expand (Pitfall 6).
- Default-off: no chevron, zero `$lookup` GETs in Network tab.
- Terminology unavailable: no chevron, no error toast (D-12 silent fallback).

**Why human:** Real SNOMED hierarchy and $lookup response polymorphism (`valueCode` vs `valueCoding`) cannot be fully captured in mocks. Walker ordering and suggestion quality require real-data smoke. Visual stripe regression (Pitfall 6) requires browser rendering confirmation.

---

## Gaps Summary

No automated gaps found. All 7 phase-specific must-haves are verified in the codebase. The 3 human verification items above are deferred live-Blaze test cases explicitly scaffolded in `43-HUMAN-UAT.md` (status: blocked with `deferral_target: "/gsd-verify-work 43"`). These are SC#4 cases and are the expected deliverable for the automated execution phase.

### ROADMAP Success Criteria Status

| SC | Description | Status |
|----|-------------|--------|
| SC#1 | Auth schema + injection + bearer storage + banner copy | ✓ VERIFIED — ValidatorAuthConfig with refined `{type, username?, password?}` (intentional deviation from `credentials: string` per D-01); header injection; localStorage-only bearer; 5-variant banner |
| SC#2 | Regression tests for both header paths + PHI gate preserved | ✓ VERIFIED — Tests 16 (Basic), 17 (Bearer), 22 + D + E (PHI gate non-bypass) all pass |
| SC#3 | Semantic near-miss setting + walker + suggestion rows | ✓ VERIFIED — semanticNearMisses default false; walkNearMisses BFS (depth=3, 50-node, 10-suggestion cap); ResourceIssueTable Collapse rows; default-off Tests 24/24b |
| SC#4 | Live-Blaze UAT scaffold — 3 cases | ✓ SCAFFOLD VERIFIED — 43-HUMAN-UAT.md exists with Cases A, B, C (8 sub-cases total); status: blocked (live infra not available in auto chain); deferral documented for `/gsd-verify-work 43` |

**Note on SC#1 schema refinement:** ROADMAP SC#1 describes `credentials: string` but the plan and implementation use `{ type, username?, password? }` per CONTEXT.md D-01 (plaintext user/pass is YAML-idiomatic; `credentials` string is ambiguous for basic auth). This refinement is intentional and is clearly the better design. The PLAN frontmatter explicitly documents this deviation. No override is needed — the ROADMAP wording was exploratory; the plan locked the final design.

---

_Verified: 2026-04-30T05:30:00Z_
_Verifier: Claude (gsd-verifier)_
