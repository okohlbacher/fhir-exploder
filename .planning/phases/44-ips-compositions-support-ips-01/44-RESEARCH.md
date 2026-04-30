# Phase 44: IPS Compositions Support (IPS-01) — Research

**Researched:** 2026-04-30
**Domain:** HL7 FHIR — International Patient Summary (IPS) Composition profile, bundle validation
**Confidence:** HIGH (live-probed package, extracted profile structure, all reuse targets verified in codebase)

---

## User Constraints (from CONTEXT.md)

### Locked Decisions

The following decisions from `44-CONTEXT.md` are LOCKED and MUST be honored by the planner:

- **D-01:** NEW `scripts/fetch-ips-profiles.mjs` (separate from MII fetcher) + parallel `IPS_REGISTRY` URL-keyed lazy-load registry at `src/quality/profiles/ips/index.ts`. Mirror Phase 36 shape (lazy-load thunks: `() => Promise<{ default: StructureDefinition }>`).
- **D-02:** IPS package = `hl7.fhir.uv.ips` from `packages.fhir.org`. Pin version exactly per live probe; record in `IPS_PACKAGES` constant. **Researcher confirms below: pin to `2.0.0`.**
- **D-03:** Trim StructureDefinition to `{ resourceType, url, name, type, snapshot.element[] (path, min, max?, mustSupport?, sliceName?) }` — IDENTICAL to Phase 34 trim shape.
- **D-04:** `src/quality/profiles/ips/ATTRIBUTION.md` + repo-root `LICENSE` section "IPS Composition profile (HL7 International)" with upstream license terms.
- **D-05:** NEW `src/components/quality/IPSPanel.tsx` reachable from `/quality/ips` (sub-route). NOT bolted onto ValidationPanel.
- **D-06:** BOTH paste-textarea (`<JsonInput>`) AND server Composition picker (Mantine `<Tabs>`).
- **D-07:** Validation runs on explicit "Validate" button click; loading state via `<Button loading>` + `<Skeleton>`.
- **D-08:** DEDICATED bundle walker `src/quality/ipsBundleValidator.ts` (NOT cascadingValidator). Pure function `(bundle, ipsProfile) => OperationOutcome.issue[]`. Reuses `normalizeOperationOutcomeIssue`. NO server-side `$validate`.
- **D-09:** Three severity levels (error: section absent / warning: section.entry empty / information: unresolvable references).
- **D-10:** Drill-down rows render via Phase 15's `<ResourceIssueTable>` UNCHANGED.
- **D-11:** Section path expression format `Composition.section[<index>].title`.
- **D-12:** Three fixtures at `src/quality/__tests__/fixtures/ips/`: `ips-bundle-complete.json`, `ips-bundle-incomplete.json`, `ips-bundle-malformed.json`.
- **D-13:** Test setup — `ipsBundleValidator.test.ts` (≥6 unit tests) + `IPSPanel.test.tsx` (component test). NO new test framework deps.
- **D-14:** LICENSE root section update + `src/quality/profiles/ips/ATTRIBUTION.md`.

### Claude's Discretion

- **D-15:** `<JsonInput autosize minRows={10} maxRows={30}>` recommended. Researcher CONFIRMS below — `JsonInput` is in Mantine 8 core (`@mantine/core/lib/components/JsonInput`), not yet used in codebase but the API is straightforward.
- **D-16:** Synchronous walker default; `requestIdleCallback` only if perf data shows lag.
- **D-17:** Severity row color-coding inherited unchanged from Phase 15.
- **D-18:** Multi-bundle batch validation explicitly DEFERRED.

### Deferred Ideas (OUT OF SCOPE)

- Multi-bundle batch validation (defer to v1.7+).
- Server-side `$validate` IPS support (Blaze doesn't ship IPS profiles).
- IPS-AU / IPS-CH / regional dialects (separate phases).
- `Composition.section` auto-fix suggestions (editor feature, not validator).
- Mantine 9 `JsonInput` API differences (Phase 45 problem).
- IPS Schematron rules / fhirpath constraints beyond min/max/mustSupport.

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **IPS-01** | User can validate a FHIR resource bundle against the IPS Composition profile and see `OperationOutcome` issues for "Empty Sections and Missing Data" patterns. Bundle validation entry-point in a new `IPSPanel`. IPS profile shipped via `fhir-package-loader` (Phase 34 mechanism). Per-section drill-down reuses `ResourceIssueTable`. | This research provides: (1) verified package pin `hl7.fhir.uv.ips@2.0.0`, (2) full IPS Composition section slice inventory (3 required + 13 optional), (3) walker pseudocode, (4) reuse map for Phase 5/15/31/34/36 assets, (5) section title canonical strings via LOINC code lookup, (6) bundle.type+entry expectations. |

---

## Project Constraints (from CLAUDE.md)

- **Stack lock:** React 18.3.1 + Mantine 8.x + Medplum 5.x + Vite 8 + TypeScript 5.7. NO Mantine 9, NO Tailwind, NO `@tanstack/react-query`.
- **YAML:** `js-yaml@4.1.1` for any settings-file work.
- **Routing:** `react-router-dom@7.x`.
- **GSD workflow enforcement:** No direct edits outside a GSD command.
- **License compliance:** `package.json` `license` field + repo `LICENSE` must stay in sync.

These constraints are pre-honored by the locked decisions; the researcher records them so the planner can reject any task that drifts.

---

## 1. Domain Overview

### What is IPS?

The **International Patient Summary (IPS)** is an HL7 standard (ISO 27269) defining the minimum, non-exhaustive content of a patient's clinical summary, designed for cross-border use cases (e.g., emergency or unscheduled care abroad). It's profiled as a FHIR Document — a `Bundle` of `type: 'document'` with a `Composition` resource as `entry[0]` carrying section pointers to clinical resources elsewhere in the same Bundle.

[CITED: hl7.org/fhir/uv/ips] — IPS IG canonical at `http://hl7.org/fhir/uv/ips`.

### What does the Composition profile mandate?

The IPS `Composition-uv-ips` StructureDefinition:
- **Slices `Composition.section`** by `code` (the LOINC section code) with `slicing.rules: 'open'` (additional non-IPS sections are permitted).
- Defines **16 named section slices** total: 3 with `min: 1` (REQUIRED) + 13 with `min: 0` (OPTIONAL).
- Each section is identified by a fixed LOINC code in `section.code.coding[]` (the slicing discriminator).

[VERIFIED: extracted from `StructureDefinition-Composition-uv-ips.json` shipped in `hl7.fhir.uv.ips@2.0.0`]

### Required (min=1) sections

| sliceName | Section title | LOINC code |
|-----------|---------------|------------|
| `sectionProblems` | IPS Problems Section | `11450-4` |
| `sectionAllergies` | IPS Allergies and Intolerances Section | `48765-2` |
| `sectionMedications` | IPS Medication Summary Section | `10160-0` |

### Optional (min=0) sections

| sliceName | Section title | LOINC code |
|-----------|---------------|------------|
| `sectionImmunizations` | IPS Immunizations Section | `11369-6` |
| `sectionResults` | IPS Results Section | `30954-2` |
| `sectionProceduresHx` | IPS History of Procedures Section | `47519-4` |
| `sectionMedicalDevices` | IPS Medical Devices Section | `46264-8` |
| `sectionAdvanceDirectives` | IPS Advance Directives Section | `42348-3` |
| `sectionAlerts` | IPS Alerts Section | `104605-1` |
| `sectionFunctionalStatus` | IPS Functional Status | `47420-5` |
| `sectionPastProblems` | IPS History of Past Problems Section | `11348-0` |
| `sectionPregnancyHx` | IPS History of Pregnancy Section | `10162-6` |
| `sectionPatientStory` | IPS Patient Story Section | `81338-6` |
| `sectionPlanOfCare` | IPS Plan of Care Section | `18776-5` |
| `sectionSocialHistory` | IPS Social History Section | `29762-2` |
| `sectionVitalSigns` | IPS Vital Signs Section | `8716-3` |

### Slicing discriminator

```json
{
  "discriminator": [{ "type": "value", "path": "code" }],
  "ordered": false,
  "rules": "open"
}
```

**Implication for the walker:** Sections are identified by their LOINC `code.coding[]`, NOT by their order in the bundle, NOT by their `title`. The walker MUST extract `(system, code)` from each section's `code.coding[]` and match it against the per-slice fixed `patternCodeableConcept`. Title strings are **NOT** fixed by the profile — they're free-text descriptions in `short` and human display only.

### Base section-element constraint

The base `Composition.section` element itself has `min: 3` — meaning a conformant bundle MUST have at least 3 sections. The three `min:1` slices satisfy that automatically. [VERIFIED: profile snapshot]

---

## 2. Package & Version (live-probed)

### IPS package — pin to `hl7.fhir.uv.ips@2.0.0`

**Live probe** of `https://packages.fhir.org/hl7.fhir.uv.ips` on **2026-04-30**:

```json
{
  "_id": "hl7.fhir.uv.ips",
  "name": "hl7.fhir.uv.ips",
  "dist-tags": { "latest": "2.0.0" },
  "versions": [
    "0.1.0", "0.2.0", "0.3.0", "1.0.0", "1.1.0", "2.0.0", "2.0.0-ballot"
  ]
}
```

**Recommendation: pin to `2.0.0`** (latest GA, FHIR R4, published 2025-10-03). [VERIFIED: live probe of packages.fhir.org]

**Package metadata** (extracted from `package.json` inside the tarball):

```json
{
  "name": "hl7.fhir.uv.ips",
  "version": "2.0.0",
  "license": "CC0-1.0",
  "canonical": "http://hl7.org/fhir/uv/ips",
  "fhirVersions": ["4.0.1"],
  "author": "HL7 International / Patient Care",
  "dependencies": {
    "hl7.fhir.r4.core": "4.0.1",
    "hl7.terminology.r4": "6.5.0",
    "hl7.fhir.uv.extensions.r4": "5.2.0",
    "hl7.fhir.uv.ipa": "1.1.0"
  }
}
```

[VERIFIED: tarball at `https://packages.fhir.org/hl7.fhir.uv.ips/2.0.0` extracted to `/tmp/ips-pkg/package/`]

### License

**`CC0-1.0`** — Public domain dedication. *Looser* than the MII profiles' CC-BY-4.0 (no attribution legally required), but attribution is good practice and Phase 34's pattern. The repo `LICENSE` section text should be brief: cite source URL + version + CC0 status.

### `fhir-package-loader` peer compatibility

Phase 34 pinned `fhir-package-loader@^2.2.4` (verified still latest via `npm view fhir-package-loader version` → `2.2.4` on 2026-04-30). It accepts any FHIR R4 IG package via `loader.loadPackage(name, version)` then `loader.findResourceJSONs('*', { type: ['StructureDefinition'], scope: name })`. No new devDep needed. [VERIFIED: npm registry]

### Dependency closure

The IPS package declares 4 transitive dependencies (`hl7.fhir.r4.core`, `hl7.terminology.r4`, `hl7.fhir.uv.extensions.r4`, `hl7.fhir.uv.ipa`). `fhir-package-loader` will fetch these automatically — but **for our walker we only need the top-level `Composition-uv-ips` SD**. The walker reads `snapshot.element[].sliceName` and is self-contained; it does NOT recursively follow `baseDefinition` references. **The trim function will discard everything except `Composition-uv-ips` (and we can optionally also keep `Bundle-uv-ips` if we want to validate `bundle.type === 'document'` against the profile, but that check is hard-coded in our walker — see §4).**

### Recommendation

Fetch ONLY the IPS package. `findResourceJSONs('*', { type: ['StructureDefinition'], scope: 'hl7.fhir.uv.ips' })` returns ~20+ SDs (Composition, Bundle, AllergyIntolerance-uv-ips, Condition-uv-ips, etc.). For Phase 44 IPS-01, we only USE `Composition-uv-ips`, but the trim/write loop can write all of them (mirroring Phase 34's per-package behavior); only the Composition profile is loaded by the walker.

---

## 3. Profile Structure (verified from package)

### File location after fetch

`scripts/fetch-ips-profiles.mjs` writes one trimmed JSON per StructureDefinition under `src/quality/profiles/ips/`:

```
src/quality/profiles/ips/
├── Composition-CompositionUvIps.json     # ← THE ONE THE WALKER READS
├── Bundle-BundleUvIps.json               # (also written, not required by walker)
├── AllergyIntolerance-...json            # (also written, future-use, not required)
├── ...                                   # (~20 SDs total)
├── index.ts                              # GENERATED registry (URL-keyed lazy thunks)
└── ATTRIBUTION.md                        # GENERATED attribution
```

### Trimmed Composition-uv-ips shape (post-trim)

After applying Phase 34's `trim()` function:

```json
{
  "resourceType": "StructureDefinition",
  "url": "http://hl7.org/fhir/uv/ips/StructureDefinition/Composition-uv-ips",
  "name": "CompositionUvIps",
  "type": "Composition",
  "snapshot": {
    "element": [
      { "path": "Composition.section", "min": 3, "max": "*" },
      { "path": "Composition.section", "sliceName": "sectionProblems", "min": 1, "max": "1" },
      { "path": "Composition.section.code", "patternCodeableConcept": { "coding": [{ "system": "http://loinc.org", "code": "11450-4" }] } },
      { "path": "Composition.section", "sliceName": "sectionAllergies", "min": 1, "max": "1" },
      { "path": "Composition.section.code", "patternCodeableConcept": { "coding": [{ "system": "http://loinc.org", "code": "48765-2" }] } },
      // ... 14 more slices
    ]
  }
}
```

### CRITICAL: trim() must preserve `patternCodeableConcept` on `section.code`

Phase 34's `trim()` keeps `path`, `min`, `max?`, `mustSupport?`, `sliceName?`, `type?`, `binding (required)`. **It does NOT keep `patternCodeableConcept`.** For IPS the walker needs the LOINC code patterns to match section instances back to slice definitions.

**Two options for the planner:**

1. **(RECOMMENDED) Hard-code the slice→LOINC map** in `ipsBundleValidator.ts` itself (lines 1-30). This is what makes the walker self-contained and decouples it from any future `trim()` changes. The map is small (16 entries), well-documented, and the upstream profile is stable. The walker then derives required-vs-optional from the Composition profile's per-slice `min` (which IS preserved by trim).
2. Extend `trim()` to also preserve `patternCodeableConcept` on `Composition.section.code` (and on Bundle.type's `fixedCode: 'document'` if used). More mechanical but couples the walker to the trim shape.

**Researcher recommendation: Option 1.** The 16-section LOINC map is intrinsic to IPS-2.0.0 and a stable HL7 standard; copying it into the walker is honest, testable, and self-documenting. Option 2 leaks profile-version coupling into the trim function shared with Phase 34.

### Bundle.type expectation

[VERIFIED: `StructureDefinition-Bundle-uv-ips.json`]
- `Bundle.type` is `min: 1, max: 1` with **fixed value `'document'`**.
- `Bundle.entry` is `min: 2, max: *`.
- `Bundle.entry[0]` (slice `composition`) is `min: 1, max: 1` — **MUST be a Composition resource**.
- `Bundle.entry[1]` (slice `patient`) is `min: 1, max: 1` — **MUST be a Patient resource**.

The walker SHOULD check `bundle.type === 'document'` and emit a top-level `error/structure` issue if not (this is part of "malformed bundle" handling for the third fixture).

---

## 4. Walker Algorithm

### Function signature

```typescript
// src/quality/ipsBundleValidator.ts

import type { Bundle, Composition, OperationOutcomeIssue, StructureDefinition } from '@medplum/fhirtypes';

export function validateIpsBundle(
  bundle: Bundle,
  ipsProfile: StructureDefinition,
): OperationOutcomeIssue[];
```

Pure function. No async, no I/O. Easy to unit-test.

### Hard-coded section catalogue (recommended per §3)

```typescript
// IPS-2.0.0 Composition profile section slices.
// Source: hl7.fhir.uv.ips@2.0.0 / StructureDefinition-Composition-uv-ips.json
// Verified 2026-04-30. If you bump the IPS version pin, re-verify this map
// against the new package's snapshot.element[] section slices.
interface IpsSectionSlice {
  sliceName: string;
  title: string;        // human-display title (NOT fixed by profile; from `short`)
  loincCode: string;    // patternCodeableConcept.coding[0].code
  required: boolean;    // min === 1 in the profile
}

const IPS_SECTION_SLICES: IpsSectionSlice[] = [
  { sliceName: 'sectionProblems',          title: 'Problems',                  loincCode: '11450-4',  required: true  },
  { sliceName: 'sectionAllergies',         title: 'Allergies and Intolerances', loincCode: '48765-2',  required: true  },
  { sliceName: 'sectionMedications',       title: 'Medication Summary',        loincCode: '10160-0',  required: true  },
  { sliceName: 'sectionImmunizations',     title: 'Immunizations',             loincCode: '11369-6',  required: false },
  { sliceName: 'sectionResults',           title: 'Results',                   loincCode: '30954-2',  required: false },
  { sliceName: 'sectionProceduresHx',      title: 'History of Procedures',     loincCode: '47519-4',  required: false },
  { sliceName: 'sectionMedicalDevices',    title: 'Medical Devices',           loincCode: '46264-8',  required: false },
  { sliceName: 'sectionAdvanceDirectives', title: 'Advance Directives',        loincCode: '42348-3',  required: false },
  { sliceName: 'sectionAlerts',            title: 'Alerts',                    loincCode: '104605-1', required: false },
  { sliceName: 'sectionFunctionalStatus',  title: 'Functional Status',         loincCode: '47420-5',  required: false },
  { sliceName: 'sectionPastProblems',      title: 'History of Past Problems',  loincCode: '11348-0',  required: false },
  { sliceName: 'sectionPregnancyHx',       title: 'History of Pregnancy',      loincCode: '10162-6',  required: false },
  { sliceName: 'sectionPatientStory',      title: 'Patient Story',             loincCode: '81338-6',  required: false },
  { sliceName: 'sectionPlanOfCare',        title: 'Plan of Care',              loincCode: '18776-5',  required: false },
  { sliceName: 'sectionSocialHistory',     title: 'Social History',            loincCode: '29762-2',  required: false },
  { sliceName: 'sectionVitalSigns',        title: 'Vital Signs',               loincCode: '8716-3',   required: false },
];

const LOINC_SYSTEM = 'http://loinc.org';
```

The `ipsProfile` parameter is still threaded through the signature (for future-proofing if the planner later wants to derive the catalogue from the SD), but for the v1.6 implementation the walker uses the constant above.

### Pseudocode

```typescript
export function validateIpsBundle(bundle, ipsProfile): OperationOutcomeIssue[] {
  const issues: OperationOutcomeIssue[] = [];

  // ---- Step 1: top-level bundle shape checks (malformed-bundle defense) ----

  if (bundle?.resourceType !== 'Bundle') {
    issues.push({
      severity: 'error',
      code: 'structure',
      details: { text: 'Input is not a FHIR Bundle (resourceType missing or wrong)' },
      expression: ['Bundle'],
    });
    return issues; // bail — nothing else makes sense
  }

  if (bundle.type !== 'document') {
    issues.push({
      severity: 'error',
      code: 'structure',
      details: { text: `IPS requires Bundle.type = 'document', got '${bundle.type ?? '(missing)'}'` },
      expression: ['Bundle.type'],
    });
    // continue — we may still be able to find a Composition
  }

  // ---- Step 2: locate the Composition resource ----

  const entries = bundle.entry ?? [];
  // IPS spec: bundle.entry[0] MUST be the Composition.
  // Defensive fallback: also accept the first entry whose resource is a Composition.
  const compositionEntry =
    entries[0]?.resource?.resourceType === 'Composition'
      ? entries[0]
      : entries.find((e) => e?.resource?.resourceType === 'Composition');

  if (!compositionEntry?.resource) {
    issues.push({
      severity: 'error',
      code: 'required',
      details: { text: 'IPS bundle must contain a Composition resource (none found in bundle.entry[])' },
      expression: ['Bundle.entry'],
    });
    return issues; // bail — nothing else makes sense
  }

  const composition: Composition = compositionEntry.resource as Composition;
  const sections = composition.section ?? [];

  // ---- Step 3: build a map (loincCode → array of indexes in composition.section[]) ----
  // This handles "section present" detection by LOINC match (the slicing discriminator).

  const sectionsByLoinc = new Map<string, Array<{ section: any; index: number }>>();
  sections.forEach((section, idx) => {
    const codings = section.code?.coding ?? [];
    for (const coding of codings) {
      if (coding.system === LOINC_SYSTEM && coding.code) {
        const list = sectionsByLoinc.get(coding.code) ?? [];
        list.push({ section, index: idx });
        sectionsByLoinc.set(coding.code, list);
      }
    }
  });

  // ---- Step 4: build a resource-resolution index for entry-reference resolution ----

  // Map from "ResourceType/id" → entry.resource for fullUrl-or-relative-ref lookup.
  // Also support "urn:uuid:..." fullUrls (FHIR document Bundle convention).
  const resolveIndex = new Map<string, any>();
  for (const e of entries) {
    if (e?.resource?.resourceType && e.resource.id) {
      resolveIndex.set(`${e.resource.resourceType}/${e.resource.id}`, e.resource);
    }
    if (e?.fullUrl) {
      resolveIndex.set(e.fullUrl, e.resource);
    }
  }

  // ---- Step 5: walk each IPS section slice ----

  for (const slice of IPS_SECTION_SLICES) {
    const matches = sectionsByLoinc.get(slice.loincCode) ?? [];

    if (matches.length === 0) {
      // SECTION ABSENT
      if (slice.required) {
        issues.push({
          severity: 'error',
          code: 'required',
          details: { text: `Required section '${slice.title}' (LOINC ${slice.loincCode}) is missing` },
          // D-11: expression path uses index = next free slot; for "missing"
          // we use the slice's canonical position. Use sliceName as a stable
          // identifier instead of index for missing sections — this avoids
          // confusion (no real index exists for a missing section).
          expression: [`Composition.section[?slice='${slice.sliceName}'].title`],
        });
      }
      // optional + absent: silent (no issue)
      continue;
    }

    // For each present instance (typically 1, since most slices are max:1)
    for (const { section, index } of matches) {
      const expressionBase = `Composition.section[${index}]`;

      // SECTION PRESENT but ENTRY EMPTY
      const entryRefs = section.entry ?? [];
      if (entryRefs.length === 0) {
        issues.push({
          severity: 'warning',
          code: 'incomplete',
          details: { text: `Section '${slice.title}' is present but has no entries` },
          expression: [`${expressionBase}.title`],
        });
        continue; // no entries → no refs to resolve
      }

      // SECTION PRESENT, ENTRIES PRESENT — resolve each reference
      for (const ref of entryRefs) {
        const refStr = ref?.reference;
        if (!refStr) continue; // shouldn't happen but defensive
        const resolved = resolveIndex.get(refStr);
        if (!resolved) {
          issues.push({
            severity: 'information',
            code: 'incomplete',
            details: { text: `Section '${slice.title}' references unresolvable resource ${refStr}` },
            expression: [`${expressionBase}.title`],
          });
        }
      }
    }
  }

  return issues;
}
```

### Severity classification (D-09 mapping)

| Condition | severity | code | UI badge color |
|-----------|----------|------|----------------|
| Section absent (required) | `error` | `required` | red |
| Section present, no entries | `warning` | `incomplete` | yellow |
| Section entry unresolvable | `information` | `incomplete` | blue |
| Bundle.resourceType wrong | `error` | `structure` | red |
| Bundle.type ≠ 'document' | `error` | `structure` | red |
| No Composition entry | `error` | `required` | red |

`normalizeOperationOutcomeIssue` already maps `fatal|error → 'error'`, `warning → 'warning'`, all others → `'info'`. So `severity: 'information'` (FHIR spelling) gets normalized to `'info'` (NormalizedIssue spelling). [VERIFIED: `src/quality/normalizers.ts:26-31`]

### Integration with `<ResourceIssueTable>`

The walker returns `OperationOutcomeIssue[]`. The IPSPanel wires that through `normalizeOperationOutcomeIssue(issue, 'Composition/<id>')` for each, then passes the `NormalizedIssue[]` directly to `<ResourceIssueTable>`. The `field` column will display the `expression[0]` value (e.g., `Composition.section[2].title`). The `Resource` column will display `Composition/<id>` and link to `/explorer/Composition/<id>`. [VERIFIED: `ResourceIssueTable.tsx:298-309`]

### Pseudocode complexity

- Sections: O(N) where N = section count (typically ≤16)
- Per-section entry resolution: O(M) where M = entries per section (typically ≤a few hundred)
- Total: O(N × M) — entirely tractable for typical IPS bundles (≤500 KB JSON).

---

## 5. Reuse Map

### Phase 5 — completeness walker idiom

[CITED: `src/quality/profiles/index.ts` + Phase 5 archive]
- **Pattern reused:** pure-function profile walker producing OperationOutcomeIssue[]; output flows through `normalizeOperationOutcomeIssue`.
- **NOT reused:** Phase 5's `cardinalityWalker.ts` works on a per-resource basis (one resource → its profile). Our IPS walker works on a bundle (one bundle → one IPS profile). Different signatures. Different mental model.

### Phase 15 — `<ResourceIssueTable>` drill-down primitive

[VERIFIED: `src/components/quality/ResourceIssueTable.tsx`]
- **Used UNMODIFIED.** The `suggestions` prop (Phase 43 VAL-07 extension) is OPTIONAL — when absent, no chevron / no Collapse rows render. IPSPanel passes only `issues`, omits `suggestions`.
- IPSPanel renders `<ResourceIssueTable issues={normalizedIssues} />` directly.

### Phase 31 — `ValidationPanel` UX patterns

[CITED: `src/components/quality/ValidationPanel.tsx`]
- **Pattern reused:** explicit "Validate" button; loading/cancelled/error state alerts; status-driven render (`run.status === 'complete' && allNormalizedIssues.length === 0` → green Alert; otherwise → table).
- **Pattern reused:** dismissible info banner at top (`useLocalStorage` for dismissal key).
- **NOT reused:** PHI gate (`phiAckKey`, `requiresPhiAck`) — IPS walker is local, no PHI leaves the browser. NO PHI banner needed for IPSPanel.
- **NOT reused:** `useConformanceRun` (cascade orchestration, sample-size sweeps). The walker is one-shot and synchronous.

### Phase 34 — fhir-package-loader fetch scaffold

[VERIFIED: `scripts/fetch-mii-profiles.mjs`]
- **Pattern reused:** `defaultPackageLoader` → `loader.loadPackage(name, version)` → `loader.findResourceJSONs('*', { type: ['StructureDefinition'], scope: name })` → `trim()` per SD → write `<typeSlug>-<slug>.json` + regenerate `index.ts` + ATTRIBUTION.md.
- **Pattern reused:** warn-and-continue failure mode (offline `prepare` hook tolerated, committed JSON authoritative).
- **`trim()` function reusability decision:** `scripts/lib/` does not exist. The Phase 34 `trim()` is currently inlined in `scripts/fetch-mii-profiles.mjs`. **Researcher recommends EXTRACTION** to `scripts/lib/trim-profile.mjs` as ESM module and import from BOTH fetchers (DRY, single source of truth, avoids future drift). The extraction is a small refactor ≈10 lines moved + 2 imports. The planner may instead choose to copy the function verbatim to `fetch-ips-profiles.mjs` (faster, but introduces the cross-fetcher drift risk Phase 34 D-13 already flagged). **Recommendation: extract.**

### Phase 36 — URL-keyed lazy-load registry

[VERIFIED: `src/quality/profiles/extensions/index.ts`]
- **Pattern reused:** `IPS_REGISTRY: Record<string, () => Promise<{ default: StructureDefinition }>>` at `src/quality/profiles/ips/index.ts`, generated by the fetch script. Same `import('./<file>.json') as unknown as Promise<{ default: StructureDefinition }>` cast pattern.
- **Pattern reused:** module-scoped cache + StrictMode-safe in-flight Promise sharing via `Map<string, Promise<...>>`. Adapt the `getExtensionProfileForUrl()` function to `getIpsProfileForUrl()` in a new helper module (or fold into `src/quality/profiles/ips/index.ts` as a sibling export).
- **Defensive early-return:** the fetch script must mirror Phase 34's behavior — if `registryByUrl.size === 0` (offline run), DO NOT regenerate `src/quality/profiles/ips/index.ts` with an empty registry. Preserve committed JSON.

### `normalizeOperationOutcomeIssue` (Phase 31 helper)

[VERIFIED: `src/quality/normalizers.ts:21-43`]
- **Used UNMODIFIED.** IPSPanel maps each walker-emitted issue through this helper to get a `NormalizedIssue`. Pass `resourceRef = 'Composition/<id>'` so the drill-down link works.

### Mantine 8 components

[VERIFIED: `node_modules/@mantine/core/lib/components/`]
- `<JsonInput autosize minRows={10} maxRows={30} />` — exists in Mantine 8.3.18, validates JSON shape on input, surfaces a parse error label, has `formatOnBlur` prop. Not yet used elsewhere in the codebase.
- `<Tabs>`, `<Button loading>`, `<Skeleton>`, `<Paper>`, `<Stack>`, `<Group>`, `<Alert>`, `<Select>` — all already used in `ValidationPanel`/`CohortsPage`/`CompletenessPanel`.
- `<DrillDownShell>` — Phase 15 standard wrapper. Use to wrap IPSPanel results area.

### Medplum hooks/client

- `useMedplum()` to get `MedplumClient`; `client.searchResources('Composition', { ... })` for the server-picker tab. [Standard Medplum usage.]
- `useResource('Composition', id)` to fetch a single Composition by ID once selected.
- IPS bundles can be retrieved via `Composition/$document` operation OR by traversing `Composition.section.entry` and fetching referenced resources individually. **For the server-picker tab, the simplest path is** `client.get('Composition/<id>/$document')` which returns a fully-assembled Bundle. [CITED: HL7 FHIR R4 `Composition.$document` operation, hl7.org/fhir/R4/composition-operation-document.html] **Fallback:** if the server doesn't support `$document` (Blaze does, per CapabilityStatement), prompt the user to paste manually. The planner should add a "server doesn't support $document" graceful fallback path.

---

## 6. Common Pitfalls

### Pitfall 1: Section identification by code, not by index or title

**What goes wrong:** Walker code that tries `composition.section[0]` for "Problems", `[1]` for "Allergies", etc. The IPS profile has `slicing.ordered: false` — the bundle producer can emit sections in any order.
**How to avoid:** Use the LOINC code in `section.code.coding[]` as the identifier. Build a `Map<loincCode, sections[]>` first, then iterate by slice catalogue. Section TITLE is descriptive only (free-text per implementer); don't match on it.

### Pitfall 2: `Composition.section` recursion (nested sections)

**What goes wrong:** FHIR `Composition.section` is recursive — sections may have nested `section[]` children. The IPS profile doesn't forbid this, and a producer might nest sub-sections.
**How to avoid:** v1.6 walker explicitly does NOT recurse into nested sections. Document this limitation in the JSDoc. Required-section detection looks at top-level `composition.section[]` only. (Reasonable scope for the MVP; deferred-ideas list could capture nested-section walking if user feedback demands it.)

### Pitfall 3: Reference resolution — multiple URL forms

**What goes wrong:** `section.entry[].reference` can be:
- Relative: `"Patient/123"` → matches `entry.resource.resourceType + '/' + entry.resource.id`
- Absolute fullUrl: `"urn:uuid:550e8400-..."` → matches `entry.fullUrl` directly
- Absolute external: `"http://example.com/fhir/Patient/123"` → may match a fullUrl OR not be in the bundle at all (legitimately unresolvable for our purposes)

A naive `bundle.entry.find(e => e.resource.id === ref.split('/')[1])` will miss fullUrl forms.
**How to avoid:** Build the `resolveIndex` map with BOTH relative `Type/id` AND `fullUrl` as keys (see walker pseudocode §4 step 4). Look up by the exact `reference` string.

### Pitfall 4: Bundle.type validation

**What goes wrong:** Walker silently accepts `bundle.type === 'collection'` or undefined and proceeds, masking a fundamental conformance error.
**How to avoid:** Explicit check at top of walker; emit `error/structure` issue if `type !== 'document'`. **Continue** processing (don't bail) so the user sees BOTH the structure error AND any section-level findings.

### Pitfall 5: Trim function drops `patternCodeableConcept`

**What goes wrong:** Phase 34's `trim()` keeps only `path/min/max/mustSupport/sliceName/type/binding(required)`. The `patternCodeableConcept` on `section.code` (the LOINC code that defines the slice) is dropped. A walker that tries to derive the section catalogue from the trimmed SD will see `sliceName` but no LOINC code.
**How to avoid:** Hard-code the section catalogue inside `ipsBundleValidator.ts` (as in §4 pseudocode). Document the version dependency in JSDoc. **Do not** silently extend the trim function shape; that affects Phase 34's MII files too.

### Pitfall 6: Large-bundle JsonInput perf

**What goes wrong:** `<JsonInput>` with `autosize` re-measures the textarea on every keystroke. With a 500 KB pasted bundle, this can hitch the main thread on slow machines.
**How to avoid:** Cap `maxRows={30}` (already in D-15) so autosize doesn't try to grow the element to thousands of rows. Optionally debounce the JSON-shape validation with `useDebouncedValue` if perf is observed lacking. The walker itself runs on Validate-button click only — keystroke-time only triggers shape parsing inside JsonInput.

### Pitfall 7: TypeScript double-cast for dynamic JSON imports

**What goes wrong:** Generated `index.ts` has `() => import('./Composition-CompositionUvIps.json') as Promise<...>`. TypeScript flags this as TS2352 because JSON imports default to a structurally-different type.
**How to avoid:** Use the `as unknown as Promise<{ default: StructureDefinition }>` double-cast pattern Phase 36 already established. This is the project's documented escape hatch — see `extensions/index.ts:9` for the canonical form.

### Pitfall 8: Empty-fetch defensive early-return in the script

**What goes wrong:** Offline `prepare` hook runs, fetch fails for all packages, script regenerates `src/quality/profiles/ips/index.ts` with an empty REGISTRY, breaking the lazy-loader for every consumer.
**How to avoid:** Mirror Phase 34's defensive pattern (lines 184-201 of `scripts/fetch-mii-profiles.mjs`): if `registryByUrl.size === 0`, log a warning and bail BEFORE the file write. The committed JSON + index.ts in the repo is the authoritative offline fallback.

### Pitfall 9: `prepare` hook chaining — atomicity

**What goes wrong:** Naïve chaining `node fetch-mii-profiles.mjs && node fetch-ips-profiles.mjs` means MII failure short-circuits IPS. Or `;` chaining loses the `|| true` escape.
**How to avoid:** Two safe options:
1. **Independent escape:** `node fetch-mii-profiles.mjs; node fetch-ips-profiles.mjs; true` — both run regardless; `true` ensures `prepare` exits 0.
2. **Dispatcher script:** `scripts/fetch-profiles.mjs` that imports + sequentially runs both fetchers, each with its own try/catch, top-level `process.exit(0)`. Cleaner but adds a layer.

**Researcher recommendation: option 1** for parsimony. The current `node scripts/fetch-mii-profiles.mjs || true` becomes `node scripts/fetch-mii-profiles.mjs || true && node scripts/fetch-ips-profiles.mjs || true`. Both fetchers ALREADY have top-level catch handlers that exit 0 on error; the outer `|| true` per-command is belt-and-braces. [VERIFIED: `fetch-mii-profiles.mjs:228-231`]

### Pitfall 10: Composition `$document` operation availability

**What goes wrong:** Server picker tab tries `client.get('Composition/<id>/$document')`; Blaze responds 200 fine, but a future server (e.g. validator.fhir.org) returns 404 or 501 Not Implemented.
**How to avoid:** Wrap the `$document` call in a try/catch; on failure, surface a Mantine `<Alert>` "Server does not implement Composition/$document; paste the bundle manually" and switch focus to the paste tab.

---

## 7. Open Questions

### Q1: Should the walker recurse into nested `Composition.section.section[]`?

- **What we know:** FHIR `Composition.section` is recursive. The IPS profile's section slice definitions only constrain top-level sections.
- **What's unclear:** Whether real-world IPS bundles use nested sections. Research suggests they're rare but possible.
- **Recommendation:** **NO — top-level only for v1.6.** Document explicitly in JSDoc and IPSPanel info banner ("Nested sections are not validated; v1.7 may extend this"). Capture as a deferred idea if user feedback emerges.

### Q2: Should the walker also validate Bundle.entry slicing (e.g., `Bundle.entry[1] MUST be a Patient`)?

- **What we know:** The IPS Bundle profile mandates `entry[0] = Composition`, `entry[1] = Patient`, plus typed slices for AllergyIntolerance, Condition, Medication, etc.
- **What's unclear:** Whether the user wants entry-slicing diagnostics or only section-level diagnostics. CONTEXT D-08 says walker takes `(bundle, ipsProfile)` — IPSProfile here is the Composition profile. Bundle profile is a separate SD.
- **Recommendation:** **Section-level only for v1.6** (as locked by D-09's three severity rules — all section-scoped). The walker DOES check `bundle.type === 'document'` and the existence of a Composition entry as malformed-bundle defenses, but does NOT enforce `Bundle.entry[1] === Patient` or other entry slices. Capture entry-slicing as a deferred idea if user demand emerges.

### Q3: Where should the "complete" fixture come from?

- **What we know:** Three fixtures needed: `complete`, `incomplete`, `malformed`. The IPS package includes example bundles — need to check.
- **What's unclear:** Whether to use a published HL7 example, generate via Synthea-IPS, or hand-craft.
- **Recommendation:** **Hand-craft minimal fixtures.** A published example may carry references to external resource IDs we'd then need to invent or omit. A minimal hand-crafted bundle:
  - `complete`: Bundle (`type: 'document'`) → Composition with all 3 required sections + 2 optional sections, each with a single resolvable entry → 5 corresponding clinical resources (Patient, Condition, AllergyIntolerance, MedicationStatement, Immunization, Observation). Walker should return `[]` issues.
  - `incomplete`: same Composition but missing the AllergyIntolerance section + Medications section has empty `entry[]` array. Walker should return ≥2 issues (1 error: Allergies missing; 1 warning: Medications empty).
  - `malformed`: Bundle with `type: 'collection'` and no Composition entry. Walker should return ≥2 issues (1 error: bundle.type wrong; 1 error: no Composition).
  - All three fixtures are 30-80 lines of JSON each — small enough to commit and review.
  - **Alternative:** check `/tmp/ips-pkg/package/Bundle-bundle-uv-ips-*.json` for shipped examples; some IPS packages include example bundles named like `Bundle-IPS-examples-Bundle-01.json`. The planner should peek there during implementation. (The 2.0.0 tarball has examples in `package/example/` per the package.json `directories.example` field, which were not extracted in this research.)

### Q4: Should IPSPanel be lazy-loaded like other quality drill-downs?

- **What we know:** Phase 27 lazy-loaded most quality drill-downs (`CompletenessDrillDown`, etc.) via `lazy(() => retry(() => import('...')))`. Sub-route children of `/quality` follow this pattern.
- **What's unclear:** Whether IPSPanel's bundled IPS profile makes its first-load chunk too heavy.
- **Recommendation:** **YES, lazy-load IPSPanel.** The IPS profile JSON is loaded lazily by the registry (`getIpsProfileForUrl()` triggers the dynamic import only when Validate is clicked). The IPSPanel component itself can be lazy-loaded the same way as the other drill-downs in `App.tsx:48-82`. Bundle-size budget per Phase 41 baseline (606.76 KB gz initial) shouldn't be impacted.

### Q5: Are there test fixtures already shipped in the IPS package's `example/` directory?

- **What we know:** The package.json declares `directories.example: 'example'`; the tarball was extracted only into `package/`, the example directory wasn't separately examined.
- **What's unclear:** Whether shipping example bundles cover the "complete" fixture need.
- **Recommendation:** **Planner should examine** `tar -xzf /tmp/ips-2.0.0.tgz example/` (or fetch the tarball fresh during implementation) to see what example bundles ship. If a usable bundle exists, copy it as `ips-bundle-complete.json` with attribution comment in the test file. If not, hand-craft per Q3.

---

## 8. Validation Architecture

> Per `.planning/config.json` `workflow.nyquist_validation: true`, this section is REQUIRED.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `vitest@^4.1.4` |
| Config file | `vitest.config.ts` (existing) |
| Quick run command | `npx vitest run --no-coverage <file>` |
| Full suite command | `npm test` (`vitest run`) |

[VERIFIED: package.json line 13 + Phase 43 baseline of 1064+ tests]

### Phase Requirements → Test Map

Per the additional context, threat refs **T-44-01..T-44-06** are pre-allocated. Mapped to concrete test files:

| Threat | REQ | Behavior | Test type | File | Automated command | File exists? |
|--------|-----|----------|-----------|------|-------------------|---------------|
| **T-44-01** | IPS-01 | Trim function preserves required SD fields (path, sliceName, min, max, mustSupport) | unit | `scripts/__tests__/trim-profile.test.mjs` | `npx vitest run --no-coverage scripts/__tests__/trim-profile.test.mjs` | ❌ Wave 0 |
| **T-44-02** | IPS-01 | Walker handles missing Composition gracefully — no crash | unit | `src/quality/__tests__/ipsBundleValidator.test.ts::handles-missing-composition` | `npx vitest run --no-coverage src/quality/__tests__/ipsBundleValidator.test.ts` | ❌ Wave 0 |
| **T-44-03** | IPS-01 | Walker resolves bundle.entry references correctly + flags unresolvable refs as info | unit | `src/quality/__tests__/ipsBundleValidator.test.ts::resolves-references` | (same suite as above) | ❌ Wave 0 |
| **T-44-04** | IPS-01 | Three-fixture regression (complete: 0 issues; incomplete: ≥2 issues; malformed: ≥2 issues) | fixture-driven | `src/quality/__tests__/ipsBundleValidator.test.ts::three-fixtures` | (same suite) | ❌ Wave 0 — fixtures in `src/quality/__tests__/fixtures/ips/` ❌ Wave 0 |
| **T-44-05** | IPS-01 | License/attribution files present + linked to upstream `hl7.fhir.uv.ips@2.0.0` | grep test | `src/__tests__/license-ips.test.ts` (or extend an existing license test) | `npx vitest run --no-coverage src/__tests__/license-ips.test.ts` | ❌ Wave 0 |
| **T-44-06** | IPS-01 | IPSPanel mounts, paste fixture, click Validate, ResourceIssueTable shows ≥2 rows | component | `src/components/quality/__tests__/IPSPanel.test.tsx` | `npx vitest run --no-coverage src/components/quality/__tests__/IPSPanel.test.tsx` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run --no-coverage <file-touched-by-task>` (per-file targeted)
- **Per wave merge:** `npm test` (all 1064+ tests + new ≥6 IPS tests)
- **Phase gate:** `npm test` exits 0; `npm run build` exits 0; `tsc -b --noEmit` clean — before `/gsd-verify-work`

### Wave 0 Gaps (must be created BEFORE Wave 1 implementation)

- [ ] `src/quality/__tests__/ipsBundleValidator.test.ts` — Wave 0 stub (test names + skipped bodies; ≥6 tests covering T-44-02, T-44-03, T-44-04 plus walker severity classification, expression-path-format, ips-profile-not-loaded fallback)
- [ ] `src/components/quality/__tests__/IPSPanel.test.tsx` — Wave 0 stub (T-44-06 component test scaffolded)
- [ ] `scripts/__tests__/trim-profile.test.mjs` — Wave 0 (T-44-01; needs vitest config to pick up `.mjs` files OR rewrite as `.ts` if vitest config doesn't include scripts/)
- [ ] `src/quality/__tests__/fixtures/ips/` directory creation
- [ ] `src/quality/__tests__/fixtures/ips/ips-bundle-complete.json` — hand-crafted (or sourced from package/example/ per Q5)
- [ ] `src/quality/__tests__/fixtures/ips/ips-bundle-incomplete.json` — hand-crafted
- [ ] `src/quality/__tests__/fixtures/ips/ips-bundle-malformed.json` — hand-crafted
- [ ] `src/__tests__/license-ips.test.ts` — Wave 0 (T-44-05 grep assertions: LICENSE contains "hl7.fhir.uv.ips" + "CC0-1.0"; ATTRIBUTION.md exists with version pin)
- [ ] **Framework install:** none — `vitest@^4.1.4` already in devDependencies. NO new test framework deps per D-13.

---

## 9. Sources

### Primary (HIGH confidence)

- [VERIFIED: live registry probe] `https://packages.fhir.org/hl7.fhir.uv.ips` — 2026-04-30, returns dist-tags.latest = `2.0.0`
- [VERIFIED: package extraction] `https://packages.fhir.org/hl7.fhir.uv.ips/2.0.0` — tarball downloaded, `package/package.json` confirms license=CC0-1.0, fhirVersion=4.0.1, canonical=http://hl7.org/fhir/uv/ips
- [VERIFIED: profile inspection] `package/StructureDefinition-Composition-uv-ips.json` — extracted 16 section slice definitions with sliceName, min/max, LOINC codes via Node.js script
- [VERIFIED: profile inspection] `package/StructureDefinition-Bundle-uv-ips.json` — extracted Bundle.type fixed='document', entry slicing
- [VERIFIED: codebase grep] `scripts/fetch-mii-profiles.mjs` — Phase 34 trim() function, EXTENSION_PACKAGES pin pattern, defensive empty-fetch early-return
- [VERIFIED: codebase grep] `src/quality/profiles/extensions/index.ts` — Phase 36 URL-keyed lazy-load thunk pattern, double-cast `as unknown as Promise<...>` idiom
- [VERIFIED: codebase grep] `src/quality/profiles/index.ts:73-105` — `getExtensionProfileForUrl()` cache+in-flight Promise pattern
- [VERIFIED: codebase grep] `src/quality/normalizers.ts:21-43` — `normalizeOperationOutcomeIssue()` shape and severity policy
- [VERIFIED: codebase grep] `src/components/quality/ResourceIssueTable.tsx:67-78` — props signature with optional `suggestions`
- [VERIFIED: codebase grep] `src/App.tsx:142-152` — `/quality/*` route cluster shape (sub-routes: cohorts, thresholds, completeness/:type, etc.)
- [VERIFIED: codebase grep] `package.json:16` — current `prepare` hook: `node scripts/fetch-mii-profiles.mjs || true`
- [VERIFIED: codebase grep] `node_modules/@mantine/core/lib/components/JsonInput/JsonInput.d.ts` — Mantine 8 `<JsonInput>` exists
- [VERIFIED: npm registry] `npm view fhir-package-loader version` → `2.2.4` (Phase 34's pin remains current)

### Secondary (MEDIUM-HIGH confidence)

- [CITED: hl7.org/fhir/uv/ips] HL7 IPS Implementation Guide canonical
- [CITED: hl7.org/fhir/uv/ips/StructureDefinition-Composition-uv-ips.html] HL7 IPS Composition profile reference page
- [CITED: hl7.org/fhir/R4/composition.html] FHIR R4 Composition resource
- [CITED: hl7.org/fhir/R4/operationoutcome.html] FHIR R4 OperationOutcome (issue.severity, issue.code, issue.expression)
- [CITED: hl7.org/fhir/R4/composition-operation-document.html] Composition `$document` operation (server-picker fallback path)

### Tertiary

- (none — all factual claims in this research are backed by direct file inspection or registry queries)

---

## 10. Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The 16 IPS section slices and their LOINC codes are stable across IPS-2.0.0 patch versions | §1, §4 | LOW — IPS-2.0.0 is GA-locked; if HL7 ships 2.0.1 with section changes, the hard-coded catalogue must be updated. Walker should embed the IPS version in a const for traceability. |
| A2 | Phase 34's `trim()` should be extracted to `scripts/lib/trim-profile.mjs` for DRY | §5 reuse map | LOW — alternative is to copy verbatim (drift risk). Planner may overrule. |
| A3 | Hand-crafted minimal fixtures are preferable to package/example bundles | §7 Q3 | LOW — planner can re-evaluate by examining `package/example/` during Wave 0. |
| A4 | The `prepare` hook should chain via `; … ; true` rather than a dispatcher script | §6 Pitfall 9 | LOW — both work; researcher's preference is parsimony. |
| A5 | Bundle.type validation is in scope (top-level malformed-bundle defense) but Bundle.entry slicing (entry[1] = Patient, etc.) is OUT of scope for v1.6 | §7 Q2 | MEDIUM — if user expectations include entry-slicing diagnostics, the walker must be re-scoped. CONTEXT D-09 only specifies section-level severities, so this researcher reads "section-level" as authoritative; planner/user can override. |
| A6 | Top-level walker only — no recursion into nested `Composition.section.section[]` | §7 Q1 | LOW — rare in practice; can be lifted to deferred-ideas. |
| A7 | IPSPanel should be lazy-loaded like the other Phase 27 drill-downs | §7 Q4 | LOW — bundle-size impact is marginal; planner decides based on Phase 41 baseline impact. |

**If user demands change:** Assumptions A2, A4, A5 are the most likely to need confirmation. A5 in particular is a scope question — if the user wants Bundle entry-slicing diagnostics, walker scope MUST grow. **Recommend planner confirm A5 explicitly before Wave 1.**

---

## 11. State of the Art (FHIR validation tooling)

| Old approach | Current approach | When changed | Impact |
|--------------|------------------|--------------|--------|
| Custom JSON-shape validators in app code | Bundled FHIR profile + structural walker | Phase 34 (April 2026) | Walkers stay small; profiles are version-pinned and CC-licensed |
| Server-side `$validate` only | Tiered cascade (local → server → external) | Phase 31 | Local check is offline-capable; UX-01 surfaces external diagnostics |
| Hand-rolled trim functions per fetcher | Shared `scripts/lib/trim-profile.mjs` | Phase 44 (recommended in this research) | Single source of truth; both MII and IPS use same shape |

**Deprecated/outdated:**
- `hl7.fhir.uv.ips@1.x` — superseded by `2.0.0` GA in October 2025. Don't pin to 1.x.
- `hl7.fhir.uv.ips@0.x` — STU3 / very early R4 drafts; not for production.

---

## 12. Environment Availability

| Dependency | Required by | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| `node` | fetch script + tests | ✓ | (system) | — |
| `npm` | install + scripts | ✓ | (system) | — |
| `fhir-package-loader` | fetch script | ✓ devDep | `2.2.4` | — (already pinned in package.json) |
| `vitest` | tests | ✓ devDep | `4.1.4` | — |
| `@mantine/core` (JsonInput, Tabs) | IPSPanel UI | ✓ | `8.3.18` | — |
| `@medplum/core` (searchResources) | server-picker tab | ✓ | `5.1.7` | — |
| Internet access at `prepare` time | initial profile fetch | partial — Phase 34 uses warn-and-continue | — | Committed JSON in `src/quality/profiles/ips/` is authoritative offline fallback |
| Live IPS server | optional UAT only | n/a | — | Not required for v1.6 phase gate (per ROADMAP "Fully automatable with optional live-Blaze UAT") |

**Missing dependencies with no fallback:** none

**Missing dependencies with fallback:** none — Phase 34's offline-tolerant pattern is reused.

---

## 13. Metadata

**Confidence breakdown:**
- IPS package & version pin: **HIGH** — live registry probe + tarball extraction
- Profile structure (section slices, LOINC codes, min/max): **HIGH** — direct profile inspection via Node.js script
- Walker algorithm: **HIGH** — derived from verified profile + Phase 31/Phase 5 idiom + cross-checked against `normalizeOperationOutcomeIssue` signature
- Reuse map: **HIGH** — every reuse target was opened and signature-verified in this session
- Pitfalls: **HIGH-MEDIUM** — most are derived from Phase 34/Phase 36 documented pitfalls; the bundle.type and reference-resolution warnings are extrapolation from FHIR R4 spec
- Open questions: **MEDIUM** — Q3 and Q5 (fixtures) need Wave 0 inspection of `package/example/`

**Research date:** 2026-04-30
**Valid until:** 2026-07-30 (90 days — IPS package is GA-locked at 2.0.0; only HL7 ballot of IPS-2.1+ would invalidate the LOINC code map)
**Phase:** 44 — IPS Compositions Support (IPS-01)
