---
created: 2026-04-13T10:28:26.000Z
title: Fix unused variable warnings in tests
area: testing
files:
  - src/__tests__/display-modes.test.tsx:7
  - src/__tests__/json-highlight.test.ts:3
---

## Problem

`npm run build` reports TS6133 unused variable errors:
- `mockPatient` declared but never read in display-modes.test.tsx
- `JsonToken` imported but never used in json-highlight.test.ts

Pre-existing issues discovered during Phase 05/06.

## Solution

Remove the unused declarations/imports from the test files.
