# Phase 29: Backlog UX - Discussion Log

> **Audit trail only.**

**Date:** 2026-04-23
**Mode:** `--auto`
**Areas discussed:** OverviewStrip drop scope, status line format, PDF regression strategy, external validator cascade order, PHI gate integration, AbortController pattern, normalizer location, todo move timing

---

## UX-02 OverviewStrip drop scope

| Option | Description | Selected |
|--------|-------------|----------|
| Drop tiles 1-2 (Total resources, Resource types), keep 7 metric rings | Matches ROADMAP #4 exactly | ✓ (locked) |
| Drop tiles 1-2 AND reorder remaining | Scope creep (acceptance is 9→7) |  |
| Drop only Total resources | Partial; doesn't hit 7 |  |

**Auto-selection:** locked by acceptance.

---

## UX-02 status line format

| Option | Description | Selected |
|--------|-------------|----------|
| `N resources · M types · Last computed {relative-time}` with interpunct | Matches ROADMAP wording | ✓ (locked) |
| Icon-laden badge row | Over-designed for dimmed status |  |

**Auto-selection:** locked.

---

## UX-02 relative-time formatter

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal inline formatter (~10 LOC, no deps) | Avoids new dependency | ✓ (recommended) |
| `Intl.RelativeTimeFormat` | Browser-native but awkward API for our thresholds |  |
| New dep (date-fns, dayjs) | Unnecessary for 10 LOC |  |

**Auto-selection:** recommended.

---

## UX-01 cascade order

| Option | Description | Selected |
|--------|-------------|----------|
| external → server `$validate` → local | Matches ROADMAP + REQUIREMENTS explicitly | ✓ (locked) |

**Auto-selection:** locked.

---

## UX-01 PHI gate integration

| Option | Description | Selected |
|--------|-------------|----------|
| Route all external fetches through existing Phase 7 gate; regression-test no-fetch-before-consent | ROADMAP + PITFALLS §8 mandate | ✓ (locked) |
| Add new gate specific to external validator | Duplicates Phase 7 |  |
| Bypass gate for "safe" resources | Breaks acceptance; would leak PHI |  |

**Auto-selection:** locked.

---

## UX-01 AbortController + timeout

| Option | Description | Selected |
|--------|-------------|----------|
| `AbortController + setTimeout(() => controller.abort())`, default 15s | Matches Phase 24 pattern | ✓ (recommended) |
| Custom promise race | Reinvents AbortController |  |

**Auto-selection:** recommended.

---

## UX-01 normalizer location

| Option | Description | Selected |
|--------|-------------|----------|
| New file `src/quality/normalizers.ts` OR extend existing `validationBackends.ts` | Planner picks after reading current layout | ✓ (Claude's Discretion) |
| Inline in ValidationPanel | Anti-pattern; not testable |  |

**Auto-selection:** planner decides location; function signature locked: `normalizeOperationOutcomeIssue(issue): NormalizedIssue` with ≥5 unit tests.

---

## Plan batching

| Option | Description | Selected |
|--------|-------------|----------|
| 2 plans: 29-01 (UX-02 warm-up) → 29-02 (UX-01 L-task) | T2 before T1 per ROADMAP lock | ✓ (locked) |
| 1 plan (both UX) | Violates intra-phase order semantic |  |

**Auto-selection:** locked. 29-02 `depends_on: [29-01]` for sequential execution.

---

## Todo move timing

| Option | Description | Selected |
|--------|-------------|----------|
| Move both pending todos to completed in Plan 29-02's final task | Ensures move only after both plans verify | ✓ (recommended) |
| Move each todo when its plan completes | Incremental but messier atomic commit |  |

**Auto-selection:** recommended.

---

## Claude's Discretion

- Relative-time formatter implementation details
- Capability probe mechanism (HEAD vs metadata vs heuristic)
- PDF regression test strategy (snapshot vs structural)
- Toast timeout duration
- Normalizer file location

## Deferred Ideas

- Local full FHIR validator (out of scope)
- FHIR Validator Wrapper path shape (v1.5)
- Bundle `$validate` batch mode (v1.5)
- R5/R6 FHIR version support (R4-only constraint)
- SMART on FHIR (excluded by project scope)
- Other pending todos (MII Synthea, auto-connect, date-picker, pin-types) — v1.5 or separate phases
