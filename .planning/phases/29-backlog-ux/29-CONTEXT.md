# Phase 29: Backlog UX - Context

**Gathered:** 2026-04-23
**Status:** Ready for planning
**Source:** Auto-captured via `/gsd-discuss-phase 29 --auto` (recommended defaults locked)

<domain>
## Phase Boundary

Two pending-todo UX items logged from prior user feedback. This is the LAST v1.4 phase. **Intra-phase order LOCKED:** T2 (UX-02 OverviewStrip) BEFORE T1 (UX-01 External validator) — small UI warm-up before L-task validator cascade.

**Requirements covered:** UX-01, UX-02

**Dependencies:** Phase 23 complete. Independent of refactor thread (25/26/27/28 — all complete).

**Effort (ROADMAP):** ~2 days. Most of that is UX-01 external validator cascade.

**Explicitly NOT in this phase:**
- Local full-featured FHIR validator (out-of-scope per pending-todo note)
- FHIR Validator Wrapper `/validate` path shape (HAPI `{Type}/$validate?profile=...` is what `remoteValidator.ts` handles today; Wrapper support → v1.5)
- Bundle `$validate` batch mode (per-resource only)
- R5/R6 FHIR version support (R4-only per project constraint)
- SMART on FHIR OAuth (project scope explicitly excludes)
- Auto-connect on startup, date-range picker, pin resource types (other pending todos, belong to other phases/v1.5)

</domain>

<decisions>
## Implementation Decisions

### UX-02: OverviewStrip 9→7 + status line (T2 — FIRST, warm-up)

- **D-01:** Drop tiles 1-2 (Total resources, Resource types) from `src/components/quality/OverviewStrip.tsx`. Keep all 7 metric ring tiles (completeness, coverage, validation, plausibility, lab-ranges, duplicates, references) in their current Kahn order.
- **D-02:** New status line ABOVE the tile strip: `N resources · M types · Last computed {relative-time}`. Relative-time formatter (e.g., "2 min ago", "just now") — use a minimal inline formatter, no new dependency. If >24h ago, switch to absolute ISO date.
- **D-03:** Status line styling: small Mantine `Text size="sm" c="dimmed"` with interpunct separators. Single line on desktop; wraps on narrow viewports. No icons.
- **D-04:** Cardinality entries remain **non-clickable** (deliberate UI-SPEC-03 decision from v1.2, preserved).
- **D-05:** Update `18-UI-SPEC.md` at `.planning/milestones/v1.2-phases/18-quality-alerting-thresholds/18-UI-SPEC.md` to reflect the 7-tile layout + status line. Preserve existing decisions; add a new decision number (e.g., D-36) noting the 9→7 reduction.
- **D-06:** PDF export (`src/quality/pdfExport.ts`) must reflect the new tile layout — 7 tiles, status line header. Regression test: snapshot PDF cover and body layout.

### UX-01: External validator cascade (T1 — SECOND, L-task)

- **D-07:** Extend `settings.yaml` schema to accept `validation.externalValidator: { url: string; enabled: boolean; timeoutMs?: number }`. Default `timeoutMs: 15000`. Config resides in `src/config/settings.ts`.
- **D-08:** Cascade order: **external (if enabled + capability probe succeeds) → server `$validate` (existing `remoteValidator.ts`) → local checker (existing `structuralValidator.ts`)**. Per-resource-type probe cached in a `Map<serverUrl, Map<resourceType, 'external'|'server'|'local'>>` — probe runs once per (server, resourceType) pair.
- **D-09:** **PHI gate (CRITICAL regression risk):** Every external fetch MUST route through the existing Phase 7 PHI acknowledgment gate BEFORE any network call. Add a regression test asserting no fetch fires until user consent is recorded. If the PHI gate rejects, fall back to server or local — never bypass.
- **D-10:** Every external `fetch` wrapped in `AbortController` with `setTimeout(() => controller.abort(), timeoutMs)`. On timeout: fall back to next tier in cascade, show Mantine blue toast `"External validator timed out after {n}s — falling back to {tier}"`. Do NOT surface a red error toast for timeouts (common case, not a defect).
- **D-11:** `ValidationPanel` renders an **"Active strategy: external / server / local"** status line per resource type. Line placement: above the validation issues table. Updates when cascade tier changes for that resource type.
- **D-12:** `OperationOutcome` response from external validator normalized via new `normalizeOperationOutcomeIssue(issue: OperationOutcomeIssue): NormalizedIssue` mapper in `src/quality/normalizers.ts` (or wherever existing normalizers live). Unit-tested with 5+ cases (severity mapping, location decoding, code extraction, extension handling, empty-issue fallback).
- **D-13:** Same validator URL shape as `remoteValidator.ts`: `POST {url}/{Type}/$validate?profile={profile}` with `Content-Type: application/fhir+json` body. If external URL has a different shape (e.g., FHIR Validator Wrapper), defer to v1.5 — don't add conditional shape handling now.

### Implementation order (LOCKED)

- **D-14:** Plan 29-01 = UX-02 (T2 warm-up) — small, low-risk. Touches OverviewStrip, pdfExport, 18-UI-SPEC.md. ~4 hours.
- **D-15:** Plan 29-02 = UX-01 (T1 L-task) — external validator cascade. Touches settings config, ValidationPanel, new normalizer, capability probe, PHI gate integration, timeout/abort plumbing. ~1.5 days. Depends on Plan 29-01 (not strictly required by code, but the intra-phase ordering is LOCKED per ROADMAP).

### Todo move

- **D-16:** After both plans complete, move pending todos to completed:
  - `.planning/todos/pending/2026-04-14-add-external-validator-integration-for-full-fhir-validate.md` → `.planning/todos/completed/`
  - `.planning/todos/pending/2026-04-14-reduce-overview-strip-tile-count-move-totals-to-header.md` → `.planning/todos/completed/`
  Done in Plan 29-02's final task (after verification).

### Claude's Discretion (blanket)

- Relative-time formatter implementation (inline vs extract; `Intl.RelativeTimeFormat` vs custom)
- Normalizer function signature (single issue vs batch)
- Capability probe mechanism (HEAD request vs `metadata` endpoint vs heuristic per URL pattern)
- PDF export regression test strategy (snapshot vs structural assertions)
- Toast timeout duration for timeout messages (recommend 5s; non-blocking)

### Folded Todos

- `2026-04-14-add-external-validator-integration-for-full-fhir-validate.md` (folded → UX-01)
- `2026-04-14-reduce-overview-strip-tile-count-move-totals-to-header.md` (folded → UX-02)

Other pending todos NOT folded (belong elsewhere):
- MII Synthea seed (environmental, deferred Phase 23 blocker)
- Auto-connect on startup (v1.5 UX)
- Date-range picker (v1.5 UX)
- Pin resource types (v1.5 UX)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase-level spec
- `.planning/ROADMAP.md` §"Phase 29: Backlog UX" — goal, intra-phase order lock (T2 before T1)
- `.planning/REQUIREMENTS.md` §"Phase 29" — UX-01, UX-02 acceptance
- `.planning/todos/pending/2026-04-14-add-external-validator-integration-for-full-fhir-validate.md` — original UX-01 note
- `.planning/todos/pending/2026-04-14-reduce-overview-strip-tile-count-move-totals-to-header.md` — original UX-02 note

### UI-SPEC to update
- `.planning/milestones/v1.2-phases/18-quality-alerting-thresholds/18-UI-SPEC.md` — the tile layout spec referenced in UX-02 acceptance

### Existing validator infrastructure (reuse)
- `src/quality/remoteValidator.ts` — existing server `$validate` cascade target
- `src/quality/structuralValidator.ts` — existing local checker (third cascade tier)
- `src/quality/validationBackends.ts` — probable home for the new external-validator backend
- `src/hooks/useValidationRun.ts` — coordinates validation runs; the cascade logic slots here

### PHI gate (critical integration)
- Phase 7 PHI acknowledgment gate — search `src/` for `phiAcknowledg` / `PHIConsent` / `gatePhi` to find the current implementation (research phase to locate exact file)

### OverviewStrip target
- `src/components/quality/OverviewStrip.tsx` — 123 LOC, tiles 1-2 at lines ~100-112, metric tiles at lines 116+

### PDF export
- `src/quality/pdfExport.ts` — cover + body layout generation

### Settings config
- `src/config/settings.ts` — schema for `validation.externalValidator` block
- `settings.yaml` at project root — user-facing config file

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`remoteValidator.ts`** — `$validate` POST call shape; extend for external-validator URL
- **`structuralValidator.ts`** — local fallback already exists; just wire as 3rd cascade tier
- **`useValidationRun.ts`** — already handles validation lifecycle; cascade logic fits here
- **`AbortController` + `setTimeout` pattern** — used in Phase 24's `useAsyncRun` cleanup; mirror the same pattern
- **Mantine `notifications.show`** — blue toast for timeouts, red for hard failures (Phase 23 precedent)
- **`relative-time` formatter** — check if any exists; if not, build inline ~10 LOC

### Established Patterns
- **Capability probe with per-server cache** — Phase 24's `QualityMetricsCache` registry pattern (2-entry LRU keyed on `serverUrl`) is the reference shape
- **PHI gate routing** — Phase 7 introduced the gate; any new network path that touches patient data MUST route through it (per PITFALLS §8)
- **OperationOutcome normalization** — existing `validationBackends.ts` likely has normalization; extend rather than duplicate
- **UI-SPEC as canonical design doc** — `18-UI-SPEC.md` change is part of acceptance, not an afterthought

### Integration Points
- **`OverviewStrip.tsx`** — remove 2 tiles, add status line
- **`QualityOverviewPage.tsx` or parent** — status line may need data from same source as tiles (total count, type count, last-computed timestamp)
- **`ValidationPanel.tsx`** — add "Active strategy: X" status line per resource
- **`useValidationRun.ts`** — cascade logic
- **`settings.yaml`** + `src/config/settings.ts` — external validator config
- **PHI gate** — integration checkpoint (research to locate)

### Test Baseline (post-Phase 28)
- 22 pre-existing failures, 814 passing
- New tests expected: normalizer (5+ cases), cascade (3+ tiers × 2 scenarios), PHI gate regression, OverviewStrip status line render, PDF snapshot

</code_context>

<specifics>
## Specific Ideas

- **Timeout message wording:** `"External validator timed out after {n}s — falling back to {server|local}"`. Blue toast (informational, not error). 5s display.
- **Probe cache key:** `${serverUrl}::${resourceType}` (same `::` separator as Phase 24's count cache). Result: one of `'external'|'server'|'local'|'probe-failed'`.
- **Status line for ValidationPanel:** `Active strategy: external · 14s timeout` (external), `Active strategy: server $validate` (server), `Active strategy: local checker` (local). Mantine `Text size="xs" c="dimmed"`.
- **Relative-time thresholds:** <60s: "just now"; <60min: "Nm ago"; <24h: "Nh ago"; else: ISO date. No seconds precision for UX sanity.

</specifics>

<deferred>
## Deferred Ideas

- **Local full FHIR validator** — explicitly out-of-scope per pending-todo note; HAPI/IG Publisher exist
- **FHIR Validator Wrapper path shape** — differs from HAPI `/$validate`; v1.5 if user requests
- **Bundle `$validate` batch mode** — v1.5
- **R5/R6 support** — R4-only project constraint
- **SMART on FHIR OAuth** — project scope excludes

### Reviewed Todos (not folded)
- MII Synthea seed — Phase 23 environmental (still relevant; user didn't promote)
- Auto-connect on startup — v1.5 UX
- Date-range picker improvements — v1.5 UX
- Pin resource types at top of dropdown — v1.5 UX

</deferred>

---

*Phase: 29-backlog-ux*
*Context gathered: 2026-04-23 via --auto (recommended defaults locked)*
*This is the LAST v1.4 phase — after completion, milestone audit can ship v1.4.*
