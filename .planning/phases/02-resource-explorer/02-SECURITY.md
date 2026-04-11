# Security Audit — Phase 02: Resource Explorer

**Audit Date:** 2026-04-11
**ASVS Level:** 1
**Phase:** 02 — Resource Explorer (Plans 01, 02, 03)
**Auditor:** GSD Secure Phase
**Result:** SECURED — 11/11 threats closed

---

## Threat Verification

| Threat ID | Category | Disposition | Status | Evidence |
|-----------|----------|-------------|--------|----------|
| T-02-01 | Tampering | mitigate | CLOSED | `src/hooks/useSearchState.ts:3` — `parseSearchRequest` and `formatSearchQuery` imported and used exclusively; no raw URL concatenation |
| T-02-02 | Tampering | mitigate | CLOSED | `src/components/explorer/JsonSyntaxHighlight.tsx:121` — tokens rendered as JSX children `{token.value}`; no `dangerouslySetInnerHTML` present; tokenizer input is `JSON.stringify` output only |
| T-02-03 | Information Disclosure | accept | CLOSED | See accepted risks log below |
| T-02-04 | Tampering | mitigate | CLOSED | `src/components/explorer/SearchFilterPanel.tsx:41-52` — filter values constructed into a `SearchRequest` struct, never concatenated into URLs; `setSearch` in `SearchResultsPage.tsx:65` serializes via `formatSearchQuery` |
| T-02-05 | Tampering | mitigate | CLOSED | `src/hooks/useSearchState.ts:27-29` — all URL params enter the system exclusively through `parseSearchRequest`; no secondary URL-construction path exists |
| T-02-06 | Denial of Service | mitigate | CLOSED | `src/components/explorer/PaginationControls.tsx:79` — `Select data={['10','25','50','100']}`; only control for `_count`; comment on line 17 references this mitigation explicitly |
| T-02-07 | Information Disclosure | accept | CLOSED | See accepted risks log below |
| T-02-08 | Tampering | mitigate | CLOSED | `src/components/explorer/ResourceDetailPage.tsx:19-23` — `FHIR_REFERENCE_PATTERN` and `FHIR_ID_PATTERN` regex guards; `isValidFhirReference()` called at line 115 before any navigation or breadcrumb push |
| T-02-09 | Tampering | accept | CLOSED | See accepted risks log below |
| T-02-10 | Information Disclosure | accept | CLOSED | See accepted risks log below |
| T-02-11 | Spoofing | mitigate | CLOSED | `src/hooks/useBreadcrumbTrail.ts:21-27` — trail is in-memory `useState`; `push()` is only mutation path; called exclusively from `handleReferenceClick` in `ResourceDetailPage.tsx:117` which requires `isValidFhirReference` to pass first |

---

## Accepted Risks Log

| Threat ID | Category | Component | Rationale | Owner |
|-----------|----------|-----------|-----------|-------|
| T-02-03 | Information Disclosure | ExplorerLayout | `MedplumClient` is already resident in memory from the Phase 01 connection flow. `ExplorerLayout` only passes the existing client into a `MedplumProvider` context for child routes. No new exposure surface is created; any child route could access the client via the outlet context regardless. | Architecture |
| T-02-07 | Information Disclosure | SearchControl renders server data | The application is a read-only local FHIR explorer. Any user operating it already has direct network access to the FHIR server. `SearchControl` renders data the user could obtain directly via the FHIR REST API. No confidentiality boundary is crossed. | Design |
| T-02-09 | Tampering | HumanReadableView / ClinicalRawView | `ResourceTable` from `@medplum/react` renders FHIR data types using React's virtual DOM (no `innerHTML`). Medplum's rendering pipeline applies JSX escaping to all string values. The application has no mechanism to modify server-returned data before rendering, and the app is read-only. | Vendor (Medplum) |
| T-02-10 | Information Disclosure | DeveloperJsonView | Full resource JSON display is the explicit design intent of the Developer tab. Users of this tab are developers inspecting FHIR resources on a server they control. The same data is accessible via direct API call. No mitigation is warranted for an intended feature in a local tool. | Design |

---

## Unregistered Threat Flags

None. No `## Threat Flags` sections were present in 02-01-SUMMARY.md, 02-02-SUMMARY.md, or 02-03-SUMMARY.md.

---

## Scope

Implementation files audited (read-only):

- `src/hooks/useSearchState.ts`
- `src/hooks/useBreadcrumbTrail.ts`
- `src/components/explorer/JsonSyntaxHighlight.tsx`
- `src/components/explorer/ExplorerLayout.tsx`
- `src/components/explorer/SearchFilterPanel.tsx`
- `src/components/explorer/SearchResultsPage.tsx`
- `src/components/explorer/PaginationControls.tsx`
- `src/components/explorer/ResourceDetailPage.tsx`
- `src/components/explorer/HumanReadableView.tsx`
- `src/components/explorer/ClinicalRawView.tsx`
- `src/components/explorer/DeveloperJsonView.tsx`
- `src/components/explorer/NavigationBreadcrumbs.tsx`
