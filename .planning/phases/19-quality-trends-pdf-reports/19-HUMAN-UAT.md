# Phase 19 — Human UAT Script

> Manual verification of PDF export and trend chart breach coloring per VALIDATION.md §Manual-Only Verifications.
> Run these steps after all automated tests pass.

## Pre-conditions
- `npm run dev` is running
- A Blaze FHIR server is reachable at the configured URL
- Quality metrics are computed (click `Recompute metrics` if stale)
- Browser devtools console is open to catch errors

## Test 1: Empty-state PDF (0 snapshots)
1. Open the browser's devtools → Application → Local Storage → remove `quality.trends.v1` (if present).
2. Navigate to `/quality`.
3. Click `Export PDF` in the toolbar.
4. Observe the button shows a loading spinner.
5. After ≤ ~5 seconds, a file should download.
6. Verify filename matches `fhir-exploder-quality-report_<slug>_<YYYY-MM-DD>_<HHMMSS>.pdf` (slug = your Blaze host-port).
7. Open the PDF. Confirm:
   - [ ] Page 1 shows cover with title `FHIR Exploder — Quality Report`, capture timestamp, server URL, sample size, cohort summary, `Local checks` badge
   - [ ] Page 2 shows `Overview` heading + 3×3 tile grid (Total resources / Distinct types / 7 metric rings all crisp, no clipping) + the italic line `*No trend history — capture snapshots on the Trends tab to include them in future reports.*`
   - [ ] NO page 3 (Trends section absent)
   - [ ] Every page footer shows `Generated ... · FHIR Exploder v...` left + `Page N of 2` right
8. Confirm a blue toast `Report downloaded` appeared on success.

## Test 2: With-trends PDF (≥2 snapshots)
1. Click `Capture snapshot` on the toolbar.
2. Wait ~5 seconds.
3. Click `Capture snapshot` again.
4. Observe toolbar button shows two blue toasts in sequence (`Snapshot captured`).
5. Click `Export PDF`.
6. Open the downloaded PDF. Confirm:
   - [ ] Page 3 exists and shows `Trends` heading + 7 mini charts
   - [ ] Each mini chart shows the metric name + line + dots (colored per threshold)
   - [ ] The summary line `N snapshots captured between <date1> and <date2>` renders at the bottom
   - [ ] Every footer shows `Page N of 3`

## Test 3: Trend chart breach coloring (visual)
1. Navigate to `/quality?tab=trends`.
2. Ensure at least 2 snapshots exist; capture more if needed.
3. Navigate to `/quality/thresholds`. Set `Completeness` threshold to 99. Back to `/quality?tab=trends`.
4. Click `Capture snapshot`.
5. On the Completeness mini chart, verify:
   - [ ] The most recent data point (the one just captured) is RED (score < 99%)
   - [ ] Earlier data points with lower stored thresholds are BLUE or RED based on THEIR per-capture threshold, NOT the current 99
   - [ ] Hovering a data point shows the tooltip with Score, Threshold, and `Breached` when applicable

## Test 4: Cross-server filter
*(Skip if only one Blaze instance available.)*
1. Capture 2 snapshots on server A (current settings.yaml).
2. Edit `settings.yaml` to point at server B. Reload.
3. Capture 2 snapshots on server B.
4. Navigate to `/quality?tab=trends`. Confirm:
   - [ ] Default view shows only server B's 2 snapshots (single-snapshot state may render if only 1 B snapshot)
   - [ ] Toggle `Include other servers` ON — all 4 snapshots appear
   - [ ] Tooltip on a data point shows a `Server: <slug>` line

## Test 5: Clear history flow
1. With ≥1 snapshot, click `Clear history` on the Trends tab toolbar.
2. Confirm modal opens with title `Clear all snapshots?`.
3. Click `Keep history`. Modal closes; snapshots intact.
4. Click `Clear history` again. Click the red `Clear history` button inside the modal.
5. Confirm blue toast `History cleared` appears, all snapshots removed, empty state renders.

## Sign-off
- [ ] Tests 1, 2, 3, 5 all pass — sign: ______
- [ ] Test 4 passes OR skipped due to single-server setup — sign: ______
