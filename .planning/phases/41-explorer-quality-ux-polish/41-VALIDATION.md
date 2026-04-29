---
phase: 41
slug: explorer-quality-ux-polish
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-29
audited: 2026-04-29
---

# Phase 41 — Validation Strategy

> Reconstructed retroactively (State B) by `/gsd-validate-phase 41`. Originally Phase 41 shipped without VALIDATION.md; SUMMARY-level coverage was already in place via colocated regression suites for all 4 REQ-IDs. The single Nyquist gap (UAT-driven inline addition of a Switch on `ResourceTypeRail.tsx`) was filled in this audit pass.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.x |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm test -- --run <pattern>` |
| **Full suite command** | `npm test -- --run` |
| **Estimated runtime** | ~11 seconds (1157 tests, 124 files) |

---

## Sampling Rate

- **After every task commit:** Run colocated test pattern (e.g. `npm test -- --run ResourceTypeLanding`)
- **After every plan wave:** Run subsystem (`npm test -- --run src/components/{explorer,quality}/`)
- **Before `/gsd-verify-work`:** Full suite must show 1134+ green / 1 expected fail (pair #13 deuteranopia)
- **Max feedback latency:** ~12 seconds for full suite

---

## Per-REQ Verification Map

| REQ-ID | Plan | Surface | Test File | Test Count | Automated Command | Status |
|--------|------|---------|-----------|------------|-------------------|--------|
| EXPL-01 | 41-01 | `ResourceTypeLanding.tsx` (right-hand page) | `src/components/explorer/__tests__/ResourceTypeLanding.test.tsx` | 6 | `npm test -- --run ResourceTypeLanding` | ✅ green |
| EXPL-01 | 41-01 + UAT | `ResourceTypeRail.tsx` (left-rail twin, added 2026-04-29 inline fix) | `src/components/explorer/__tests__/ResourceTypeRail.test.tsx` | 6 | `npm test -- --run ResourceTypeRail` | ✅ green (gap-fill 2026-04-29) |
| QUAL-01 | 41-02 | `CompletenessPanel.tsx` (per-type sortable matrix) | `src/components/quality/__tests__/CompletenessPanel.compareRows.test.tsx` | 3 | `npm test -- --run CompletenessPanel.compareRows` | ✅ green |
| QUAL-01 | 41-02 | `CodingCoveragePanel.tsx` (per-type sortable matrix) | `src/components/quality/__tests__/CodingCoveragePanel.compareRows.test.tsx` | 2 | `npm test -- --run CodingCoveragePanel.compareRows` | ✅ green |
| QUAL-02 | 41-03 | `QualityByTypeMatrix.tsx` heat gradient | `src/components/quality/__tests__/QualityByTypeMatrix.heatGradient.test.tsx` | 6 | `npm test -- --run QualityByTypeMatrix.heatGradient` | ✅ green |
| QUAL-03 | 41-03 | `QualityByTypeMatrix.tsx` CSV export + filename | `src/components/quality/__tests__/QualityByTypeMatrix.csvExport.test.tsx` | 12 | `npm test -- --run QualityByTypeMatrix.csvExport` | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**Total Phase-41 colocated tests:** 35 (6 EXPL-01-Landing + 6 EXPL-01-Rail + 3 QUAL-01-Completeness + 2 QUAL-01-Coding + 6 QUAL-02 + 12 QUAL-03).

---

## Threat-Mitigation Test Coverage

| Threat ID | Disposition | Test Lock | Status |
|-----------|-------------|-----------|--------|
| T-41-01-01 (localStorage tampering) | accept | N/A — accepted disposition | covered by SECURITY.md |
| T-41-01-02 (Switch UI disclosure) | accept | N/A — accepted disposition | covered by SECURITY.md |
| T-41-02-01 (compareRows export) | accept | Pure-function tests assert no side effects | covered by 5 colocated tests |
| T-41-03-01 (CSV view-only) | accept | N/A — accepted disposition | covered by SECURITY.md |
| T-41-03-02 (filename injection) | mitigate | `replace(/[^a-z0-9.-]/g, '-')` regex locked | covered by `QualityByTypeMatrix.csvExport.test.tsx` filename pattern assertions |
| T-41-03-03 (Excel formula injection) | accept | N/A — out-of-scope per CONTEXT D-21 | covered by SECURITY.md |

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new framework install needed; Vitest + Mantine `MantineProvider` + `MemoryRouter` test scaffolding already in place from Phases 21+ (per `src/components/quality/__tests__/`).

---

## Manual-Only Verifications

| Behavior | REQ-ID | Why Manual | Test Instructions |
|----------|--------|------------|-------------------|
| Visual heat-gradient color rendering at runtime | QUAL-02 | Mantine theme tokens (`--mantine-color-{green,yellow,red}-{1,9}`) resolve at runtime; jsdom asserts inline-style strings, not actual rendered backgrounds | UAT Test 4 (passed 2026-04-29): browser sees green/yellow/red bands matching threshold breakpoints |
| CSV file download triggered to OS file system | QUAL-03 | Browser anchor-click → blob download is OS-level and not testable in jsdom (the BlobPart + filename pattern ARE tested but the actual file-write is not) | UAT Test 5 (passed 2026-04-29): file appears in Downloads folder with correct filename and content |
| localStorage persistence across actual page reload | EXPL-01 | jsdom-backed `localStorage` is per-test; cross-page-reload state is end-to-end | UAT Test 1 (passed 2026-04-29): F5/Cmd-R preserves Switch state on both surfaces |

---

## Validation Audit 2026-04-29

| Metric | Count |
|--------|-------|
| REQ-IDs total | 4 (EXPL-01, QUAL-01, QUAL-02, QUAL-03) |
| Surfaces total | 6 (4 REQs × varying surface counts; EXPL-01 spans 2 surfaces, QUAL-01 spans 2) |
| Gaps found | 1 (ResourceTypeRail Switch — UAT-driven inline addition) |
| Gaps resolved | 1 (`ResourceTypeRail.test.tsx` written, 6/6 pass) |
| Gaps escalated to manual | 0 |
| Threat mitigations tested | 1/1 (T-41-03-02 regex lock) |

---

## Validation Sign-Off

- [x] All REQ-IDs have automated verify (no `<command>` placeholders left)
- [x] Sampling continuity: no 3 consecutive surfaces without automated verify
- [x] Wave 0 covered (existing infrastructure sufficient)
- [x] No watch-mode flags in any command
- [x] Feedback latency well under 12s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-04-29 (auto-validated; gap-fill applied + audit run inline)
