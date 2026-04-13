---
created: 2026-04-13T10:28:26.000Z
title: Fix SearchRequest coercion warning TS2352
area: ui
files:
  - src/components/explorer/SearchResultsPage.tsx:59
  - src/components/explorer/SearchResultsPage.tsx:62
---

## Problem

`SearchRequest<Resource>` is coerced to `Record<string, unknown>` in SearchResultsPage.tsx, causing TS2352 warnings during `npm run build`. Pre-existing issue discovered during Phase 05/06.

## Solution

Use a properly typed intermediate or adjust the type assertions to satisfy the compiler without unsafe coercion.
