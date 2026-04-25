---
phase: 34-14-mii-extension-modules-palette-bundled-profiles
reviewed: 2026-04-25T05:35:58Z
depth: standard
files_reviewed: 22
files_reviewed_list:
  - package.json
  - scripts/fetch-mii-profiles.mjs
  - scripts/fetch-mii-profiles.test.mjs
  - src/__tests__/mii-icons.test.ts
  - src/__tests__/mii-modules.test.ts
  - src/__tests__/theme.test.ts
  - src/__tests__/useEmptyExtensionsCoordinator.test.tsx
  - src/components/dashboard/DashboardPage.tsx
  - src/components/patients/ClinicalTimeline.tsx
  - src/components/patients/MiiModuleTab.tsx
  - src/components/patients/MiiModuleTabs.tsx
  - src/components/patients/TimelineEntry.tsx
  - src/components/patients/__tests__/MiiModuleTab.test.tsx
  - src/components/patients/__tests__/MiiModuleTabs.test.tsx
  - src/hooks/useEmptyExtensionsCoordinator.tsx
  - src/quality/profiles/extensions/index.ts
  - src/quality/profiles/index.ts
  - src/theme.ts
  - src/utils/mii-icons.ts
  - src/utils/mii-modules.ts
  - src/utils/timeline-utils.ts
  - vitest.config.ts
findings:
  critical: 0
  warning: 4
  info: 7
  total: 11
status: issues_found
---

# Phase 34: Code Review Report

**Reviewed:** 2026-04-25T05:35:58Z
**Depth:** standard
**Files Reviewed:** 22
**Status:** issues_found

## Summary

Phase 34 lands the MII extension module palette: 14 new extension modules, the
21-icon registry (`ICON_MAP`), 7 new color palettes in `theme.ts`, the
per-patient empty-extensions coordinator (publish/subscribe context), the
`fetch-mii-profiles.mjs` regenerator (501 trimmed StructureDefinitions in
`src/quality/profiles/extensions/index.ts`), and the wiring across
`DashboardPage`, `MiiModuleTab(s)`, and `ClinicalTimeline` to render icons +
the Hide/Show empty-modules toggle.

The code is well-tested (test files for each module, `MiiModuleTab` /
`MiiModuleTabs` / `useEmptyExtensionsCoordinator` / theme / icons / modules /
fetch script all have new coverage), well-documented (extensive inline comments
referencing CONTEXT D-XX decisions), and follows the project's Mantine + medplum
conventions. No security-critical or crash-class bugs were found.

The four Warnings concentrate on (a) unencoded `patientId` in URL string
interpolation across two components and (b) two correctness issues in
`fetch-mii-profiles.mjs` around the registry-overwrite + ATTRIBUTION
metadata-versus-actual-bundle drift. Info items are mostly minor consistency /
robustness suggestions plus a stale doc comment.

## Warnings

### WR-01: Unencoded `patientId` interpolated into FHIR search URLs

**File:** `src/components/patients/MiiModuleTab.tsx:81`
**Issue:** The per-type fetch URL is built by raw template-string interpolation:

```ts
let url = `${type}?${param}=Patient/${patientId}&_count=50&_sort=-date`;
```

`patientId` is not passed through `encodeURIComponent`. FHIR resource IDs are
typically `[A-Za-z0-9-.]{1,64}` so this is benign for well-formed ids, but a
patient with an unexpected character (`+`, `&`, `#`, space, `?`) or an attacker-
controlled route param would either (a) produce a malformed search URL, (b)
truncate the `Patient/...` token at the first `&`, or (c) inject extra query
params (`patientId = "p1&_count=9999"` would override `_count=50`). The
`?` literal in `${type}?${param}=` could also collide with a literal `?` in
`patientId`. None of these cause memory corruption, but they are a real
surface for "weird-id-breaks-tab" bugs and a low-grade SSRF surface against
the bound FHIR server.

**Fix:**
```ts
const encodedId = encodeURIComponent(patientId);
let url = `${type}?${param}=Patient/${encodedId}&_count=50&_sort=-date`;
if (extra) url += `&${extra}`;
```
(Same fix applies to `ClinicalTimeline.tsx:72` — see WR-02.)

### WR-02: Same unencoded `patientId` issue in `ClinicalTimeline`

**File:** `src/components/patients/ClinicalTimeline.tsx:72`
**Issue:** The timeline aggregator builds search URLs with the same raw
interpolation pattern as WR-01:

```ts
client.searchResources(
  type,
  `patient=Patient/${patientId}&_count=100&_sort=-date`
)
```

Identical risk profile to WR-01 — a non-canonical patient id breaks the
timeline view rather than only the affected MII tab. Worth fixing in the same
commit so the two callsites stay aligned.

**Fix:**
```ts
const encodedId = encodeURIComponent(patientId);
// ... in the map ...
client.searchResources(
  type,
  `patient=Patient/${encodedId}&_count=100&_sort=-date`
)
```

### WR-03: ATTRIBUTION.md metadata pushed before bundle success is confirmed

**File:** `scripts/fetch-mii-profiles.mjs:129-141`
**Issue:** The `attributionSections.push(...)` call (lines 129-136) runs
unconditionally for every package iteration, *before* the
`if (status !== LoadStatus.LOADED) { ... continue; }` guard at line 138.
The result: when a package fails to fetch (offline, 404, version mismatch),
its ATTRIBUTION.md section is still emitted as if it had been bundled, even
though zero StructureDefinition JSON files were written for it. Downstream
license-audit tooling reading ATTRIBUTION.md will believe the package is
in the bundle when it isn't.

This is partially masked by the defensive early-return at line 182 (which
preserves the committed ATTRIBUTION.md if *every* package fails), but a
single-package failure still corrupts the regenerated file.

**Fix:** Move the `attributionSections.push` call below the LoadStatus check:

```ts
if (status !== LoadStatus.LOADED) {
  console.warn(`[warn] ${name}@${version} — status ${status}; skipping...`);
  continue;
}

attributionSections.push(
  `## ${name}\n\n` +
  `- **Canonical URL:** ${CANONICAL_URLS[name] ?? '(unknown)'}\n` +
  `- **Bundled version:** ${version}\n` +
  // ... etc.
);

const sds = loader.findResourceJSONs(...) ?? [];
```

### WR-04: Silent registry overwrite on duplicate canonical URLs

**File:** `scripts/fetch-mii-profiles.mjs:166`
**Issue:** The generated `REGISTRY` object is keyed by `sd.url`:

```ts
registryLines.push(`  [(${varName} as unknown as StructureDefinition).url]: ${varName} as unknown as StructureDefinition,`);
```

If two StructureDefinitions across the 14 packages share the same canonical
`url` (which can legitimately happen — e.g. a profile re-published in a
follow-up package, or two LogicalModels with identical URLs sharing only
filename differences), the second wins silently with no warning. The
generated `index.ts` ends up with fewer registry entries than imported
`sd0`-`sd500` files, and `getExtensionProfileForUrl()` returns whichever
SD happened to be alphabetically last per package iteration.

The registry currently has 501 imports (`sd0`..`sd500`); the resulting
`REGISTRY` object size should equal that count. A silent collision would
reduce it without surfacing the drift.

**Fix:** Detect duplicates at generation time and warn:

```ts
const seenUrls = new Set();
for (const sd of sds) {
  if (seenUrls.has(sd.url)) {
    console.warn(`[warn] ${name}@${version} — duplicate canonical URL ${sd.url}; later SD will overwrite earlier`);
  }
  seenUrls.add(sd.url);
  // ... existing slug + writeFile logic ...
}
```

Or, cheaper, runtime self-check in the generated `index.ts`:

```ts
// (append at end of generated file)
console.assert(
  Object.keys(REGISTRY).length === N_IMPORTS,
  'REGISTRY entries != import count — duplicate canonical URLs detected',
);
```

## Info

### IN-01: `extensionModules` recomputed every render → effect re-fires every render

**File:** `src/components/patients/MiiModuleTabs.tsx:121, 143-151`
**Issue:** `extensionModules` is computed via `MII_MODULES.filter(...)` directly
in the function body, producing a new array reference on every render. That
reference is then a dep of the deep-link auto-expand `useEffect` (line 151):

```ts
const extensionModules = MII_MODULES.filter((m) => m.category === 'extension');
// ...
useEffect(() => {
  if (activeTab && extensionModules.some(...) && !extensionOpened) {
    toggleExtension();
  }
}, [activeTab, extensionModules, extensionOpened, toggleExtension]);
```

The `!extensionOpened` guard prevents an infinite loop, but the effect still
fires every render. Same pattern in `DashboardPage.tsx:171-174` (cheaper there
since no effect depends on the result).

**Fix:**
```ts
const extensionModules = useMemo(
  () => MII_MODULES.filter((m) => m.category === 'extension'),
  [],
);
const baseModules = useMemo(
  () => MII_MODULES.filter((m) => m.category === 'base'),
  [],
);
```

### IN-02: Stale doc comment — "six MII modules"

**File:** `src/utils/mii-modules.ts:5`
**Issue:** The interface JSDoc opens with: *"Defines the six MII
(Medizininformatik-Initiative) Kerndatensatz modules..."*. The exported
`MII_MODULES` array now contains 21 entries (7 base + 14 extension). The
out-of-date number will mislead future maintainers reading the file header.

**Fix:** Update to: *"Defines the 21 MII Kerndatensatz modules (7 base + 14
extension)..."* — or generalise to *"...the MII Kerndatensatz module
configuration..."* without a count.

### IN-03: Generated filenames lose all delimiters for URL-shaped SD types

**File:** `scripts/fetch-mii-profiles.mjs:158`
**Issue:** `String(sd.type ?? 'Unknown').replace(/[^A-Za-z0-9]+/g, '')`
strips slashes/dots from URL-shaped `sd.type` values produced by MII
LogicalModel SDs. The result is filenames like:

```
httpswwwmedizininformatikinitiativedefhirextmodulbildgebungStructureDefinitionLogicalModelBildgebung-mii-lm-bildgebung.json
```

(line 16 of the generated index — 110 chars). This works on macOS / Linux
ext4 (255-byte limit per component) but is fragile on filesystems with
shorter limits (eCryptfs has a 143-char limit; older NTFS can hit 255 chars
including the full path). Also hurts grep-readability and looks like the
URL was accidentally double-stringified.

**Fix:** Map the URL-prefix down to a short token before the strip step:

```ts
const rawType = sd.type ?? 'Unknown';
// LogicalModel SDs sometimes carry a URL as `type`; collapse to last segment.
const cleanType = String(rawType).split('/').pop() ?? rawType;
const typeSlug = String(cleanType).replace(/[^A-Za-z0-9]+/g, '');
```

### IN-04: `trim()` may preserve extra binding fields beyond strength + valueSet

**File:** `scripts/fetch-mii-profiles.mjs:91`
**Issue:** When `e.binding?.strength === 'required'`, the entire `e.binding`
object is preserved (`out.binding = e.binding`). Per the test expectation
on line 133 (`{ strength: 'required', valueSet: 'http://vs' }`), only
`strength` and `valueSet` are needed for completeness checks. If MII sources
include additional binding fields (e.g. `description`, `extension`,
`additional`), those bytes ship in the bundle even though the consumer
doesn't need them.

**Fix (optional, bundle-size win):**
```ts
if (e.binding?.strength === 'required') {
  out.binding = {
    strength: e.binding.strength,
    ...(e.binding.valueSet ? { valueSet: e.binding.valueSet } : {}),
  };
}
```

### IN-05: `.filter(Boolean) as Resource[]` weakens the type system

**File:** `src/components/patients/MiiModuleTab.tsx:91`
**Issue:** `.filter(Boolean) as Resource[]` is a common but type-unsafe
pattern. Strict TS doesn't narrow `(Resource | undefined)[]` to `Resource[]`
through `filter(Boolean)`; the `as` cast shuts the compiler up. If a falsy
non-undefined Resource ever sneaks through (impossible today but possible
under a schema evolution), the cast hides it.

**Fix:**
```ts
.filter((r): r is Resource => r !== undefined);
```

### IN-06: Test relies on arbitrary `setTimeout(50)` for async settling

**File:** `scripts/fetch-mii-profiles.test.mjs:107, 152, 169, 183, 199`
**Issue:** Each test does `await new Promise((r) => setTimeout(r, 50))` to
wait for the dynamically-imported script's top-level `main()` to resolve.
This is a flaky pattern — on a busy CI runner a 50ms wait may not be enough,
and on a fast machine 50ms is wasted.

**Fix:** Refactor `fetch-mii-profiles.mjs` to export `main()` as a named
export and let the test `await` it directly:

```js
// fetch-mii-profiles.mjs
export async function main() { /* ... */ }
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => { console.warn(...); process.exit(0); });
}
```

```js
// fetch-mii-profiles.test.mjs
const { main } = await import('./fetch-mii-profiles.mjs');
await main();
```

### IN-07: `setLoading(false)` not called when fetch resolves after unmount

**File:** `src/components/patients/MiiModuleTab.tsx:95-103`
**Issue:** Inside the `Promise.all(...).then(...)` block:

```ts
Promise.all(types.map(fetchOne)).then((perType) => {
  if (cancelled) return;
  // ...
  setResources(all);
  setLoading(false);
});
```

If `cancelled === true`, the early-return is correct (no state set on
unmounted component). If the parent re-mounts the same component before the
microtask runs, `cancelled` belongs to the *old* effect closure and the
*new* mount sees `loading = true` until its own fetch resolves. This is
benign (the new mount kicks off its own fetch + setLoading) but means
there's a brief flash of skeleton even when cached data could render
immediately. Not worth fixing unless caching becomes a requirement.

---

_Reviewed: 2026-04-25T05:35:58Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
