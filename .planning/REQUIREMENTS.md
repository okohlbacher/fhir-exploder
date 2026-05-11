# Requirements: v1.9 Polish, Discovery & UAT Closure

**Milestone goal:** Close the accumulated UAT backlog, fix 8 low-priority code issues, and upgrade reverse-reference lookup from a hand-curated catalog to dynamic CapabilityStatement-driven discovery.

---

## v1.9 Requirements

### Code Quality Fixes

- [ ] **FIX-01**: User can middle-click a `ReferenceLink` and land in the correct patient-scoped URL (patient context preserved via patient-aware hrefs built from `BasePathContext`).
- [ ] **FIX-02**: `HumanReadableView` uses `DomainResource.extension` typed cast instead of `(resource as unknown as Record<string, unknown>).extension as ExtensionShape[]` double-cast.
- [ ] **FIX-03**: `NavigationBreadcrumbs` activates the Patients breadcrumb on the bare `/patients` path (not only on `/patients/` prefix children).
- [ ] **FIX-04**: `referenceChecker` validates the extracted resource id against `FHIR_ID_PATTERN` before adding it to the `_id` query bucket (rejects trailing-slash / malformed ids).
- [ ] **FIX-05**: `structuralValidator` checks `signal?.aborted` at entry and returns `[]` immediately when the AbortSignal has been fired.
- [ ] **FIX-06**: `ConnectionContext` throws `new Error(message)` (an `Error` instance) on connection failure, not a plain `{ status, message }` object.
- [ ] **FIX-07**: A regression test asserts the `completenessWalker` sliced-array v1-behaviour invariant (Pitfall 4 documented in code, currently untested).
- [ ] **FIX-08**: The `$everything` button on `ResourceDetailPage` uses `IconExternalLink` instead of the semantically incorrect `IconShareplay`.

### Reverse Reference Discovery

- [ ] **REVR-04**: When a user navigates to a non-Patient resource detail page, the incoming-references panel is populated using a catalog dynamically discovered from the server's `CapabilityStatement` — specifically, `reference`-typed `SearchParameter` entries in `CapabilityStatement.rest[0].resource[*].searchParam`. The dynamic catalog is cached per server URL and refreshed on server switch. When the CapabilityStatement is unavailable, the app falls back to the hand-curated `reverseReferenceCatalog.ts` transparently (no error shown to user).

### UAT Closure

- [ ] **UAT-01**: All Phase 58 deferred UAT items in Groups A, C, D, E, F, and G are verified as PASS or WAIVED with documented rationale against a live Blaze server running Synthea data. Group B items (data-blocked — require Blaze seed fixtures) are WAIVEd with an explicit revisit note.

---

## Future Requirements (deferred)

- **STACK-01** — Mantine 9 / React 19 upgrade. Re-attempt trigger: `npm view @medplum/react peerDependencies` shows `@mantine/core: ^9.x`. Deferred indefinitely until peer-dep gate passes.
- **GRPH-G2** — Schema graph: static, server-independent resource-type relationship graph.
- **GRPH-DEPTH** — Graph depth > 3: UX design required before implementation.
- **REVR-DYN-EXT** — Deep CapabilityStatement SearchParameter `$describe` resolution for search params lacking an inline `target` list.
- **FEDCQL-01** — Federated cohort queries / server-side CQL execution.
- **COHORT-VERSION-01** — Cohort versioning and audit history.

---

## Out of Scope

| Item | Reason |
|------|--------|
| Write operations (create/update/delete resources) | Read-only explorer; architectural constraint |
| Multi-server simultaneous browsing | One server at a time by design |
| Phase 47 Group B UAT items (data-blocked) | Require Blaze seed fixtures not present in Synthea; WAIVEd pending real-world FHIR data |
| SMART on FHIR launch | Not needed for direct Blaze access |
| GraphQL FHIR | Blaze exposes REST only |

---

## Traceability

| REQ-ID | Phase | Plans |
|--------|-------|-------|
| FIX-01 | Phase 59 | 59-01 |
| FIX-02 | Phase 59 | 59-01 |
| FIX-03 | Phase 59 | 59-01 |
| FIX-04 | Phase 59 | 59-01 |
| FIX-05 | Phase 59 | 59-01 |
| FIX-06 | Phase 59 | 59-01 |
| FIX-07 | Phase 59 | 59-01 |
| FIX-08 | Phase 59 | 59-01 |
| REVR-04 | Phase 60 | 60-01, 60-02 |
| UAT-01 | Phase 61 | — (human-only, no plans) |

**Coverage:** 10 / 10 v1.9 requirements mapped to phases.
