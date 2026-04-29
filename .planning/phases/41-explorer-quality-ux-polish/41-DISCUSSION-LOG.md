# Phase 41: Explorer + Quality UX polish — Discussion Log

> **Audit trail only.** Decisions captured in CONTEXT.md.

**Date:** 2026-04-29
**Phase:** 41-explorer-quality-ux-polish
**Mode:** `--auto` (recommended defaults auto-selected)
**Areas discussed:** EXPL-01 toggle, QUAL-01 sort behavior, QUAL-02 gradient, QUAL-03 CSV export

---

## EXPL-01 — Hide empty resource types toggle

| Decision | Options considered | Selected |
|----------|-------------------|----------|
| Control type | Mantine Switch / Mantine Checkbox / SegmentedControl | **Switch** (matches v1.5 idiom) |
| Placement | Above list right-aligned / inline with list / sidebar control | **Above list right-aligned** |
| Default state | Off / On / Persisted-from-yesterday | **Off** (preserves existing behavior) |
| localStorage key | per REQUIREMENTS.md | `explorer.hideEmptyResourceTypes.v1` |
| No-zeros UX | Hide toggle / show disabled / show enabled (no-op) | **Show disabled with tooltip** |

## QUAL-01 — N/A rows sort to bottom

| Decision | Options considered | Selected |
|----------|-------------------|----------|
| N/A predicate | `pct === null` / `total === 0` / both | **`pct === null`** (existing convention) |
| Sort behavior | N/A always last / N/A reverses with dir / N/A configurable | **N/A always last** (mirrors `aSettled` pattern) |
| Multi-panel scope | Only CompletenessPanel / All 4 panels with audit verdict | **All 4 panels with per-panel verdict in SUMMARY** |
| Visual indicator | Dimmed text / "—" badge / gray background row | **Em-dash + dimmed (Phase 38.2 convention)** |

## QUAL-02 — Heat-column gradient

| Decision | Options considered | Selected |
|----------|-------------------|----------|
| Color scheme | 3-stop (green/yellow/red) / 5-stop / continuous gradient | **3-stop using Mantine theme tokens** |
| Threshold source | New per-cell logic / reuse `useThresholds().isBreached` | **Reuse `useThresholds().isBreached`** |
| A11y | Add ARIA labels / supplement existing numeric value | **Supplement only — numeric value is primary** |
| Implementation | CSS module / inline style / theme component override | **Inline style on Table.Td** (localized diff) |

## QUAL-03 — CSV export

| Decision | Options considered | Selected |
|----------|-------------------|----------|
| Button placement | Card header / row above table / floating | **Card header right-aligned** |
| Button variant | primary / default / subtle / light | **subtle** (matches matrix card visual rhythm) |
| Encoding | UTF-8 / UTF-8 + BOM / UTF-16 LE | **UTF-8 + BOM** (Excel compat per REQUIREMENTS) |
| Sparse-cell representation | `0%` / `0` / empty / `—` | **empty (NOT 0%)** |
| Filename pattern | per REQUIREMENTS | `quality-matrix-{server-host}-{YYYY-MM-DD}.csv` |
| Download mechanism | new file-saver dep / inline Blob+anchor / reuse `downloadString` | **Inline Blob+anchor** (or reuse if exists) |
| Export scope | All rows / current visible/sorted | **Current visible/sorted** |

---

## Claude's Discretion (deferred to planner)

- Toggle helper-text wording ("Hide empty (N)" vs alternatives)
- Mantine shade choice for QUAL-02 backgrounds (shade-1 vs shade-2)
- Button variant fine-tuning for QUAL-03 (subtle vs default)
- QUAL-01 row-styling scope (whole row vs metric column only)

## Deferred Ideas

- "Export all rows" toggle in QUAL-03 (v1.7+ candidate)
- Heat-column gradient extension to Counts table (out of scope)
- CSV including sort-marker metadata (out of scope)
- Per-row expansion in QualityByTypeMatrix (out of scope)
