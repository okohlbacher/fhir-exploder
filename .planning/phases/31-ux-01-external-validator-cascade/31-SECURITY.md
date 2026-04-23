---
phase: 31
slug: ux-01-external-validator-cascade
status: verified
threats_open: 0
asvs_level: 1
created: 2026-04-23
---

# Phase 31 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
>
> Covers sub-plans **31-01** (cascading validator + external tier) and **31-02** (CR-01 gap closure: UI↔cascade PHI key agreement).

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Browser → external validator URL | NEW outbound network call carrying full FHIR resource bodies. URL is user-configured via `public/settings.yaml`; trust class = self-hosted config (local-first tool). | PHI (full FHIR resources) via POST body |
| Browser localStorage → PHI-ack gate | Gate state persists under `quality.validation.phiAcknowledged.v1:{serverUrl}\|{externalUrl}`. DOM-level tampering accepted — local-first tool treats the browser as a trust boundary. | Consent flag (boolean-ish string) |
| Browser → Blaze FHIR server ($validate server tier) | Pre-existing boundary. D-20 widens it by threading `AbortSignal` — no new trust implications. | PHI via POST body |
| Browser → in-memory probe cache | Ephemeral `useRef<Map>`; never persisted; cleared on settings change (D-17). | Probe results (no PHI) |
| Browser → external validator URL (UI write path) | 31-02: UI now writes PHI-ack under the external-tier key, matching the cascade's read path (`isPhiAcknowledged(serverUrl, ext.url)`). | Consent flag |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-31-01 | I (SSRF via untrusted external URL) | `cascadingValidator.ts` `tryExternal` | accept | Local-only tool; user configures `externalValidator.url` in their own `settings.yaml`. Ships disabled-by-default (commented template in `public/settings.yaml:41-46`). No UI control writes the URL. Anti-feature invariant: no `validator.fhir.org` auto-populate. | closed |
| T-31-02 | I (PHI leakage in URL) | `tryExternal` URL construction | mitigate | URL built as `${base}${Type}/$validate?profile=${encodeURIComponent(canonical)}` — profile is a canonical URL, not PHI. Resource body flows in POST only. `src/quality/cascadingValidator.ts:144-153`. | closed |
| T-31-03 | E (Consent bypass — PHI gate skipped) | `cascadingValidator.ts:tryExternal` | mitigate | Gate re-evaluated per outbound fetch before `AbortController` alloc (`cascadingValidator.ts:131-134`). Single-source module: `src/quality/phiGate.ts` (grep-unique `PHI_ACK_KEY_PREFIX`). Tests: `phiGate.test.ts:36-41` (fetch-spy zero pre-ack); `cascadingValidator.test.ts:108-128` (external never fetched when localStorage empty). | closed |
| T-31-04 | D (Timeout exhaustion / hanging requests) | cascade + `useConformanceRun` cleanup | mitigate | `AbortController + setTimeout(abort, timeoutMs=15000)` (`cascadingValidator.ts:136-137`). Caller abort chained via `addEventListener('abort', ..., { once: true })` at `cascadingValidator.ts:141`. Unmount abort at `useConformanceRun.ts:349-355`. Tests: `cascadingValidator.test.ts:130-173` (timeout) + `:243-259` (caller abort mid-fetch). | closed |
| T-31-05 | T (OperationOutcome schema drift HAPI/Firely/IG-Publisher) | `normalizers.ts` + cascade external tier | mitigate | `normalizeOperationOutcomeIssue` handles `expression?.[0] ?? location?.[0] ?? ''` (`normalizers.ts:35`). 3 real-shape fixtures under `src/quality/__tests__/fixtures/normalizers/`. Tests 9/10/11 at `normalizers.test.ts:84-108`. | closed |
| T-31-06 | T (Probe cache staleness after settings swap) | `useConformanceRun.ts` + cascade probe cache | mitigate | `JSON.stringify(settings?.validation?.externalValidator ?? null)` serialized dep triggers `clearProbeCache` (`useConformanceRun.ts:130-135`). Per-type reset on `start()` click (`:151-156`). 3-part probe key `${serverUrl}::${externalValidatorUrl}::${resourceType}` (`cascadingValidator.ts:64-70`). Tests: `cascadingValidator.test.ts:283-300`. | closed |
| T-31-07 | T (Settings deepMerge parse error drops externalValidator block) | `src/config/settings.ts` | mitigate | Field-level narrowing at `settings.ts:76-92`. Invalid url drops block (`if (extUrl.length > 0)` at :88). Invalid `timeoutMs` falls back to 15000 (`:80-83`). Invalid `label` dropped (`:84-87`). Backward-compatible when block absent. Coverage via `tsc --noEmit` strict-null + schema review. | closed |
| T-31-08 | I (Log injection via OperationOutcome diagnostics) | `notifications.show` + `ResourceIssueTable` | mitigate | `payload.to` typed as `ActiveStrategy = 'external' \| 'server' \| 'local' \| 'probe-failed'` (`cascadingValidator.ts:42`) — TS-enforced union; no user strings flow in. Timeout sanitized via `Math.round(ms / 1000)` at `useConformanceRun.ts:259-261`. `ResourceIssueTable` renders via React JSX escaping (no `dangerouslySetInnerHTML`; grep-clean). | closed |
| T-31-09 | I (CORS error leaks internal URL in toast) | `notify('cors', ...)` toast copy | accept | Toast copy at `useConformanceRun.ts:263-272` references only `payload.to` (enum) and generic CORS/network guidance. Does NOT embed external URL or server body. User inspects DevTools for details (D-19). | closed |
| T-31-10 | D (AbortSignal integrity — orphan requests after unmount) | `types.ts` + `remoteValidator.ts` + `useConformanceRun` | mitigate | D-20: `ValidationBackend.validate` signature widened (`types.ts:113`). `remoteValidator.ts:60,69-75` threads signal into `MedplumClient.post` 4th-arg options. Cascade `tryServer` passes `opts.abort.signal` (`cascadingValidator.ts:196`). Unmount abort at `useConformanceRun.ts:349-355`. Test 7 at `cascadingValidator.test.ts:243-259`. | closed |
| T-31-02-01 | T (PHI ack key derivation mismatch UI↔cascade) | `ValidationPanel.tsx` | mitigate | `phiGateUrl` useMemo at `ValidationPanel.tsx:94-99` derives the key from `externalValidator.url` when external tier is enabled (else server `validatorUrl`). `phiAckKey(serverUrl, phiGateUrl)` at `:116-119` matches cascade read at `cascadingValidator.ts:132`. Integration Tests A/B/C at `ValidationPanel.phi-gate.integration.test.tsx:165,208,252` lock the invariant. | closed |
| T-31-02-02 | I (External-only deployment no banner → manual localStorage workaround) | `ValidationPanel.tsx` banner visibility | mitigate | `hasExternal` check at `ValidationPanel.tsx:265-268`. `requiresPhiAck = (hasRemote \|\| hasExternal) && !phiAcknowledged` at `:269`. Test A at `ValidationPanel.phi-gate.integration.test.tsx:165-206` renders external-only config and asserts banner appears. | closed |
| T-31-02-03 | R (Future refactor reintroduces key mismatch) | `ValidationPanel.tsx` | mitigate | Integration Tests A+B at `ValidationPanel.phi-gate.integration.test.tsx:165-250` use `vi.spyOn(global, 'fetch')` to assert UI-write → cascade-read contract end-to-end. CI blocks regression. | closed |
| T-31-02-04 | I (User mis-reads banner URL, acknowledges wrong tier) | `ValidationPanel.tsx` banner copy | accept | Banner displays actual `phiGateUrl` at `ValidationPanel.tsx:313-315`, i.e., the URL that will receive PHI. Residual risk (user reads inattentively) is outside the application's control. | closed |
| T-31-02-05 | D (Integration test spins up real network / slows CI) | integration test harness | accept | `vi.spyOn(global, 'fetch').mockResolvedValue(...)` at `ValidationPanel.phi-gate.integration.test.tsx:151-156` — no real network. 3 tests; expected runtime <500ms each. Negligible CI impact. | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-31-01 | T-31-01 | Local-first tool; `externalValidator.url` is user-configured in their own `settings.yaml`, same trust class as pre-existing `validation.validatorUrl`. No remote source can set the URL; no UI write-path. Anti-feature invariant preserved (no `validator.fhir.org` auto-populate). | phase planner (31-01) | 2026-04-23 |
| AR-31-02 | T-31-09 | CORS toast copy intentionally generic — references `payload.to` enum and points the user to DevTools rather than embedding the external URL or server response body. Locked under D-19. | phase planner (31-01) | 2026-04-23 |
| AR-31-03 | T-31-02-04 | Banner displays the actual URL that will receive PHI (`phiGateUrl`). Residual risk of inattentive reading lies outside application control. | phase planner (31-02) | 2026-04-23 |
| AR-31-04 | T-31-02-05 | Integration test uses `vi.spyOn(global, 'fetch')` — fully mocked. CI cost is negligible (3 tests × <500ms). | phase planner (31-02) | 2026-04-23 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-04-23 | 15 | 15 | 0 | gsd-security-auditor (sonnet) |

### Security Audit 2026-04-23

| Metric | Count |
|--------|-------|
| Threats found | 15 |
| Closed | 15 |
| Open | 0 |

Auditor verdict: `## SECURED`. All mitigate threats cite file:line evidence in src tree and named tests; all accept threats cite PLAN.md rationale. No unregistered flags. Read-only audit — no implementation files modified.

Key verification confirmations:
- `grep "quality.validation.phiAcknowledged.v1"` — 1 match (`phiGate.ts:18`); single-source key preserved.
- `grep "options?: { signal"` in `types.ts` — 1 match (`:113`); D-20 widening present.
- `grep "signal"` in `remoteValidator.ts` — 3 matches; server-tier signal threading wired.
- `ls fixtures/normalizers/*.json` — 3 files (hapi / firely / ig-publisher); schema-drift coverage locked.
- AbortController unmount cleanup confirmed at `useConformanceRun.ts:349-355`.

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-04-23
