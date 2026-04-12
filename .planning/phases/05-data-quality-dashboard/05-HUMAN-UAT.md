---
status: partial
phase: 05-data-quality-dashboard
source: [05-VERIFICATION.md]
started: 2026-04-12T12:15:00Z
updated: 2026-04-12T12:15:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. End-to-end Counts dashboard against live Blaze
expected: `/quality` shows OverviewStrip Card 1 (total resources) and Card 2 (non-empty type count). ResourceCountsPanel lists every CapabilityStatement type with inline Progress bar scaled to largest count. "Show empty types" toggle works. Sortable columns interact correctly.
result: [pending]

### 2. Completeness tab shows worst-first sorted MII analysis
expected: Disclosure banner present. Each row has a 48px RingProgress with integer %, populated/total counts, sample size, MII profile name (or "Structural (min>=1)" fallback). Drill-down at `/quality/completeness/Condition` shows per-path Progress rows with "{pct}% ({count}/{sampleSize})" captions.
result: [pending]

### 3. Coding Coverage tab displays stacked 3-bucket bars
expected: Legend shows blue/orange/red swatches for system+code / text-only / empty. Each row has a stacked 3-segment Progress.Root bar. Drill-down shows example CodeableConcepts rendered via `CodeableConceptDisplay` (with resolved display values when terminology server reachable).
result: [pending]

### 4. Validation tab warning banner + batch run
expected: Dismissible orange warning banner shows "Blaze does not implement $validate…" Backend indicator shows Structural (blue) + Remote (not configured) (gray). Select "Condition" → click "Validate sample" → live progress bar + live region announces progress → issues appear severity-sorted with clickable `/explorer/{type}/{id}` links. Cancel preserves partial results with yellow cancellation alert. "Export report (JSON)" downloads a timestamped file.
result: [pending]

### 5. Remote validator respects T-05-05-02 safety boundary (optional)
expected: Add `validation.validatorUrl: https://validator.fhir.org/validator` to settings.yaml, restart app, click "Validate sample" on Validation tab. Network tab in devtools shows POST requests go to `validator.fhir.org` — NEVER to Blaze base URL. Backend indicator flips to Remote (configured) (green). Issues from both backends are deduplicated via `dedupeIssues`.
result: [pending]

### 6. Overview Strip Card 3/4 flip from em-dash to live percentages
expected: Initially show em-dash "—". As completeness batch settles, Card 3 flips to integer percentage (e.g. "72%"). As coverage batch settles, Card 4 flips (e.g. "84%"). Values are arithmetic means of per-type percentages across settled types with positive denominators.
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0
blocked: 0

## Gaps
