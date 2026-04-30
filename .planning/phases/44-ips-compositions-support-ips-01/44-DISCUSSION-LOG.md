# Phase 44: IPS Compositions Support (IPS-01) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-30
**Phase:** 44-ips-compositions-support-ips-01
**Mode:** `--auto` (no human interaction; recommended option auto-picked for every gray area)
**Areas discussed:** Profile Fetch & Registry · UI Entry Point · Validator Architecture · Drill-Down Wiring · Test Strategy · LICENSE/Attribution

---

## G-01 Profile Fetch & Registry

### D-01 — Fetch script + registry layout

| Option | Description | Selected |
|--------|-------------|----------|
| Separate script + parallel `IPS_REGISTRY` | New `scripts/fetch-ips-profiles.mjs` + `src/quality/profiles/ips/index.ts`; mirrors Phase 36 URL-keyed lazy-load shape | ✓ (auto-picked: recommended) |
| Extend existing `fetch-mii-profiles.mjs` to also fetch IPS | One script, one registry; coupling MII + IPS update flow | |
| Inline IPS profile JSON (no fetcher) | Bundle once, never re-fetch; simplest but no upgrade path | |

**Auto-selected rationale:** IPS = HL7 International (different attribution); separate script keeps update cadence + license metadata isolated. Reusing Phase 36 lazy-load shape preserves trim/cache invariants.

### D-02 — Package version pin

| Option | Description | Selected |
|--------|-------------|----------|
| Live-probe + pin in `IPS_PACKAGES` const | Researcher confirms latest stable at planning time | ✓ (auto-picked: recommended) |
| Hard-code latest known | Skip live probe; risk of staleness | |

### D-03 — Trim shape

| Option | Description | Selected |
|--------|-------------|----------|
| Identical to Phase 34 trim (`{ resourceType, url, name, type, snapshot.element[] }`) | Reuse trim function | ✓ (auto-picked: recommended) |
| Custom IPS-specific trim | Diverge from Phase 34 | |

### D-04 — Attribution

| Option | Description | Selected |
|--------|-------------|----------|
| `src/quality/profiles/ips/ATTRIBUTION.md` + LICENSE root section | Mirror Phase 34 | ✓ (auto-picked: recommended) |
| Inline in CONTEXT.md only | Insufficient for license compliance | |

---

## G-02 UI Entry Point

### D-05 — Panel placement

| Option | Description | Selected |
|--------|-------------|----------|
| New `IPSPanel.tsx` at `/quality/ips` | Dedicated bundle-level workflow; separate from per-resource cascade | ✓ (auto-picked: recommended) |
| Bolted onto `ValidationPanel` | Mixes per-resource cascade with bundle validation; confusing UX | |
| Tab in existing CompletenessPanel | IPS findings ≠ completeness findings | |

**Auto-selected rationale:** IPS validation is bundle-level, fundamentally different from the per-resource cascade. Mixing them confuses users.

### D-06 — Bundle input mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Both: paste textarea + server Composition picker (Mantine `<Tabs>`) | Covers ad-hoc + connected workflows | ✓ (auto-picked: recommended) |
| Paste only | Simpler but loses connected-server use case | |
| Server picker only | Loses ad-hoc / file-based workflows | |

### D-07 — Validation trigger

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit "Validate" button | Matches Quality cluster pattern; avoids accidental runs during paste | ✓ (auto-picked: recommended) |
| Auto-on-input (debounced) | Risk of partial-paste validation; UX noise | |

---

## G-03 Validator Architecture

### D-08 — Walker vs cascade

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated bundle walker (no cascade) | Pure-function `ipsBundleValidator`; reuses `normalizeOperationOutcomeIssue` only | ✓ (auto-picked: recommended) |
| Reuse Phase 31 cascade with IPS profile injected | Brings PHI-gate friction + per-resource HTTP round-trips that don't fit bundle-level | |
| Server `$validate` only | Requires Blaze to ship IPS profiles (it doesn't) | |

**Auto-selected rationale:** IPS validation is bundle-level traversal of `Composition.section[]`; cascade is wrong abstraction. Pure walker is easier to unit-test.

### D-09 — Severity classification

| Option | Description | Selected |
|--------|-------------|----------|
| Three severity levels (error/warning/information for absent/empty/unresolvable) | Matches clinical IPS workflow; sortable | ✓ (auto-picked: recommended) |
| Two levels (error/warning) | Loses unresolvable-ref signal | |
| Single level (issue or no issue) | No prioritization for users | |

---

## G-04 Drill-Down Wiring

### D-10 — Drill-down primitive

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse Phase 15 `<ResourceIssueTable>` UNMODIFIED | Zero new components; consistent UX | ✓ (auto-picked: recommended) |
| Custom IPS-specific table | Duplicate primitive; inconsistent UX | |

### D-11 — Section path format

| Option | Description | Selected |
|--------|-------------|----------|
| `Composition.section[N].title` | Sortable, groupable, locks slice ordering | ✓ (auto-picked: recommended) |
| Free-text title only | Loses positional info | |

---

## G-05 Test Strategy

### D-12 — Fixtures

| Option | Description | Selected |
|--------|-------------|----------|
| Three fixtures (complete / incomplete / malformed) | Covers happy path + SC #4 + edge case | ✓ (auto-picked: recommended) |
| One fixture (incomplete only) | Misses positive baseline + edge case | |

### D-13 — Test files

| Option | Description | Selected |
|--------|-------------|----------|
| Walker unit + IPSPanel component test, no new framework | Reuses vitest 1.x | ✓ (auto-picked: recommended) |
| Add Playwright/E2E for IPS | Out of scope; vitest covers unit + component | |

---

## G-06 LICENSE/Attribution

### D-14 — License updates

| Option | Description | Selected |
|--------|-------------|----------|
| Repo LICENSE section + per-package ATTRIBUTION.md | Mirrors Phase 34; license compliance | ✓ (auto-picked: recommended) |
| LICENSE only (no per-package metadata) | Loses upstream version + URL trail | |

---

## Claude's Discretion

- **D-15** Mantine input choice (`<JsonInput>` recommended, `<Textarea>` fallback if Phase 45 renames the component)
- **D-16** Async chunking for large bundles (>1 MB) — default sync; revisit on user feedback
- **D-17** Severity row color-coding inherited from Phase 15; no change
- **D-18** Multi-bundle batch validation — explicitly DEFERRED

## Deferred Ideas

- Multi-bundle batch validation (v1.7+)
- Server-side `$validate` IPS support (depends on server)
- IPS-AU / IPS-CH / regional dialects (separate phases)
- Composition.section auto-fix suggestions (editor feature, not validator)
- Schematron-style cross-element rules (Phase 4x candidate)
