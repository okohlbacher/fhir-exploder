# Phase 31: UX-01 External Validator Cascade - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `31-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-04-23
**Phase:** 31-ux-01-external-validator-cascade
**Areas discussed:** Gray-area selection only; user chose "No preference"

---

## Gray-area selection

**Question asked:** Which v1.5 deltas beyond the preserved 29-02-PLAN do you want to discuss for Phase 31?

| Option | Description | Selected |
|--------|-------------|----------|
| Probe cache semantics | VAL-01 expands key to `(serverUrl, externalValidatorUrl, resourceType)` + adds reset-on-Validate-sample-click | |
| Validator variant detection | VAL-03 asks for `Active strategy: external (HAPI)` suffix — detect via Capability Statement vs URL heuristic vs user label vs defer | |
| CORS failure UX | VAL-02 adds "CORS failure surfaces root cause in the demote notification" — detection + messaging | |
| AbortSignal threading for server tier | VAL-05 requires `remoteValidator.ts` to accept an `AbortSignal` — breaking vs additive vs overload | |

**User's choice:** "No preference" — deferred all four decisions to Claude.

**Notes:** Phase 31 was heavily pre-litigated before this discuss session. The preserved `29-02-PLAN.md` locks D-07..D-16; v1.5 research (`SUMMARY.md`, `PITFALLS.md`) locks 5 additional invariants (probe cache location, zero runtime deps, PHI gate re-evaluation, etc.). Only four v1.5-era deltas beyond the preserved plan required user input, and the user deferred all of them. Defaults were locked using research/SUMMARY, PITFALLS #1-6, and REQUIREMENTS.md VAL-01..05 as the authoritative sources, and recorded as D-17..D-20 in `31-CONTEXT.md`.

---

## Claude's Discretion

All four v1.5-delta decisions fell to Claude's discretion via the user's "No preference" selection. Defaults chosen:

- **D-17 probe cache:** 3-part flat-string key `${serverUrl}::${externalValidatorUrl}::${resourceType}`; full wipe on settings change; per-type reset on "Validate sample" click; lives in `useRef<Map>` inside `useConformanceRun`.
- **D-18 validator variant:** URL-pattern heuristic + optional user-configured `label` override in `settings.yaml`. No Capability Statement query (rejected — 200-500 ms round-trip for a cosmetic label).
- **D-19 CORS UX:** pre-timeout `TypeError` = "likely CORS" heuristic; blue toast, `autoClose: 8000`, extended copy with browser-console pointer + `Access-Control-Allow-Origin` guidance. Distinct from D-10's timeout toast (5s).
- **D-20 AbortSignal threading:** additive optional `options?: { signal?: AbortSignal }` on `ValidationBackend.validate()` — zero call-site churn for existing callers.

Additional executor-discretion items captured in `31-CONTEXT.md` §Claude's Discretion: normalizer fixture sources, Map construction style, CORS heuristic tightening, toast deduplication, status-line DOM position, variant-suffix formatting (text-parens vs Badge).

## Deferred Ideas

See `31-CONTEXT.md` §Deferred — Validator Wrapper URL shape, Capability-Statement variant detection, bundle $validate batch mode, R5/R6 support, validator auth, semantic near-miss, preflight OPTIONS probe. All tracked for v1.6+ where relevant.
