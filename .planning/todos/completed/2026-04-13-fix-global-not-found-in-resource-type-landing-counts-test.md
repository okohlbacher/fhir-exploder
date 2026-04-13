---
created: 2026-04-13T10:28:26.000Z
title: Fix global not found in resource-type-landing-counts test
area: testing
files:
  - src/__tests__/resource-type-landing-counts.test.tsx:11
---

## Problem

`npm run build` reports TS2304 "Cannot find name 'global'" in resource-type-landing-counts.test.tsx. Pre-existing issue discovered during Phase 05/06.

## Solution

Add proper type declaration for `global` (e.g., reference `@types/node` in test tsconfig) or replace with a test-framework-compatible approach.
