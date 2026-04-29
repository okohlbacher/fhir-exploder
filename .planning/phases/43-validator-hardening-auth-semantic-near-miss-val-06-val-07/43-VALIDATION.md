---
phase: 43
slug: validator-hardening-auth-semantic-near-miss-val-06-val-07
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-29
---

# Phase 43 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 1.x |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run src/quality/__tests__/cascadingValidator.test.ts src/quality/__tests__/normalizers.test.ts src/components/quality/__tests__/ValidationPanel.phi-gate.integration.test.tsx` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | quick ~2 s, full ~10 s |

---

## Sampling Rate

- **After every task commit:** Run quick command (focused tests on the touched file family)
- **After every plan wave:** Run full suite
- **Before `/gsd-verify-work`:** Full suite must be green; ≥1154 passing (Phase 42 baseline) + ~25 new tests projected by RESEARCH.md → target ≥1179 passing
- **Max feedback latency:** 10 s

---

## Per-Task Verification Map

> The planner fills the exact Task IDs and acceptance criteria; this map enumerates the test family per requirement so the planner has Nyquist coverage by construction.

| Task family | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| Schema extension (`auth?: { type, username?, password? }`) | 43-01 | 1 | VAL-06 | T-43-01 (config storage) | Plaintext credentials in settings.yaml are accepted; invalid `auth.type` rejected at parse | unit | `npx vitest run src/__tests__/settings.test.ts` | ✅ | ⬜ pending |
| Header injection in `tryExternal` (basic + bearer) | 43-01 | 2 | VAL-06 | T-43-02 (header path) | `Authorization: Basic <b64>` and `Authorization: Bearer <token>` set on outgoing fetch; PHI gate runs FIRST | unit | `npx vitest run src/quality/__tests__/cascadingValidator.test.ts -t auth` | ✅ | ⬜ pending |
| `notify('auth-missing')` when bearer + empty localStorage | 43-01 | 2 | VAL-06 | T-43-03 (missing creds demote) | Cascade demotes to server-tier with `auth-missing` notify event; banner copy reflects state | unit | `npx vitest run src/quality/__tests__/cascadingValidator.test.ts -t auth-missing` | ✅ | ⬜ pending |
| `notify('auth-failed')` on 401/403 | 43-01 | 2 | VAL-06 | T-43-04 (auth failure demote) | 401/403 from validator → demote to server-tier with `auth-failed` notify event; banner reflects "auth: <type> — failed (server fallback)" | unit | `npx vitest run src/quality/__tests__/cascadingValidator.test.ts -t auth-failed` | ✅ | ⬜ pending |
| PHI gate non-bypass | 43-01 | 2 | VAL-06 | T-43-05 (PHI gate invariant) | When PHI not acknowledged, no `Authorization` header is built (cascade demotes BEFORE auth path entered) | integration | `npx vitest run src/components/quality/__tests__/ValidationPanel.phi-gate.integration.test.tsx -t auth-no-phi` | ✅ | ⬜ pending |
| `ValidatorAuthSettingsModal` token entry/clear | 43-01 | 3 | VAL-06 | T-43-06 (token UX) | Token saved to `validator.bearerToken.v1` in localStorage; "Clear" wipes the key; modal does NOT roundtrip to settings.yaml | component | `npx vitest run src/components/settings/__tests__/ValidatorAuthSettingsModal.test.tsx` | ❌ W0 | ⬜ pending |
| Banner copy reflects auth state | 43-01 | 3 | VAL-06 | T-43-07 (banner observability) | `ValidationPanel` renders "auth: basic" or "auth: bearer" or "auth: bearer (token missing — set in Settings)" matching cascade state | component | `npx vitest run src/components/quality/__tests__/ValidationPanel.test.tsx -t auth-banner` | ✅ | ⬜ pending |
| `NormalizedIssue.code` field carries `code-invalid` | 43-02 | 1 | VAL-07 | — | `normalizers.ts` populates `code?: string` from `OperationOutcome.issue.code`; existing description squash preserved | unit | `npx vitest run src/quality/__tests__/normalizers.test.ts -t code-field` | ✅ | ⬜ pending |
| `$lookup` graph walker (parents + children, depth=3 cap, 50-node abort) | 43-02 | 2 | VAL-07 | — | BFS returns ancestors+descendants; cap at 10 results; alphabetical tiebreak; aborts at depth=3 or node-count=50 | unit | `npx vitest run src/quality/__tests__/semanticNearMissWalker.test.ts` | ❌ W0 | ⬜ pending |
| Walker reuses `TerminologyResolver` cache | 43-02 | 2 | VAL-07 | — | Walker calls `TerminologyResolver.lookup` (Phase 4 cache); silent fallback when terminology server unavailable; no error to user | unit | `npx vitest run src/quality/__tests__/semanticNearMissWalker.test.ts -t cache` | ❌ W0 | ⬜ pending |
| Opt-in default-off (`semanticNearMisses: false`) | 43-02 | 2 | VAL-07 | — | When setting is false, walker is NOT invoked; no suggestion rows render; default value is false in parsed settings | unit + component | `npx vitest run src/quality/__tests__/cascadingValidator.test.ts -t opt-in` | ✅ | ⬜ pending |
| Suggestion rows in `ResourceIssueTable` | 43-02 | 3 | VAL-07 | — | Inline expandable rows (`<Mantine.Collapse>` or row-group fallback) render below offending issue; columns = code/display/relation; tooltip shows full SNOMED display + system URL | component | `npx vitest run src/components/quality/__tests__/ResourceIssueTable.test.tsx -t did-you-mean` | ✅ | ⬜ pending |
| Probe cache invalidates on bearer-token rotation | 43-02 | 2 | VAL-06 | T-43-04 (token rotation) | Setting bearer token via modal triggers probe cache reset (per RESEARCH.md Pitfall 2 + Open Question 2) | unit | `npx vitest run src/quality/__tests__/cascadingValidator.test.ts -t probe-rotate` | ✅ | ⬜ pending |
| Live-Blaze HUMAN-UAT scaffold | 43-02 | 3 | VAL-06, VAL-07 | T-43-01..07 (real-network validation) | 3 cases scaffolded: (a) basic-auth-protected validator URL, (b) bearer-token validator URL, (c) deliberately-invalid SNOMED code surfacing ≥1 near-miss | manual | n/a (HUMAN-UAT walk) | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/components/settings/__tests__/ValidatorAuthSettingsModal.test.tsx` — stub file for modal component tests (NEW, blocks Plan 43-01 Wave 3)
- [ ] `src/quality/__tests__/semanticNearMissWalker.test.ts` — stub file for walker tests (NEW, blocks Plan 43-02 Wave 2)
- [ ] No new framework install — vitest 1.x already covers all test types

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Authorization header succeeds against a real basic-auth-protected validator URL | VAL-06 | Header injection logic is unit-tested; live-network round-trip needs a real protected validator instance (TLS, real 401 vs 403 distinction, possible TLS-cert quirks) | Stand up a basic-auth-protected validator (or use an org instance); configure `settings.yaml` with `auth: { type: 'basic', username: ..., password: ... }`; run a validation cycle; confirm validator returns 200 (not 401) and active-strategy stays `external`. Recorded in `43-HUMAN-UAT.md` Case A. |
| Authorization header succeeds against a real bearer-token-protected validator URL | VAL-06 | Same — real org-issued bearer tokens have format quirks unit tests don't cover | Configure `auth: { type: 'bearer' }`; enter org-issued bearer token via the new ValidatorAuthSettingsModal; run a validation cycle; confirm 200 response and `external` active-strategy. Recorded in `43-HUMAN-UAT.md` Case B. |
| `$lookup` against real terminology server returns parents/children that survive into the suggestion UI for a deliberately-invalid SNOMED code | VAL-07 | Mock fixtures don't capture real terminology server response variance (`valueCode` vs `valueCoding`, missing display, hierarchy depth at the chosen concept); tooltip + relation labels need real-data smoke | Configure `semanticNearMisses: true`; enter a known-invalid SNOMED code into a Patient.condition.code in a Synthea bundle; trigger validation; expand the offending issue; confirm ≥1 suggestion row with code+display+relation; verify tooltip on hover. Recorded in `43-HUMAN-UAT.md` Case C. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify (the only manual gates are the 3 live-Blaze UAT cases, gated behind unit-tested foundations)
- [ ] Wave 0 covers all MISSING references (2 new test files: ValidatorAuthSettingsModal, semanticNearMissWalker)
- [ ] No watch-mode flags (every command uses `--run`)
- [ ] Feedback latency < 10 s (quick command targets the cascade + normalizer + PHI gate test files; full suite ~10 s)
- [ ] `nyquist_compliant: true` set in frontmatter (planner flips this once all tasks have automated verifies + Wave 0 stubs are scheduled)

**Approval:** pending
