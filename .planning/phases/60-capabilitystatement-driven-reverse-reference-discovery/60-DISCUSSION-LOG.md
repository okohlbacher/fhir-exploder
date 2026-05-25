# Phase 60: CapabilityStatement-Driven Reverse-Reference Discovery - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-25
**Phase:** 60-capabilitystatement-driven-reverse-reference-discovery
**Areas discussed:** Catalog builder placement

---

## Catalog builder placement

### Q1: Where does the dynamic catalog builder live?

| Option | Description | Selected |
|--------|-------------|----------|
| Extend ConnectionContext | Parse catalog in `connect()`, add `dynamicCatalog` to connected state. Zero additional fetches; clean invalidation on server switch. | ✓ |
| Pure derivation hook | `useCapabilityStatementCatalog()` reads `capability` from context via `useMemo`. No state changes to ConnectionContext. | |
| New context with own fetch | Separate context that fetches `/metadata` independently. Overkill — ConnectionContext already has capability. | |

**User's choice:** Extend ConnectionContext (Recommended)
**Notes:** ConnectionContext already has `capability: CapabilityStatement` in connected state — no second fetch needed.

---

### Q2: What type should `dynamicCatalog` have in the connected state?

| Option | Description | Selected |
|--------|-------------|----------|
| Same ReverseReferenceCatalog type | Reuse `Partial<Record<ResourceType, readonly ReverseReferenceEntry[]>>`. Zero new type surface. | ✓ |
| Nullable ReverseReferenceCatalog | `dynamicCatalog: ReverseReferenceCatalog \| null` — null for empty-catalog state. | |

**User's choice:** Same ReverseReferenceCatalog type (Recommended)
**Notes:** Empty object `{}` represents "no usable reference params" without introducing a new null union.

---

### Q3: Parser location — standalone utility vs. inline?

| Option | Description | Selected |
|--------|-------------|----------|
| Standalone utility function | `src/utils/capabilityStatementCatalog.ts` exports `buildDynamicCatalog(capability)`. Unit-testable with fixture. | ✓ |
| Inline in connect() | Simpler file count but harder to unit test — tests would need to mock the full connect flow. | |

**User's choice:** Standalone utility function (Recommended)
**Notes:** Required by success criterion 4a (parser unit test with fixture CapabilityStatement).

---

## Claude's Discretion

- **Target type inference strategy** — Not discussed. User deferred to researcher. Constraint: REVR-DYN-EXT (SearchParameter definition follow) is explicitly deferred. Researcher should determine the convention-based approach.
- **Union merge dedup details** — Not discussed. Researcher to confirm `type+param` composite key matches `entryKey` in RelatedResourcesPanel.
- **Icon handling for dynamic entries** — Not discussed. Dynamic catalog entries have no icons; researcher may propose convention.

## Deferred Ideas

- **REVR-DYN-EXT** — Deep SearchParameter `$describe` resolution. Tracked in ROADMAP.md §Deferred Items.
- **Icons for dynamically-discovered resource types** — Out of scope for Phase 60.
