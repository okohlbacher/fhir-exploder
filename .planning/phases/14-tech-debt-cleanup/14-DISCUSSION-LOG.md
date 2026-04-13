# Phase 14: Tech Debt Cleanup - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-13
**Phase:** 14-tech-debt-cleanup
**Areas discussed:** Fix strategy

---

## Fix Strategy

### Borderline Info Findings

| Option | Description | Selected |
|--------|-------------|----------|
| Fix all 17 (Recommended) | Address every info finding as written in the review, including minor optimizations. For IN-08 (shared cache), add the TODO comment as suggested rather than building the cache. | ✓ |
| Triage first | Review each finding and mark some as won't-fix if they'd introduce scope creep or risk regressions. | |
| Mechanical only | Only fix dead code, unused imports, and trivially safe changes. Skip anything that changes runtime behavior. | |

**User's choice:** Fix all 17 (Recommended)
**Notes:** None

### Todo Folding

| Option | Description | Selected |
|--------|-------------|----------|
| Fold all 4 (Recommended) | All 4 are TypeScript error fixes that must be resolved anyway for zero-error build. Folding avoids duplicate work. | ✓ |
| Keep separate | Leave todos as standalone items, fix only what the review findings and build errors require. | |

**User's choice:** Fold all 4 (Recommended)
**Notes:** None

### TypeScript Fix Style

| Option | Description | Selected |
|--------|-------------|----------|
| Utility helper (Recommended) | Create a small toRecord(resource) or similar utility that does the 'as unknown as Record<string,unknown>' cast once, used everywhere. Reduces noise. | ✓ |
| Inline each | Fix each cast site with 'as unknown as Record<string,unknown>'. More explicit, no new abstraction. | |
| You decide | Claude picks the cleanest approach per error site. | |

**User's choice:** Utility helper (Recommended)
**Notes:** None

---

## Claude's Discretion

- Utility helper naming and location
- Fix ordering strategy
- Test vs source file separation

## Deferred Ideas

None — discussion stayed within phase scope
