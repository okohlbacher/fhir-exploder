/**
 * percentClean — shared helper for "% clean" rollups pushed by quality
 * panels (Validation, Plausibility, LabRanges, Duplicates, References).
 *
 * Collapses two concerns into one helper:
 *   1. Guard invalid denominators (zero, negative, NaN, Infinity) → undefined.
 *      undefined signals "no data" to the OverviewStrip, which renders an
 *      em-dash per D-14. Do NOT push 0 in this case (pitfall 7 in
 *      18-RESEARCH.md).
 *   2. Clamp the result to [0, 100]. If `affected` legitimately exceeds
 *      `total` (e.g., cluster membership counts overflow the sample
 *      denominator) the arithmetic can go negative, which would render as
 *      "-3%" on a tile and pass a negative `ringValue` to Mantine's
 *      RingProgress — the section would disappear or wrap. Clamping keeps
 *      the display honest.
 *
 * See 18-REVIEW.md WR-01 for rationale.
 */

export function percentClean(affected: number, total: number): number | undefined {
  if (!Number.isFinite(total) || total <= 0) return undefined;
  if (!Number.isFinite(affected)) return undefined;
  const pct = Math.round((1 - affected / total) * 100);
  return Math.max(0, Math.min(100, pct));
}
