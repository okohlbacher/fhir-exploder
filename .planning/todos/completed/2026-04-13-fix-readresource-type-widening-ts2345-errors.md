---
created: 2026-04-13T10:28:26.000Z
title: Fix readResource type-widening TS2345 errors
area: ui
files:
  - src/components/explorer/ResourceDetailPage.tsx:56
  - src/components/patients/FhirResourcesView.tsx:106
---

## Problem

`readResource(resourceType, id)` calls pass `resourceType: string` which is not assignable to the `ResourceType` literal union expected by Medplum's typed API. This causes TS2345 errors during `npm run build` (tsc -b). Pre-existing issue discovered during Phase 05/06.

## Solution

Narrow the `resourceType` parameter at call sites via `as ResourceType` cast or a runtime-validated helper that asserts the string is a valid ResourceType before passing it to `readResource`.
