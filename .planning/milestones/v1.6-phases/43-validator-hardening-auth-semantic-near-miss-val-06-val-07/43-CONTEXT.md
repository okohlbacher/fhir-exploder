# Phase 43: Validator Hardening — Auth + Semantic Near-Miss (VAL-06 + VAL-07) - Context

**Gathered:** 2026-04-29
**Status:** Ready for planning
**Mode:** `--auto` (auto-picked recommended defaults; every auto-pick logged inline)

<domain>
## Phase Boundary

Extend the Phase 31 external-validator cascade (`src/quality/cascadingValidator.ts`) with two productionization features:

1. **VAL-06** — HTTP authentication for protected validators (`Basic` + `Bearer`) with PHI-gate preservation and an explicit "bearer tokens never persist to settings.yaml" rule.
2. **VAL-07** — Opt-in semantic near-miss detection: when an external validator returns `code-invalid`, walk SNOMED CT / ICD-10 ancestors+descendants up to depth 3 via the configured terminology server and surface "Did you mean?" suggestions inline.

**In scope:**
- Schema additions in `src/config/types.ts` (`validation.externalValidator.auth`, `validation.externalValidator.semanticNearMisses`)
- `cascadingValidator.tryExternal` Authorization header injection after PHI gate, before fetch
- New module under `src/quality/` for the SNOMED/ICD-10 graph walker (reuses Phase 4's `mii-terminology` cache)
- "Did you mean?" suggestion rows in `ResourceIssueTable` (mirrors Phase 15 drill-down idiom)
- Bearer-token entry UI (extension of `src/components/settings/SettingsPage.tsx` or a new modal mirror of `TerminologySettingsModal.tsx`)
- `validator.bearerToken.v1` localStorage key (NEVER serialized to disk — load on cascade init, prompt user via UI)
- Regression tests for header injection paths + opt-in default-off semantic near-miss
- Live-Blaze HUMAN-UAT scaffold (3 cases: basic-auth URL, bearer-token URL, deliberately-invalid SNOMED code)

**Not in scope:**
- mTLS / OAuth 2.0 / OIDC client credentials (out of scope; if Phase 4x demands, opens new phase)
- Configurable depth (depth=3 is the SC cap; configurability is a future toggle)
- Validator switcher UI (Phase 31 already gates by `enabled`)
- Settings UI for `semanticNearMisses` toggle if it adds to scope creep (Claude's discretion — see D-08)

</domain>

<decisions>
## Implementation Decisions

### G-01 Authentication Scheme & Storage

- **D-01 [auto-picked: recommended]:** Extend `externalValidator` in `src/config/types.ts` with optional `auth?: { type: 'basic' | 'bearer'; username?: string; password?: string }`. **Bearer tokens are NEVER stored in this object.** Basic auth keeps `username` + `password` as plaintext fields in `settings.yaml` (the user already manages this file locally; same trust boundary as the FHIR server URL). At fetch time, basic credentials are encoded to `btoa(`${username}:${password}`)` once per request (no caching of the encoded form).
  *Rationale:* `<user>:<pass>` is hand-editable in YAML and matches how every other YAML-configured tool exposes basic auth (curl, ansible, k8s ingress). Pre-encoded base64 in YAML invites accidental commits of credentials and obscures them. Bearer secrets are different — they're often issued by SSO systems and rotated; they don't belong in a plaintext file.

- **D-02 [auto-picked: recommended]:** Bearer tokens load from `localStorage` under the key `validator.bearerToken.v1`. The cascade reads the key once per `tryExternal` call (cheap; localStorage is sync). If `auth.type === 'bearer'` and the key is missing/empty, the cascade demotes to server-tier validation with a notify event `auth-missing` (new event — extends the existing `demote`/`cors`/`error` set). Banner copy in `ValidationPanel` reflects "auth: bearer (token missing — set in Settings)" when this state is hit.
  *Rationale:* Mirrors Phase 31's existing demote pattern (D-09). The `auth-missing` notify event preserves the cascade's "always returns SOME tier" invariant — UX never breaks from missing credentials.

- **D-03 [auto-picked: recommended]:** Bearer-token entry UI lives in **a new `ValidatorAuthSettingsModal.tsx`** that mirrors `src/components/settings/TerminologySettingsModal.tsx`. It opens from a "Set bearer token" button in `SettingsPage.tsx`'s validator section. The modal: (1) shows the active validator URL, (2) accepts the token in a `<PasswordInput>` (Mantine 8), (3) writes to `localStorage` on save, (4) provides a "Clear token" action. The modal does NOT roundtrip the token through `settings.yaml`.
  *Rationale:* Mantine's `PasswordInput` masks input; modal pattern matches existing terminology-server modal so the codebase stays consistent. Separation of concerns — token entry is a security-relevant UX, not a generic settings field.

### G-02 Header Injection Path

- **D-04 [auto-picked: recommended]:** In `cascadingValidator.tryExternal`, build `Authorization` header AFTER the PHI gate (`isPhiAcknowledged()`), BEFORE `AbortController` allocation, BEFORE `fetch()`. The header is built locally (not stored on the validator-options object) so credentials never leak through the `notify` event payloads.
  *Rationale:* Matches Phase 31 PITFALLS #3 ordering invariant (PHI gate runs FIRST). Local build keeps credentials out of any serialized state.

- **D-05 [auto-picked: recommended]:** Header format:
  - `Basic`: `Authorization: Basic ${btoa(`${username}:${password}`)}`
  - `Bearer`: `Authorization: Bearer ${token}` (token is raw — caller is responsible for any URL-encoding etc.)
  *Rationale:* RFC 7617 (basic) and RFC 6750 (bearer) — standard formats; no transformation beyond base64 for basic.

- **D-06 [Claude's Discretion]:** Probe cache key (`${serverUrl}::${externalValidatorUrl}::${resourceType}`) does **NOT** include auth state. Implication: a cached probe success from an unauthenticated session would be reused after auth is added. Acceptable trade-off — probe cache is per-session, the user almost never enables auth mid-session, and including auth-state in the key creates a leak vector. The planner can revisit if the threat model warrants.

### G-03 Semantic Near-Miss — Endpoint & Walk

- **D-07 [auto-picked: recommended]:** Use the configured terminology server's `$lookup` operation with `property=parent` and `property=child` for SNOMED CT / ICD-10 hierarchical walking. Reuses Phase 4's `mii-terminology` infrastructure (LRU cache, graceful fallback, configured server URL). NOT `$expand` — `$expand` is for ValueSets, not for arbitrary code-system hierarchy walking.
  *Rationale:* `$lookup` returns parent/child concepts directly (HL7 FHIR R4 §5.5.1). It's the canonical SNOMED CT graph traversal endpoint per FHIR Terminology Service spec.

- **D-08 [auto-picked: recommended]:** Walk depth = 3 hard-cap (matches SC). Implementation: BFS with a per-node visited set; abort early if total node count > 50 (defense against pathological hierarchies). Non-configurable in v1.6 — add a `maxDepth` setting ONLY if user feedback demands it (Phase 4x backlog candidate).
  *Rationale:* SC mandates depth 3. The 50-node guard is a cheap defense-in-depth against a SNOMED concept with thousands of descendants (e.g., `Disorder of body system` has tens of thousands).

- **D-09 [auto-picked: recommended]:** Suggestion ordering: ancestors first (broader → more specific), then descendants (specific → very specific). Cap at top 10 suggestions in the UI. Tie-break by alphabetical display.
  *Rationale:* Validators report invalid codes that are usually one step off — a parent or sibling is more useful than a leaf descendant.

### G-04 "Did You Mean?" UI

- **D-10 [auto-picked: recommended]:** Surface suggestions as **inline expandable rows** below the offending issue row in `ResourceIssueTable.tsx` (mirrors Phase 15 drill-down idiom). The row shows a `<Mantine.Collapse>` with a small table: `Code | Display | Relation (parent/child/sibling)`. A `<Tooltip>` on each row preview shows the full SNOMED display + system URL.
  *Rationale:* `ResourceIssueTable` already supports drill-down; users navigate Validation issues there. Inline expansion keeps suggestions tightly bound to the offending issue (no visual context switch).

- **D-11 [auto-picked: recommended]:** When `semanticNearMisses: false` (default), the suggestion row is NOT rendered AT ALL — no placeholder, no toggle. Toggling it on requires editing `settings.yaml` (no UI control in v1.6 — keeps UI surface minimal; defer if user feedback demands).
  *Rationale:* Default-off matches SC. UI control is a separate UX decision; YAML toggle is sufficient for opt-in users.

### G-05 Failure Modes

- **D-12 [auto-picked: recommended]:** Terminology server unavailable → silent fallback (no suggestion shown, no error to user). Matches PROJECT.md core constraint "Must handle terminology server being unavailable gracefully (fall back to raw codes)" and Phase 4's pattern.
- **D-13 [auto-picked: recommended]:** Authentication failure (401/403) → demote to server-tier with `notify('auth-failed', { tier: 'external' })`. Active-strategy banner reflects "auth: <type> — failed (server fallback)". Matches Phase 31's demote pattern.
- **D-14 [auto-picked: recommended]:** Bearer token clear-on-tab-close: NO. Token persists in `localStorage` until explicitly cleared via the modal. (Threat model: this is a local browser tool against a trusted FHIR server; persistent tokens are acceptable. If multi-user shared-machine becomes a concern, defer to a future phase.)

### G-06 Test Approach

- **D-15 [auto-picked: recommended]:** Unit tests use `vi.spyOn(globalThis, 'fetch')` to assert Authorization header presence (basic + bearer) on outgoing requests. Mirrors `cascadingValidator.test.ts` existing patterns. NO new test framework dependencies (no `msw`).
- **D-16 [auto-picked: recommended]:** PHI gate test extends `ValidationPanel.phi-gate.integration.test.tsx` with auth-without-PHI: PHI not acknowledged → no Authorization header is attempted (cascade demotes BEFORE the auth path is entered).
- **D-17 [auto-picked: recommended]:** Semantic near-miss tests use a fixture `OperationOutcome` with `code-invalid` + a `vi.spyOn` on the terminology server fetch to return canned `$lookup` responses. Assert: ancestors+descendants surfaced, capped at 10, ordering correct, depth=3 cap respected.
- **D-18 [auto-picked: recommended]:** Live-Blaze UAT (43-HUMAN-UAT.md) scaffold mirrors Phase 42's pattern (`status: scaffolded`, 3 cases per ROADMAP SC #4).

### Claude's Discretion

- **D-06** Probe cache auth-state inclusion (kept simple; leak vector judged minor in local-tool threat model).
- **D-19** Exact Mantine component for token entry (`PasswordInput` recommended but planner can substitute `Input.Password` with eye-toggle if Mantine 8 prefers).
- **D-20** Suggestion table column order (display vs code first); keep readable.
- **D-21** Whether to log `auth.type` to `notify` events for telemetry (YES, NO credentials).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 43 source files (current cascade — extend, don't replace)
- `src/quality/cascadingValidator.ts` — Phase 31's three-tier cascade (external → server → local). PHI gate at line ~131 (BEFORE AbortController). Notify event vocabulary: `demote`, `cors`, `error`. New events for Phase 43: `auth-missing`, `auth-failed`.
- `src/quality/normalizers.ts` — `OperationOutcome.issue` normalization. `code-invalid` detection happens here.
- `src/quality/phiGate.ts` (referenced from cascadingValidator.ts:36) — `isPhiAcknowledged(serverUrl, externalUrl)`. Reuse, do not modify.
- `src/config/types.ts` — Add `auth` + `semanticNearMisses` fields under `validation.externalValidator`.
- `src/config/settings.ts` — Settings loader. Add validation for new schema fields.
- `src/components/quality/ValidationPanel.tsx` — Banner copy update (auth state).
- `src/components/quality/ResourceIssueTable.tsx` — Drill-down rows for "Did you mean?".
- `src/components/settings/SettingsPage.tsx` — Add bearer-token modal trigger.
- `src/components/settings/TerminologySettingsModal.tsx` — Pattern reference for new `ValidatorAuthSettingsModal.tsx`.

### Phase 43 tests (extend, don't replace)
- `src/quality/__tests__/cascadingValidator.test.ts` — Add tests for D-04, D-05, D-13, D-15.
- `src/components/quality/__tests__/ValidationPanel.phi-gate.integration.test.tsx` — Extend per D-16.

### Prior phase summaries (archived in v1.5 milestone)
- Phase 31 (UX-01 External Validator Cascade) — VAL-01..05 baseline. CONTEXT/RESEARCH/SUMMARY archived under `.planning/milestones/v1.5/` (or wherever v1.5 archive lives — researcher will locate).
- Phase 4 (Terminology Server Integration) — `mii-terminology` LRU cache + graceful fallback pattern. Cache module under `src/quality/mii-terminology.ts` (researcher to confirm path).
- Phase 7 (PHI Gate) — `phiGate.ts` invariants.
- Phase 15 (Quality Drill-Down) — `<DrillDownShell>` + Mantine `Collapse` row pattern.

### Standards & specs
- HL7 FHIR R4 §5.5.1 — `$lookup` operation (CodeSystem hierarchical traversal): https://hl7.org/fhir/R4/codesystem-operation-lookup.html
- HL7 FHIR R4 §11.4.5 — `OperationOutcome.issue.code` codes (`code-invalid` etc.): https://hl7.org/fhir/R4/valueset-issue-type.html
- RFC 7617 — Basic Authentication Scheme: https://datatracker.ietf.org/doc/html/rfc7617
- RFC 6750 — Bearer Token Usage: https://datatracker.ietf.org/doc/html/rfc6750
- SNOMED CT — Hierarchical relationships (parent/child via `116680003 |Is a|`): https://www.snomed.org/snomed-ct/five-step-briefing
- ROADMAP.md §Phase 43 — definitive SCs.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Cascading validator scaffold** (`cascadingValidator.ts`): demote/cors/error notify pattern, probe cache, PHI gate ordering — all extension points already exist.
- **Mantine PasswordInput** (Mantine 8): masked input for token entry. No new dependency.
- **`mii-terminology` LRU cache** (Phase 4): reuse for `$lookup` results to avoid hammering the terminology server during graph walk.
- **`<DrillDownShell>` / `<Mantine.Collapse>`** (Phase 15): pattern for inline expandable suggestion rows.
- **`vi.spyOn(globalThis, 'fetch')`** (existing test infra): no new test framework needed for header-injection tests.
- **`TerminologySettingsModal.tsx`**: structural template for the new `ValidatorAuthSettingsModal.tsx`.

### Established Patterns
- **PHI gate FIRST** (PITFALLS #3): authentication path runs AFTER PHI gate, never before.
- **Demote-on-failure** (Phase 31): cascade always returns *some* tier; auth missing/failed → server-tier fallback, not error.
- **localStorage versioned keys** (`quality.cohorts.v1`, `quality.thresholds.v1` from Phase 21+): use `validator.bearerToken.v1` matching this convention.
- **Mantine 8 modals** (`useDisclosure` + `<Modal>`): standard idiom; mirror in `ValidatorAuthSettingsModal`.
- **No-op fallback for unavailable terminology** (PROJECT.md core constraint): silent suggestion drop, never error.

### Integration Points
- **`tryExternal` (cascadingValidator.ts ~line 128-180)**: Authorization header injection point.
- **`SettingsPage.tsx` validator section**: Bearer-token modal trigger button.
- **`ValidationPanel.tsx` banner**: Active-strategy + auth state copy.
- **`ResourceIssueTable.tsx` row**: Suggestion expansion.
- **`config/types.ts` `ValidationConfig`**: Schema extension.

</code_context>

<specifics>
## Specific Ideas

- **No new external dependencies.** Stay within Mantine 8 + Medplum 5 + js-yaml. The graph walker is plain TS.
- **Plaintext credentials in settings.yaml are intentional.** YAML lives in the user's local working directory; same trust boundary as the FHIR server URL. Bearer tokens are special because they're often org-issued and rotated.
- **No auth UI for `semanticNearMisses` toggle** (D-11). Keep settings UI minimal; YAML edit is sufficient for opt-in.
- **Hard-cap depth=3** (D-08) with a 50-node early-abort.
- **Suggestion cap at 10** (D-09) with parents-first ordering.
- **Silent fallback** when terminology server unavailable (D-12) — matches Phase 4 pattern.

</specifics>

<deferred>
## Deferred Ideas

- **OAuth 2.0 / OIDC / mTLS** — out of scope for VAL-06; opens its own phase if user demand emerges.
- **Configurable depth** (`semanticNearMisses.maxDepth`) — added to backlog if user feedback shows depth=3 is wrong for some terminology servers.
- **UI toggle for semanticNearMisses** — defer until user feedback shows YAML edit is too friction-heavy.
- **Multi-user shared-machine token rotation** — defer; current threat model is single-user local tool.
- **Auth state in probe cache key** (D-06) — defer; minor leak vector in local-tool threat model.
- **`$expand`-based suggestions for ValueSets** — orthogonal to `$lookup`-based hierarchical walking; could be a future Phase 4x feature.

</deferred>

---

*Phase: 43-validator-hardening-auth-semantic-near-miss-val-06-val-07*
*Context gathered: 2026-04-29*
*Mode: --auto (every D-XX rationale logged inline; user can review and revise CONTEXT.md before /gsd-plan-phase 43 --auto runs)*
