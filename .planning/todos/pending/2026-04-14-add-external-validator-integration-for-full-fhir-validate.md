---
created: 2026-04-14T17:30:00.000Z
title: Add external FHIR validator integration for full $validate semantics
area: quality
files:
  - src/components/quality/ValidationPanel.tsx
  - src/config/types.ts
  - src/quality/profileConformanceChecker.ts
source: feedback/feedback-2026-04-14T16-51-19-207Z_7171b2cd.json
---

## Problem

Blaze (and several other FHIR servers) do not implement the `$validate` operation. The Validation panel currently falls back to a local structural conformance check against bundled MII profiles (`profileConformanceChecker.ts`). This is useful but is NOT semantically equivalent to a full FHIR `$validate`: it misses canonical resolution, terminology binding strength enforcement, slicing discriminator checks, and cross-extension validation that a proper validator (HAPI, fhir-validator CLI, etc.) would catch. The in-app banner already explains the limitation, but the app offers no path to upgrade the fidelity of validation when the server cannot do it.

Logged from user feedback on `/quality?tab=validation` (2026-04-14): "FHIR server does not support $validate".

## Solution

Add optional integration with an external FHIR validator endpoint:

1. Extend `settings.yaml` schema with a `validation.externalValidator` block (URL, optional auth, profile pack selection).
2. Prefer the external validator when configured; fall through to `$validate` on the FHIR server; fall through to the local structural checker as today if neither is available.
3. Surface the active strategy in the Validation panel's status line ("Using external validator @ https://…" / "Using local MII profile bundle" / "Using server $validate").
4. Settings UI: let the user paste a validator URL and test connectivity.

Non-goals: implementing a local full-FHIR validator (out of scope — rely on external).
