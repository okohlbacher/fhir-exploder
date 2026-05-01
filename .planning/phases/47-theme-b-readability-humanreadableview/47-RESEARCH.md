# Phase 47: Theme B — Readability: HumanReadableView - Research

**Researched:** 2026-05-01
**Domain:** FHIR reference resolution + extension surfacing + contained-resource rendering inside `HumanReadableView` (Mode 2 of the future 4-mode resource shell, but for Phase 47 still inside the current `<Tabs>` chrome)
**Confidence:** HIGH (CONTEXT.md fully locks the design; codebase carries direct precedents for every primitive needed)

---

## Summary

Phase 47 enriches `src/components/explorer/HumanReadableView.tsx` along three orthogonal axes (READ-01 reference resolution, READ-02 property-level extension surfacing, READ-03 contained-resource rendering). All three locked decisions in CONTEXT.md map cleanly onto patterns already shipped in the codebase: the **Phase 36** module-scoped `cache + inFlight Map` pair is the exact precedent for the Phase 47 reference cache; **Phase 4 `TerminologyResolver`** demonstrates the negative-cache + silent-failure idiom; **`useResolvedResource`** shows the StrictMode-safe + cancellation hook pattern; **`ResourceTypeList`** demonstrates the Mantine 8 `<Accordion multiple variant="separated">` idiom for the contained-resource expand. **`referenceWalker.normalizeReference`** already implements D-04's relative/absolute → `Type/id` normalization and is reusable.

The phase introduces ONE new public contract: the `useReferenceResolver(reference: string)` hook in `src/hooks/useReferenceResolver.ts`, with module-scoped `Map<\`${type}/${id}\`, Resource | null>` cache + parallel `Map<key, Promise<Resource | null>>` inFlight map. The hook is consumed inline by a new `ReferenceLink` sub-component in `HumanReadableView`/`ResourcePropertyTable`, which replaces the current raw `<Anchor href={Type/id}>` pattern with a `summarizeResource(target).primary`-rendering link plus `<Tooltip label={Type/id}>`. The same hook is the API the future JSON peek drawer (Phase 46.5/47.5) and IncomingReferencesPanel (Phase 48) will import — Phase 47's ONLY consumer is `HumanReadableView` itself, but the hook MUST land with that contract locked.

**Primary recommendation:** Mirror Phase 36's `getExtensionProfileForUrl` shape verbatim — module-scoped `referenceCache` + `referenceInFlight` Maps, but expose a React hook (not an async function) so reads stay synchronous (cache-hit) and pending state surfaces via the hook's `status` return. Use `client.readReference({ reference })` for the actual fetch (Medplum 5.1.7 returns `ReadablePromise<WithId<T>>` — which auto-throws on 404; catch silently and cache `null` per D-02). Re-use `referenceWalker.normalizeReference` (already extracted, already tested) for D-04. Mantine 8 `<Accordion multiple variant="separated">` for READ-03.

---

## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01 — Reference rendering text (READ-01):** Inline text MUST be `summarizeResource(target).primary`. The full reference URL (e.g. `Patient/abc123`) is accessible via Mantine `<Tooltip>` on hover. The rendered text remains a clickable router link to `/explorer/{type}/{id}`.

**D-02 — Reference cache shape (READ-01 SC#2):** Session-level `Map<\`${type}/${id}\`, Resource | null>`. Cleared on full reload. Repeat references hit cache; failed lookups (404 / network error) cache `null` and silently fall back to the raw href display. NO error toast. NO retry on cache miss within the session.

**D-03 — Cache lifecycle and exposure:** Cache lives in a module-scoped `Map` accessed via a custom hook `useReferenceResolver(reference: string) → { resource: Resource | null; status: 'pending' | 'resolved' | 'failed' }`. The hook is the SINGLE consumer-facing API. The underlying `Map` is NOT exported. The hook is reusable by Phase 48 (IncomingReferencesPanel) and the future JSON peek drawer (`Cmd+click` chip resolution).

**D-04 — Reference URL parsing:** `Reference.reference` strings are parsed as `Type/id` (relative) or full URL (absolute). Absolute URLs that match the configured FHIR base URL are normalized to `Type/id` for cache lookup. Cross-server / contained-resource fragment refs (`#contained-id`) are NOT cached — they resolve from the parent resource's `contained[]` array.

**D-05 — Loading states (READ-01):** While a reference is in-flight (status `'pending'`), render the reference URL string verbatim with a Mantine `<Skeleton width={120} height={14}>` overlay (or equivalent visual cue). Once resolved, swap to the human-readable text. On failure, render the raw `Type/id` text as the link content.

**D-06 — Extension surfacing (READ-02):** Inline `[+1 extension]` chip rendered next to the property row, click-expands to reveal the extension's URL + value inline (NOT a modal). For multiple extensions on the same property, the chip reads `[+N extensions]`. The full `extension[]` array of the resource itself remains accessible via the existing dedicated "Extensions" subsection at the bottom of the view (already shipped in Phase 35 UAT-FU-02).

**D-07 — Extension display format:** Each surfaced extension renders as: `<Code>extension URL</Code>` on one line, the extension's value rendered via the existing `<ResourcePropertyDisplay>` on the next line. For nested extensions (`extension.extension[]`), recurse with a 1-level indent.

**D-08 — Contained-resource rendering (READ-03):** `Resource.contained[]` is rendered inline as a collapsed accordion below the parent resource's properties. Each contained entry shows `summarizeResource(contained).primary` in the accordion header. Click-expand reveals a full `<ResourcePropertyTable>` for that contained resource (read-only, no further drilldown). NO fall-through to the JSON modal. NO router navigation.

**D-09 — Test coverage** (5 cache states for READ-01, 3 chip states for READ-02, 3 accordion states for READ-03 — see CONTEXT.md verbatim).

**D-10 — Bundle budget:** +5 KB gz vs Phase 46 close baseline (584.17 KB). React Flow / dagre are NOT involved in this phase.

**D-11 — Backwards compatibility:** Existing `HumanReadableView` callers (`ResourceDetailPage.tsx`) MUST continue to work without prop changes. The hook is internal. New affordances appear automatically when the rendered resource has the relevant data.

### Claude's Discretion

- Hook implementation pattern (custom hook vs context-based) — pick whichever Mantine 8 + React 18 idiom is cleanest.
- Which `MedplumClient` method to use for reference resolution (`readReference` vs `readResource` vs raw `client.get`) — choose the path that minimizes 404 noise in the network log and respects the configured base URL.
- File layout: introduce `src/hooks/useReferenceResolver.ts` or co-locate inside `HumanReadableView` directory.
- Skeleton width / accordion styling defaults.

### Deferred Ideas (OUT OF SCOPE)

- 4-mode resource shell (`Summary | Human | Graph | JSON`) — Phase 47 keeps existing `<Tabs>` chrome.
- JSON peek drawer (`src/components/peek/`) — Phase 46.5 / 47.5. Phase 47 ships the cache hook the drawer reuses, NOT the drawer itself.
- Sidebar v2 / Expert toggle / IA collapse — last per design handoff.
- Graph Mode 3 — Phase 49.
- IncomingReferencesPanel — Phase 48.
- Per-extension hover tooltip showing extension definition / SD URL — polish, defer.
- Cross-server reference resolution.
- Extension validation against profile SDs.

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **READ-01** | References auto-resolve via lazy fetch + per-session cache; render `summarizeResource(target).primary` inline; full ref via Tooltip; clickable link to `/explorer/{type}/{id}`; failed lookups silent → raw href fallback. | New `useReferenceResolver` hook (Phase 36 cache pattern + `client.readReference` fetch); new `<ReferenceLink>` sub-component in `ResourcePropertyTable`; reuse `summarizeResource` (Phase 46) and `referenceWalker.normalizeReference` (Phase 17 / D-04). |
| **READ-02** | Property-level extensions (`_propertyName` keys + standalone `extension[]` entries on a property) reachable from human-readable surface (no JSON drop-down). | New `<ExtensionChip>` + inline-expand `<ExtensionRow>` rendered alongside property rows in `ResourcePropertyTable`. Extends current `_`-prefix filter (line 262 of `ResourcePropertyTable.tsx`) to surface them rather than drop them. Reuses `<Code>` + nested `<RenderValue>` for value rendering (D-07). |
| **READ-03** | `Resource.contained[]` renders inline (currently falls through to JSON modal). Each shows `summarizeResource(contained).primary` header; expandable to full `ResourcePropertyTable`. | New `<ContainedResourcesAccordion>` mounted in `HumanReadableView` after `ResourcePropertyTable`, before `ExtensionsSection`. Mirror `ResourceTypeList`'s `<Accordion multiple variant="separated">` idiom. Add `'contained'` to `SKIP_KEYS` in `ResourcePropertyTable` so the accordion is the sole rendering path. |

---

## Project Constraints (from CLAUDE.md)

- **Stack lock-in:** React 18.3.1, TypeScript 5.7, Vite 8, Medplum 5.1.7, Mantine 8.3.18, react-router-dom 7.14. No new top-level dependencies for Phase 47.
- **Do NOT use:** Mantine 9.x, `@tanstack/react-query` (don't introduce a parallel cache layer to MedplumClient), Tailwind CSS, Next.js, GraphQL FHIR.
- **GSD workflow:** All edits flow through `/gsd-execute-phase 47`.
- **License:** MIT — keep `LICENSE` and `package.json` `license` field in sync. No new bundled package code that would change attribution.
- **Terminology fallback:** existing `useResolvedResource` already wraps the resource — Phase 47 must preserve this enrichment layer; the reference-resolution hook is orthogonal.

---

## Standard Stack

### Core (already installed — no new deps for Phase 47)

| Library | Version (verified) | Purpose | Why Standard |
|---------|--------------------|---------|--------------|
| `@medplum/core` | 5.1.7 | `MedplumClient.readReference<T>(reference: Reference<T>) → ReadablePromise<WithId<T>>` for the actual fetch [VERIFIED: `/Users/kohlbach/Claude/Exploder/node_modules/@medplum/core/dist/esm/index.d.ts` line "readReference<T extends Resource>(reference: Reference<T>, options?: MedplumRequestOptions): ReadablePromise<WithId<T>>"] | Auto-handles `Reference.reference` parsing; respects `client.fhirUrl()` base; returns ReadablePromise (cancellable). |
| `@medplum/fhirtypes` | 5.1.7 | `Reference`, `Resource`, `Extension` type definitions | Already used everywhere; CONTEXT.md cites these directly. |
| `@medplum/react-hooks` | 5.1.7 | `useMedplum()` to access the MedplumClient instance from inside the hook [VERIFIED: codebase uses this in `ResourceDetailPage.tsx:42`, `PatientDetailPage.tsx`] | The hook needs the client; useMedplum is the established access path. |
| `@mantine/core` | 8.3.18 | `<Skeleton width={120} height={14}>` for D-05 pending state; `<Tooltip>` for D-01 hover; `<Accordion multiple variant="separated">` for D-08; `<Code>` for D-07; existing `<Anchor>` for clickable router link | All four primitives already used elsewhere in codebase ([VERIFIED: `MiiModuleTab.tsx:107` Skeleton, `ResourcePropertyTable.tsx:180` Tooltip, `ResourceTypeList.tsx:34` Accordion, `ResourcePropertyTable.tsx:113` Code]). |
| `react-router-dom` | 7.14.0 | `useNavigate()` / `<Anchor component={Link}>` (Phase 26 standardization pattern) for `/explorer/{type}/{id}` navigation | Already standardized per Phase 26 SHELL-04. The reference-click interception in `ResourceDetailPage.handleReferenceClick` (line 104) already pushes into the breadcrumb trail — the new `<ReferenceLink>` MUST keep its `<a href="/explorer/Patient/123">` shape so the existing event-bubbling interception still wires up. [VERIFIED: `ResourceDetailPage.tsx:104-123`] |
| `vitest` | ^4.1.4 | Test runner (already installed; Phase 46 mirrored exactly) | `npm test` baseline 1292 passing post-Phase-46. |
| `@testing-library/react` | 16.3.2 | `render`, `screen`, `fireEvent`, `waitFor` for hook + component tests | Already in test patterns (`HumanReadableView.extensions.test.tsx`). |

### Supporting (already shipped — reuse)

| Module | Purpose | Use Case |
|--------|---------|----------|
| `src/utils/summarizeResource.ts` | `summarizeResource(target).primary` inline text (D-01) and accordion headers (D-08) | Pure, no I/O — perfect for synchronous rendering once cache hit. |
| `src/quality/referenceWalker.ts:normalizeReference` | D-04 normalization: `'http://blaze/fhir/Patient/123'` → `'Patient/123'`; `'#contained-id'` / `'urn:...'` → null | Already extracted, already tested (`reference-checker.test.ts`); reuse VERBATIM. May need to export it (currently not exported — see Open Questions Q1). |
| `src/utils/fhir-helpers.ts:toRecord` | Defensive bracket access on `Resource` | Walking `_propertyName` keys for READ-02 needs this. |
| `src/hooks/useResolvedResource.ts` | Existing terminology-resolution wrapper | Phase 47's resource is already wrapped (`HumanReadableView.tsx:28`); Phase 47 changes do NOT touch this layer. |
| Phase 36 `getExtensionProfileForUrl` (template) | Module-scoped cache + inFlight Map + StrictMode-safe lazy-load idiom | The reference cache is structurally identical [VERIFIED: `src/quality/profiles/index.ts:67-105`]. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `client.readReference({ reference })` | `client.readResource(type, id)` after parsing `reference` | `readReference` is ergonomic when input is a `Reference` object; we have the raw string. Manual parse + `readResource` is one line longer but identical semantics. **Recommended:** parse once via `normalizeReference`, then `client.readResource(type as ResourceType, id)` — keeps the call site type-safe and mirrors `ResourceDetailPage.tsx:60`. |
| `client.readReference` | `client.get(client.fhirUrl(\`${type}/${id}\`).toString())` | Raw `client.get` works but loses Medplum's response unwrapping (some Blaze endpoints return strings; ConnectionContext.tsx:26-28 already documents this gotcha). `readResource` handles it natively. |
| Module-scoped cache | Context-based cache (provider) | Module-scoped is simpler, matches Phase 36 precedent, survives StrictMode double-mount, avoids prop-drilling. Context would force every consumer to wrap in a provider — overkill for read-only session cache. **Recommended:** module-scoped Map + hook (D-03 already locks this). |
| New parallel cache | Reuse Medplum's internal `RequestCache` (if any) | Medplum's internal cache is not a public API and its TTL/eviction is undocumented; we need explicit `null` (failed) semantics not implementable atop Medplum's cache. **Recommended:** maintain our own. |

**Installation:** No new packages. All deps already in `package.json`.

**Version verification (verified 2026-05-01 against committed `node_modules` and `package.json`):**
- `@medplum/core@5.1.7` (matches CLAUDE.md stack table)
- `@mantine/core@8.3.18` — `<Accordion>`, `<Skeleton>`, `<Tooltip>`, `<Code>`, `<Anchor>` all present and used in codebase.
- `react@18.3.1` — StrictMode double-mount safety REQUIRED for hook design.
- `vitest@4.1.4` — `npm test` baseline `1292 passing / 1 failing (pre-existing deuteranopia, unrelated) / 22 todo`.

---

## Architecture Patterns

### Recommended Project Structure (deltas only)

```
src/
├── hooks/
│   ├── useReferenceResolver.ts        # NEW — public hook + module cache (D-03)
│   └── __tests__/
│       └── useReferenceResolver.test.tsx  # NEW — 5 cache-state cases (D-09 READ-01)
├── components/explorer/
│   ├── HumanReadableView.tsx          # MODIFY — mount ContainedResourcesAccordion
│   ├── ResourcePropertyTable.tsx      # MODIFY — replace inline Reference render with <ReferenceLink>; surface _propertyName extensions via <ExtensionChip>; add 'contained' to SKIP_KEYS
│   ├── ReferenceLink.tsx              # NEW — render hook output: Skeleton (pending) | summary text + Tooltip (resolved) | raw href (failed)
│   ├── ContainedResourcesAccordion.tsx # NEW — Mantine Accordion mirror of ResourceTypeList
│   └── ExtensionChip.tsx              # NEW — [+N extensions] inline-expand row
├── utils/
│   └── referenceUrl.ts                 # NEW (or re-export from referenceWalker) — normalizeReference + buildExplorerHref helpers (Open Q1)
└── __tests__/
    ├── HumanReadableView.contained.test.tsx     # NEW — D-09 READ-03 (3 cases)
    ├── HumanReadableView.extensions-inline.test.tsx  # NEW — D-09 READ-02 (3 cases)
    └── ReferenceLink.test.tsx                    # NEW — D-09 READ-01 (5 cases)
```

### Pattern 1: Module-scoped Lazy Cache with In-Flight Dedup (Phase 36 mirror)

**What:** Two module-scoped Maps — `cache: Map<key, Resource | null>` (resolved + negative entries) and `inFlight: Map<key, Promise<Resource | null>>` (active fetches). First reader triggers the fetch and registers the Promise; concurrent readers (StrictMode double-mount, sibling components) share the same Promise. Resolution writes to `cache` and clears `inFlight`. Failure writes `null` to `cache` and clears `inFlight` (negative caching).

**When to use:** Always, for any session-level lazy resource cache where multiple components may demand the same key concurrently and we want StrictMode-safe dedup. Required by D-02 + D-03.

**Example (verbatim from `src/quality/profiles/index.ts:67-105`):**
```typescript
// Source: VERIFIED — src/quality/profiles/index.ts (Phase 36)
const extensionProfileCache = new Map<string, StructureDefinition>();
const extensionProfileInFlight = new Map<
  string,
  Promise<StructureDefinition | null>
>();

export async function getExtensionProfileForUrl(
  canonicalUrl: string,
): Promise<StructureDefinition | null> {
  const cached = extensionProfileCache.get(canonicalUrl);
  if (cached !== undefined) return cached;

  const inFlight = extensionProfileInFlight.get(canonicalUrl);
  if (inFlight !== undefined) return inFlight;

  const loader = EXTENSION_REGISTRY[canonicalUrl];
  if (!loader) return null;

  const promise = loader()
    .then((mod) => {
      const sd = mod.default;
      extensionProfileCache.set(canonicalUrl, sd);
      extensionProfileInFlight.delete(canonicalUrl);
      return sd;
    })
    .catch((err) => {
      extensionProfileInFlight.delete(canonicalUrl);
      console.warn(`[extensions] failed: ${canonicalUrl}: ${String(err)}`);
      return null;
    });
  extensionProfileInFlight.set(canonicalUrl, promise);
  return promise;
}
```

**Phase 47 adaptation (sketch):** wrap in a hook so cache-hit reads stay synchronous and pending state is observable.

```typescript
// SKETCH (planner refines):
const referenceCache = new Map<string, Resource | null>();
const referenceInFlight = new Map<string, Promise<Resource | null>>();

// Distinguish: undefined = not tried; null = tried, failed (D-02)

function fetchReference(
  client: MedplumClient,
  key: string,
  type: ResourceType,
  id: string,
): Promise<Resource | null> {
  const inFlight = referenceInFlight.get(key);
  if (inFlight) return inFlight;

  const promise = client
    .readResource(type, id)
    .then((r) => {
      referenceCache.set(key, r);
      referenceInFlight.delete(key);
      return r as Resource;
    })
    .catch(() => {
      // D-02: silent on 404 / network error; cache null
      referenceCache.set(key, null);
      referenceInFlight.delete(key);
      return null;
    });
  referenceInFlight.set(key, promise);
  return promise;
}

export interface ReferenceResolution {
  resource: Resource | null;
  status: 'pending' | 'resolved' | 'failed';
}

export function useReferenceResolver(
  rawReference: string | undefined,
): ReferenceResolution {
  const client = useMedplum();
  const normalized = useMemo(
    () => (rawReference ? normalizeReference(rawReference) : null),
    [rawReference],
  );
  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);

  // Synchronous cache read — no setState if cache hit (avoids extra render)
  const cached = normalized ? referenceCache.get(normalized) : undefined;

  useEffect(() => {
    if (!normalized) return;
    if (referenceCache.has(normalized)) return; // cache hit (incl. negative); nothing to do
    let cancelled = false;
    const [type, id] = normalized.split('/');
    fetchReference(client, normalized, type as ResourceType, id).then(() => {
      if (!cancelled) forceUpdate();
    });
    return () => { cancelled = true; };
  }, [client, normalized]);

  if (!normalized) return { resource: null, status: 'failed' }; // contained ref or malformed
  if (cached === undefined) return { resource: null, status: 'pending' };
  if (cached === null)      return { resource: null, status: 'failed' };
  return { resource: cached, status: 'resolved' };
}
```

### Pattern 2: Mantine 8 Accordion (collapsed-by-default, multi-expand)

**What:** Mantine `<Accordion multiple variant="separated">` — no `defaultValue` for collapsed-by-default; `multiple` allows several panels open simultaneously; `variant="separated"` renders each item as a stand-alone card (visually distinct from inline `<Table>` properties above).

**When to use:** Contained-resource accordion (D-08); per CONTEXT.md "Default state: all collapsed."

**Example (verbatim from `src/components/dashboard/ResourceTypeList.tsx:34-54`):**
```tsx
// Source: VERIFIED — codebase precedent
<Accordion multiple defaultValue={orderedCategories} variant="separated">
  {orderedCategories.map(category => (
    <Accordion.Item key={category} value={category}>
      <Accordion.Control>
        <Text fw={600} size="lg">{category} ({types.length})</Text>
      </Accordion.Control>
      <Accordion.Panel>
        <ResourceTypeGroup ... />
      </Accordion.Panel>
    </Accordion.Item>
  ))}
</Accordion>
```

**Phase 47 adaptation:** OMIT `defaultValue` (collapsed-by-default); use `key={contained.id ?? index}` since `Resource.id` is optional on contained resources; header renders `summarizeResource(contained).primary`; panel mounts `<ResourcePropertyTable resource={contained} />`. Contained resource is wrapped in its own `useResolvedResource` if we want terminology resolution for nested codings — but per D-08 this is "read-only, no further drilldown" — the simplest read is to NOT re-resolve and rely on the parent's resolution (codings inside contained DON'T currently auto-resolve in the parent walk since `useResolvedResource` only walks the top-level resource — see Open Q2).

### Pattern 3: React 18 StrictMode-safe Async Effects

**What:** Use `let cancelled = false` cleanup flag inside `useEffect`; if Promise settles after unmount or next-effect-run, don't `setState`. Identical to `useResolvedResource.ts:48-66` precedent.

**When to use:** Every async fetch in a hook. React 18 StrictMode mounts effects twice in dev, and our `inFlight` Map already dedupes the network request — but we still need the cancellation flag to avoid a stale `setState` on unmount.

**Example:** see `useResolvedResource.ts:48-66` (already verified).

### Pattern 4: Reference-link click interception (existing in `ResourceDetailPage`)

**What:** `ResourceDetailPage.tsx:104-123` defines `handleReferenceClick` which captures bubbling click events on any `<a href="/path">` inside the human-readable subtree, regex-matches `/(Type)/(id)$`, and calls `breadcrumbs.push(...)` — preventing default navigation but pushing a breadcrumb trail entry.

**When to use:** The new `<ReferenceLink>` MUST emit an `<a href={"/explorer/Patient/123"}>` (or `<Anchor>`) so this existing interceptor keeps working. **Do not** add an explicit `useNavigate()` call to the new component — let the existing parent-level interception handle it.

### Anti-Patterns to Avoid

- **Don't fire one fetch per render.** Always check `referenceCache.has(key)` BEFORE issuing. The hook must be re-render-safe (every component instance using the hook for the same ref shares one cache entry + one Promise).
- **Don't toast on 404.** D-02 explicitly forbids it. Cache `null` and silently render the raw `Type/id` as link text (D-05 status='failed').
- **Don't cache fragment refs (`#contained-id`).** `normalizeReference` already returns null for these (D-04). The hook MUST short-circuit to `status: 'failed'` (or a fourth status `'contained'` if we want to distinguish — TBD by planner; status='failed' is simpler and the visual outcome is identical: render the raw fragment as link text). Resolution for `#`-refs happens by **searching `parent.contained[]`** in the consumer (`<ReferenceLink resource={parent} reference="#sub1" />`), not via the hook. **Recommended:** add an optional `parentResource?: Resource` arg to `<ReferenceLink>` — if the rawRef starts with `#`, look up in `parentResource.contained[]` first; the hook is bypassed.
- **Don't add `contained` to existing SKIP_KEYS without confirming the new accordion is mounted.** Currently `ResourcePropertyTable.tsx:18` SKIP_KEYS = `{resourceType, meta, text, extension}`. Without the accordion mounted in `HumanReadableView`, removing the contained walk silently drops the data.
- **Don't introduce a parallel React Context for the cache.** Module-scoped + hook is simpler and matches Phase 36 (D-03 locked).
- **Don't re-resolve terminology inside contained-resource panels.** Either skip terminology for contained, or wrap each `<Accordion.Panel>` in its own `useResolvedResource` (a per-panel hook call is fine because `useResolvedResource`'s effect deps only fire on resource-identity change — contained resources are stable inside a parent). Recommended (Open Q2): start without re-resolution; add later if HUMAN-UAT shows missing displays in nested codings.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Reference URL parsing (relative + absolute + base-URL strip) | New regex / URL parser | `referenceWalker.normalizeReference` (already extracted, already tested via `reference-checker.test.ts`) | Edge cases: malformed absolute, `urn:` placeholder, fragment refs, host-relative paths, trailing-slash variants. The walker has been hardened through Phase 17 + Phase 24 (FOUND-01 reference-checker rewrite). May need to be exported (it's currently file-private — see Open Q1). |
| In-flight request dedup | Reference-counted custom Map | Module-scoped `Map<key, Promise>` (Phase 36 pattern) | StrictMode double-mount, sibling concurrent reads, page-level retry — three subtle scenarios already proven by Phase 36's lazy-load tests (`conformance-run-extension-profiles.test.tsx`). |
| Negative caching with TTL | Custom expiry logic | Per CONTEXT.md D-02 there is NO TTL — `null` lives until full reload. Don't add complexity that wasn't requested. | Phase 4 `TerminologyResolver` HAS a `negativeTtlMs`; Phase 47 explicitly opts OUT (D-02 "session-level Map cleared on full reload"). |
| Mantine Skeleton overlay | Custom shimmer CSS | Mantine `<Skeleton width={N} height={N}>` | Already used in `MiiModuleTab.tsx:107`, `FhirResourcesView.tsx:152`. Built-in animation, theme-aware. |
| Tooltip with arrow | Custom CSS popper | Mantine `<Tooltip label withArrow position="top">` | Already used in `ResourcePropertyTable.tsx:180` for identifier system. |
| Click-to-expand accordion | Custom collapse + state | Mantine `<Accordion multiple variant="separated">` | Already used in `ResourceTypeList.tsx`. Built-in keyboard a11y, animations, ARIA. |
| FHIR resource fetch | `fetch(\`${baseUrl}/Patient/${id}\`)` | `client.readResource(type, id)` or `client.readReference(ref)` | MedplumClient handles base URL + auth headers + JSON parse. Direct `fetch` would lose Phase 1 auth modes (open/basic/bearer) and Phase 4 PHI gate semantics. |
| Router navigation interception | New `onClick` handler in `<ReferenceLink>` | Reuse the existing parent-level `handleReferenceClick` in `ResourceDetailPage.tsx:104` | The interceptor walks the ancestor chain to find an `<a>` with matching href — works for any new link emitted in the subtree. Keep `<ReferenceLink>` emitting `<a href="/explorer/...">` and the existing handler does the rest. |
| Resource-level extension display | New table | Existing `ExtensionsSection` in `HumanReadableView.tsx:59` (Phase 35 UAT-FU-02) | Already shipped; D-06 explicitly preserves the "bottom Extensions section". Phase 47 adds the inline `[+N]` chip for **property-level** extensions only. |

**Key insight:** Reference resolution + extension surfacing + accordion contained-resources are all **composition-level** changes. Every primitive needed already exists in the codebase or in Mantine 8. Phase 47's job is to wire 4 NEW small components (`useReferenceResolver`, `<ReferenceLink>`, `<ExtensionChip>`, `<ContainedResourcesAccordion>`) using these existing primitives. The bundle delta should be a few KB at most (D-10 +5 KB budget is generous).

---

## Runtime State Inventory

> Phase 47 is greenfield (new hook + new components + light edits to existing components). No rename / refactor / migration. **None of the rename-style runtime-state categories apply** — verified by inspection.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — the new cache is module-scoped + cleared on reload (D-02). No localStorage / sessionStorage / IndexedDB writes in scope. | none |
| Live service config | None — Blaze server config unchanged. No new endpoints called beyond standard FHIR REST `GET /{Type}/{id}`. | none |
| OS-registered state | None — pure SPA; no OS daemons, schedulers, or pm2 entries in this codebase. | none |
| Secrets/env vars | None — `client.readResource` uses the existing connection (Phase 43 VAL-06 auth still in effect). No new env keys. | none |
| Build artifacts | None — no source-rename, no `.egg-info`-equivalent stale artifacts. Vite dev server picks up changes via HMR. | none |

**Verdict:** Pure additive phase. No state-migration tasks needed.

---

## Common Pitfalls

### Pitfall 1: StrictMode double-mount fires duplicate fetches

**What goes wrong:** React 18 StrictMode mounts every effect twice in dev. Without the in-flight Map, the same reference would issue two GET requests on first render — visible in DevTools network log, slow, and wasteful.

**Why it happens:** `useEffect(() => fetch(...), [...])` runs once on first mount, once on simulated unmount-remount, and once on real mount.

**How to avoid:** The module-scoped `referenceInFlight: Map<key, Promise>` deduplicates at the module level — even across the StrictMode remount, the second mount sees the inFlight Promise and joins it.

**Warning signs:** DevTools network tab shows 2x the expected requests in dev mode (production is single, dev is double-without-dedup).

### Pitfall 2: Stale closure on `client` in the cache helper

**What goes wrong:** The module-scoped `fetchReference(client, ...)` closes over the client passed in. If the user switches FHIR servers mid-session (Phase 26 SHELL-01 / connection-gated outlet), the old client is stale.

**Why it happens:** `MedplumClient` is mutable — `useMedplum()` returns a stable reference per ConnectionProvider mount, but if the ConnectionProvider tears down (server switch), the new client is a different instance.

**How to avoid:** Pass `client` explicitly into `fetchReference` from the hook (the hook reads `client` from `useMedplum()` on every render). The cache key is `\`${type}/${id}\`` and does NOT include server URL — but per D-02 the cache is "cleared on full reload" — so a server switch without page reload would surface stale data.

**Recommended:** Add an `useEffect` listening on `client` identity in the hook (or in a top-level `<HumanReadableView>` mount) that calls a `__reset()` function exported from `useReferenceResolver.ts` to clear both Maps when the client changes. Mirror Phase 26 ConnectionGatedOutlet expectations. (Open Q3 — confirm with planner whether server-switch mid-session is a valid Phase 47 concern or deferred.)

**Warning signs:** Switch servers in Settings page, navigate to a resource, see stale resolved labels from the prior server.

### Pitfall 3: `Reference.reference` may be a relative ref, an absolute URL, OR a fragment ref

**What goes wrong:** `Reference.reference: 'http://blaze:8080/fhir/Patient/abc'` and `Reference.reference: 'Patient/abc'` and `Reference.reference: '#contained-id'` all reach the cache. Without normalization, the absolute URL never hits the relative-cache entry — leading to two cache slots for one logical resource.

**Why it happens:** FHIR R4 spec allows all three forms. Blaze typically returns relative; some other servers return absolute; bundles use `urn:uuid:` placeholders.

**How to avoid:** Pass every input through `normalizeReference` (extracted from `referenceWalker.ts:25`) BEFORE cache lookup. `'#'`-prefix and `'urn:'`-prefix return null — handle as `status: 'failed'` (or `'contained'` — D-04 says cross-server / fragments are NOT cached, resolved from `parent.contained[]`).

**Warning signs:** Cache miss for a reference you just hit; "duplicate fetch" symptom on apparent re-renders; Patient label flips between resolved and pending on rerender.

### Pitfall 4: 404 spam on Blaze for missing references

**What goes wrong:** Blaze returns HTTP 404 for missing resources. Browser DevTools network log fills with red 404 entries — UX noise even though the user-visible behavior is silent fallback.

**Why it happens:** D-02 explicitly says fall back silently, but the GET request still hits Blaze, which still returns 404, which still shows red in DevTools.

**How to avoid:** This is unavoidable — we MUST attempt the GET to discover whether a reference resolves. The only mitigation is to **cache `null` (negative cache)** so we don't re-attempt the same reference twice. D-02 already mandates this. **Do NOT** preemptively check via `?_summary=count` — that's a second round-trip per reference, worse.

**Warning signs:** DevTools network shows repeated 404s on rapid scroll → indicates negative cache isn't working. Add a test that asserts only ONE fetch per (failed) reference key (D-09 READ-01 case 4 covers this).

### Pitfall 5: `_propertyName.extension` shape — primitive extensions on FHIR primitives

**What goes wrong:** FHIR primitive types (`birthDate`, `gender`, `valueDecimal`) cannot directly carry extensions in JSON, so the spec uses **sibling `_propertyName` keys** to carry the extension array. Example:
```json
{
  "birthDate": "1981-01-15",
  "_birthDate": {
    "extension": [{
      "url": "http://hl7.org/fhir/StructureDefinition/data-absent-reason",
      "valueCode": "asked-unknown"
    }]
  }
}
```
The current `ResourcePropertyTable.tsx:262` filters these via `!k.startsWith('_')` — they're DROPPED. READ-02 requires surfacing them.

**Why it happens:** FHIR R4 primitive-extension shape is non-obvious; was deliberately filtered as noise in Phase 30 cleanup.

**How to avoid:** Modify the filter logic in `ResourcePropertyTable`. For each non-`_`-prefix key `K`, check if `_K` exists alongside it; if yes, attach those extensions to a `<ExtensionChip>` inline next to the row. Pseudocode:
```typescript
const allKeys = Object.keys(resource).filter(k => !SKIP_KEYS.has(k) && !k.startsWith('_'));
// ... for each key K
const sibling = (resource as Record<string, unknown>)[`_${key}`];
const propertyExtensions = (sibling as { extension?: Extension[] })?.extension ?? [];
const inlineExtensions = (resource as Record<string, unknown>)[key]?.extension; // for non-primitive
const total = propertyExtensions.length + (inlineExtensions?.length ?? 0);
if (total > 0) render <ExtensionChip count={total} extensions={[...]}>...
```

**Edge cases:**
- Array-valued primitives (`given: ['Anna', 'Maria']` + `_given: [null, { extension: [...] }]`) — `_given` array is parallel-indexed; `null` at index N means "no extension on element N." Phase 47 D-06 should treat each indexed extension as a separate row OR aggregate — **planner discretion**. Recommend: aggregate count for the chip; on expand show one entry per indexed extension. (Open Q4)
- `_K` exists with no `extension` field — schema-rare, treat as no extensions.

**Warning signs:** Test with a Patient that has `_birthDate.extension` (asked-unknown), confirm the `[+1 extension]` chip appears next to `birthDate`. Without test fixtures, this is invisible.

### Pitfall 6: Mantine 8 `<Accordion>` controlled vs uncontrolled

**What goes wrong:** Mantine 8 Accordion supports both controlled (`value` + `onChange`) and uncontrolled (`defaultValue`). Mixing them produces React "controlled-to-uncontrolled" warnings.

**Why it happens:** `multiple` accordions take `string[]` not `string`; common to forget the array form on first attempt.

**How to avoid:** Use uncontrolled with no `defaultValue` for collapsed-by-default. CONTEXT.md specifies "Default state: all collapsed" — uncontrolled is simpler.

```tsx
<Accordion multiple variant="separated">
  {contained.map((c, i) => (
    <Accordion.Item key={c.id ?? `idx-${i}`} value={c.id ?? `idx-${i}`}>
      <Accordion.Control>{summarizeResource(c).primary}</Accordion.Control>
      <Accordion.Panel><ResourcePropertyTable resource={c} /></Accordion.Panel>
    </Accordion.Item>
  ))}
</Accordion>
```

### Pitfall 7: Contained resource without `id`

**What goes wrong:** `Resource.contained[].id` is technically required by FHIR spec but Blaze (and other servers) sometimes return contained resources without `id` (especially when ingested from non-conformant sources). Using `id` as React key + Accordion `value` then breaks.

**Why it happens:** Real-world data violates spec.

**How to avoid:** Fall back to `idx-${i}` for both React key and Accordion value. Do NOT use `JSON.stringify(c)` — too expensive on big resources, and renders may flicker if reference identity changes.

### Pitfall 8: `useEffect` re-fires when reference string is computed inline

**What goes wrong:** `useReferenceResolver(reference.reference)` where the parent recomputes `reference.reference` on every render — if upstream re-creates the string (e.g., template-literal interpolation), the effect deps tick on every parent render.

**Why it happens:** React's `Object.is` comparison; primitives compare by value but `useMemo`-derived strings in upstream may not be stable.

**How to avoid:** The hook's input is a string — strings compare by value, so the effect ONLY re-fires if the actual string content changes. Verify no caller is doing `useReferenceResolver(\`${type}/${id}\`)` with type/id pulled from non-stable refs. The natural input is `obj.reference` directly from a FHIR resource — stable across renders since the resource object is stable.

### Pitfall 9: TanStack-React-Query / parallel cache temptation

**What goes wrong:** Adding `@tanstack/react-query` "for proper caching" — explicitly forbidden by CLAUDE.md ("Adding react-query would create two competing cache layers").

**How to avoid:** Use the simple Map pattern. Don't reach for a library when 12 lines of plain JS suffice.

---

## Code Examples

### Example 1: Reading a FHIR resource by `Type/id` (D-04 normalized)

```typescript
// Source: VERIFIED — src/components/explorer/ResourceDetailPage.tsx:60
client
  .readResource(resourceType as ResourceType, id)
  .then((res: Resource) => {
    setResource(res);
    setLoading(false);
  })
  .catch((err: unknown) => {
    // D-02: Phase 47 hook catches silently and caches null
    // (don't show toast, don't set error UI)
  });
```

### Example 2: Mantine 8 Skeleton inline overlay (D-05 pending state)

```tsx
// Adapted from src/components/patients/MiiModuleTab.tsx:107 and FhirResourcesView.tsx:170
{status === 'pending' && (
  <Skeleton width={120} height={14} />
)}
{status === 'resolved' && resource && (
  <Tooltip label={`${type}/${id}`} withArrow position="top">
    <Anchor href={`/explorer/${type}/${id}`} size="sm">
      {summarizeResource(resource).primary}
    </Anchor>
  </Tooltip>
)}
{status === 'failed' && (
  <Tooltip label="Reference unresolvable" withArrow position="top">
    <Anchor href={`/explorer/${type}/${id}`} size="sm">{type}/{id}</Anchor>
  </Tooltip>
)}
```

### Example 3: D-04 reference normalization (already shipped)

```typescript
// Source: VERIFIED — src/quality/referenceWalker.ts:25-48 (Phase 17 / Phase 24)
function normalizeReference(value: string): string | null {
  if (value.startsWith('#')) return null;        // D-04: contained, NOT cached
  if (value.startsWith('urn:')) return null;     // D-04: bundle placeholder
  if (value.startsWith('http://') || value.startsWith('https://')) {
    const schemeIdx = value.indexOf('://');
    const afterScheme = schemeIdx >= 0 ? value.slice(schemeIdx + 3) : value;
    const firstSlash = afterScheme.indexOf('/');
    if (firstSlash < 0) return null;
    const pathOnly = afterScheme.slice(firstSlash + 1);
    const parts = pathOnly.split('/').filter(Boolean);
    if (parts.length < 2) return null;
    const type = parts[parts.length - 2];
    const id = parts[parts.length - 1];
    if (!type || !id) return null;
    return `${type}/${id}`;
  }
  const segs = value.split('/');
  if (segs.length !== 2 || !segs[0] || !segs[1]) return null;
  return value;
}
```

### Example 4: Existing Reference rendering in `ResourcePropertyTable.RenderValue` (the code being replaced)

```tsx
// Source: VERIFIED — src/components/explorer/ResourcePropertyTable.tsx:90-99
// Reference — include href so the click handler in ResourceDetailPage can intercept
if (obj.reference && typeof obj.reference === 'string') {
  const ref = obj.reference as string;
  // Build a navigable href: Patient/id → /explorer/Patient/id
  const href = ref.includes('/') ? `/explorer/${ref}` : ref;
  return (
    <Group gap="xs">
      <Anchor size="sm" href={href}>{ref}</Anchor>
      {obj.display && <Text size="sm" c="dimmed">({obj.display as string})</Text>}
    </Group>
  );
}
```
**Phase 47 replaces this with `<ReferenceLink reference={ref} display={obj.display} />`** which internally calls `useReferenceResolver(ref)` and renders per D-01 / D-05.

### Example 5: Existing Mantine 8 Accordion idiom (the template for D-08)

```tsx
// Source: VERIFIED — src/components/dashboard/ResourceTypeList.tsx:34-54
<Accordion multiple defaultValue={orderedCategories} variant="separated">
  {orderedCategories.map(category => (
    <Accordion.Item key={category} value={category}>
      <Accordion.Control>
        <Text fw={600} size="lg">{category} ({types.length})</Text>
      </Accordion.Control>
      <Accordion.Panel>
        <ResourceTypeGroup ... />
      </Accordion.Panel>
    </Accordion.Item>
  ))}
</Accordion>
```

### Example 6: Vitest test pattern (Phase 46 mirror — for D-09 coverage)

```tsx
// Source: VERIFIED — src/__tests__/HumanReadableView.extensions.test.tsx:1-50
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';

// Polyfill ResizeObserver + matchMedia for jsdom (required by Mantine ScrollArea)
class MockResizeObserver { observe = vi.fn(); unobserve = vi.fn(); disconnect = vi.fn(); }
(globalThis as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
  MockResizeObserver as unknown as typeof ResizeObserver;
Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn().mockImplementation(...) });

// Mock useResolvedResource to bypass TerminologyProvider
vi.mock('../hooks/useResolvedResource', () => ({
  useResolvedResource: <T,>(r: T): T => r,
}));

// For READ-01: mock useReferenceResolver to return controlled state
vi.mock('../hooks/useReferenceResolver', () => ({
  useReferenceResolver: vi.fn(),
  __resetReferenceCache: vi.fn(),
}));
```

### Example 7: MedplumClient mock for hook unit tests

```typescript
// Adapted from src/__tests__/conformance-run-extension-profiles.test.tsx:38-43
vi.mock('@medplum/react-hooks', () => ({
  useMedplum: () => ({
    readResource: vi.fn(async (type: string, id: string) => {
      if (id === 'missing') throw new Error('Not found');
      return { resourceType: type, id, name: [{ family: 'Mueller', given: ['Anna'] }] };
    }),
  }),
}));
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Inline `RenderValue` Reference branch (line 90 of `ResourcePropertyTable.tsx`) renders raw `Type/id` text | `<ReferenceLink>` resolves via `useReferenceResolver` and renders `summarizeResource(target).primary` | Phase 47 (this phase) | Human-readable view becomes self-sufficient — no need to navigate into each reference to find out who/what it is. |
| Property-level extensions filtered out by `!k.startsWith('_')` (line 262 of `ResourcePropertyTable.tsx`) | `_propertyName.extension` arrays surfaced via inline `<ExtensionChip>` | Phase 47 | Closes READ-02 — primitive-extension data reachable without dropping into JSON. |
| `Resource.contained[]` falls into `RenderValue`'s deep-nested-object path → `<DeepJsonModal>` (effectively the JSON modal) | `<ContainedResourcesAccordion>` at the bottom of `HumanReadableView` (above the existing ExtensionsSection) | Phase 47 | Closes READ-03 — contained resources become first-class. |
| Phase 30 generic `_`-prefix filter [VERIFIED: `ResourcePropertyTable.tsx:262`] | Replaced with sibling-aware filter (`_K` extensions surface as inline chip on K's row) | Phase 47 | More truthful display — no silent data loss. |

**Deprecated/outdated:** None. Phase 47 is purely additive; no existing patterns are removed.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `referenceWalker.normalizeReference` is currently file-private and would need to be exported (or duplicated) | Don't Hand-Roll, Code Examples | LOW — a 24-line helper either exported once OR duplicated; either way, behavior is identical. Planner verifies during plan-phase. |
| A2 | Re-resolving terminology codings inside contained-resource panels is NOT required for Phase 47 | Pattern 2, Open Questions | MEDIUM — if HUMAN-UAT shows raw codes inside a contained-resource sub-table where the parent shows resolved displays, we'd need to wrap each panel in `useResolvedResource`. Mitigated by adding HUMAN-UAT case for this. |
| A3 | Server-switch mid-session does NOT need an explicit cache flush in Phase 47 | Pitfall 2 | LOW — Phase 26 ConnectionGatedOutlet redirects on server switch; full reload likely. If not, stale data is silently incorrect (visible but stable). Add a `__resetReferenceCache` export so future phase can wire it. |
| A4 | The cache key `\`${type}/${id}\`` is sufficient (does NOT need to include server URL or version `_history`) | Pattern 1 | LOW — single-server tool per CLAUDE.md "single FHIR server connection". If we ever support multi-server (deferred), key shape changes. |
| A5 | Indexed-primitive-extension semantics (`_given: [null, {ext}]`) can be represented as a flat aggregate count + per-index list on expand | Pitfall 5 | LOW — this is an edge case (rare in practice); D-06 doesn't specify the exact UX for indexed extensions. Planner picks; HUMAN-UAT confirms. |
| A6 | The existing `ResourceDetailPage.handleReferenceClick` interceptor will continue to work with the new `<ReferenceLink>` component since it emits an `<a href="/explorer/...">` shape | Pattern 4, Anti-Patterns | LOW — interceptor is anchor-href-based, not class- or component-based. Should be transparent. Verified by inspection at `ResourceDetailPage.tsx:104-123`. |
| A7 | Mantine 8 `<Accordion>` with no `defaultValue` defaults to all-collapsed | Pattern 2, Pitfall 6 | LOW — verified by inspection; if wrong, set `defaultValue={[]}` explicitly. |
| A8 | Bundle delta will fit comfortably in +5 KB gz budget | D-10 | LOW — 4 small components + 1 hook = ~200-400 LOC source; gzip should be 1-2 KB. No new deps. |
| A9 | The hook's status='failed' is appropriate for both 404 AND fragment-ref AND malformed-ref cases (single failure mode) | Pattern 1, Pitfall 3 | LOW — visual outcome identical (raw `Type/id` rendered). Test cases cover all three paths separately. |

**If this table is empty:** All claims in this research were verified or cited — no user confirmation needed.

---

## Open Questions

1. **Q1: Should `normalizeReference` be exported from `src/quality/referenceWalker.ts`, moved to `src/utils/referenceUrl.ts`, or duplicated in `useReferenceResolver.ts`?**
   - What we know: `referenceWalker.ts:25` defines it as a file-private function. It's covered by `src/__tests__/reference-checker.test.ts`.
   - What's unclear: extracting it could destabilize `extractReferences` callers (visual-test-only risk).
   - **Recommendation:** Extract to `src/utils/referenceUrl.ts` and re-export from `referenceWalker.ts` for back-compat. Add 1-2 unit tests targeting the extracted module directly. Planner decides at plan-phase.

2. **Q2: Should each contained-resource accordion panel re-run `useResolvedResource` (terminology resolution) for nested codings?**
   - What we know: D-08 says "read-only, no further drilldown" — silent on terminology. Parent's `useResolvedResource` walks the WHOLE resource via `collectCodings` (`src/terminology/walker.ts`), which DOES recurse into contained — so codings inside contained are already resolved at the parent level.
   - What's unclear: confirm `walker.collectCodings` recurses into `contained[]`.
   - **Recommendation:** Verify in plan-phase via grep/read of `terminology/walker.ts`. If yes → no extra work. If no → add a small recursion in plan-phase (out of scope of this research).

3. **Q3: Is server-switch mid-session a Phase 47 concern, or fully owned by Phase 26 ConnectionGatedOutlet?**
   - What we know: Phase 26 SHELL-01 wires `ConnectionGatedOutlet` which forces a re-mount on connection-state change; in practice this means the cache module survives but no `<HumanReadableView>` is mounted during the disconnected interim.
   - What's unclear: whether Phase 26's outlet does a full unmount + remount of the explorer subtree (which would naturally clear in-memory state in components, but the module-scoped cache survives).
   - **Recommendation:** Defer. Export a `__resetReferenceCache()` from the hook module for forward-compat (use in tests anyway). Do NOT auto-flush in Phase 47.

4. **Q4: For indexed-primitive extensions (`_given: [null, {ext}]`), how does the chip render?**
   - What we know: D-06 says "[+N extensions]" aggregates extensions per property. Indexed primitives technically have multiple slots.
   - **Recommendation:** Aggregate (sum lengths across array indices), label as `[+N extensions]`; on expand, list each with its index prefix (e.g. `given[1]:`). Confirm in HUMAN-UAT against a real Patient with `_given` extensions.

5. **Q5: Does `<ResourcePropertyDisplay>` from `@medplum/react` exist and handle FHIR Extension values, or do we use the existing local `RenderValue`?**
   - What we know: D-07 says "existing `<ResourcePropertyDisplay>`" — but the codebase already replaced Medplum's `ResourceTable`/`ResourcePropertyDisplay` with the local `ResourcePropertyTable` + `RenderValue` because Medplum's "crashes on non-Medplum servers" (verbatim from `ResourcePropertyTable.tsx:259`).
   - What's unclear: which one D-07 is referring to.
   - **Recommendation:** Use the local `<RenderValue value={extensionValueX}>` (from `ResourcePropertyTable.tsx:49`) — it already handles all FHIR datatypes and avoids Medplum's schema-system crash. Update D-07 reading to "existing local property-value renderer". Planner confirms during plan-phase.

---

## Environment Availability

> Phase 47 is a code-only change. No new external tools, services, runtimes, or CLI utilities required.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build / test | ✓ | (existing) | — |
| Vite dev server | Local UAT | ✓ | 8.x | — |
| Blaze FHIR server | Live HUMAN-UAT (Q1, Q4 confirmation) | ✓ (per Phase 1 setup) | local container | If unavailable, postpone HUMAN-UAT to a session with Blaze running. Auto tests do not require Blaze (use vitest mocks). |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 4.1.4 (already installed; `vitest.config.ts` at repo root, jsdom env, globals enabled) |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run src/hooks/__tests__/useReferenceResolver.test.tsx src/__tests__/HumanReadableView.contained.test.tsx src/__tests__/HumanReadableView.extensions-inline.test.tsx src/__tests__/ReferenceLink.test.tsx` |
| Full suite command | `npm test` (runs `vitest run`) |
| Estimated runtime | ~3s for the new files alone; ~30-60s for full suite (1292 baseline post-Phase-46 → ~1310-1320 after Phase 47) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| READ-01 | Reference resolves and renders `summarizeResource(target).primary` (cache miss → fetch → render) | unit | `npx vitest run src/hooks/__tests__/useReferenceResolver.test.tsx -t "cache miss"` | ❌ Wave 0 |
| READ-01 | Cache hit returns synchronously (no fetch on second consumer) | unit | `npx vitest run src/hooks/__tests__/useReferenceResolver.test.tsx -t "cache hit"` | ❌ Wave 0 |
| READ-01 | 404 fallback → cache `null`, status='failed', no toast | unit | `npx vitest run src/hooks/__tests__/useReferenceResolver.test.tsx -t "404"` | ❌ Wave 0 |
| READ-01 | Network-error fallback → cache `null`, status='failed', no toast | unit | `npx vitest run src/hooks/__tests__/useReferenceResolver.test.tsx -t "network error"` | ❌ Wave 0 |
| READ-01 | Repeat reference reuse — only ONE fetch issued for N concurrent consumers (StrictMode-safe) | unit | `npx vitest run src/hooks/__tests__/useReferenceResolver.test.tsx -t "concurrent"` | ❌ Wave 0 |
| READ-01 | `<ReferenceLink>` renders Skeleton (pending) | unit | `npx vitest run src/__tests__/ReferenceLink.test.tsx -t "pending"` | ❌ Wave 0 |
| READ-01 | `<ReferenceLink>` renders summary text + Tooltip (resolved) | unit | `npx vitest run src/__tests__/ReferenceLink.test.tsx -t "resolved"` | ❌ Wave 0 |
| READ-01 | `<ReferenceLink>` renders raw `Type/id` (failed) | unit | `npx vitest run src/__tests__/ReferenceLink.test.tsx -t "failed"` | ❌ Wave 0 |
| READ-01 | `<ReferenceLink>` for `#contained-id` reads from `parentResource.contained[]` (no hook fetch) | unit | `npx vitest run src/__tests__/ReferenceLink.test.tsx -t "fragment"` | ❌ Wave 0 |
| READ-01 | D-04 normalization: absolute URL with matching base → same cache key as relative | unit | `npx vitest run src/hooks/__tests__/useReferenceResolver.test.tsx -t "normalization"` | ❌ Wave 0 |
| READ-02 | `[+1 extension]` chip presence on a property with one `_propertyName.extension` | unit | `npx vitest run src/__tests__/HumanReadableView.extensions-inline.test.tsx -t "chip presence"` | ❌ Wave 0 |
| READ-02 | Chip click → expand reveals URL + value via local `<RenderValue>` | unit | `npx vitest run src/__tests__/HumanReadableView.extensions-inline.test.tsx -t "chip expand"` | ❌ Wave 0 |
| READ-02 | Nested extension recursion (extension.extension[]) — 1-level indent | unit | `npx vitest run src/__tests__/HumanReadableView.extensions-inline.test.tsx -t "nested"` | ❌ Wave 0 |
| READ-02 | Resource-level extensions remain in bottom `ExtensionsSection` (regression — Phase 35 UAT-FU-02 still passes) | unit | `npx vitest run src/__tests__/HumanReadableView.extensions.test.tsx` | ✅ |
| READ-03 | Contained-resource accordion presence + summary-headed labels | unit | `npx vitest run src/__tests__/HumanReadableView.contained.test.tsx -t "accordion render"` | ❌ Wave 0 |
| READ-03 | Expand reveals full `<ResourcePropertyTable>` for contained | unit | `npx vitest run src/__tests__/HumanReadableView.contained.test.tsx -t "expand"` | ❌ Wave 0 |
| READ-03 | Multi-contained ordering — preserves source order | unit | `npx vitest run src/__tests__/HumanReadableView.contained.test.tsx -t "ordering"` | ❌ Wave 0 |
| READ-03 | `Resource.contained` no longer falls into RenderValue's nested-object path (regression — `contained` added to SKIP_KEYS) | grep + unit | `! grep -q "contained" src/components/explorer/ResourcePropertyTable.tsx \|\| grep -q "SKIP_KEYS.*contained" src/components/explorer/ResourcePropertyTable.tsx` | ❌ Wave 0 |
| Cross-cutting | Build clean | command | `npm run build` (exit 0) | ✅ |
| Cross-cutting | TypeScript clean | command | `npx tsc -b --noEmit` (exit 0) | ✅ |
| Cross-cutting | Full suite green; no regression vs 1292 baseline (expect ~1310-1320) | command | `npm test` | ✅ |
| Cross-cutting | Bundle delta ≤ +5 KB gz (D-10) | command | manual `gzip -c dist/assets/*.js \| wc -c` comparison vs Phase-46-close baseline 584.17 KB | ✅ (manual) |
| HUMAN-UAT | Live Blaze: reference resolves visually; tooltip shows full ref; click navigates | manual | `npm run dev` against Blaze | manual-only |
| HUMAN-UAT | Live Blaze: `[+N extensions]` chip appears next to `birthDate` on a Patient with `_birthDate.extension` (Q4 indexed-array confirmation) | manual | `npm run dev` against Blaze with seed Patient | manual-only |
| HUMAN-UAT | Live Blaze: contained-resource accordion expands cleanly with no layout shift; nested codings show resolved displays (Q2 confirmation) | manual | `npm run dev` against Blaze with a contained-bearing resource | manual-only |

### Sampling Rate

- **Per task commit:** `npx vitest run src/hooks/__tests__/useReferenceResolver.test.tsx src/__tests__/HumanReadableView.contained.test.tsx src/__tests__/HumanReadableView.extensions-inline.test.tsx src/__tests__/ReferenceLink.test.tsx` (~3s)
- **Per wave merge:** `npm test` (full suite — confirm ≥1292 passing, no regression)
- **Phase gate:** Full suite green + `npm run build` exit 0 + bundle-delta verified ≤ +5 KB gz before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/hooks/useReferenceResolver.ts` — implements READ-01 hook + module cache (D-02/D-03)
- [ ] `src/hooks/__tests__/useReferenceResolver.test.tsx` — covers READ-01 5 cache states + StrictMode-concurrent + D-04 normalization
- [ ] `src/components/explorer/ReferenceLink.tsx` — implements D-01/D-05 visual states
- [ ] `src/__tests__/ReferenceLink.test.tsx` — covers pending/resolved/failed + fragment-ref path
- [ ] `src/components/explorer/ContainedResourcesAccordion.tsx` — implements READ-03 D-08 accordion
- [ ] `src/__tests__/HumanReadableView.contained.test.tsx` — covers accordion render + expand + ordering
- [ ] `src/components/explorer/ExtensionChip.tsx` — implements READ-02 D-06 inline chip
- [ ] `src/__tests__/HumanReadableView.extensions-inline.test.tsx` — covers chip presence + expand + nested
- [ ] `src/utils/referenceUrl.ts` (or extract from `referenceWalker.ts`) — exports `normalizeReference` (Q1)
- [ ] Modify `src/components/explorer/ResourcePropertyTable.tsx` — add 'contained' to SKIP_KEYS; replace inline Reference branch with `<ReferenceLink>`; surface `_propertyName` extensions
- [ ] Modify `src/components/explorer/HumanReadableView.tsx` — mount `<ContainedResourcesAccordion>` between `<ResourcePropertyTable>` and `<ExtensionsSection>`

*Framework already installed (vitest 4.1.4); no install step needed.*

**Distinct validation dimensions for Phase 47 (per phase brief):**
- **Hook lifecycle** — pending → resolved | failed transition is an asynchronous state machine; tests must cover BOTH the synchronous-cache-hit path AND the async-fetch path AND the cleanup-on-unmount path.
- **Cache state transitions** — `undefined` (not tried) vs `null` (tried, failed) vs `Resource` (resolved). Three states, three test cases.
- **404-fallback observability** — silent fallback is invisible to user but visible in the cache. Test asserts cache state, not UI state, for the failed branch.
- **StrictMode-safety** — concurrent reads dedupe via `inFlight` Map; assertable via "exactly one `client.readResource` call" expectation across two simultaneous mounts (vitest renders + StrictMode wrapper).

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | no | Phase 47 reuses Phase 1 / Phase 43 auth — no new auth surface |
| V3 Session Management | no | Module-scoped cache is in-memory only; cleared on reload |
| V4 Access Control | no | Read-only explorer; no mutation surface |
| V5 Input Validation | yes | `Reference.reference` strings are user-data (server-supplied); MUST be validated before constructing `client.readResource(type, id)` calls or `<a href="/explorer/${type}/${id}">` URLs |
| V6 Cryptography | no | No crypto in scope |
| V7 Error Handling | yes | 404 / network errors MUST be silenced (no toast, no console error) per D-02; failed cache entries MUST not propagate to user-visible error state |
| V12 Files & Resources | no | No file uploads / downloads in scope |
| V14 Configuration | no | No new env vars, no new config |

### Known Threat Patterns for {React + TypeScript + Mantine 8 + Medplum}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| **T-47-01: Reference-href injection** — malicious server returns `Reference.reference: 'javascript:alert(1)'` or `'../../etc/passwd'`; if rendered as anchor `href` without validation, becomes XSS or path-traversal vector. | Tampering / Information Disclosure | Existing `FHIR_REFERENCE_PATTERN = /^[A-Z][a-zA-Z]+$/` and `FHIR_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9\-.]{0,63}$/` in `ResourceDetailPage.tsx:19-24` ALREADY validate references at the click-interception layer (T-02-08 mitigation per code comment). Phase 47's `<ReferenceLink>` MUST emit hrefs that pass these patterns; the existing interceptor will silently drop bad ones. NEW guard: `useReferenceResolver` MUST validate via these same patterns before calling `client.readResource(type, id)` — a malicious server-supplied `Reference.reference` could otherwise issue a request to `client.readResource('../etc' as ResourceType, 'passwd')` (Medplum probably catches this, but defense-in-depth is cheap). |
| **T-47-02: Reference-loop / billion-references DoS** — server returns a resource whose contained[] is hundreds of entries deep, or whose references form a cycle and the page rapidly re-resolves the same ref via prop changes. | DoS | Cache `null` (D-02) for failed; the `inFlight` Map dedupes; rendering `contained[].length` items in an Accordion is bounded by what FHIR returns in one resource. No recursion into resolved references in Phase 47 (out of scope — Phase 49 graph would handle depth). For contained[] of pathological size, Mantine Accordion handles N items gracefully but for N>100 we may want to add a cap. **Recommend:** plan a defensive `contained.slice(0, 50)` cap with a "+N more" note; or accept unlimited for Phase 47 + flag for HUMAN-UAT. |
| **T-47-03: XSS via extension values** — `Extension.valueString` from a malicious server contains `<script>` tags. | Tampering / XSS | Existing `RenderValue` already escapes via React's text-node escaping (no `dangerouslySetInnerHTML` in `ResourcePropertyTable.tsx`). Phase 47's `<ExtensionChip>` MUST also use the same `<RenderValue>` (D-07) — never `dangerouslySetInnerHTML` for extension values. |
| **T-47-04: Cache poisoning across users (multi-tenant)** | Information Disclosure | N/A — single-user local tool; cache is per-browser-tab. No cross-user contamination possible. |

**Defense-in-depth additions for Phase 47:**
- Validate `[type, id] = normalizeReference(rawRef).split('/')` against `FHIR_REFERENCE_PATTERN` + `FHIR_ID_PATTERN` BEFORE calling `client.readResource(type, id)`.
- Catch all failures (incl. validation failures) silently per D-02; cache `null`.
- Use `<RenderValue>` for ALL extension value rendering — never raw HTML.
- Bundle the contained-resources count cap consideration into HUMAN-UAT.

---

## Sources

### Primary (HIGH confidence — VERIFIED via code inspection)

- **`/Users/kohlbach/Claude/Exploder/src/components/explorer/HumanReadableView.tsx`** — current implementation (142 LOC); contains `<ScrollArea>` + `<ResourcePropertyTable>` + `<ExtensionsSection>` (the bottom resource-level extensions table from Phase 35 UAT-FU-02).
- **`/Users/kohlbach/Claude/Exploder/src/components/explorer/ResourcePropertyTable.tsx`** — current implementation (300 LOC); confirms `SKIP_KEYS = {resourceType, meta, text, extension}` (line 18), `_`-prefix filter at line 262, inline Reference render at line 90-99, `<DeepJsonModal>` fallback at line 235-253.
- **`/Users/kohlbach/Claude/Exploder/src/components/explorer/ResourceDetailPage.tsx`** — confirms current `<Tabs>` chrome (Human-readable / JSON), `handleReferenceClick` interceptor at line 104-123, FHIR-pattern validation at lines 19-24.
- **`/Users/kohlbach/Claude/Exploder/src/quality/profiles/index.ts:67-105`** — Phase 36 `getExtensionProfileForUrl` with module-scoped `cache + inFlight` pattern (the template for `useReferenceResolver`).
- **`/Users/kohlbach/Claude/Exploder/src/quality/referenceWalker.ts:25-48`** — `normalizeReference` D-04 normalization (already shipped).
- **`/Users/kohlbach/Claude/Exploder/src/hooks/useResolvedResource.ts`** — terminology resolution wrapper (Phase 4); StrictMode-safe pattern with `cancelled` flag and stale-flash guard.
- **`/Users/kohlbach/Claude/Exploder/src/terminology/TerminologyResolver.ts:131-184`** — `lookupDisplay` with negative-cache + inFlight dedup; mature precedent for the pattern in production for 3+ milestones.
- **`/Users/kohlbach/Claude/Exploder/src/components/dashboard/ResourceTypeList.tsx:1-56`** — Mantine 8 `<Accordion multiple variant="separated">` idiom (template for D-08).
- **`/Users/kohlbach/Claude/Exploder/src/__tests__/HumanReadableView.extensions.test.tsx`** — Phase 35 UAT-FU-02 tests (template for Phase 47 D-09 test files; `vi.mock('../hooks/useResolvedResource', ...)`, ResizeObserver/matchMedia polyfills).
- **`/Users/kohlbach/Claude/Exploder/src/__tests__/conformance-run-extension-profiles.test.tsx:1-80`** — Phase 36 lazy-load consumer-wiring test (template for `useReferenceResolver.test.tsx` mocking patterns).
- **`/Users/kohlbach/Claude/Exploder/node_modules/@medplum/core/dist/esm/index.d.ts`** — Medplum 5.1.7 API verification; `readReference<T>(reference: Reference<T>, options?: MedplumRequestOptions): ReadablePromise<WithId<T>>` and `readResource<RT>(resourceType: RT, id: string, options?: MedplumRequestOptions): ReadablePromise<WithId<ExtractResource<RT>>>`.
- **`/Users/kohlbach/Claude/Exploder/.planning/phases/46-theme-a-foundation-summary-util/46-VALIDATION.md`** — Phase 46 validation strategy (template for the Validation Architecture section above).
- **`/Users/kohlbach/Claude/Exploder/.planning/phases/47-theme-b-readability-humanreadableview/47-CONTEXT.md`** — locked decisions (D-01 through D-11) verbatim.
- **`/Users/kohlbach/Claude/Exploder/design_handoff_v1.7_navigation/README.md`** + `view-resource-shell.jsx` — visual target for Mode 2 (Human); confirms `[+1 extension]` chip on the `code` row, inline `summarizeResource(target).primary` link text.
- **`/Users/kohlbach/Claude/Exploder/CLAUDE.md`** — stack lock-in, "Do NOT use" list, GSD workflow.
- **`/Users/kohlbach/Claude/Exploder/.planning/REQUIREMENTS.md`** — READ-01 / READ-02 / READ-03 acceptance criteria.
- **`/Users/kohlbach/Claude/Exploder/.planning/STATE.md`** — Phase 46 close baseline (1292 passing, 584.17 KB gz initial-load).

### Secondary (MEDIUM confidence)

- **FHIR R4 spec — primitive extension shape (`_propertyName.extension`)** [CITED: HL7 FHIR R4 Element documentation at https://www.hl7.org/fhir/R4/element.html — referenced via codebase comments at `HumanReadableView.tsx:55` and `ResourcePropertyTable.tsx:15`]; not freshly verified online in this research session, but the convention is stable across R4/R5 and inline-documented in the codebase.
- **Mantine 8 `<Accordion>` controlled vs uncontrolled API** — verified via inspection of `ResourceTypeList.tsx` usage; not freshly fetched from Mantine 8 docs URL in this session. If mantine 8.3.18 has a regression, adjust at plan-phase.

### Tertiary (LOW confidence)

- None — all critical claims grounded in either local code inspection or CONTEXT.md.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions verified against `node_modules/@medplum/core/package.json` (5.1.7) and `package.json`. No new deps needed.
- Architecture: HIGH — three direct precedents in codebase (Phase 36 cache, Phase 4 resolver, Phase 35 ExtensionsSection). All four new components (hook + ReferenceLink + Accordion + ExtensionChip) are straightforward composition.
- Pitfalls: HIGH for the React 18 / Mantine 8 / FHIR specifics (codebase has handled all of these before); MEDIUM on the indexed-primitive-extension UX (Pitfall 5 / Q4 is a real edge case where D-06 leaves room for planner discretion).
- Validation Architecture: HIGH — exact mirror of Phase 46's strategy with READ-01/02/03 mapped to specific test files + commands; Wave 0 gaps enumerated.
- Security: MEDIUM — T-47-01 (reference-href injection) is a defense-in-depth addition not explicitly mandated by CONTEXT.md but consistent with the existing `ResourceDetailPage` validation (T-02-08); planner should confirm.

**Research date:** 2026-05-01
**Valid until:** 2026-05-31 (30 days; stack is stable, codebase precedents are stable, no fast-moving APIs in play). Re-verify if Mantine 8 → 9 upgrade lands (Phase 50 / STACK-01) before Phase 47 ships.

---

*Phase: 47-theme-b-readability-humanreadableview*
*Research: codebase-grounded; CONTEXT.md fully authoritative; planner consumes for plan-phase*
