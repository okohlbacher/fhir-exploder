# Phase 19 — Deferred Items

Pre-existing issues discovered during Phase 19 execution but OUT OF SCOPE for the plans in this phase. Tracked here per the GSD deviation-rules SCOPE BOUNDARY (only fix issues directly caused by current task changes).

---

## Pre-existing TypeScript build errors (TS2352)

**Discovered during:** 19-01 Task 1 (`npm run build` verification after dep alignment)
**Files affected:**
- `src/quality/profileConformanceChecker.ts` (lines 139, 142, 143, 144, 147, 296)
- `src/quality/temporalPlausibilityWalker.ts` (line 439)

**Error signature:**
```
error TS2352: Conversion of type 'ElementDefinition' to type 'Record<string, unknown>' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
  Index signature for type 'string' is missing in type 'ElementDefinition'.
```

**Status at HEAD (before Phase 19 work):** These errors already existed at commit `fcc610f` (phase plan created). They are not caused by:
- `@mantine/charts@8.3.18` downgrade (proven — errors are in unrelated files with no Mantine imports)
- `jspdf@^4.2.1` addition (proven — errors are in unrelated files with no jspdf imports)

**Proof:** Verified by running `npm run build` against a clean checkout at `fcc610f` with `@mantine/charts@9.0.1` still installed — same errors reproduce.

**Root cause (likely):** TypeScript 5.7's stricter narrowing of `as Record<string, unknown>` conversions against typed union members. The `ElementDefinition` / `Resource` types from `@medplum/fhirtypes` now have enough surface to not sufficiently overlap with `Record<string, unknown>`.

**Fix pattern:** Change `(el as Record<string, unknown>)` to `(el as unknown as Record<string, unknown>)` — the double-cast the compiler suggests. Each occurrence is a one-line change.

**Deferred to:** A dedicated tech-debt plan. Not wired into any v1.2 requirement; does not block Plan 19-01, 19-02, or 19-03 since no new code in Phase 19 touches these files.
