---
phase: 43
slug: 43-validator-hardening-auth-semantic-near-miss-val-06-val-07
status: blocked
created: 2026-04-30
covers: [VAL-06-UAT, VAL-07-UAT]
roadmap_success_criterion: "ROADMAP §43 SC #4 — Live-Blaze UAT confirms (a) basic-auth-protected validator URL succeeds with auth: basic banner; (b) bearer-token-protected validator URL succeeds with auth: bearer banner; (c) deliberately-invalid SNOMED code surfaces ≥1 near-miss suggestion in ResourceIssueTable."
blocked_reason: "Live-Blaze infrastructure (basic-auth-protected validator, bearer-token validator, deliberately-invalid SNOMED resource) is not available in this auto-mode execution chain. Scaffold is complete and ready for human-tester walk via /gsd-verify-work 43; flip status to passed / partially-passed once cases run."
deferral_target: "Human tester walk via /gsd-verify-work 43 (next manual session)"
---

# Phase 43 — Human UAT (Live Blaze)

> Manual smoke test against a running Blaze + a real protected external validator + a configured terminology server. Run AFTER 43-02 lands. Record results inline; do NOT split into a separate VERIFICATION.md.

## Prerequisites

- [ ] Blaze running locally (or reachable via `settings.yaml` URL) with a Synthea cohort loaded.
- [ ] At least one external FHIR validator instance available with HTTP Basic auth (any HAPI behind nginx `auth_basic` or org instance).
- [ ] At least one external FHIR validator instance available with Bearer token auth (Firely Server with API key, IG-Publisher Wrapper, or org instance).
- [ ] A configured terminology server (e.g. CSIRO Ontoserver SNOMED CT R4 sandbox or org Ontoserver) reachable via `settings.terminology.serverUrl`.
- [ ] A test resource (Condition, Observation, etc.) carrying a deliberately-invalid SNOMED code (e.g. via direct FHIR PUT of `99999999999` or a deprecated/retired SNOMED code that the validator will flag as `code-invalid`).
- [ ] `npm run dev` running and reachable in a browser.
- [ ] Browser DevTools Network tab open to observe outbound `$validate` POSTs and `$lookup` GETs; Application tab open to inspect Local Storage.
- [ ] FHIR Exploder built from a HEAD that contains commits for Plan 43-01 + Plan 43-02 (full Phase 43 GREEN).

---

## Test Cases

### Case A — Basic-auth-protected validator URL (VAL-06, ROADMAP §43 SC #4 [a])

**Goal:** Confirm that Authorization: Basic header injection works against a real protected validator.

#### A.1 — Positive (correct credentials)

Steps:

1. Stand up a basic-auth-protected validator (HAPI behind `nginx auth_basic`, or any org instance).
2. Edit `settings.yaml`:
   ```yaml
   validation:
     externalValidator:
       url: https://your-protected-validator.example/fhir/$validate
       enabled: true
       timeoutMs: 15000
       auth:
         type: basic
         username: <your-username>
         password: <your-password>
   ```
3. Restart the dev server (`npm run dev`).
4. Open the app → Quality → Validation → click "Validate Sample".
5. Observe the active-strategy banner, the auth banner, and the outgoing POST in the Network tab.
6. Confirm via DevTools → Application → Local Storage that `validator.bearerToken.v1` is NOT set (basic auth doesn't use it).

Expected:

- Active strategy banner reads `external` (NOT `server`).
- Auth banner reads `auth: basic`.
- Network tab shows `Authorization: Basic <base64>` header on the outgoing POST to the validator URL.
- Validator responds 200; issues populate.
- `validator.bearerToken.v1` is absent from Local Storage.

**Pass/Fail:** _________________

**Observed banner text:** _________________

**Network header (sanitized):** _________________

**Notes:** _________________

#### A.2 — Negative (wrong password)

Steps:

1. Edit `settings.yaml` and replace `password` with an incorrect value.
2. Restart dev server.
3. Click "Validate Sample".

Expected:

- Auth banner reads `auth: basic — failed (server fallback)`.
- Active strategy reads `server`.
- No credential strings appear in any console log or notify payload.

**Pass/Fail:** _________________

**Notes:** _________________

---

### Case B — Bearer-token-protected validator URL (VAL-06, ROADMAP §43 SC #4 [b])

**Goal:** Confirm that Authorization: Bearer header injection works, the modal stores tokens in localStorage only, and probe-cache invalidation triggers on token rotation (T-43-04).

#### B.1 — Modal save + positive validate

Steps:

1. Configure a bearer-protected validator (Firely Server with API key, or IG-Publisher Wrapper bearer token).
2. Edit `settings.yaml`:
   ```yaml
   validation:
     externalValidator:
       url: https://your-bearer-validator.example/fhir/$validate
       enabled: true
       timeoutMs: 15000
       auth:
         type: bearer
   ```
   (Note: NO `password` / `token` field — bearer tokens go via the modal.)
3. Restart dev server. Open app → Settings → in the validator section, click **"Set bearer token"**.
4. The new `ValidatorAuthSettingsModal` opens. Enter your org-issued bearer token in the masked PasswordInput. Click **Save**.
5. Confirm Mantine notification "Token saved". Modal closes.
6. DevTools → Application → Local Storage shows `validator.bearerToken.v1` populated.
7. Open Quality → Validation → click "Validate Sample".

Expected:

- Active strategy banner reads `external`.
- Auth banner reads `auth: bearer`.
- Network tab shows `Authorization: Bearer <token>` header.
- Validator responds 200; issues populate.

**Pass/Fail:** _________________

**Observed banner text:** _________________

**Network header (sanitized):** _________________

**Notes:** _________________

#### B.2 — Token-missing demote

Steps:

1. Open the modal → click **Clear token** → confirm `validator.bearerToken.v1` is removed from Local Storage.
2. Click "Validate Sample".

Expected:

- Auth banner reads `auth: bearer (token missing — set in Settings)`.
- Cascade demotes to server tier (no Bearer header on outgoing POST — confirm via Network tab).

**Pass/Fail:** _________________

**Notes:** _________________

#### B.3 — Token rotation (T-43-04 probe-cache invalidation)

Steps:

1. Re-enter a valid bearer token via the modal → Save.
2. Click "Validate Sample" once → confirm cascade re-probes the external tier (NOT stuck on server tier from the previous demote).
3. Open the modal again, change the token to a new (still-valid) value → Save.
4. Click "Validate Sample" once more → confirm the NEW token is sent in the Authorization header.

Expected:

- After rotation, a fresh probe to the external tier occurs (no stale server-tier cache).
- The new token (not the old one) is sent in the next Authorization header.

**Pass/Fail:** _________________

**Notes:** _________________

---

### Case C — Deliberately-invalid SNOMED code surfaces ≥1 near-miss (VAL-07, ROADMAP §43 SC #4 [c])

**Goal:** Confirm that the semantic near-miss walker walks SNOMED CT / ICD-10 hierarchies via `$lookup`, surfaces parent / child suggestions inline in `ResourceIssueTable`, and silently drops to no suggestions when the terminology server is unavailable.

#### C.1 — Opt-in ON, real terminology server, invalid SNOMED code

Steps:

1. Configure a Synthea (or any) FHIR server with a Patient that has a Condition.code carrying a SNOMED code that's known to be invalid OR malformed (e.g., manually edit a Condition resource via the API to use SNOMED `99999999999` or a deprecated code that the validator will flag as `code-invalid`).
2. Edit `settings.yaml`:
   ```yaml
   terminology:
     serverUrl: https://r4.ontoserver.csiro.au/fhir   # or your org Ontoserver
   validation:
     externalValidator:
       url: https://your-validator.example/fhir/$validate
       enabled: true
       timeoutMs: 15000
       semanticNearMisses: true   # <-- opt-in
   ```
3. Restart dev server. Open Quality → Validation → click "Validate Sample".
4. Locate the row for the invalid SNOMED code in the issue table → it should be a `code-invalid` issue.
5. Click the chevron at the start of that row.

Expected:

- The invalid SNOMED code appears as a `code-invalid` issue in `ResourceIssueTable`.
- A chevron icon appears at the start of that row.
- Clicking the chevron opens an inline `<Collapse>` with a small table: columns `Display | Code | Relation`.
- At least 1 suggestion row appears (parent or child concept from SNOMED).
- Hover over the Display cell → tooltip shows full SNOMED display + system URL.
- Striped rows in the parent table do NOT visibly shift when the Collapse expands (Pitfall 6).

**Pass/Fail:** _________________

**Observed suggestion count:** _________________

**Sample suggestion (display + relation):** _________________

**Notes:** _________________

#### C.2 — Default-off (semanticNearMisses: false)

Steps:

1. Edit `settings.yaml` and set `validation.externalValidator.semanticNearMisses: false` (or remove the field entirely).
2. Restart dev server. Click "Validate Sample".
3. Inspect the same `code-invalid` row that surfaced suggestions in C.1.

Expected:

- NO chevron appears on any row, even on `code-invalid` issues.
- NO inline Collapse row in the DOM (`document.querySelector('[data-collapse-row="true"]')` returns null in DevTools).
- DevTools Network tab shows ZERO `CodeSystem/$lookup` GETs (walker never invoked).

**Pass/Fail:** _________________

**Notes:** _________________

#### C.3 — Terminology server unavailable (D-12 silent fallback)

Steps:

1. Re-enable `semanticNearMisses: true`.
2. Stop the terminology server, OR point `terminology.serverUrl` to an unreachable URL.
3. Restart dev server. Click "Validate Sample".

Expected:

- The `code-invalid` issue still appears in the table.
- NO chevron on the row (walker returned `[]` silently).
- NO error toast or console error visible to the user.
- DevTools Network tab MAY show one or more failed `$lookup` requests; the walker's try/catch swallows them.

**Pass/Fail:** _________________

**Notes:** _________________

---

## Sign-Off

- [ ] Case A.1 + A.2 pass (basic auth + negative).
- [ ] Case B.1 + B.2 + B.3 pass (bearer + token-missing + rotation).
- [ ] Case C.1 + C.2 + C.3 pass (near-miss + default-off + silent fallback).
- [ ] No console errors during the walks.
- [ ] No Mantine / React warnings introduced.
- [ ] No real tokens, passwords, or PII appear in the recorded evidence.

**Tester:** _________________

**Date:** _________________

**Blaze instance:** _________________

**Validator instance(s) used (sanitized URLs):** _________________

**Terminology server used:** _________________

**Patient/Resource ID(s) used:** _________________

## Status

`status: scaffolded` — flip to `status: passed` when all 8 sub-cases checked off, OR `status: partially-passed` (with rationale) OR `status: blocked` (with rationale and deferral target — typical when no protected validator instance is available locally).
