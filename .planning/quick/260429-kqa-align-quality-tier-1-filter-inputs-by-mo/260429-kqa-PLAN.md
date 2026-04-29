---
quick_id: 260429-kqa
description: Align /quality Tier-1 filter inputs by moving Sample size description into a Tooltip
type: quick
mode: retroactive
date: 2026-04-29
files_modified:
  - src/components/quality/SampleSizeControl.tsx
must_haves:
  truths:
    - "All 3 Tier-1 filter inputs (Resource types, Active cohort, Sample size) baseline-align — input fields sit at the same Y coordinate"
    - "The 'First N resources of each type are inspected. Increase for accuracy; decrease for speed.' text remains accessible to users (now in a Tooltip on the IconInfoCircle next to the 'Sample size' label)"
    - "No regression in `npx tsc -b --noEmit` (exit 0); no regression in `npm run build` (clean)"
  artifacts:
    - path: src/components/quality/SampleSizeControl.tsx
      provides: NumberInput label as a Group containing 'Sample size' Text + IconInfoCircle wrapped in Tooltip
      contains: "IconInfoCircle"
---

<objective>
The Tier-1 scope card at `/quality` (rendered by [QualityOverviewPage.tsx:401-427](src/components/quality/QualityOverviewPage.tsx:401)) puts three filter controls in a 3-column SimpleGrid:

| Column | Component | Mantine prop usage |
|--------|-----------|---------------------|
| 1 | `ResourceTypeSelector` (MultiSelect) | `label="Resource types"` only |
| 2 | `ActiveCohortSelect` (Select) | `label="Active cohort"` only |
| 3 | `SampleSizeControl` (NumberInput) | `label="Sample size"` **+ `description="..."`** |

Mantine renders `description` as a ~20px sub-label between the label and the input, pushing column 3's input field below the input baselines of columns 1 and 2.

The 2026-04-23 fix at commit `5b4fb93` ("fix(30/uat-6): align Active-cohort column with siblings in Quality Tier-1") corrected the **label**-row alignment (replaced an `align='flex-end'` Group with a vertical Stack in column 2) but did not touch column 3's input-row offset.

This quick task closes that follow-up gap by removing the `description` prop and surfacing the same hint text via a Mantine `<Tooltip>` on an inline `<IconInfoCircle>` next to the "Sample size" label. All 3 columns end up with single-line labels; input rows align cleanly.
</objective>

<scope>
- Single source file: `src/components/quality/SampleSizeControl.tsx` (~22 lines net diff)
- No test changes (no dedicated test file for this component; the broader QualityOverviewPage tree has integration coverage but no input-baseline assertion)
- No theme.ts touch — this is a per-component fix, not a global pattern shift
</scope>

<task type="auto">
<name>Drop NumberInput `description`; surface text via Tooltip on inline IconInfoCircle</name>

<read_first>
- src/components/quality/SampleSizeControl.tsx (the file being edited)
- src/components/quality/QualityOverviewPage.tsx:401-427 (Tier-1 scope card mount site — confirms the SimpleGrid layout)
- src/components/quality/ResourceTypeSelector.tsx:48 (peer column 1 — uses `label=` only, no description)
- src/components/quality/ActiveCohortSelect.tsx:105 (peer column 2 — uses `label=` only, no description)
</read_first>

<action>
1. Add imports to `SampleSizeControl.tsx`:
   - From `@mantine/core`: `Group`, `Text`, `Tooltip` (additive — `NumberInput` already imported)
   - From `@tabler/icons-react`: `IconInfoCircle`

2. Remove the `description` prop from `<NumberInput>`.

3. Replace the simple `label="Sample size"` with a JSX label expression:
   ```tsx
   label={
     <Group gap={4} wrap="nowrap">
       <Text size="sm" fw={500} component="span">Sample size</Text>
       <Tooltip
         label="First N resources of each type are inspected. Increase for accuracy; decrease for speed."
         multiline
         w={260}
         withArrow
       >
         <IconInfoCircle
           size={14}
           style={{ cursor: 'help', color: 'var(--mantine-color-dimmed)' }}
           aria-label="Sample size help"
         />
       </Tooltip>
     </Group>
   }
   ```
4. Keep the existing `aria-label="Sample size"` on the NumberInput (separate from the icon's aria-label — both are needed for screen readers).
</action>

<acceptance_criteria>
- `grep -c '^      description=' src/components/quality/SampleSizeControl.tsx` returns 0 (description prop removed)
- `grep -c 'IconInfoCircle' src/components/quality/SampleSizeControl.tsx` returns ≥ 2 (import + usage)
- `grep -c 'Tooltip' src/components/quality/SampleSizeControl.tsx` returns ≥ 2 (import + usage)
- `npx tsc -b --noEmit` exits 0
- `npm run build` exits clean
- Visual smoke (manual): open `http://localhost:5173/quality`, observe the 3 filter inputs baseline-align, hover the ⓘ icon next to "Sample size" and confirm the tooltip text appears
</acceptance_criteria>
</task>

<verification>
- Build clean: `npm run build` (built in ~520ms post-fix vs ~600ms pre-fix; no significant bundle impact since IconInfoCircle is already in @tabler/icons-react bundle)
- Type check clean: `npx tsc -b --noEmit` exit 0
- Source files changed: 1 (`src/components/quality/SampleSizeControl.tsx`)
- Net diff: +19 / -3 lines

The visual alignment is verified by direct inspection at `/quality` in the running dev server. No automated visual regression test exists — the existing Tier-1 layout has no DOM-baseline assertion, and adding one would be a separate task (candidate for v1.6 Phase 41 UX polish).
</verification>

<threat_model>
**No new attack surface.**

- Tooltip text is a static literal string — no user-controlled input rendered
- IconInfoCircle is a self-closing SVG component — no innerHTML, no `dangerouslySetInnerHTML`
- React's default JSX escaping covers any future text changes
- ARIA labels added (`aria-label="Sample size help"`) improve a11y without introducing new state

OWASP A01-A10: all N/A (UI-only refactor of an existing input control with zero new I/O surfaces).
</threat_model>

---

*This is a retroactive PLAN.md — the work was authorized inline by the user with "Fix now via Option A" and landed at commit `aa80da4` before this PLAN was written. Captured here for STATE.md tracking and future audit traceability per CLAUDE.md GSD enforcement guidance.*
