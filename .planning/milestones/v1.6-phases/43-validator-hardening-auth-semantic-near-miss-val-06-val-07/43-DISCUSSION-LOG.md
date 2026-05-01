# Phase 43: Validator Hardening — Auth + Semantic Near-Miss - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-29
**Phase:** 43-validator-hardening-auth-semantic-near-miss-val-06-val-07
**Mode:** `--auto` (recommended defaults auto-picked; no interactive Q&A)
**Areas discussed:** Authentication scheme & storage, Header injection path, Semantic near-miss endpoint & walk, "Did you mean?" UI, Failure modes, Test approach

---

## Authentication scheme & storage

| Option | Description | Selected |
|--------|-------------|----------|
| `<user>:<pass>` plaintext in settings.yaml + base64 encode at fetch time | Hand-editable, mirrors curl/ansible/k8s-ingress conventions | ✓ (D-01) |
| Pre-encoded base64 string in settings.yaml | Looks security-flavoured but offers no real protection; obscures content | |
| Separate `~/.config/exploder/credentials` file | Splits config across files; doesn't match existing pattern | |

**User's choice (auto-picked recommended):** `<user>:<pass>` plaintext in settings.yaml; encoded once per request.
**Notes:** Same trust boundary as FHIR server URL in same file. Bearer is treated differently (D-02) because tokens are often issued/rotated by SSO.

| Option | Description | Selected |
|--------|-------------|----------|
| `validator.bearerToken.v1` localStorage; load once per `tryExternal` | Versioned key matching existing `quality.cohorts.v1` etc. pattern | ✓ (D-02) |
| sessionStorage (clear on tab close) | More restrictive but burdensome for long sessions | |
| In-memory only (re-prompt every load) | Most secure but UX-hostile | |

**User's choice (auto-picked recommended):** localStorage with `auth-missing` notify event when key empty.

| Option | Description | Selected |
|--------|-------------|----------|
| New `ValidatorAuthSettingsModal.tsx` mirroring `TerminologySettingsModal.tsx` | Codebase-consistent; `<PasswordInput>` masks token | ✓ (D-03) |
| Inline `<PasswordInput>` in `SettingsPage.tsx` | Less code but mixes secret-entry into a generic settings page | |
| CLI flag at app start | Doesn't fit a SPA model | |

**User's choice (auto-picked recommended):** new modal with explicit Save / Clear actions.

---

## Header injection path

| Option | Description | Selected |
|--------|-------------|----------|
| Inject AFTER PHI gate, BEFORE AbortController/fetch; build header locally | Preserves Phase 31 PITFALLS #3 ordering; credentials never leak through notify | ✓ (D-04) |
| Inject inside fetch options builder, before PHI check | Violates Phase 31 ordering invariant | |
| Wrap fetch in a higher-order function with auth | Adds indirection without benefit | |

**User's choice (auto-picked recommended):** preserve Phase 31 ordering, build header locally per-request.

**Header format** — RFC 7617 (basic) and RFC 6750 (bearer); standard formats. (D-05)

---

## Semantic near-miss — endpoint & walk

| Option | Description | Selected |
|--------|-------------|----------|
| FHIR R4 `$lookup` with `property=parent`+`property=child` (canonical hierarchy walk) | Reuses Phase 4's terminology infra; spec-blessed for SNOMED traversal | ✓ (D-07) |
| `$expand` on a wildcard ValueSet | `$expand` is for ValueSets, not arbitrary code-system hierarchy | |
| Custom CodeSystem walk via `?_id=` queries | Reinvents `$lookup`; brittle | |

**User's choice (auto-picked recommended):** `$lookup` with parent/child property filters.

| Option | Description | Selected |
|--------|-------------|----------|
| BFS depth=3 hard-cap with 50-node early-abort | Matches SC; defends against pathological hierarchies | ✓ (D-08) |
| Configurable depth (`maxDepth` setting) | Premature; defer until feedback demands | |
| Iterative deepening | Overkill at depth=3 | |

| Option | Description | Selected |
|--------|-------------|----------|
| Ancestors first (broader → specific), then descendants; cap at 10; alpha tiebreak | Validators usually report codes that are one step off — parents/siblings most useful | ✓ (D-09) |
| Descendants first | Reverse priority — leaf codes are usually wrong, not what users want | |
| Mixed by graph distance | Harder to predict; needs ranking logic | |

---

## "Did you mean?" UI

| Option | Description | Selected |
|--------|-------------|----------|
| Inline expandable rows below offending issue in `ResourceIssueTable.tsx` (Mantine `Collapse`) | Mirrors Phase 15 drill-down idiom; suggestions tightly bound to issue | ✓ (D-10) |
| Separate "Suggestions" panel beside the issue table | Visual context switch; users have to flip between panels | |
| Mantine `Popover` on issue row hover | Discoverability problem; not all suggestions visible at once | |

| Option | Description | Selected |
|--------|-------------|----------|
| Default-off; YAML toggle only; no UI control | Keeps settings UI minimal; matches SC `default false` | ✓ (D-11) |
| Default-off with UI toggle in SettingsPage | More discoverable but adds settings surface | |
| Default-on | Violates SC | |

---

## Failure modes

| Option | Description | Selected |
|--------|-------------|----------|
| Silent fallback when terminology server unavailable (no error to user) | Matches PROJECT.md "Must handle terminology server being unavailable gracefully" + Phase 4 pattern | ✓ (D-12) |
| Toast/notification on terminology failure | User-hostile for a degraded-but-working state | |
| Banner indicator only | Matches active-strategy banner pattern but adds visual noise | |

| Option | Description | Selected |
|--------|-------------|----------|
| 401/403 → demote to server-tier with `notify('auth-failed')` | Matches Phase 31 demote pattern; cascade always returns SOME tier | ✓ (D-13) |
| 401/403 → return null (cascade fails entirely) | Breaks Phase 31's invariant | |
| 401/403 → retry without auth | Wrong — leaks the fact that auth was attempted | |

**Token clear-on-tab-close: NO** (D-14) — local-tool threat model; persistent tokens acceptable.

---

## Test approach

| Option | Description | Selected |
|--------|-------------|----------|
| `vi.spyOn(globalThis, 'fetch')` for header injection assertions | Mirrors existing test pattern; no new framework | ✓ (D-15) |
| `msw` (Mock Service Worker) | Adds dependency; not needed for header-presence assertions | |
| Real terminology server hits | Slow; flaky; not a unit-test pattern | |

PHI-gate test extends `ValidationPanel.phi-gate.integration.test.tsx` (D-16).
Semantic near-miss tests use canned `$lookup` fixtures via `vi.spyOn` (D-17).
Live-Blaze UAT scaffold mirrors Phase 42 pattern (D-18).

---

## Claude's Discretion

- D-06: Probe cache key does NOT include auth state (minor leak vector judged acceptable in local-tool threat model).
- D-19: Exact Mantine token-entry component (`PasswordInput` recommended; planner can substitute equivalent).
- D-20: Suggestion table column order.
- D-21: Whether to log `auth.type` (NOT credentials) to notify events for telemetry.

---

## Deferred Ideas

Captured in CONTEXT.md `<deferred>` section:
- OAuth 2.0 / OIDC / mTLS
- Configurable depth (`semanticNearMisses.maxDepth`)
- UI toggle for `semanticNearMisses`
- Multi-user shared-machine token rotation
- Auth state in probe cache key
- `$expand`-based ValueSet suggestions
