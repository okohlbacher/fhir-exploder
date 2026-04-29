---
phase: 41
slug: explorer-quality-ux-polish
status: verified
threats_open: 0
asvs_level: 1
created: 2026-04-29
---

# Phase 41 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
> Source: 41-01-PLAN.md §threat_model + 41-02-PLAN.md §threat_model + 41-03-PLAN.md §threat_model + 2026-04-29 UAT-driven inline fix in ResourceTypeRail.tsx.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Browser ↔ localStorage | `explorer.hideEmptyResourceTypes.v1` — single boolean, shared between ResourceTypeLanding (right) and ResourceTypeRail (left) Switches | non-PHI client-side preference |
| Browser ↔ Filesystem | CSV blob download via anchor click; same-origin, user-initiated, no upload | already-rendered matrix data (non-new) |
| Browser ↔ FHIR server | `client.getBaseUrl()` read-only; no new auth path | server URL string only |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-41-01-01 | Tampering | localStorage key `explorer.hideEmptyResourceTypes.v1` | accept | Single boolean controlling client-side row filtering only — no security boundary. Worst case: malicious script flips toggle. No network call, no PHI exposure. | closed |
| T-41-01-02 | Information Disclosure | Switch UI rendering (Landing + Rail) | accept | Toggle reveals existence of empty resource types — already visible to anyone with explorer access. No new disclosure. | closed |
| T-41-02-01 | Tampering | `compareRows` + `toRow` exported from CompletenessPanel + CodingCoveragePanel for testing | accept | Pure functions, no side effects; export expands test surface only. No security boundary crossed. | closed |
| T-41-03-01 | Information Disclosure | CSV export contents | accept | CSV contains only data the user is already viewing on screen — same content as the rendered matrix. No PHI escapes that wasn't already rendered. | closed |
| T-41-03-02 | Tampering | Filename injection via `client.getBaseUrl()` | mitigate | `buildMatrixCsvFilename` at `src/components/quality/QualityByTypeMatrix.tsx:174` sanitizes via `host.toLowerCase().replace(/[^a-z0-9.-]/g, '-')` before concatenation. Locked by 12 colocated CSV-export tests. | closed |
| T-41-03-03 | Tampering | CSV cell injection (Excel formula injection via `=`/`+`/`-`/`@` prefix) | accept | Out of scope per CONTEXT D-21 fixture (no formula-prefix test). v1.7+ candidate if a real attacker model emerges. Per-cell `csvEscape` handles only quote/comma/newline escaping. | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

### UAT-driven inline fix coverage

The 2026-04-29 inline fix that added a matching Switch on `ResourceTypeRail.tsx` and flipped both Switches' default to ON does not introduce a new attack surface. T-41-01-01 and T-41-01-02 (already documented for the Landing Switch and the same localStorage key) cover the new rail surface verbatim — same key, same boolean, same UI category.

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-41-01 | T-41-01-01 | Client-side preference flag with no PHI; localStorage tampering grants no privilege escalation | phase-41 PLAN | 2026-04-29 |
| AR-41-02 | T-41-01-02 | Empty resource types are already rendered visibly; toggle reveals nothing not already on screen | phase-41 PLAN | 2026-04-29 |
| AR-41-03 | T-41-02-01 | Test seam exposure of pure function; no side effects | phase-41 PLAN | 2026-04-29 |
| AR-41-04 | T-41-03-01 | CSV export of data already rendered on screen; no privilege boundary | phase-41 PLAN | 2026-04-29 |
| AR-41-05 | T-41-03-03 | Excel formula injection deferred per CONTEXT D-21 — re-evaluate at v1.7 if attacker model surfaces | phase-41 PLAN | 2026-04-29 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-04-29 | 6 | 6 | 0 | gsd-secure-phase (skip-auditor short-circuit; threats_open: 0 after disposition + code verification) |

### Audit notes

- 5/6 threats are `accept`-disposition with documented rationale → CLOSED by disposition.
- 1/6 threat (T-41-03-02) is `mitigate`-disposition → verified inline by grep against `src/components/quality/QualityByTypeMatrix.tsx`: the sanitization regex `replace(/[^a-z0-9.-]/g, '-')` is present at line 174 inside `buildMatrixCsvFilename`. 12 colocated regression tests (`QualityByTypeMatrix.csvExport.test.tsx`) lock the filename pattern.
- No auditor agent spawned — Step 3 short-circuit (`threats_open: 0` after classification).

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter
