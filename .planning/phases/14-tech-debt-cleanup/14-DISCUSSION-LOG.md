# Phase 14: Tech Debt Cleanup - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md -- this log preserves the alternatives considered.

**Date:** 2026-04-13
**Phase:** 14-tech-debt-cleanup
**Areas discussed:** Fix strategy (session 1), Review file access, Fix prioritization, Test error strategy, Utility helper scope (session 2 -- update)

---

## Session 1 (Initial Context Capture)

### Fix Strategy -- Borderline Info Findings

| Option | Description | Selected |
|--------|-------------|----------|
| Fix all 17 (Recommended) | Address every info finding as written in the review. For IN-08, add TODO comment. | ✓ |
| Triage first | Review each finding and mark some as won't-fix. | |
| Mechanical only | Only fix dead code, unused imports, trivially safe changes. | |

**User's choice:** Fix all 17

### Todo Folding

| Option | Description | Selected |
|--------|-------------|----------|
| Fold all 4 (Recommended) | All 4 are TS error fixes that must be resolved anyway. | ✓ |
| Keep separate | Leave todos as standalone items. | |

**User's choice:** Fold all 4

### TypeScript Fix Style

| Option | Description | Selected |
|--------|-------------|----------|
| Utility helper (Recommended) | Create toRecord() utility for the cast. | ✓ |
| Inline each | Fix each cast site individually. | |
| You decide | Claude picks per error site. | |

**User's choice:** Utility helper

---

## Session 2 (Context Update -- Revised Error Analysis)

### Review File Access

| Option | Description | Selected |
|--------|-------------|----------|
| Exact commit SHAs | Use 'git show 46e2c82:' and 'git show 2596316:' -- precise and reliable | ✓ |
| Restore files temporarily | Check out review files into phase directory | |
| Inline the findings | Copy 17 info findings directly into CONTEXT.md | |

**User's choice:** Exact commit SHAs
**Notes:** Review files deleted during milestone archival. Previous context incorrectly referenced `git show HEAD:<path>`.

### Fix Prioritization

| Option | Description | Selected |
|--------|-------------|----------|
| Quick wins first | testing-library types (31) -> unused vars (4) -> Resource casts (17) -> info findings (17) | ✓ |
| Source before tests | Info findings + source TS errors first, then test files | |
| You decide | Claude picks optimal order | |

**User's choice:** Quick wins first
**Notes:** Error breakdown revised: 31 TS2305 (testing-library), 17 TS2352 (Resource casts), 4 TS6133 (unused), 1 TS2345, 1 other.

### Test Error Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Install @testing-library/dom | Add as dev dependency so re-exports resolve. 31 errors cleared. | ✓ |
| Add skipLibCheck in tests | Suppress type errors. Tests run but aren't type-checked. | |
| You decide | Claude picks cleanest approach | |

**User's choice:** Install @testing-library/dom

### Utility Helper Scope

**Q1: Does toRecord() still make sense given revised error breakdown?**

| Option | Description | Selected |
|--------|-------------|----------|
| Keep toRecord() as planned | Covers 17 TS2352 + ~45 existing inline casts | |
| Skip helper, inline fix | Add `as unknown as Record` at 17 sites | |
| Broader utility module | fhir-helpers.ts with toRecord() + other FHIR helpers | ✓ |

**Q2: How far should the utility module go?**

| Option | Description | Selected |
|--------|-------------|----------|
| toRecord() + getCodeDisplay() | Two most repeated patterns (4+ files each) | ✓ |
| Just toRecord() | Minimal scope | |
| All three helpers | toRecord(), getCodeDisplay(), getDateFromResource() | |

**User's choice:** toRecord() + getCodeDisplay()
**Notes:** Date extraction left as-is (more context-dependent).

---

## Claude's Discretion

- Exact naming and location of utility functions
- Fix ordering within quick-wins-first strategy
- Implementation details of getCodeDisplay() (return type, null handling)

## Deferred Ideas

None -- discussion stayed within phase scope
