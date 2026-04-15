---
phase: 19
slug: quality-trends-pdf-reports
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-14
---

# Phase 19 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Populated from `19-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.4 + @testing-library/react 16.3.2 + jsdom 29.0.2 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm run test -- src/quality` |
| **Full suite command** | `npm run test` |
| **Estimated runtime** | ~10 seconds quick / ~60 seconds full |

---

## Sampling Rate

- **After every task commit:** `npm run test -- src/quality/trendsHistory.test.ts src/quality/pdf-filename.test.ts src/quality/trends-breach.test.ts` (~1 sec, pure-function tests)
- **After every plan wave:** `npm run test -- src/quality src/__tests__/trends src/__tests__/pdf` (~10 sec)
- **Before `/gsd-verify-work`:** Full suite `npm run test` must be green + `npm run build` (tsc -b clean)
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 19-01 / T1 | 01 | 1 | QUAL-05, QUAL-06 | T-19-01, T-19-02 | Peer-valid deps + jsPDF/Mantine charts importable | integration (npm) | `npm ls @mantine/charts @mantine/core jspdf 2>&1 \| grep -vE "^(npm warn\|$)" \| grep -v invalid && npm run build` | Wave 0 — package.json exists | ⬜ planned |
| 19-01 / T2 | 01 | 1 | QUAL-05, QUAL-06 | T-19-02, T-19-05 | Snapshot type + pure helpers (filename sanitization, breach flag, server filter) round-trip correctly | unit (vitest) | `npm run test -- src/quality/__tests__/trendsHistory.test.ts src/quality/__tests__/capture-snapshot.test.ts src/quality/__tests__/pdf-filename.test.ts src/quality/__tests__/trends-breach.test.ts src/quality/__tests__/trends-filter.test.ts` | Wave 0 — 5 test files | ⬜ planned |
| 19-02 / T1 | 02 | 2 | QUAL-05 | T-19-07, T-19-09 | `useTrendsHistory` hydrates, corrupt payload → `[]` + warn, `QuotaExceededError` surfaces red toast | hook (vitest + @testing-library) | `npm run test -- src/__tests__/use-trends-history.test.tsx` | Wave 0 — test stub | ⬜ planned |
| 19-02 / T2 | 02 | 2 | QUAL-05 | T-19-07, T-19-08, T-19-10, T-19-11, T-19-12 | Trends tab renders 0/1/N states, Overlay mode, Include-other-servers filter with per-server shape disambiguation (UI-SPEC I-07), Clear history modal, soft-warning at >500 | component (vitest + @testing-library) | `npm run test -- src/__tests__/trends-panel.test.tsx src/__tests__/use-trends-history.test.tsx` | Wave 0 — test stub | ⬜ planned |
| 19-03 / T1 | 03 | 3 | QUAL-05, QUAL-06 | T-19-13, T-19-14, T-19-15, T-19-16, T-19-17 | `PdfReportLayout` renders 2 or 3 pages conditionally; `exportQualityPdf` orchestrates portal→fonts→rAF×2→toPng×N→jsPDF.save→cleanup with try/finally | unit + layout (vitest + mocks) | `npm run test -- src/__tests__/pdf-report-layout.test.tsx src/quality/__tests__/pdfExport.test.ts` | Wave 0 — test stubs | ⬜ planned |
| 19-03 / T2 | 03 | 3 | QUAL-05, QUAL-06 | T-19-18, T-19-19 | `/quality` toolbar Capture + Export buttons wired; TrendsPanel receives `onCapture`; error path surfaces red toast | full suite (vitest + tsc) | `npm run test && npm run build` | — (edits existing files) | ⬜ planned |
| 19-03 / T3 | 03 | 3 | QUAL-05, QUAL-06 | T-19-13, T-19-20 | Human UAT: end-to-end PDF export, breach coloring (D-11), cross-server filter, Clear history flow | manual (checkpoint:human-verify) | `19-HUMAN-UAT.md` script (manual — jsdom cannot render canvas) | `19-HUMAN-UAT.md` created by T2 | ⬜ planned |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `npm install @mantine/charts@8.3.18 jspdf@^4.2.1` — fix peer-invalid state + add PDF lib
- [ ] `src/quality/trendsHistory.test.ts` — stubs for QUAL-05 serializer round-trip
- [ ] `src/quality/capture-snapshot.test.ts` — stubs for QUAL-05 snapshot factory
- [ ] `src/quality/pdf-filename.test.ts` — stubs for QUAL-06 filename sanitization
- [ ] `src/quality/trends-breach.test.ts` — stubs for QUAL-05 breach coloring
- [ ] `src/quality/trends-filter.test.ts` — stubs for QUAL-05 server filter predicate
- [ ] `src/quality/pdfExport.test.ts` — stubs for QUAL-06 orchestration (mock `html-to-image` + `jspdf`)
- [ ] `src/__tests__/use-trends-history.test.tsx` — stubs for QUAL-05 hook (ResizeObserver + matchMedia mocks copied from `thresholds-page.test.tsx`)
- [ ] `src/__tests__/trends-panel.test.tsx` — stubs for QUAL-05 UI (0/1/N snapshot states + soft-warning + quota-exceeded paths)
- [ ] `src/__tests__/pdf-report-layout.test.tsx` — stubs for QUAL-06 layout conditional rendering

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| End-to-end PDF generation against real DOM | QUAL-06 | jsdom lacks canvas — `html-to-image` `toPng()` cannot execute in headless test env | Capture 0, 1, and 5 snapshots on the Trends tab, click Export PDF, verify downloaded filename matches `fhir-exploder-quality-report_<slug>_<timestamp>.pdf`, open PDF and check: header page present, Overview section shows 7 tiles with rings + threshold annotations, Trends section present only when ≥2 snapshots, footer on every page. |
| Trend chart breach coloring (visual) | QUAL-05 | Per-point dot-renderer color correctness requires visual inspection across breach/clean/disabled states | Capture a snapshot with all thresholds enabled, tune thresholds up to force breach, capture again, verify red/blue/gray dots render per D-12. |
| Cross-server filter ("Include other servers") | QUAL-05 | Requires switching Blaze instance mid-session | Capture on server A, change settings.yaml to server B, reload, capture on server B, verify default view shows only B's snapshots and toggle reveals both with visual distinction. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (test stub files + dep install)
- [ ] No watch-mode flags in automated commands
- [ ] Feedback latency < 10s for per-task sampling
- [ ] `nyquist_compliant: true` set in frontmatter after planner fills Per-Task map

**Approval:** planner-signed 2026-04-14 — Per-Task map populated (7 rows: P01-T1, P01-T2, P02-T1, P02-T2, P03-T1, P03-T2, P03-T3), nyquist_compliant + wave_0_complete flipped to true. Pending human sign-off on UAT (see `19-HUMAN-UAT.md` created during Plan 03 Task 2).
