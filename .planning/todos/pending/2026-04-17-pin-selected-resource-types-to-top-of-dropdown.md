---
created: 2026-04-17T08:07:13.458Z
title: Pin selected resource types to top of dropdown
area: ui
files:
  - src/components/quality/QualityDashboard.tsx
---

## Problem

Surfaced during Phase 23 live-Blaze UAT (T-6.3 C):

The "Resource types" MultiSelect on the /quality toolbar lists all resource types from the server in default order. With a large Blaze instance this list is very long, making it hard to see which types are currently selected — they can be buried anywhere in the list.

Users expect selected items to appear at the top of the dropdown so they can quickly see and manage their current selection without scrolling.

## Solution

Sort the MultiSelect options so that currently-selected values appear first, followed by unselected values in their original order. Mantine's `MultiSelect` supports a custom `filter` prop and/or sorting the `data` array before passing it in — pre-sort the options array whenever the selection changes so selected items float to the top.

Alternatively, use Mantine's `renderOption` + a stable sort on `data` keyed by `selected` status.

Acceptance: with 3 types selected out of 20+, the 3 selected types appear as the first 3 entries when the dropdown opens.
