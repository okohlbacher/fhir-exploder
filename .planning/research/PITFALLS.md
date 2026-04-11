# Domain Pitfalls

**Domain:** FHIR Explorer (Medplum React + Blaze FHIR Server)
**Researched:** 2026-04-11
**Confidence:** MEDIUM (web research tools unavailable; findings based on deep domain knowledge of Medplum, Blaze, FHIR R4, and MII ecosystem -- flagged items may need validation against current docs)

---

## Critical Pitfalls

Mistakes that cause rewrites, architectural dead ends, or fundamental breakage.

### Pitfall 1: MedplumClient Assumes a Medplum Backend

**What goes wrong:** `MedplumClient` is not a generic FHIR client. It has Medplum-specific assumptions baked into its authentication flow (OAuth2 with Medplum's auth server), project/workspace scoping, batch request formatting, and URL construction. Instantiating `MedplumClient` and pointing it at Blaze will fail on authentication handshake, return unexpected errors on certain operations, or silently send Medplum-specific headers/parameters that Blaze ignores.

**Why it happens:** Medplum React components accept a `MedplumClient` instance via `<MedplumProvider>`. The components call `medplum.searchResources()`, `medplum.readResource()`, etc. These methods construct HTTP requests with Medplum-specific behavior:
- Auth flow expects Medplum's token endpoint and client credentials model
- `searchResources` may append Medplum-specific search parameters (e.g., `_compartment`)
- Error handling expects Medplum's OperationOutcome format
- Some components call Medplum-specific endpoints (e.g., `/$csv-export`, `/auth/me`)

**Consequences:** Core rendering components may work if you bypass the client, but anything involving search, pagination, or auth will break. You end up wrapping or replacing most of `MedplumClient`.

**Prevention:**
- Do NOT use `MedplumClient` for HTTP communication. Write a thin FHIR client adapter that talks to Blaze directly using standard `fetch()`.
- Use Medplum React components ONLY for their rendering/display capabilities (e.g., `<ResourceTable>`, `<ResourceForm>`, type-specific displays).
- Pass pre-fetched FHIR resources as props to Medplum components rather than letting them fetch data themselves.
- If a Medplum component requires `useMedplum()` context internally for data fetching, that component cannot be used -- wrap or replace it.
- Audit every Medplum React component you plan to use: does it fetch data internally or just render props?

**Detection:** Component renders blank or throws on mount. Network tab shows requests to unexpected URLs or with wrong auth headers. Console errors about missing Medplum context.

**Phase:** Must be resolved in Phase 1 (foundation). This is an architectural decision that affects everything built on top.

**Confidence:** MEDIUM -- MedplumClient coupling is well-established in training data, but exact component-level fetch behavior may have changed in recent versions. Validate by inspecting `@medplum/react` source.

---

### Pitfall 2: Medplum React Components That Fetch Internally Are Unusable

**What goes wrong:** Many Medplum React components are not pure renderers. Components like `<ResourceTable>` with search functionality, `<SearchControl>`, `<BundleDisplay>`, and autocomplete inputs call `useMedplum()` internally to execute searches. These will fail against Blaze because they go through `MedplumClient`.

**Why it happens:** Medplum designed their components for the Medplum ecosystem. "Batteries included" means data fetching is built into components, not separated out.

**Consequences:** You discover mid-build that a component you planned to use makes internal API calls. You either fork it, wrap it with intercepted context, or build a replacement -- each is costly.

**Prevention:**
- Before using ANY Medplum React component, read its source code. Check for `useMedplum()`, `useMedplumContext()`, or any `medplum.` method calls.
- Create a compatibility matrix early: "renders props only" vs. "fetches internally."
- For "fetches internally" components, decide upfront: fork, mock the MedplumClient methods they call, or build custom.
- Consider creating a `FakeMedplumClient` that implements only the methods Medplum components actually call, routing them to your Blaze client. This is hacky but may work for simple cases.

**Detection:** Component throws "MedplumClient not initialized" or similar. Network requests go to wrong server. Components that should show data render empty.

**Phase:** Phase 1 -- must audit components and establish the rendering strategy before building views.

**Confidence:** MEDIUM -- component architecture is stable in Medplum, but specific components may have been refactored to be more composable. Check current source.

---

### Pitfall 3: Blaze Pagination Uses Opaque Self-Links, Not Offset-Based

**What goes wrong:** Building pagination UI that assumes offset-based page navigation (e.g., "go to page 5 of 20"). Blaze uses the FHIR-standard `Bundle.link` mechanism with opaque `next` URLs containing `__t` and `__page-id` tokens. You cannot compute arbitrary page numbers or jump to a specific page.

**Why it happens:** FHIR spec defines pagination via `Bundle.link` with `relation: "next"`. Blaze implements this correctly but does not support `_offset` or arbitrary page jumping. This is spec-compliant but surprises developers used to SQL-style pagination.

**Consequences:** Cannot build a page-number navigation bar. "Page 3 of 47" UIs are impossible without caching all intermediate page tokens. Users can only go forward (and sometimes backward if `previous` links are provided).

**Prevention:**
- Design pagination as "Load More" / infinite scroll, or simple Next/Previous navigation.
- Cache the `Bundle.link` URLs for visited pages so users can go back without re-fetching.
- Display "showing 1-20 of ~5000" using `Bundle.total` (which Blaze does provide) but do NOT promise page-jump capability.
- If you need "jump to page N," you must sequentially follow `next` links -- expensive and slow for deep pages.

**Detection:** Pagination links return 400 or unexpected results when you try to construct offset URLs manually.

**Phase:** Phase 1-2 -- pagination is needed immediately for resource browsing.

**Confidence:** HIGH -- Blaze's pagination behavior is well-documented and follows FHIR spec strictly.

---

### Pitfall 4: Large Bundle Handling Crashes the Browser

**What goes wrong:** Requesting all resources of a type (e.g., 50K Observations) or receiving a large Bundle and trying to parse/render it. JavaScript heap runs out of memory, or the DOM becomes unresponsive with thousands of table rows.

**Why it happens:** FHIR Bundles are JSON. A Bundle with 1000 Observation resources can be 5-20MB of JSON. Parsing this is fine, but keeping 50K parsed resource objects in React state while rendering them all will exhaust memory and lock the main thread.

**Consequences:** Browser tab crashes. App becomes unresponsive. Users with large datasets (the primary use case) cannot use the tool.

**Prevention:**
- ALWAYS use `_count` parameter (e.g., `_count=20`) to limit page size. Never fetch unbounded results.
- Implement virtual scrolling (e.g., `react-window` or `@tanstack/virtual`) for any list that might exceed ~100 items.
- For the data quality dashboard (resource counts), use `_summary=count` which returns only `Bundle.total` without resource payloads.
- Never store all pages in memory simultaneously. Discard previous page data when loading next page (unless implementing back-navigation cache with a cap).
- For resource count queries, use `[ResourceType]?_summary=count` -- Blaze handles this efficiently without loading resource data.

**Detection:** Slow rendering, increasing memory in DevTools, eventual tab crash. Test with realistic data volumes early.

**Phase:** Phase 1 (foundation) for the pattern; Phase 2 (resource explorer) for implementation.

**Confidence:** HIGH -- this is universal to any FHIR browser application.

---

### Pitfall 5: CORS Blocking Browser-to-Localhost-Blaze Requests

**What goes wrong:** The React app (served by Vite on `localhost:5173`) makes `fetch()` requests to Blaze (on `localhost:8080`). The browser blocks these as cross-origin requests because the ports differ. Every API call fails with a CORS error.

**Why it happens:** Same-origin policy. Different ports = different origins. Blaze's default Docker configuration does not set CORS headers.

**Consequences:** The app cannot communicate with Blaze at all. Appears completely broken on first run.

**Prevention:**
- **Option A (recommended for dev):** Configure Vite's dev server proxy to forward `/fhir/*` requests to `localhost:8080`. The browser only sees same-origin requests. This is the cleanest solution.
  ```typescript
  // vite.config.ts
  server: {
    proxy: {
      '/fhir': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      }
    }
  }
  ```
- **Option B:** Configure Blaze to send CORS headers via its environment variables or a reverse proxy (nginx/caddy) in front of Blaze. Blaze supports `CORS_ALLOW_ORIGINS` environment variable in its Docker config.
- **Option C:** For production builds, serve the static app from the same origin as Blaze using a reverse proxy.
- Document the CORS setup prominently in README. This will be the first thing that breaks for any new user.

**Detection:** Browser console shows `Access-Control-Allow-Origin` errors. Network tab shows failed preflight (OPTIONS) requests.

**Phase:** Phase 1 -- literally the first thing that must work.

**Confidence:** HIGH -- standard web development issue, well-understood.

---

## Moderate Pitfalls

### Pitfall 6: MII Terminology Server Rate Limiting and Latency

**What goes wrong:** The app fires a `$lookup` or `$translate` request for every CodeableConcept it encounters while rendering a resource. When displaying a list of 20 Observations, each with multiple codings, this generates 40-100+ terminology requests in rapid succession. The MII Terminology Server (https://terminology.medizininformatik-initiative.de/fhir) either rate-limits you, responds slowly (200-500ms per request), or times out.

**Why it happens:** CodeableConcepts are everywhere in FHIR. A single Observation has `code`, `category`, `interpretation`, `valueCodeableConcept`, each potentially needing display resolution. Naive implementation = one HTTP request per coding.

**Consequences:** Page rendering blocks on terminology lookups. UI feels sluggish. If the server rate-limits, you get 429 errors and missing display values. If the server is down, the entire app may hang.

**Prevention:**
- Implement an aggressive local cache (in-memory + IndexedDB/localStorage) for terminology lookups. Coding systems are stable -- cache for hours or days.
- Batch terminology lookups where possible. Group all codes from a page load, deduplicate, and resolve in one batch or a small number of requests.
- Render immediately with the raw `code` value, then asynchronously replace with display text when the lookup completes (progressive enhancement).
- Set short timeouts (2-3 seconds) on terminology requests. If it fails, show the raw code + system. Never block rendering on terminology.
- Pre-populate cache for common MII coding systems (ICD-10-GM, OPS, LOINC, ATC) on app startup or first use.
- Consider bundling a local snapshot of the most common code displays (top 500 ICD-10-GM codes, top 200 LOINC codes).

**Detection:** Slow page loads when viewing coded resources. Network tab shows dozens of pending requests to the terminology server. Console 429 errors.

**Phase:** Phase 2-3 -- needed when rendering coded resources, but the caching architecture should be designed in Phase 1.

**Confidence:** MEDIUM -- MII Terminology Server behavior (rate limits, latency) is based on experience with public FHIR terminology servers generally. Specific MII server limits need validation.

---

### Pitfall 7: CodeableConcept Resolution Is Harder Than It Looks

**What goes wrong:** Assuming CodeableConcepts are simple `{system, code, display}` tuples. In reality:
- Multiple codings per CodeableConcept (e.g., ICD-10-GM + alpha-ID + SNOMED CT for the same diagnosis)
- `display` field may be missing entirely
- `text` field may be present but different from any coding's display
- System URIs vary (canonical URL vs. OID vs. shorthand)
- Unknown or custom coding systems that no terminology server can resolve
- German-specific systems (ICD-10-GM uses `http://fhir.de/CodeSystem/bfarm/icd-10-gm`, not the international ICD-10 URI)

**Why it happens:** FHIR's CodeableConcept is intentionally flexible. MII data comes from heterogeneous hospital systems with varying coding practices.

**Consequences:** Display logic becomes a tangled mess of special cases. Some resources show raw URIs instead of human-readable text. Users see `http://loinc.org|85354-9` instead of "Blood pressure panel."

**Prevention:**
- Define a clear resolution priority: `text` > first `coding.display` > `$lookup` result > `code` value > "Unknown"
- For multiple codings, pick the "primary" one using a preference order: LOINC > SNOMED > ICD-10-GM > others for display purposes.
- Normalize system URIs early -- map known OID variants to canonical URLs.
- Build a `resolveCodeableConcept(cc: CodeableConcept): Promise<string>` utility that encapsulates all the logic, so rendering code stays clean.
- For German systems, maintain a mapping of system URIs to human-readable system names (e.g., "ICD-10-GM", "OPS", "ATC").

**Detection:** Resources rendering with long URIs, raw codes, or "undefined" where display text should be. Different representations of the same concept showing inconsistently.

**Phase:** Phase 2 -- needed for any human-readable display of clinical data.

**Confidence:** HIGH -- CodeableConcept complexity is a well-known FHIR challenge.

---

### Pitfall 8: Blaze _include and _revinclude Limitations

**What goes wrong:** Building patient-centric views that rely on `_include` / `_revinclude` to fetch related resources in a single query (e.g., `Patient?_revinclude=Condition:subject` to get a patient's conditions). Blaze supports these but with important constraints:
- `_include` only applies to the current page of results, not the entire result set.
- Recursive `_include:iterate` support may be limited or absent.
- `_revinclude` with large result sets can create huge Bundles that hit memory limits.
- Some search parameter + include combinations may not work as expected.

**Why it happens:** `_include`/`_revinclude` are among the more complex FHIR search features. Implementations vary in completeness and edge-case handling.

**Consequences:** Patient views show incomplete data. "Show all conditions for this patient" works for patients with 5 conditions but fails or is slow for patients with 500. Related resources appear missing when they exist.

**Prevention:**
- For patient-centric browsing, prefer explicit chained searches over _revinclude: `Condition?subject=Patient/123&_count=20` instead of `Patient?_revinclude=Condition:subject`.
- Test _include/_revinclude behavior against your specific Blaze version early.
- Always handle the case where included resources are absent from the Bundle (they may be on the next page or unsupported).
- Use the compartment-style approach: fetch the patient first, then fetch each resource type separately with `subject=Patient/[id]`. This is more requests but more predictable.

**Detection:** Patient view shows fewer related resources than exist. Bundle.total doesn't match the number of included resources.

**Phase:** Phase 2 -- patient-centric browsing.

**Confidence:** MEDIUM -- Blaze's _include behavior specifics may have improved in recent versions. Test against your actual Blaze version.

---

### Pitfall 9: MII Profile Validation Complexity

**What goes wrong:** Attempting client-side FHIR profile validation against MII Kerndatensatz StructureDefinitions. This requires:
1. Downloading all relevant StructureDefinitions (and their dependencies -- base profiles, extensions, value sets, code systems)
2. A FHIR validation engine that runs in the browser
3. Handling profile versioning and snapshot vs. differential forms

**Why it happens:** FHIR validation is enormously complex. The official FHIR validator is a Java application. There is no production-quality JavaScript FHIR validator. MII profiles have deep dependency chains.

**Consequences:** Building a "validate against MII profiles" feature takes 10x longer than expected. Results may be incorrect due to incomplete validation logic. The validator becomes a project unto itself.

**Prevention:**
- Do NOT build a full FHIR validator in the browser. Instead:
  - **Option A (recommended):** Use Blaze's or an external validator's `$validate` operation. Send the resource to the server and display the OperationOutcome. Blaze supports `$validate` if profiles are loaded.
  - **Option B:** Implement lightweight "conformance checks" -- not full validation but checking required fields are present, cardinality constraints, and binding strength. Much simpler than full validation.
  - **Option C:** Call an external validation service (e.g., the official FHIR validator wrapped in a small backend service).
- For MII profiles, use the published npm packages or simplifier.net packages. MII profiles are published at `https://simplifier.net/organization/koordinationsstellemii/~packages`.
- If you must do client-side checks, limit scope to: "Does this resource claim conformance to an MII profile via `meta.profile`?" and "Are the required MII extensions present?"

**Detection:** Validation feature slipping schedule. Incorrect validation results (false positives/negatives). Massive profile dependency downloads.

**Phase:** Phase 3 or later -- this is a differentiator feature, not table stakes. Design the approach in Phase 1, implement much later.

**Confidence:** MEDIUM -- MII profile availability and Blaze $validate support specifics should be verified against current versions.

---

### Pitfall 10: settings.yaml Security -- Credentials in Plain Text

**What goes wrong:** Storing Blaze auth credentials (basic auth passwords, bearer tokens) in a plain-text `settings.yaml` file. The file gets committed to git, shared in screenshots, or left readable by other local processes.

**Why it happens:** "It's a local-only tool" creates false security comfort. Settings files are naturally version-controlled. Developers copy-paste configs into issues.

**Consequences:** Credentials leak. In clinical/research environments, this may violate institutional security policies even for "local tools."

**Prevention:**
- Add `settings.yaml` to `.gitignore` from day one. Ship a `settings.example.yaml` with placeholder values.
- Support environment variable overrides for sensitive values: `BLAZE_AUTH_TOKEN` overrides `auth.token` in settings.yaml.
- Never log or display the full auth token in the UI. Show `Bearer ****...xxxx` (last 4 chars).
- Consider supporting OS keychain integration for a future phase, but env vars are sufficient for now.
- Document clearly: "Never commit settings.yaml. It contains credentials."

**Detection:** `git status` shows settings.yaml as tracked. Credentials visible in app UI or console logs.

**Phase:** Phase 1 -- must be correct from the start. Retrofitting .gitignore after credentials are committed is painful.

**Confidence:** HIGH -- standard security practice.

---

## Minor Pitfalls

### Pitfall 11: Blaze _sort Parameter Support Is Limited

**What goes wrong:** Assuming you can sort by any field. Blaze supports `_sort` but only on indexed search parameters, not arbitrary resource fields. Sorting by `name` works for Patient, but sorting by `valueQuantity` for Observation may not.

**Prevention:**
- Check Blaze's CapabilityStatement (`/metadata`) for supported search parameters per resource type.
- Build sort options dynamically from the CapabilityStatement rather than hardcoding.
- Default to `_sort=-_lastUpdated` which is universally supported.

**Phase:** Phase 2 -- resource explorer.

**Confidence:** MEDIUM -- verify against your Blaze version's CapabilityStatement.

---

### Pitfall 12: Medplum fhirtypes Version Mismatch With Blaze's FHIR Support

**What goes wrong:** `@medplum/fhirtypes` defines types for FHIR R4, which aligns with Blaze. But Medplum may include extensions to the type definitions that reflect Medplum-specific properties or newer R4B/R5 elements. TypeScript compiles fine but runtime data doesn't match.

**Prevention:**
- Use `@medplum/fhirtypes` for type definitions but validate against actual Blaze responses.
- Add runtime type checking for critical paths (e.g., `bundle.link` structure, `OperationOutcome` format).
- Consider supplementing with a simpler FHIR R4 type package if Medplum types cause confusion.

**Phase:** Phase 1.

**Confidence:** LOW -- need to verify current @medplum/fhirtypes for Medplum-specific extensions.

---

### Pitfall 13: Bundle.total May Be Absent or Estimated

**What goes wrong:** Relying on `Bundle.total` for displaying "X results found." FHIR spec says `total` is optional. Blaze generally provides it for search results, but for complex queries or after server restarts, it may be absent or take time to compute.

**Prevention:**
- Always handle `Bundle.total` being `undefined`. Display "Results" instead of "0 Results" when total is missing.
- Use `Bundle.entry.length` for the current page count, `Bundle.total` only for the global count with a fallback.

**Phase:** Phase 1.

**Confidence:** HIGH -- standard FHIR behavior.

---

### Pitfall 14: Vite Dev Proxy Does Not Apply to Production Builds

**What goes wrong:** CORS is solved during development with Vite's proxy, but the production build (static files) has no proxy. Deploying or sharing the built app breaks because CORS returns.

**Prevention:**
- Document the production deployment story from the start: "use nginx/caddy as reverse proxy serving both the app and proxying to Blaze."
- Provide a `docker-compose.yml` or deployment guide that includes the reverse proxy.
- Alternatively, if this is truly local-only, document that users should run `npm run dev` (not a production build) or provide a simple serve script with proxy.

**Phase:** Phase 1 -- decide the deployment model early.

**Confidence:** HIGH -- standard Vite behavior.

---

### Pitfall 15: German MII Terminology Systems Require Special Handling

**What goes wrong:** LOINC and SNOMED have well-known FHIR system URIs. But German systems used in MII data have less obvious URIs:
- ICD-10-GM: `http://fhir.de/CodeSystem/bfarm/icd-10-gm`
- OPS: `http://fhir.de/CodeSystem/bfarm/ops`
- Alpha-ID: `http://fhir.de/CodeSystem/bfarm/alpha-id`
- ATC (German): `http://fhir.de/CodeSystem/bfarm/atc`

The MII Terminology Server may handle these but standard terminology servers (e.g., tx.fhir.org) will not. Hardcoding assumptions about system URIs will miss German-specific codes entirely.

**Prevention:**
- Maintain a registry of known system URIs with human-readable labels and the correct terminology server endpoint for each.
- Route terminology lookups to the MII Terminology Server specifically, not a generic FHIR terminology server.
- Test with real MII-profiled data early (not just generic FHIR test data).

**Phase:** Phase 2 -- terminology resolution.

**Confidence:** HIGH -- German FHIR system URIs are well-established.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Phase 1: Foundation / Connection | CORS blocking all requests (Pitfall 5) | Set up Vite proxy immediately; test connection before anything else |
| Phase 1: Foundation / Client | MedplumClient coupling (Pitfall 1, 2) | Audit Medplum components upfront; build own FHIR client |
| Phase 1: Foundation / Config | Credentials in settings.yaml (Pitfall 10) | .gitignore + env var overrides from day one |
| Phase 2: Resource Explorer | Pagination assumes offset (Pitfall 3) | Design Load More / Next-Previous UI, not page numbers |
| Phase 2: Resource Explorer | Large result sets crash browser (Pitfall 4) | Always use _count, implement virtual scrolling |
| Phase 2: Patient-Centric View | _revinclude limitations (Pitfall 8) | Use per-type queries instead of _revinclude |
| Phase 2: Display / Terminology | Terminology server overload (Pitfall 6) | Cache aggressively, render codes first, resolve async |
| Phase 2: Display / CodeableConcept | Multi-coding complexity (Pitfall 7) | Build resolveCodeableConcept utility with clear priority |
| Phase 3: Validation | Full validation is a rabbit hole (Pitfall 9) | Use server-side $validate or lightweight checks only |
| Phase 3: Production | Dev proxy doesn't apply to builds (Pitfall 14) | Plan reverse proxy deployment from start |

---

## Sources

- FHIR R4 specification (hl7.org/fhir/R4) -- pagination, search, CodeableConcept behavior: HIGH confidence
- Medplum React architecture patterns from training data: MEDIUM confidence (may have changed)
- Blaze FHIR server behavior from training data and GitHub documentation: MEDIUM confidence
- MII Kerndatensatz profile ecosystem from training data: MEDIUM confidence (profile locations/packaging may have changed)
- General FHIR development pitfalls: HIGH confidence (well-established patterns)
- German FHIR system URIs (fhir.de): HIGH confidence (standardized by HL7 Germany)

**Note:** Web search and fetch tools were unavailable during this research. All findings are based on training data (cutoff ~May 2025). Specific version behaviors for Blaze and Medplum React should be validated against current documentation. Items marked MEDIUM or LOW confidence are flagged for phase-specific validation.
