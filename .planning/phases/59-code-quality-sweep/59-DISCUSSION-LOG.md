# Phase 59: Code Quality Sweep - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-11
**Phase:** 59-code-quality-sweep
**Areas discussed:** BasePathContext design (FIX-01)

---

## Areas Selected for Discussion

| Option | Description | Selected |
|--------|-------------|----------|
| BasePathContext design (FIX-01) | ReferenceLink needs patient-aware hrefs for middle-click | ✓ |
| Commit granularity | One commit per fix vs. one grouped commit | |
| FIX-06 throw scope | Fix only line 30 vs. audit all throws | |

**Notes:** 7 of the 8 fixes have exact, unambiguous specs from REQUIREMENTS.md. Commit granularity and FIX-06 scope were identified as potential gray areas but user opted not to discuss them — defaults applied (atomic per-fix commits; fix only the identified line 30).

---

## BasePathContext design (FIX-01)

### What does BasePathContext expose?

| Option | Description | Selected |
|--------|-------------|----------|
| basePath string | Full prefix string, e.g. `/patients/abc123` or `/explorer`. ReferenceLink builds `${basePath}/${type}/${id}` | ✓ |
| patientId only | `string \| null`. ReferenceLink conditionally builds patient URL, falls back to buildExplorerHref | |

**User's choice:** basePath string (Recommended)
**Notes:** Cleanest — unifies both scopes without conditional logic. Provider in ResourceDetailPage already has this value (computed at line 64).

### Where should BasePathContext.Provider be placed?

| Option | Description | Selected |
|--------|-------------|----------|
| ResourceDetailPage | Narrowest correct scope — basePath computed here; subtree renders ReferenceLink | ✓ |
| Route layout wrapper | Higher up in component tree; broader scope but basePath unavailable there | |

**User's choice:** ResourceDetailPage (Recommended)
**Notes:** Follows PeekContext and ExpertModeContext provider placement precedent.

---

## Claude's Discretion

- **Commit granularity:** One atomic commit per fix (clean git history, easy bisect). User did not select this gray area for discussion, so defaulting to the more defensible choice.
- **FIX-06 scope:** Fix only the identified line 30 in ConnectionContext.tsx. No broader audit.
- **FIX-04 pattern import:** Import `FHIR_ID_PATTERN` from `referenceUrl.ts` — already exported there, no need to redefine locally.
- **FIX-03 exact check:** Use `basePath === '/patients' || basePath.startsWith('/patients/')` (not the broader `startsWith('/patients')`).

## Deferred Ideas

None mentioned during discussion.
