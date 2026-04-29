# Requirements — v1.6 Hardening, UX Polish & Carry-Overs

**Milestone:** v1.6
**Goal:** Close v1.5 tech-debt carry-overs, ship Explorer/Quality UX polish, and add two standards-track features (IPS Compositions, validator auth) without major redirection.
**Phase numbering:** Continues from 38.2 → starts at Phase 39.

---

## Theme 1 — v1.5 Closeout

- [x] **DEUT-01**: User-equivalent CI gate verifies palette+icon discriminability for the 21 MII module adjacent pairs under deuteranopia simulation. Headless Brettel/Machado JS matrix in Vitest renders the Dashboard tile grid + Patient-detail tab row + ClinicalTimeline at the post-Phase 34 HEAD, then asserts pairwise discriminability for all 21 adjacent pairs (especially borderline pair #7 mikrobiologie ↔ molekulargenetik HIGH, pair #12 pro ↔ seltene MEDIUM-HIGH). Closes Phase 37 deferred clause without a Chrome DevTools manual capture session.
- [ ] **NYQ-01**: All v1.5 phases lacking VALIDATION.md (phases 31, 33, 38) have one written retroactively, and the 5 v1.5 phases currently `nyquist_compliant: false` (32, 34, 35, 36, 37) are upgraded to `nyquist_compliant: true` via test backfill. `/gsd-validate-phase` invoked per phase; result tracked in v1.5 audit refresh.
- [ ] **AUDIT-01**: Phase 38.1 standalone `38.1-VERIFICATION.md` is written retroactively. Sources: 38.1-01-SUMMARY.md frontmatter (`re_walk: passed`, 6/6 tasks, +6 test baseline) + cascading evidence in 33-HUMAN-UAT.md (`fixed in Phase 38.1, commit <sha>` annotations on Tests 1, 2, 6). Status: `passed` with no gaps.

## Theme 2 — Explorer / Quality UX Polish

- [ ] **EXPL-01**: User can toggle "Hide empty resource types" on the Explorer resource-type landing page. Mantine `Switch` near the top, default off, persisted to `localStorage` key `explorer.hideEmptyResourceTypes.v1`. When on, types with `counts[type] === 0` collapse out of the list. Implementation site: `src/components/explorer/ResourceTypeLanding.tsx`. Promotes backlog Phase 999.1.
- [ ] **QUAL-01**: Quality completeness panel sorts resource types with no records (`pct === null`) to the bottom regardless of sort direction (mirrors the existing `aSettled !== bSettled` pattern that pushes loading/error rows to the end). Treats `pct === null` as "not-applicable", not "worst possible". Same fix audited & applied to `CoveragePanel`, `ValidationPanel`, `ReferencesPanel` if they share the pattern. Implementation site: `src/components/quality/CompletenessPanel.tsx` `compareRows` (~line 59). Promotes backlog Phase 999.2.
- [ ] **QUAL-02**: Per-type quality matrix card renders a heat-column gradient on each metric column (Complete% / Coverage% / Validation% / References%): green at 100% → yellow at threshold → red below threshold. Accessible (color is supplemented by the existing `<SortableTh>` numeric value). Threshold pulled from `useThresholds()` per metric. Implementation site: `src/components/quality/QualityByTypeMatrix.tsx`.
- [ ] **QUAL-03**: User can export the per-type quality matrix as CSV via a "Download CSV" button on the matrix card. Headers match the visible columns; sparse cells render empty (NOT `0%`); BOM-prefixed UTF-8 for Excel compatibility. Filename pattern: `quality-matrix-{server-host}-{YYYY-MM-DD}.csv`. Implementation site: `src/components/quality/QualityByTypeMatrix.tsx`.
- [ ] **MII-EXT-15**: Patient-detail extension-module tabs show pre-probed counts on tab labels (e.g. `Onkologie (12)`) so the user knows which extension tabs have data before clicking. Probe is a single FHIR `_summary=count` request per extension module, fired in parallel on patient mount, with results cached per `(patientId, moduleId)` for the session. Tab labels with zero count render dimmed with `(0)`. Continues v1.5's MII extension series.

## Theme 3 — Validator Hardening

- [ ] **VAL-06**: External validator HTTP tier supports HTTP Basic and Bearer authentication. `validation.externalValidator.auth: { type: 'basic' | 'bearer', credentials: string }` schema added to `settings.yaml`; `cascadingValidator.tryExternal` injects `Authorization` header before fetch. Bearer tokens stored in `localStorage` (NEVER in settings.yaml on disk) per a new `validator.bearerToken.v1` key. Banner copy in `ValidationPanel` updates to reflect that auth is in use. Extends Phase 31's VAL-01..05.
- [ ] **VAL-07**: External validator UX-01 cascade detects semantic near-misses for codes in `OperationOutcome.issue` by walking the SNOMED CT and ICD-10 hierarchy. When a code is rejected as `error/code-invalid`, walker queries the configured terminology server for ancestors/descendants up to depth 3, surfaces "Did you mean?" suggestions in the issue panel. Behavior is opt-in via `validation.externalValidator.semanticNearMisses: boolean` (default false). Implementation site: `src/quality/cascadingValidator.ts` + `src/quality/normalizers.ts`. Continues Phase 31's UX-01 work.

## Theme 4 — Standards & Stack

- [ ] **IPS-01**: User can validate a FHIR resource bundle against the IPS (International Patient Summary) Composition profile and see `OperationOutcome` issues for "Empty Sections and Missing Data" patterns. Bundle validation entry-point added to `ValidationPanel` (or a new `IPSPanel`). IPS profile shipped via `fhir-package-loader` (same mechanism as MII extensions in Phase 34). Per-section drill-down reuses Phase 15's `ResourceIssueTable`.
- [ ] **STACK-01**: Mantine 9 upgrade — bumps `@mantine/core`, `@mantine/hooks`, `@mantine/notifications`, `@mantine/spotlight` to ^9.x and `@mantine/charts` to the matching version. Requires React 19 (also in scope for this phase). Pre-flight gate: `@medplum/react` peer-dep range must allow Mantine 9 + React 19; if not, phase defers to v1.7 with a `WAIVE-AND-DEFER` decision recorded. Test gate: 1064+ passing post-upgrade with no visual regressions; `tsc -b --noEmit` clean; `npm run build` clean. Bundle-size gate: ±10% gz delta from v1.5 baseline (606.76 KB).

---

## Cross-Cutting Verification (every phase)

- [ ] Test baseline preserved: `npm test` shows 1064+ passing / 0 failed after every atomic commit.
- [ ] `npm run build` exits clean (tsc -b + vite).
- [ ] Live-Blaze UAT per phase that touches user-visible behavior (smoke test at minimum).
- [ ] Design token compliance grep: `grep -rn 'color: #' src/ --include='*.tsx'` returns 0 new hits; no new `color="indigo"` literal outside Mantine theme primitives.

---

## Future Requirements (deferred beyond v1.6)

_Captured for visibility; not in v1.6 scope._

- **Federated cohort queries** (server-side CQL execution) — v1.3 deferred, no demand surfaced
- **Cohort versioning / audit history** — v1.3 deferred
- **Phenotype-style multi-criteria builder** — v1.3 deferred
- **Multi-server simultaneous browsing** — out of scope per PROJECT.md

---

## Out of Scope (explicit non-requirements)

- **Write operations** (creating/updating/deleting FHIR resources) — read-only explorer
- **User authentication for the app itself** — local-only tool
- **SMART on FHIR launch context** — direct Blaze access
- **genomDE → MII CDS mapping pipeline** — moved to a separate project (2026-04-29)
- **Auto-populate `validator.fhir.org` as default external validator URL** — anti-feature (creates unexpected network calls)
- **Retry-with-backoff on 5xx from external validator** — anti-feature (added complexity without predictable value)

---

## Traceability (REQ-ID → Phase)

| REQ-ID | Phase | Depends on |
|--------|-------|------------|
| NYQ-01 | Phase 39 | — |
| AUDIT-01 | Phase 39 | — |
| DEUT-01 | Phase 40 | — |
| EXPL-01 | Phase 41 | — |
| QUAL-01 | Phase 41 | — |
| QUAL-02 | Phase 41 | (consumes Phase 35 matrix card) |
| QUAL-03 | Phase 41 | (consumes Phase 35 matrix card) |
| MII-EXT-15 | Phase 42 | (consumes Phase 33 helpers + Phase 34 modules) |
| VAL-06 | Phase 43 | VAL-01..05 (Phase 31) |
| VAL-07 | Phase 43 | VAL-01..05 (Phase 31) |
| IPS-01 | Phase 44 | (uses Phase 34's fhir-package-loader scaffolding + Phase 15 ResourceIssueTable) |
| STACK-01 | Phase 45 | — (peer-dep gate; may defer to v1.7) |

**Coverage:** 12/12 v1.6 requirements mapped to exactly one phase ✓

## Sources

- v1.5 audit: [.planning/milestones/v1.5-MILESTONE-AUDIT.md](milestones/v1.5-MILESTONE-AUDIT.md) — surfaced DEUT-01, NYQ-01, AUDIT-01
- v1.5 backlog: phases 999.1, 999.2 in pre-archive ROADMAP.md — promoted as EXPL-01, QUAL-01
- v1.5 deferred items list: pre-archive ROADMAP.md §Deferred Items — surfaced QUAL-02, QUAL-03, VAL-06, VAL-07, IPS-01, STACK-01, MII-EXT-15
- v1.5 archive: [.planning/milestones/v1.5-ROADMAP.md](milestones/v1.5-ROADMAP.md), [.planning/milestones/v1.5-REQUIREMENTS.md](milestones/v1.5-REQUIREMENTS.md)
