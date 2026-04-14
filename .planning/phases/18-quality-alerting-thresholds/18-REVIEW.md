---
phase: 18-quality-alerting-thresholds
reviewed: 2026-04-14T00:00:00Z
depth: standard
files_reviewed: 22
files_reviewed_list:
  - src/App.tsx
  - src/__tests__/duplicates-panel.test.tsx
  - src/__tests__/lab-ranges-panel.test.tsx
  - src/__tests__/plausibility-panel.test.tsx
  - src/__tests__/quality-overview.test.tsx
  - src/__tests__/references-panel.test.tsx
  - src/__tests__/summary-card.test.tsx
  - src/__tests__/thresholds-page.test.tsx
  - src/__tests__/thresholds.test.ts
  - src/components/quality/DuplicatesPanel.tsx
  - src/components/quality/LabRangesPanel.tsx
  - src/components/quality/OverviewStrip.tsx
  - src/components/quality/PlausibilityPanel.tsx
  - src/components/quality/QualityOverviewPage.tsx
  - src/components/quality/ReferencesPanel.tsx
  - src/components/quality/SummaryCard.tsx
  - src/components/quality/ThresholdsPage.tsx
  - src/components/quality/ValidationPanel.tsx
  - src/hooks/useThresholds.ts
  - src/quality/QualityMetricsContext.tsx
  - src/quality/thresholds.ts
findings:
  critical: 0
  warning: 4
  info: 7
  total: 11
status: issues_found
---

# Phase 18: Code Review Report

**Reviewed:** 2026-04-14
**Depth:** standard
**Files Reviewed:** 22 (21 source + dependency `App.tsx`)
**Status:** issues_found

## Summary

Phase 18 introduces the per-metric quality alerting threshold system (DQ-11/DQ-12): a `Thresholds` domain module + `useThresholds` localStorage-backed hook, a `ThresholdsPage` settings UI, an expanded 9-tile `OverviewStrip` with breach signaling and click-through navigation, a `QualityMetricsContext` rendezvous for panel→strip rollups, and `useEffect` rollup-pushers in five panels (Validation, Plausibility, LabRanges, Duplicates, References).

The implementation is overall solid: the three-state threshold semantics (`undefined`/`null`/`number`) are correctly modeled in `resolveThreshold`, the duplicates breakdown is correctly DERIVED rather than directly settable, mid-run flicker gating is consistent across all panel rollup `useEffect`s, and `sampleSize === 0` paths correctly push `undefined` rather than 0 (pitfall 7). Test coverage is broad and includes targeted regression assertions.

The findings below are concentrated in two areas:

1. **Numeric clamping** — five panel rollup expressions can produce negative percentages when issue counts exceed the denominator (`affected > sampleSize` or `outOfRange > checked`). Not a runtime crash, but a tile reading "-12%" or rendering a negative ring slice would be visually wrong. Worth one shared helper.
2. **Naming hygiene** — there are two distinct hooks named `useQualityMetrics` (one in `hooks/`, one in `quality/QualityMetricsContext`). This is the kind of collision that produces wrong-import bugs, especially with auto-import.

No critical issues; no security concerns.

## Warnings

### WR-01: Panel rollup percentages are not clamped to [0, 100]

**Files:**
- `src/components/quality/DuplicatesPanel.tsx:108-109`
- `src/components/quality/PlausibilityPanel.tsx:119`
- `src/components/quality/LabRangesPanel.tsx:62`
- `src/components/quality/ReferencesPanel.tsx:79`
- `src/components/quality/ValidationPanel.tsx:210`

**Issue:** Every panel that pushes an "overall % clean" computes `Math.round((1 - affected / denominator) * 100)` without clamping. If `affected > denominator` (which can happen — e.g., the duplicates patient pass legitimately counts patients across clusters that may exceed the sample if the sampling/cluster counting drift, or a future bug in numerator counting), the rolled-up tile will render a negative percentage like `"-3%"` and pass a negative `ringValue` to `RingProgress`. Mantine's `RingProgress` does not gracefully handle negative values (the section disappears or wraps).

This is the same arithmetic shape repeated five times, so the fix is best done once.

**Fix:** Add a clamping helper in `src/quality/thresholds.ts` (or a new `src/quality/percent.ts`) and use it in all five panels:

```ts
// src/quality/percent.ts
export function percentClean(affected: number, total: number): number | undefined {
  if (!Number.isFinite(total) || total <= 0) return undefined;
  const pct = Math.round((1 - affected / total) * 100);
  return Math.max(0, Math.min(100, pct));
}
```

Then in each panel:

```ts
// LabRangesPanel.tsx
setOverallLabRanges(percentClean(summary.outOfRange, summary.checked));

// PlausibilityPanel.tsx
const affected = new Set(run.issues.map((i) => i.resourceId)).size;
setOverallPlausibility(percentClean(affected, run.progress.total));
```

This also collapses the `denominator <= 0 → undefined` branch into the helper, removing duplicated guard logic.

---

### WR-02: Two distinct hooks both named `useQualityMetrics`

**Files:**
- `src/hooks/useQualityMetrics.ts` (returns `{ counts, summary, lastComputed, recompute }`)
- `src/quality/QualityMetricsContext.tsx:179` (returns the rollup context)

**Issue:** Two completely different hooks share the same name in the same project. `QualityOverviewPage.tsx:21` imports the first; every panel imports the second. An IDE auto-import or a careless refactor can swap them silently — the call sites take different argument shapes, so a wrong import would surface as a TypeScript error in best case, but in JS-ish code patterns it could land as a runtime crash with a misleading stack trace.

The two hooks also have very different lifecycles (one is data-fetching state per `(client, types)`, one is the rollup rendezvous), which compounds confusion when reading code.

**Fix:** Rename one of them. Suggested:

```ts
// src/hooks/useQualityMetrics.ts → rename to useResourceCountsMetrics or similar
export function useResourceCountsMetrics(client, types) { ... }
```

OR rename the context hook:

```ts
// src/quality/QualityMetricsContext.tsx
export function useQualityMetricsRollup(): QualityMetricsContextValue { ... }
```

Update the ~10 import sites accordingly. Pick whichever rename has fewer call sites to touch.

---

### WR-03: `resolveThreshold` collapses `undefined` value of present key to `null`

**File:** `src/quality/thresholds.ts:62`

**Issue:** The doc comment (lines 6-8) defines three states for a stored value: `undefined` (absent) → default; `null` → disabled; `number` → custom. But the implementation:

```ts
export function resolveThreshold(key: MetricKey, stored: Thresholds): number | null {
  if (key in stored) return stored[key] ?? null;
  return DEFAULT_THRESHOLDS[key];
}
```

…uses `??` which collapses *both* `null` and `undefined` to `null`. This means if `stored = { completeness: undefined }` (key present but value undefined — possible if a stale localStorage payload survives a migration, or if a future code path accidentally writes undefined), the metric is treated as **disabled** rather than falling back to the default.

Per the documented contract, a present-but-undefined value is undefined territory. The current behavior is a silent assumption, not an enforced one.

**Fix:** Make the three-state semantics explicit:

```ts
export function resolveThreshold(key: MetricKey, stored: Thresholds): number | null {
  if (!(key in stored)) return DEFAULT_THRESHOLDS[key];
  const v = stored[key];
  if (v === null) return null;
  if (typeof v === 'number') return v;
  // present but neither null nor number → treat as absent (defensive)
  return DEFAULT_THRESHOLDS[key];
}
```

Add a regression test in `src/__tests__/thresholds.test.ts`:

```ts
it('returns default when stored[key] is present but undefined (defensive)', () => {
  const stored = { completeness: undefined } as unknown as Thresholds;
  expect(resolveThreshold('completeness', stored)).toBe(80);
});
```

---

### WR-04: `useThresholds.useLocalStorage` async hydration causes a one-frame breach flicker on first paint

**Files:**
- `src/hooks/useThresholds.ts:31` (the hook)
- `src/components/quality/OverviewStrip.tsx:115-143` (consumer that visually flickers)

**Issue:** Mantine's `useLocalStorage` is async-hydrating: on first render it returns the `defaultValue` (`{}`), and only after hydration completes does it return the persisted overrides. This means on every page load, the OverviewStrip briefly evaluates `isBreached` against `DEFAULT_THRESHOLDS`, then re-renders against the user's stored overrides one frame later. If the user has, say, `validation: null` (disabled), they will see a red "breached" tile flash for one frame on every page load before it transitions to the disabled state.

Tests work around this via `flush(150)` — see `thresholds-page.test.tsx:60-64` — which confirms the async hydration is observable but the production UI does not gate on it.

**Fix:** Either:

1. Track a hydrated flag and suppress breach styling until hydrated:

```ts
// useThresholds.ts
const [hydrated, setHydrated] = useState(false);
useEffect(() => { setHydrated(true); }, []);
// ...
const isBreached = useCallback(
  (key, value) => hydrated && pureIsBreached(value, resolveThreshold(key, stored)),
  [stored, hydrated],
);
```

2. Or document the behavior explicitly in the JSDoc on `useThresholds` so future maintainers don't chase it as a bug.

The flicker is cosmetic, not functional — Warning rather than Critical — but it directly contradicts the D-15 contract that breach signals are stable visual cues, not transient banners.

## Info

### IN-01: `ValidationPanel` parameter named `_props` but is read

**File:** `src/components/quality/ValidationPanel.tsx:77`

**Issue:** The function signature uses the underscore prefix convention (`_props: ValidationPanelProps`) which signals "intentionally unused", but the body reads `_props.sampleSize` at line 136. The convention mismatch is confusing — readers will assume the parameter is unused, then be surprised.

**Fix:** Rename to `props`:

```ts
export function ValidationPanel(props: ValidationPanelProps) {
  // ...
  const sampleSize = props.sampleSize;
}
```

Or destructure at the signature: `export function ValidationPanel({ sampleSize, client }: ValidationPanelProps)`. (Note: the current code reads `client` from `useOutletContext`, not from props, so `client` from props is genuinely unused — that's likely why the underscore was added. Destructuring only what's used resolves both points.)

---

### IN-02: Variable shadowing in `deriveOverallDuplicates`

**File:** `src/quality/QualityMetricsContext.tsx:103`

**Issue:** `const sum = components.reduce((a, b) => a + b, 0);` — the reduce parameter `b` shadows the outer parameter `b: DuplicatesBreakdown` at line 96. Not a runtime bug since the inner closure doesn't reference the outer `b`, but it's a readability snag.

**Fix:** Rename the outer parameter or the inner reducer args:

```ts
function deriveOverallDuplicates(breakdown: DuplicatesBreakdown): number | undefined {
  const components: number[] = [];
  if (breakdown.patient !== undefined) components.push(breakdown.patient);
  for (const v of Object.values(breakdown.hashByType)) {
    if (v !== undefined) components.push(v);
  }
  if (components.length === 0) return undefined;
  return Math.round(components.reduce((sum, n) => sum + n, 0) / components.length);
}
```

---

### IN-03: `as never` type assertion in tab validation

**File:** `src/components/quality/QualityOverviewPage.tsx:75`

**Issue:** `tabParam && VALID_TABS.has(tabParam as never)` uses `as never` to bypass type checking on `Set.has`. While functional, `as never` is an unusual escape hatch. A more conventional pattern with the same runtime effect uses a type guard:

**Fix:**

```ts
type ValidTab = 'counts' | 'completeness' | 'coverage' | 'validation' |
                'plausibility' | 'lab-ranges' | 'duplicates' | 'references';
const VALID_TABS = new Set<ValidTab>([...]);

function isValidTab(s: string): s is ValidTab {
  return (VALID_TABS as Set<string>).has(s);
}

const activeTab: ValidTab = tabParam && isValidTab(tabParam) ? tabParam : DEFAULT_TAB;
```

This narrows `activeTab` to `ValidTab` instead of `string`, which is useful for downstream handlers.

---

### IN-04: Defensive `v !== undefined` check on values typed as `number`

**File:** `src/quality/QualityMetricsContext.tsx:99-101`

**Issue:**

```ts
for (const v of Object.values(b.hashByType)) {
  if (v !== undefined) components.push(v);
}
```

`hashByType` is typed as `Record<string, number>`, so TypeScript guarantees `v` is `number`. The `v !== undefined` check is dead under the type. It's harmless, but either:
- The check is defensive against a runtime contract violation that should be enforced at the writer site (in `setDuplicatesContribution`) rather than the reader site, OR
- The type should be `Record<string, number | undefined>` if undefined is actually a state we want to model.

**Fix:** Pick one. If you want the runtime guard, change the type to `Record<string, number | undefined>`. Otherwise drop the check.

---

### IN-05: `ThresholdsPage` reset modal queries by case-insensitive button text and selects the first match

**File:** `src/__tests__/thresholds-page.test.tsx:144-145, 158, 182-183`

**Issue:** Tests use `screen.getAllByRole('button', { name: /reset to defaults/i })[0]!` to disambiguate the page-level Reset button from the modal's confirm button, which has the same accessible name (`/reset to defaults/i`). This is fragile: if the page ever adds another button matching the same regex, or if Mantine's portal mounts the modal earlier in the DOM order, the wrong button could be clicked.

**Fix:** Distinguish the two buttons by accessible name. The page-level trigger could be `"Reset all thresholds"` and the modal confirm could stay as `"Reset to defaults"`. Or use `data-testid` on one of them. This makes the tests order-independent.

(This is a test-file-only nit; the production code is fine.)

---

### IN-06: `progressMessage` heuristic in DuplicatesPanel is acknowledged-but-fragile

**File:** `src/components/quality/DuplicatesPanel.tsx:130-141`

**Issue:** The IIFE comment explicitly calls out the heuristic: "we use a simple rule: show 'Matching patients' until the patient pass is done (run.duplicateClusters updated) or until skippedPatients is set." If the patient pass produces zero clusters and zero skipped patients (legitimate when no duplicates exist), the message will incorrectly stay on "Matching patients" until hashing finishes.

**Fix:** Have `useDuplicateReport` expose a discriminated `phase` field (`'patient' | 'hashing'`) and key `progressMessage` off of that. The hook already knows which phase it is in; surfacing it eliminates the heuristic entirely.

(Out of scope for Phase 18 if the hook is owned by Phase 17, but worth noting for the next iteration.)

---

### IN-07: `OverviewStrip` `metricValueOf` switch lacks default case

**File:** `src/components/quality/OverviewStrip.tsx:81-98`

**Issue:** TypeScript narrows correctly on the `MetricKey` union, so the switch is exhaustive at compile time. But there is no `default:` clause. If `MetricKey` ever gains a new value and someone adds it to `METRIC_ORDER` without updating `metricValueOf`, the function will return `undefined` implicitly — silently degrading the new tile to em-dash.

**Fix:** Add an exhaustiveness check:

```ts
const metricValueOf = (key: MetricKey): number | undefined => {
  switch (key) {
    case 'completeness': return metrics.overallCompleteness;
    // ... other cases
    case 'references': return metrics.overallReferences;
    default: {
      const _exhaustive: never = key;
      return _exhaustive;
    }
  }
};
```

This forces a compile error rather than a silent em-dash when `MetricKey` grows.

---

_Reviewed: 2026-04-14_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
