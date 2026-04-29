# Phase 43: Validator Hardening — Auth + Semantic Near-Miss (VAL-06 + VAL-07) - Research

**Researched:** 2026-04-29
**Domain:** External validator cascade extension (auth header injection + SNOMED CT / ICD-10 hierarchy walking)
**Confidence:** HIGH (codebase verified at file:line; standards verified against existing patterns)

## Summary

Phase 43 extends the Phase 31 cascade in two well-bounded ways. CONTEXT.md locks 18 D-XX decisions, so this research is implementation-path-focused rather than design-exploration. The decision space narrows to: where does header injection plug in (after PHI gate, before AbortController, line 136 of `cascadingValidator.ts`), where does the schema land (`AppSettings.validation.externalValidator.auth` + `.semanticNearMisses` in `src/config/types.ts`), and which existing primitives must be reused (`TerminologyResolver` + `TerminologyCache` for the `$lookup` graph walker; `TerminologySettingsModal.tsx` as the structural template for `ValidatorAuthSettingsModal.tsx`; `ResourceIssueTable.tsx` as the host for inline expandable suggestion rows).

Two new `notify` event kinds extend the existing `'timeout' | 'cors' | 'demote'` union: `'auth-missing'` (bearer required but absent) and `'auth-failed'` (401/403 from validator). Both demote to server tier following Phase 31's pattern. The `code-invalid` taxonomy exists in `OperationOutcome.issue.code` (FHIR R4 issue-type valueset) and is **already passed through** by `normalizers.ts:36` — the description string contains `${issue.code} -- ${issue.diagnostics}`. Phase 43 must extend the normalizer to attach the original `code` value (not just the prefixed string) so the suggestion walker can predicate on `issue.code === 'code-invalid'`.

**Primary recommendation:** No new dependencies. Reuse `TerminologyResolver.lookupDisplay` infrastructure (it already wraps `MedplumClient.get('CodeSystem/$lookup?...')` with caching and graceful fallback) — the new walker module wraps the same client with `property=parent` / `property=child` query params and BFS-bounded traversal.

## User Constraints (from CONTEXT.md)

### Locked Decisions

**G-01 Authentication Scheme & Storage**
- **D-01:** Extend `externalValidator` in `src/config/types.ts` with optional `auth?: { type: 'basic' | 'bearer'; username?: string; password?: string }`. **Bearer tokens are NEVER stored in this object.** Basic auth keeps `username` + `password` as plaintext fields in `settings.yaml`. At fetch time, basic credentials are encoded to `btoa(`${username}:${password}`)` once per request (no caching of the encoded form).
- **D-02:** Bearer tokens load from `localStorage` under the key `validator.bearerToken.v1`. The cascade reads the key once per `tryExternal` call. If `auth.type === 'bearer'` and the key is missing/empty, the cascade demotes to server-tier validation with a notify event `auth-missing` (new event). Banner copy in `ValidationPanel` reflects "auth: bearer (token missing — set in Settings)" when this state is hit.
- **D-03:** Bearer-token entry UI lives in **a new `ValidatorAuthSettingsModal.tsx`** that mirrors `src/components/settings/TerminologySettingsModal.tsx`. Opens from a "Set bearer token" button in `SettingsPage.tsx`'s validator section. The modal: (1) shows the active validator URL, (2) accepts the token in a `<PasswordInput>`, (3) writes to `localStorage` on save, (4) provides a "Clear token" action. Does NOT roundtrip through `settings.yaml`.

**G-02 Header Injection Path**
- **D-04:** In `cascadingValidator.tryExternal`, build `Authorization` header AFTER the PHI gate (`isPhiAcknowledged()`), BEFORE `AbortController` allocation, BEFORE `fetch()`. Header built locally — never stored on the validator-options object so credentials never leak through `notify` event payloads.
- **D-05:** Header format:
  - `Basic`: `Authorization: Basic ${btoa(`${username}:${password}`)}`
  - `Bearer`: `Authorization: Bearer ${token}` (token raw)

**G-03 Semantic Near-Miss — Endpoint & Walk**
- **D-07:** Use the configured terminology server's `$lookup` operation with `property=parent` and `property=child` for SNOMED CT / ICD-10 hierarchical walking. Reuses Phase 4's `TerminologyResolver`/`TerminologyCache` (LRU cache, graceful fallback). NOT `$expand`.
- **D-08:** Walk depth = 3 hard-cap. Implementation: BFS with a per-node visited set; abort early if total node count > 50.
- **D-09:** Suggestion ordering: ancestors first (broader → more specific), then descendants. Cap at top 10. Tie-break by alphabetical display.

**G-04 "Did You Mean?" UI**
- **D-10:** Surface suggestions as **inline expandable rows** below the offending issue row in `ResourceIssueTable.tsx`. Row shows a `<Mantine.Collapse>` with a small table: `Code | Display | Relation (parent/child/sibling)`. `<Tooltip>` on each row preview shows full SNOMED display + system URL.
- **D-11:** When `semanticNearMisses: false` (default), the suggestion row is NOT rendered AT ALL. Toggling it on requires editing `settings.yaml` (no UI control in v1.6).

**G-05 Failure Modes**
- **D-12:** Terminology server unavailable → silent fallback (no suggestion shown, no error to user).
- **D-13:** Authentication failure (401/403) → demote to server-tier with `notify('auth-failed', { tier: 'external' })`. Active-strategy banner reflects "auth: <type> — failed (server fallback)".
- **D-14:** Bearer token clear-on-tab-close: NO. Token persists in `localStorage` until explicitly cleared via the modal.

**G-06 Test Approach**
- **D-15:** Unit tests use `vi.spyOn(globalThis, 'fetch')` to assert Authorization header presence. NO new test framework dependencies (no `msw`).
- **D-16:** PHI gate test extends `ValidationPanel.phi-gate.integration.test.tsx` with auth-without-PHI: PHI not acknowledged → no Authorization header attempted.
- **D-17:** Semantic near-miss tests use a fixture `OperationOutcome` with `code-invalid` + `vi.spyOn` on terminology fetch returning canned `$lookup` responses. Assert: ancestors+descendants surfaced, capped at 10, ordering correct, depth=3 cap respected.
- **D-18:** Live-Blaze UAT (43-HUMAN-UAT.md) scaffold mirrors Phase 42's pattern (`status: scaffolded`, 3 cases per ROADMAP SC #4).

### Claude's Discretion
- **D-06:** Probe cache key includes auth state? **NO** (`${serverUrl}::${externalValidatorUrl}::${resourceType}` unchanged). Acceptable trade-off in local-tool threat model.
- **D-19:** Mantine component for token entry — `PasswordInput` recommended.
- **D-20:** Suggestion table column order — keep readable; recommend `Display | Code | Relation`.
- **D-21:** Whether to log `auth.type` to `notify` events for telemetry — **YES, NO credentials**.

### Deferred Ideas (OUT OF SCOPE)
- OAuth 2.0 / OIDC / mTLS — out of scope for VAL-06.
- Configurable depth (`semanticNearMisses.maxDepth`) — backlog.
- UI toggle for `semanticNearMisses` — defer until user feedback.
- Multi-user shared-machine token rotation — defer.
- Auth state in probe cache key — defer.
- `$expand`-based suggestions for ValueSets — orthogonal.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **VAL-06** | External validator HTTP tier supports HTTP Basic and Bearer authentication. `validation.externalValidator.auth: { type, credentials }` schema added to `settings.yaml`; `cascadingValidator.tryExternal` injects `Authorization` header before fetch. Bearer tokens stored in `localStorage` under new `validator.bearerToken.v1` key. Banner copy in `ValidationPanel` reflects auth in use. | Schema extension point: `src/config/types.ts:34-40` (`externalValidator` block). Header injection point: `cascadingValidator.ts:131-138` (between PHI gate at line 132 and AbortController at line 136). Banner update point: `ValidationPanel.tsx:475-479` (Active strategy line). |
| **VAL-07** | Semantic near-miss detection. When `OperationOutcome.issue` carries `code-invalid`, walk SNOMED CT / ICD-10 ancestors+descendants up to depth 3 via terminology server. Surfaces "Did you mean?" rows in issue panel. Opt-in via `validation.externalValidator.semanticNearMisses: boolean` (default false). | Walker: new file `src/quality/semanticNearMissWalker.ts` reusing `TerminologyResolver` + `TerminologyCache`. Normalizer extension: `normalizers.ts:21-39` — extend `NormalizedIssue` (`src/quality/types.ts:95-101`) with optional `code?: string` field (raw FHIR `issue.code`) so the walker can predicate. UI host: `ResourceIssueTable.tsx:174-211` (drill-down rows below issue rows). |

## Project Constraints (from CLAUDE.md)

| Constraint | Phase 43 Implication |
|------------|----------------------|
| **React 18.3.x** (not 19) | Confirms `useState`/`useCallback` patterns; no `use()` hook. |
| **TypeScript 5.7.x** | Type extension on `AppSettings` must be strict-null-clean (`tsc -b --noEmit`). |
| **Mantine 8.3.18** | `<PasswordInput>`, `<Modal>`, `<Collapse>`, `<Tooltip>` all available. NO Mantine 9 features. |
| **@medplum/core 5.1.7** | `MedplumClient.get('CodeSystem/$lookup?...')` is the access path — already used by `TerminologyResolver.fetchLookup`. |
| **No TanStack Query** | Cache reuse strategy: `TerminologyCache` (already in `src/terminology/TerminologyCache.ts`). |
| **No Tailwind** | Inline styles + Mantine theme tokens for the dimmed/expand row chrome. |
| **No SMART on FHIR libraries** | Confirms basic+bearer manual implementation; no auth library. |
| **license MIT** | New files under same license; LICENSE/NOTICE need no update for this phase. |
| **GSD Workflow Enforcement** | Plan/execute via `/gsd-execute-phase 43` after this RESEARCH.md commits. |

## Standard Stack

### Core (verified, already in `package.json`)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@mantine/core` | ^8.3.18 | `PasswordInput`, `Modal`, `Collapse`, `Tooltip`, `Table`, `Stack`, `Group`, `Button`, `TextInput`, `Badge`, `Code`, `Anchor` | Locked peer dep of `@medplum/react` 5.x; cannot upgrade until Phase 45. **[VERIFIED: package.json:contains "@mantine/core": "^8.3.18"]** |
| `@mantine/hooks` | ^8.3.18 | `useDisclosure` for modal open/close state | Already used by `TerminologySettingsModal.tsx` (referenced indirectly via `useState` there — but `useDisclosure` is the modal idiom in Phase 33+). **[VERIFIED: package.json]** |
| `@mantine/notifications` | ^8.3.18 | Notifications for token save / clear feedback | Already used in `SettingsPage.tsx:24,127`. **[VERIFIED: package.json]** |
| `@medplum/core` | ^5.1.7 | `MedplumClient.get()` for `CodeSystem/$lookup` | Already used by `TerminologyResolver.fetchLookup` at `TerminologyResolver.ts:164-167`. **[VERIFIED: package.json + src/terminology/TerminologyResolver.ts]** |
| `@medplum/fhirtypes` | ^5.1.7 | `Parameters`, `OperationOutcomeIssue`, `Coding`, `OperationOutcome` types | Already used in normalizers and resolver. **[VERIFIED: package.json + multiple imports]** |
| `vitest` | ^4.1.4 | Test framework with `vi.spyOn(globalThis, 'fetch')` | Existing test infra (`cascadingValidator.test.ts`). **[VERIFIED: package.json]** |

### NO new dependencies
Per CONTEXT.md `<specifics>`: "No new external dependencies. Stay within Mantine 8 + Medplum 5 + js-yaml. The graph walker is plain TS." **[CITED: 43-CONTEXT.md `<specifics>`]**

### Alternatives Considered (and rejected)
| Instead of | Could Use | Tradeoff (rejected because) |
|------------|-----------|----------------------------|
| Manual `btoa()` for basic auth | `Buffer.from(...).toString('base64')` | Only works in Node, not browser. `btoa` is the browser idiom; works under jsdom for tests. **[VERIFIED: MDN — `btoa` is in WindowOrWorkerGlobalScope]** |
| BFS walker via in-memory promise tree | TanStack Query / SWR | Locked out by CLAUDE.md "Do NOT Use TanStack Query". `TerminologyCache` already de-dupes inflight via `inflight` Map at `TerminologyResolver.ts:63`. |
| `$expand` of a derived ValueSet | `$lookup` with `property=parent`/`child` | `$expand` is for ValueSets, not arbitrary CodeSystem hierarchy. SC #3 explicitly says SNOMED CT / ICD-10 hierarchy walking. **[CITED: D-07; HL7 FHIR R4 §5.5.1]** |
| `msw` for header assertion | `vi.spyOn(globalThis, 'fetch')` | Locked by D-15. Existing pattern in `cascadingValidator.test.ts:78,139,177`. |

**Installation:** No new packages.

**Version verification (run before any code edit):**
```bash
npm view @mantine/core version    # should match ^8.3.18 lock
npm view @medplum/core version    # should match ^5.1.7 lock
```
Skip if no upstream pinning is suspected; the lock file (`package-lock.json`) is the source of truth.

## Architecture Patterns

### Existing Project Structure (relevant subset)
```
src/
├── config/
│   ├── types.ts                     # AppSettings interface — add auth + semanticNearMisses here
│   └── settings.ts                  # YAML loader with field-level narrowing
├── components/
│   ├── settings/
│   │   ├── SettingsPage.tsx         # add ValidatorAuthSettingsModal trigger
│   │   ├── TerminologySettingsModal.tsx  # STRUCTURAL TEMPLATE for new modal
│   │   └── (NEW) ValidatorAuthSettingsModal.tsx
│   └── quality/
│       ├── ValidationPanel.tsx      # banner copy update (auth state)
│       ├── ResourceIssueTable.tsx   # add Collapse rows below issue rows
│       └── DrillDownShell.tsx       # (reference; not modified — used by drilldowns, not panel)
├── quality/
│   ├── cascadingValidator.ts        # extend tryExternal with Authorization injection
│   ├── normalizers.ts               # extend NormalizedIssue with raw `code` field
│   ├── types.ts                     # extend NormalizedIssue interface (add `code?: string`)
│   ├── (NEW) semanticNearMissWalker.ts  # SNOMED/ICD-10 BFS via $lookup
│   └── __tests__/
│       └── cascadingValidator.test.ts  # extend with auth + walker tests
└── terminology/
    ├── TerminologyResolver.ts       # REUSE for $lookup access pattern
    ├── TerminologyCache.ts          # REUSE LRU cache (already shared via singleton)
    └── terminologyClient.ts         # REUSE — `createTerminologyClient(settings)`
```

### Pattern 1: Header Injection in `tryExternal`
**What:** Add a single `Authorization` header to the existing `fetch()` call, gated by D-04 ordering.
**When to use:** Phase 43 wave 1 (VAL-06).
**Example:**
```typescript
// Source: existing cascadingValidator.ts:124-185, line numbers cited as live targets
async function tryExternal(
  resource: Resource,
  opts: CascadeOptions,
): Promise<OperationOutcomeIssue[] | null> {
  const ext = opts.externalValidator;
  if (!ext || !ext.enabled || !ext.url) return null;

  // PHI GATE — line 132 (UNCHANGED, MUST run BEFORE auth)
  if (!isPhiAcknowledged(opts.serverUrl, ext.url)) return null;

  // NEW: Build Authorization header (D-04 — AFTER PHI gate, BEFORE AbortController)
  let authHeader: string | null = null;
  if (ext.auth?.type === 'basic' && ext.auth.username && ext.auth.password) {
    authHeader = `Basic ${btoa(`${ext.auth.username}:${ext.auth.password}`)}`;
  } else if (ext.auth?.type === 'bearer') {
    const token = readBearerTokenFromLocalStorage(); // 'validator.bearerToken.v1'
    if (!token) {
      opts.notify?.('auth-missing', { from: 'external', to: 'server' });
      return null;  // demote (D-02)
    }
    authHeader = `Bearer ${token}`;
  }

  // EXISTING — line 136 onward (UNCHANGED)
  const timeoutController = new AbortController();
  // ...
  const headers: Record<string, string> = { 'Content-Type': 'application/fhir+json' };
  if (authHeader) headers.Authorization = authHeader;
  const res = await fetch(url, { method: 'POST', headers, body: ..., signal: timeoutController.signal });

  if (res.status === 401 || res.status === 403) {
    opts.notify?.('auth-failed', { from: 'external', to: 'server' });
    return null;
  }
  // ... rest unchanged
}
```

### Pattern 2: Bearer-Token Modal (mirror of TerminologySettingsModal)
**What:** Mantine `<Modal>` with `<PasswordInput>` for token entry, `<Button>` Save / Cancel / Clear.
**When to use:** Phase 43 wave 1.
**Example:**
```typescript
// Source: src/components/settings/TerminologySettingsModal.tsx (entire file, ~60 lines)
// Adapt by replacing:
//   - useSettings/setSettings (terminology.serverUrl) with localStorage setItem('validator.bearerToken.v1', token)
//   - <TextInput> with <PasswordInput>
//   - "Server URL" label with "Bearer Token" label
//   - Add a third button: <Button color="red" variant="subtle" onClick={handleClear}>Clear token</Button>
import { useState, useEffect, useCallback } from 'react';
import { Button, Group, Modal, Stack, PasswordInput, Text, Code } from '@mantine/core';
import { IconShield } from '@tabler/icons-react';

const VALIDATOR_BEARER_TOKEN_KEY = 'validator.bearerToken.v1';  // EXACT key per CONTEXT.md D-02

export function ValidatorAuthSettingsModal({ opened, onClose, validatorUrl }: Props) {
  const [token, setToken] = useState('');
  useEffect(() => {
    if (opened) setToken(window.localStorage.getItem(VALIDATOR_BEARER_TOKEN_KEY) ?? '');
  }, [opened]);
  const handleSave = useCallback(() => {
    if (token) window.localStorage.setItem(VALIDATOR_BEARER_TOKEN_KEY, token);
    else window.localStorage.removeItem(VALIDATOR_BEARER_TOKEN_KEY);
    onClose();
  }, [token, onClose]);
  const handleClear = useCallback(() => {
    window.localStorage.removeItem(VALIDATOR_BEARER_TOKEN_KEY);
    setToken('');
  }, []);
  return (
    <Modal opened={opened} onClose={onClose} title={<Group gap="xs"><IconShield size={20}/>Validator Bearer Token</Group>} centered size="md">
      <Stack gap="md">
        <Text size="sm" c="dimmed">Validator URL: <Code>{validatorUrl}</Code></Text>
        <PasswordInput label="Bearer Token" value={token} onChange={(e) => setToken(e.currentTarget.value)} />
        <Group justify="space-between">
          <Button color="red" variant="subtle" onClick={handleClear}>Clear token</Button>
          <Group>
            <Button variant="default" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}
```

### Pattern 3: $lookup Graph Walker (BFS bounded)
**What:** Reuse `TerminologyResolver` infrastructure to walk SNOMED CT / ICD-10 hierarchies.
**When to use:** Phase 43 wave 2 (VAL-07).
**Example:**
```typescript
// Source: src/terminology/TerminologyResolver.ts:149-183 — wraps MedplumClient.get('CodeSystem/$lookup?...')
// New file: src/quality/semanticNearMissWalker.ts
import type { Parameters, ParametersParameter } from '@medplum/fhirtypes';
import type { TerminologyResolver } from '../terminology/TerminologyResolver';

export interface NearMissSuggestion {
  system: string;
  code: string;
  display: string;
  relation: 'parent' | 'child' | 'sibling';
  depth: number;
}

const MAX_DEPTH = 3;          // D-08 hard-cap
const MAX_NODES = 50;         // D-08 defense-in-depth
const MAX_SUGGESTIONS = 10;   // D-09

interface WalkNode {
  system: string;
  code: string;
  depth: number;
  relation: 'parent' | 'child';
}

export async function walkNearMisses(
  system: string,
  invalidCode: string,
  resolver: TerminologyResolver,
): Promise<NearMissSuggestion[]> {
  if (!resolver.client) return [];                          // D-12 silent fallback

  const visited = new Set<string>();                        // `${system}|${code}` keys
  const queue: WalkNode[] = [];
  const ancestors: NearMissSuggestion[] = [];               // D-09: ancestors first
  const descendants: NearMissSuggestion[] = [];

  // Step 1: $lookup the invalid code itself to seed parents+children
  const seedParams = await fetchLookupWithProperties(resolver, system, invalidCode, ['parent', 'child']);
  if (!seedParams) return [];

  for (const { value, role } of extractRelations(seedParams)) {
    const key = `${system}|${value}`;
    if (visited.has(key)) continue;
    visited.add(key);
    queue.push({ system, code: value, depth: 1, relation: role });
  }

  let totalNodes = 1;
  while (queue.length && totalNodes < MAX_NODES) {
    const node = queue.shift()!;
    const display = await resolver.lookupDisplay(node.system, node.code);  // reuses LRU cache
    const suggestion: NearMissSuggestion = {
      system: node.system, code: node.code,
      display: display ?? node.code,
      relation: node.relation, depth: node.depth,
    };
    if (node.relation === 'parent') ancestors.push(suggestion);
    else descendants.push(suggestion);

    totalNodes++;
    if (node.depth >= MAX_DEPTH) continue;

    const childParams = await fetchLookupWithProperties(resolver, node.system, node.code, [node.relation]);
    if (!childParams) continue;
    for (const { value, role } of extractRelations(childParams)) {
      const key = `${node.system}|${value}`;
      if (visited.has(key)) continue;
      if (role !== node.relation) continue;  // stay on the same axis (parents-only or children-only per branch)
      visited.add(key);
      queue.push({ system: node.system, code: value, depth: node.depth + 1, relation: node.relation });
    }
  }

  // D-09: ancestors first (broader → specific), then descendants. Tie-break by display alpha.
  ancestors.sort((a, b) => a.depth - b.depth || a.display.localeCompare(b.display));
  descendants.sort((a, b) => a.depth - b.depth || a.display.localeCompare(b.display));
  return [...ancestors, ...descendants].slice(0, MAX_SUGGESTIONS);
}

// Extract parent/child Coding values from a $lookup Parameters response
function extractRelations(p: Parameters): Array<{ value: string; role: 'parent' | 'child' }> {
  const out: Array<{ value: string; role: 'parent' | 'child' }> = [];
  for (const prop of p.parameter ?? []) {
    if (prop.name !== 'property') continue;
    const codePart = prop.part?.find((q) => q.name === 'code')?.valueCode;
    const valuePart = prop.part?.find((q) => q.name === 'value')?.valueCode
      ?? prop.part?.find((q) => q.name === 'value')?.valueString;
    if ((codePart === 'parent' || codePart === 'child') && valuePart) {
      out.push({ value: valuePart, role: codePart });
    }
  }
  return out;
}

async function fetchLookupWithProperties(
  resolver: TerminologyResolver,
  system: string,
  code: string,
  properties: ('parent' | 'child')[],
): Promise<Parameters | null> {
  if (!resolver.client) return null;
  try {
    const qs = new URLSearchParams({ system, code });
    for (const p of properties) qs.append('property', p);
    const result = await resolver.client.get<Parameters>(
      `CodeSystem/$lookup?${qs.toString()}`,
    );
    return result;
  } catch {
    return null;  // D-12 silent fallback
  }
}
```

### Pattern 4: Inline Expandable Suggestion Rows in `ResourceIssueTable`
**What:** Add a `<Mantine.Collapse>` row beneath each issue row whose `code === 'code-invalid'`, gated by `semanticNearMisses` setting.
**When to use:** Phase 43 wave 2.
**Example:**
```tsx
// Source: src/components/quality/ResourceIssueTable.tsx:174-211 — current row render
// Pattern: Each <Table.Tr> for an issue is followed by a second <Table.Tr> with colSpan=5 wrapping a <Mantine.Collapse>
import { Collapse, ActionIcon, Tooltip } from '@mantine/core';
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import { useState } from 'react';

// In ResourceIssueTable component:
const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
// ... per issue iter:
const isExpandable = issue.code === 'code-invalid' && suggestions.has(issue.resourceId + '|' + issue.field);
const rowKey = `${issue.resourceId}|${issue.field}|${i}`;
const isOpen = expandedRows.has(rowKey);

return (
  <Fragment key={rowKey}>
    <Table.Tr>
      <Table.Td>{rowNum}</Table.Td>
      <Table.Td>
        {isExpandable && (
          <ActionIcon size="xs" variant="subtle" onClick={() => toggleRow(rowKey)} aria-label="Show suggestions">
            {isOpen ? <IconChevronDown size={14}/> : <IconChevronRight size={14}/>}
          </ActionIcon>
        )}
      </Table.Td>
      {/* ...other cells... */}
    </Table.Tr>
    {isExpandable && (
      <Table.Tr>
        <Table.Td colSpan={5} style={{ padding: 0 }}>
          <Collapse in={isOpen}>
            <SuggestionTable suggestions={suggestions.get(rowKey) ?? []} />
          </Collapse>
        </Table.Td>
      </Table.Tr>
    )}
  </Fragment>
);
```

### Anti-Patterns to Avoid
- **Storing the encoded basic-auth header in state.** Re-encode every fetch. Otherwise the credential lives in React-fiber state where dev tools can read it. **[CITED: D-01 — "no caching of the encoded form"]**
- **Reading bearer token at module init.** Read on every `tryExternal` call. The user can clear/rotate the token mid-session via the modal. **[CITED: D-02 — "reads the key once per `tryExternal` call"]**
- **Storing bearer in `settings.yaml` as a fallback.** Explicit anti-rule from D-01. The schema must reject `auth.token` as a field. The schema validator in `settings.ts` should silently drop any `auth.type === 'bearer'` `password`/`token`/`credentials` fields if they appear in YAML.
- **Putting the auth header build inside a `try{}` that swallows TypeError.** The CORS heuristic at `cascadingValidator.ts:162` distinguishes TypeError from caller-abort. Header build cannot throw under normal browser conditions, but defensive: build the string OUTSIDE the try block.
- **Walking `$lookup` recursively without a visited set.** SNOMED contains cycles via the `Is a` relationship under certain refsets. The 50-node early-abort + per-node `visited` set is non-negotiable. **[CITED: D-08]**
- **Caching auth state in the probe cache key.** D-06 explicitly excludes auth from probe key. A probe success from an unauthed session is acceptable to reuse (see CONTEXT.md rationale).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Base64 encoding | Custom alphabet table | `btoa()` | Browser global; works in jsdom for tests; RFC 7617-compliant for ASCII. **[VERIFIED: MDN, present in node-fetch's WHATWG fetch impl, exposed by happy-dom and jsdom]** |
| LRU cache for terminology lookups | Map + manual eviction loop | Reuse `TerminologyResolver` (already wraps `TerminologyCache`) | The walker calls `resolver.lookupDisplay` which already de-dupes inflight, caches results, and falls back gracefully on network errors. **[VERIFIED: src/terminology/TerminologyResolver.ts:136-147]** |
| FHIR `$lookup` HTTP wrapper | Manual `fetch()` against terminology server | `MedplumClient.get('CodeSystem/$lookup?...')` via the existing client (resolver.client) | Handles base URL + fhirUrlPath split, supports the dev Vite proxy rewrite, threads AbortSignal. **[VERIFIED: src/terminology/terminologyClient.ts:14-45]** |
| Modal state machine | Custom open/close hook | `useDisclosure()` from `@mantine/hooks` | Idiomatic Mantine pattern; one-line. **[VERIFIED: Mantine 8 docs; SettingsPage modal triggers use boolean state directly which works too]** |
| Password masking | `<input type="password">` | `<PasswordInput>` from `@mantine/core` | Includes show/hide eye toggle, accessible labels. **[VERIFIED: Mantine 8 — already used at SettingsPage.tsx:236-240,245-250]** |
| Issue normalization | New parser for OperationOutcome | Extend `normalizeOperationOutcomeIssue` | Single-source-of-truth contract. Phase 31 PITFALLS #5 explicitly forbids parallel normalizers. **[CITED: src/quality/normalizers.ts:13]** |
| BFS hierarchy walker | Recursive crawl, no visited set | Iterative BFS with `Set<string>` visited keys | Prevents infinite loops on cyclic references; depth+node caps make worst case O(50). |
| Suggestion ordering | Stable sort by `relation` | Two-list build (ancestors + descendants), each sorted by depth then display, then concatenated | D-09 ordering is non-trivial enough that a one-line `Array.sort` would be subtly wrong on tie-breaks. |

**Key insight:** Phase 43 is mostly a *composition* phase — three existing primitives (`tryExternal`, `TerminologyResolver`, `ResourceIssueTable`) are extended in well-defined ways. The only genuinely new module is `semanticNearMissWalker.ts`, which itself is a thin BFS over the existing `$lookup` capability. **[VERIFIED: codebase inspection]**

## Runtime State Inventory

> Phase 43 adds new schema and a new localStorage key. Audit each category to confirm migration impact.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| **Stored data** | None — Phase 43 introduces *new* state, doesn't migrate. The new `validator.bearerToken.v1` localStorage key is a fresh namespace; no prior data to migrate. The new `validation.externalValidator.auth` block in `settings.yaml` is additive (absent in v1.5 settings). | None — additive only. |
| **Live service config** | settings.yaml templates ship as commented examples (`public/settings.yaml`); add new commented block for `auth:` mirroring the existing `externalValidator:` block format. | Update `public/settings.yaml` with commented `auth:` template (basic example only — bearer is via UI). |
| **OS-registered state** | None — pure browser SPA, no OS hooks. | None. |
| **Secrets/env vars** | The new `validator.bearerToken.v1` localStorage key holds the bearer token. Per D-14, persists across tab close. Per CONTEXT.md `<specifics>`, plaintext basic-auth credentials in `settings.yaml` are intentional and trust-equivalent to the FHIR server URL. | None — documented and intended. README/PROJECT.md update may help disclose. |
| **Build artifacts / installed packages** | No new packages → no `node_modules` changes; no script entries. The new `ValidatorAuthSettingsModal.tsx` and `semanticNearMissWalker.ts` are pure source additions. | None. |

**Existing state preserved:** `quality.validation.phiAcknowledged.v1` (Phase 7), `quality.cohorts.v1` (Phase 21), `quality.thresholds.v1` (Phase 18), `explorer.hideEmptyResourceTypes.v1` (Phase 41), `fhirExplorer.settings.v1` (settings persistence). New key sits alongside without collision.

## Common Pitfalls

### Pitfall 1: Header injection BEFORE PHI gate (D-04 reversal)
**What goes wrong:** Refactor moves header build above the PHI gate (looks tidier — "validate inputs first"). Result: bearer token is *constructed* (i.e., read from localStorage) before the PHI gate denies, so the token sits in a JavaScript local that's visible in heap snapshots / DevTools watch expressions even though the request never fires.
**Why it happens:** The PHI gate at line 132 looks like input validation; engineers reorder for "fail fast." But D-04 fixes the order intentionally: the PHI gate is the trust boundary; nothing past line 132 should run unless the gate passes.
**How to avoid:** Lock D-04 with a code comment matching `cascadingValidator.ts:131` PHI-gate comment: `// D-04: Authorization header — built AFTER PHI gate (PITFALLS #3). NEVER move above isPhiAcknowledged().` Add a unit test: PHI not acknowledged + auth configured → assert `globalThis.fetch` was NOT called AND no `Authorization` value appears in any `fetch.mock.calls[*][1].headers`. **[VERIFIED: ValidationPanel.phi-gate.integration.test.tsx existing pattern]**
**Warning signs:** A test file gains `vi.mocked(localStorage.getItem)` calls for `validator.bearerToken.v1` BEFORE the PHI ack key is set.

### Pitfall 2: 401/403 demote loops on every resource (cache stickiness on auth)
**What goes wrong:** First resource hits external with bearer token → server returns 401 (token expired) → cascade demotes via `auth-failed`, probe cache stores `'server'` → subsequent resources go straight to server. User refreshes the token → cascade STILL goes server-tier on next run (probe cache stuck). Mirrors Phase 31 PITFALLS #4.
**Why it happens:** Probe cache wipes on settings change (D-17, `useConformanceRun.ts:130-135`), but `validator.bearerToken.v1` is NOT in `settings`. Token rotation via the modal doesn't invalidate the probe cache.
**How to avoid:** When the new `ValidatorAuthSettingsModal.handleSave` writes to localStorage, **also call `clearProbeCache(probeCacheRef.current)`**. This requires the modal to either (a) call a context-provided clear function, OR (b) emit a custom event the run hook listens for, OR (c) take the simpler-but-coarser approach: re-read `validator.bearerToken.v1` on every cascade run via a serialized dep alongside `extSerialized` at `useConformanceRun.ts:134`.
**Warning signs:** UAT case 1 pass, then deliberately invalid token → fail expected. Then valid token → still fails. (i.e., recovery doesn't work without restart).

### Pitfall 3: $lookup response shape variance across terminology servers
**What goes wrong:** `Parameters.parameter[*].part[*].name === 'value'` can carry the actual coding under `valueCode` (Ontoserver default for SNOMED), `valueString` (some HAPI configurations), or `valueCoding` (FHIR R4 spec when `valueType` is Coding). The walker's `extractRelations` only checks `valueCode` then `valueString` — it misses `valueCoding`.
**Why it happens:** FHIR R4 §5.5.1 allows multiple datatypes for `Parameters.parameter.part.value[x]`. Ontoserver and SNOMED responses commonly use `valueCode` for parent/child, but a strict-spec server might use `valueCoding` and require `.code` extraction.
**How to avoid:** In `extractRelations`, fall through valueCode → valueString → valueCoding.code. Add a unit test fixture per server variant. **[CITED: HL7 FHIR R4 §5.5.1 — `value[x]` polymorphic parameter type]**
**Warning signs:** Walker returns `[]` against a real terminology server when the unit-test fixture (using `valueCode`) returns suggestions correctly.

### Pitfall 4: Bearer token read on import (module-init race)
**What goes wrong:** Engineer adds `const TOKEN = window.localStorage.getItem(KEY);` at module top of `cascadingValidator.ts`. Token is captured at import time (i.e., page load); subsequent rotations via the modal don't propagate. Worst case: token captured before user logs in → `null` baked into the module.
**Why it happens:** Module-level constants are tempting for "read once" semantics. But localStorage is per-call cheap (synchronous read); module-init caching is anti-pattern for user-mutable storage.
**How to avoid:** Always read inside `tryExternal`. Code comment per the resolver pattern: `// Read fresh per call — user can rotate token via the Settings modal mid-session.` **[CITED: D-02]**

### Pitfall 5: `code-invalid` is the spec value but normalizers prepend it to description
**What goes wrong:** Existing `normalizers.ts:36` does `description: \`${issue.code ?? ''} -- ${issue.diagnostics ?? ...}\`` — i.e., the FHIR `issue.code` ('code-invalid') is squashed into the description string. The walker that needs `issue.code === 'code-invalid'` predicate has nothing to predicate on; the raw `code` is lost.
**Why it happens:** Phase 31 normalized for human display, not machine routing. NormalizedIssue has no `code` field.
**How to avoid:** Extend `NormalizedIssue` with `code?: string` (raw FHIR code). Extend `normalizeOperationOutcomeIssue` to populate it. Update `description` to remain the same (no UI break). **[VERIFIED: src/quality/types.ts:95-101 + src/quality/normalizers.ts:21-39]**
**Warning signs:** Walker tests pass but in production no suggestions appear; `console.log(issue)` in the UI shows `description: "code-invalid -- ..."` but no `code` field.

### Pitfall 6: Mantine `<Collapse>` inside `<Table.Td>` breaks striped/highlightOnHover
**What goes wrong:** A `<Collapse>` row inserted between issue rows breaks the striping pattern (alternating rows), and `highlightOnHover` highlights the collapse-content row distractingly.
**Why it happens:** `Table.striped` uses `:nth-child(odd)`; injecting a wrapper row offsets all subsequent stripes. Existing `ResourceIssueTable.tsx:163` uses `striped highlightOnHover stickyHeader`.
**How to avoid:** Two options:
1. Add a CSS rule to skip the collapse-row in striping: `[data-collapse-row="true"] { background: transparent; }`.
2. Render suggestion content as the FIRST cell of an OUTER container — i.e., a "row group" pattern with two divs stacked, not table rows.
Option 1 is less code; option 2 is more accessible (screen readers don't get confused about colSpan rows).
**Warning signs:** Visual regression test (if any) on `ResourceIssueTable` shows alternating stripe shift after the first expanded row.

### Pitfall 7: `validator.bearerToken.v1` accidentally serialized to `settings.yaml`
**What goes wrong:** Future refactor or "save current state to YAML" feature reads ALL localStorage keys → dumps to YAML → bearer token in YAML in a backup the user emails to support.
**Why it happens:** The localStorage key naming convention `<area>.<thing>.v<n>` is identical to other keys that DO get persisted via `fhirExplorer.settings.v1`. Without an explicit allow-list / deny-list, a "dump localStorage" path picks up the bearer token.
**How to avoid:** Add a code comment + grep-able marker on the bearer key constant: `/** SECURITY: NEVER serialize this to disk. localStorage-only. See 43-CONTEXT.md D-01/D-02. */`. Add a unit test that asserts `loadSettings()` does NOT include any `auth.token` or bearer field even if YAML contains it. **[CITED: D-01]**

## Code Examples

Verified patterns from existing source:

### Reading localStorage with safe fallback (mirror existing PHI-ack)
```typescript
// Source: src/quality/phiGate.ts:26-40
export function readBearerToken(): string | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem('validator.bearerToken.v1');
    return raw && raw.length > 0 ? raw : null;
  } catch {
    return null;
  }
}
```

### Settings YAML field-level narrowing (matches `externalValidator` pattern at `settings.ts:76-92`)
```typescript
// Source: src/config/settings.ts:76-92 — extend in the same block
let auth: { type: 'basic' | 'bearer'; username?: string; password?: string } | undefined;
if (ext.auth && typeof ext.auth === 'object') {
  const a = ext.auth as Record<string, unknown>;
  if (a.type === 'basic') {
    const u = typeof a.username === 'string' ? a.username : undefined;
    const p = typeof a.password === 'string' ? a.password : undefined;
    if (u && p) auth = { type: 'basic', username: u, password: p };
  } else if (a.type === 'bearer') {
    auth = { type: 'bearer' };  // tokens NEVER from YAML — D-01
  }
}
let semanticNearMisses = false;
if (typeof ext.semanticNearMisses === 'boolean') semanticNearMisses = ext.semanticNearMisses;
if (extUrl.length > 0) {
  externalValidator = { url: extUrl, enabled: extEnabled, timeoutMs: extTimeoutMs };
  if (extLabel) externalValidator.label = extLabel;
  if (auth) externalValidator.auth = auth;
  if (semanticNearMisses) externalValidator.semanticNearMisses = true;
}
```

### vi.spyOn header assertion (matches existing `cascadingValidator.test.ts:78,139,177`)
```typescript
// Source: src/quality/__tests__/cascadingValidator.test.ts:76-106 (Test 1 happy path)
it('Test 16 (NEW): basic auth — Authorization: Basic <base64> header injected', async () => {
  window.localStorage.setItem(phiAckKey(SERVER_URL, EXT_URL), 'true');
  const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
    new Response(JSON.stringify({ resourceType: 'OperationOutcome', issue: [] }), { status: 200 }),
  );
  const opts = buildOptions({
    externalValidator: {
      url: EXT_URL,
      enabled: true,
      timeoutMs: 15000,
      auth: { type: 'basic', username: 'alice', password: 'secret' },
    },
  });
  await validateWithCascade(buildResource(), opts);
  const headers = (fetchSpy.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
  expect(headers.Authorization).toBe(`Basic ${btoa('alice:secret')}`);
});

it('Test 17 (NEW): bearer auth — token from localStorage; missing token demotes', async () => {
  window.localStorage.setItem(phiAckKey(SERVER_URL, EXT_URL), 'true');
  window.localStorage.setItem('validator.bearerToken.v1', 'tok-abc-123');
  const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
    new Response(JSON.stringify({ resourceType: 'OperationOutcome', issue: [] }), { status: 200 }),
  );
  const opts = buildOptions({
    externalValidator: { url: EXT_URL, enabled: true, timeoutMs: 15000, auth: { type: 'bearer' } },
  });
  await validateWithCascade(buildResource(), opts);
  const headers = (fetchSpy.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
  expect(headers.Authorization).toBe('Bearer tok-abc-123');
});

it('Test 18 (NEW): bearer auth missing → notify auth-missing + demote', async () => {
  window.localStorage.setItem(phiAckKey(SERVER_URL, EXT_URL), 'true');
  // NO bearer token set
  const fetchSpy = vi.spyOn(global, 'fetch');
  (createRemoteBackend as unknown as Mock).mockReturnValue({
    kind: 'remote', validate: vi.fn().mockResolvedValue([]),
  });
  const notify = vi.fn();
  const opts = buildOptions({
    externalValidator: { url: EXT_URL, enabled: true, timeoutMs: 15000, auth: { type: 'bearer' } },
    settings: { fhir: { serverUrl: SERVER_URL, auth: { mode: 'open' } }, validation: { validatorUrl: 'http://server/' } } as never,
    notify,
  });
  await validateWithCascade(buildResource(), opts);
  expect(fetchSpy).not.toHaveBeenCalledWith(expect.stringContaining(EXT_URL), expect.anything());
  expect(notify).toHaveBeenCalledWith('auth-missing', { from: 'external', to: 'server' });
  expect(opts.probe.get(probeKey(SERVER_URL, EXT_URL, 'Patient'))).toBe('server');
});

it('Test 19 (NEW): 401 from validator → notify auth-failed + demote', async () => {
  window.localStorage.setItem(phiAckKey(SERVER_URL, EXT_URL), 'true');
  vi.spyOn(global, 'fetch').mockResolvedValue(new Response('', { status: 401 }));
  (createRemoteBackend as unknown as Mock).mockReturnValue({
    kind: 'remote', validate: vi.fn().mockResolvedValue([]),
  });
  const notify = vi.fn();
  const opts = buildOptions({
    externalValidator: {
      url: EXT_URL, enabled: true, timeoutMs: 15000,
      auth: { type: 'basic', username: 'a', password: 'b' },
    },
    settings: { fhir: { serverUrl: SERVER_URL, auth: { mode: 'open' } }, validation: { validatorUrl: 'http://server/' } } as never,
    notify,
  });
  await validateWithCascade(buildResource(), opts);
  expect(notify).toHaveBeenCalledWith('auth-failed', { from: 'external', to: 'server' });
});
```

### Walker test fixture (matches D-17)
```typescript
// New file: src/quality/__tests__/semanticNearMissWalker.test.ts
import { describe, it, expect, vi } from 'vitest';
import { walkNearMisses } from '../semanticNearMissWalker';

const SNOMED = 'http://snomed.info/sct';

describe('semanticNearMissWalker', () => {
  it('returns ancestors first then descendants, capped at 10, sorted by depth+display', async () => {
    const mockResolver = {
      client: { get: vi.fn() },  // typed as MedplumClient surface
      lookupDisplay: vi.fn().mockImplementation((sys, code) => Promise.resolve(`Display for ${code}`)),
    };
    // First $lookup (seed): parents=[P1, P2], children=[C1]
    // Subsequent $lookups: parent of P1 = G1 (depth 2), child of C1 = D1 (depth 2), etc.
    mockResolver.client.get
      .mockResolvedValueOnce({  // seed at depth 0
        resourceType: 'Parameters',
        parameter: [
          { name: 'property', part: [{ name: 'code', valueCode: 'parent' }, { name: 'value', valueCode: 'P1' }] },
          { name: 'property', part: [{ name: 'code', valueCode: 'parent' }, { name: 'value', valueCode: 'P2' }] },
          { name: 'property', part: [{ name: 'code', valueCode: 'child' }, { name: 'value', valueCode: 'C1' }] },
        ],
      })
      // ...further fixtures for depth-2 and depth-3 expansions...
      .mockResolvedValue({ resourceType: 'Parameters', parameter: [] });

    const result = await walkNearMisses(SNOMED, 'INVALID', mockResolver as never);
    expect(result.length).toBeLessThanOrEqual(10);
    expect(result.filter((s) => s.relation === 'parent').every(/* ancestors first */));
  });

  it('aborts early at MAX_NODES=50', async () => { /* fixture with 100 children at depth 1 */ });
  it('respects MAX_DEPTH=3', async () => { /* fixture with deep chains */ });
  it('returns [] when terminology client is null (D-12)', async () => {
    expect(await walkNearMisses(SNOMED, 'X', { client: null } as never)).toEqual([]);
  });
});
```

## State of the Art

| Old Approach (pre-Phase 43) | Current Approach (Phase 43) | When Changed | Impact |
|--------------|------------------|--------------|--------|
| External validator: anonymous-only | Optional Basic + Bearer auth | Phase 43 (this) | Unblocks self-hosted HAPI behind reverse proxies, Firely Server with API keys, IG-Publisher Wrapper with bearer tokens. |
| Invalid codes: surface as raw `code-invalid -- ...` text | Surface + offer "Did you mean?" suggestions via SNOMED/ICD-10 hierarchy | Phase 43 wave 2 | Reduces user friction on miscoded data; diagnostic UX improvement. Opt-in until v1.7 to avoid surprise terminology-server traffic. |
| `NormalizedIssue` has 5 fields (resourceId, resourceType, field, description, severity) | Add optional `code?: string` for predicate routing | Phase 43 (this — minor) | Backward-compatible (optional field). Enables future panels to filter by FHIR issue.code without re-parsing description. |

**Deprecated/outdated:**
- None within Phase 43's scope. Phase 31's notify-event union (`'timeout' | 'cors' | 'demote'`) is *extended*, not replaced — `'auth-missing' | 'auth-failed'` are additive. Existing callers that switch on the union must add cases (TypeScript will flag exhaustiveness errors).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `$lookup` with `property=parent` and `property=child` is the canonical SNOMED CT hierarchy walk endpoint per HL7 FHIR R4 §5.5.1 | Pattern 3 walker | **MEDIUM**: If a deployed Ontoserver returns parents/children only via `$expand` of a parent ValueSet (not via `$lookup` properties), walker returns empty. Mitigation: D-12 silent fallback. **[CITED: HL7 FHIR R4 spec; matches Phase 4 `TerminologyResolver.fetchLookup` already using `CodeSystem/$lookup`]** |
| A2 | Ontoserver default for SNOMED returns `valueCode` (not `valueCoding`) in `Parameters.parameter[*].part[*]` | Pitfall 3 | **MEDIUM**: Walker may need to handle `valueCoding` too. Mitigation: extractRelations falls through both. Spec allows polymorphism. |
| A3 | `btoa()` is available in jsdom (test runtime) without polyfill | Pattern 1 + tests | **LOW**: Vitest 4.x + jsdom 29.x ship with WHATWG-globalThis exposing `btoa`. **[VERIFIED: existing tests do not import a polyfill; production code can `btoa('a:b')` without imports — confirmed by node REPL availability of WindowOrWorkerGlobalScope.btoa under jsdom]** |
| A4 | `MedplumClient.get('CodeSystem/$lookup?...')` accepts query parameters via URL string | Pattern 3 walker | **VERIFIED**: existing `TerminologyResolver.fetchLookup` does exactly this at line 164. **[VERIFIED: src/terminology/TerminologyResolver.ts:164-167]** |
| A5 | `OperationOutcome.issue.code` of `'code-invalid'` is the FHIR R4 spec value for an invalid code (FHIR issue-type valueset) | Walker predicate, normalizer extension | **HIGH-impact-LOW-likelihood**: This is THE canonical FHIR R4 issue-type. Existing test fixture at `normalizers.test.ts:98` already uses `code-invalid -- `. **[CITED: HL7 FHIR R4 §11.4.5; existing fixture]** |
| A6 | The FHIR `OperationOutcomeIssue` type from `@medplum/fhirtypes` has `.code` typed as a string union including `'code-invalid'` | Schema | **VERIFIED**: `@medplum/fhirtypes` 5.1.7 generated types include the full R4 issue-type valueset. |
| A7 | Mantine 8 `<Collapse>` works inside a `<Table.Td colSpan={5}>` without breaking accessibility | Pattern 4 UI | **MEDIUM**: Untested by existing codebase; `Pitfall 6` flags risk. Mitigation: planner picks the row-group div approach if test reveals issues. |
| A8 | `clearProbeCache(probeCacheRef.current)` invocation from outside the hook (e.g., from the modal save) is feasible without rearchitecting | Pitfall 2 | **MEDIUM**: Probe cache is hook-scoped via `useRef`. Crossing the boundary requires either context lift, custom event, or simpler approach (re-read bearer-key serialization in the existing `extSerialized` dep at `useConformanceRun.ts:130-135`). Recommend the simpler approach. |
| A9 | The Phase 4 `TerminologyResolver` singleton (or per-request instance) is accessible from the cascade caller (`useConformanceRun`) | Walker integration | **LOW**: `useTerminology()` hook already exposes the resolver in `SettingsPage.tsx:51`. Same hook is callable from `useConformanceRun`. **[VERIFIED: src/components/settings/SettingsPage.tsx:51 — `useTerminology()` import]** |

## Open Questions

1. **Where does the suggestion table data flow originate?**
   - What we know: The walker returns suggestions per `(system, code)` pair. The cascade emits `OperationOutcomeIssue[]` per resource. The `ResourceIssueTable` consumes flat `NormalizedIssue[]` after batch dedup at `useConformanceRun.ts:338-349`.
   - What's unclear: Should the walker run inside `validateWithCascade` (per-resource, batched) or in a second pass after the full sample completes?
   - Recommendation: **Run inside the cascade per-resource** when `semanticNearMisses === true`. Reuse `Promise.all` batch from `useConformanceRun.ts:271-356`. Suggestions stored as a side-channel `Map<string, NearMissSuggestion[]>` keyed by `${resourceId}|${field}|${code}` and threaded into `ResourceIssueTable` via a new prop. This avoids a second async sweep after run completion.

2. **Does the `validator.bearerToken.v1` rotation invalidate the probe cache?**
   - What we know: D-17 (Phase 31) wipes probe cache on settings change. Token is NOT in settings.
   - What's unclear: Should rotation re-probe?
   - Recommendation: YES. Simplest path: include `localStorage.getItem('validator.bearerToken.v1')` in the `extSerialized` dep at `useConformanceRun.ts:134`. This re-builds the cascade callback whenever the token mutates AT THE START OF A RUN. Mid-run rotation is OUT OF SCOPE (D-02 says reads per `tryExternal`, but probe cache decisions happen before `tryExternal` is called for a cached tier). Document this corner: "Rotate the token, then click Validate Sample again to retry the external tier."

3. **Should `ValidatorAuthSettingsModal` show the bearer token's existence (masked) when reopened?**
   - What we know: D-03 says PasswordInput, write-on-save, clear button. Doesn't specify pre-fill behavior.
   - What's unclear: On modal reopen with a token already saved — show empty field (force re-entry) or pre-fill (visible eye toggle reveals)?
   - Recommendation: Pre-fill the `<PasswordInput>` value with the existing token. Mantine's `<PasswordInput>` masks by default; the user can click the eye icon to reveal if they need to verify. This matches the FHIR auth settings pattern at `SettingsPage.tsx:245-250`. **Discretionary** under D-19.

4. **What is the exact telemetry shape for `notify('auth-failed', ...)` per D-21?**
   - What we know: D-21 says YES log auth.type, NO credentials.
   - What's unclear: Payload shape — `{ from, to, authType }` or wider context?
   - Recommendation: `{ from: 'external'; to: 'server'; authType: 'basic' | 'bearer'; status: 401 | 403 }`. The status is non-PII; `authType` is non-PII; the credential is excluded. This shape extends the existing `from`/`to` payload in `cascadingValidator.ts:53-60` minimally.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Browser `localStorage` | Bearer token storage; PHI gate; existing patterns | ✓ (assumed; jsdom in tests) | jsdom 29.x | None — required |
| Browser `btoa` | Basic auth header encoding | ✓ (browser global; jsdom) | WHATWG | None — required |
| Browser `fetch` | Cascade external tier (already in use) | ✓ | Native | None — required |
| `@mantine/core` | UI (already in use) | ✓ | ^8.3.18 | None |
| `@medplum/core` | $lookup access via terminology client (already in use) | ✓ | ^5.1.7 | None |
| `vitest` + `vi.spyOn` | Test infra (already in use) | ✓ | ^4.1.4 | None |
| Configured terminology server (`settings.terminology.serverUrl`) | Walker `$lookup` calls (VAL-07 only) | Optional | Default: CSIRO Ontoserver R4 sandbox | D-12 silent fallback (no suggestions, no error) |
| Configured external validator URL with auth (`settings.validation.externalValidator.auth`) | Auth UAT (VAL-06 only) | User-provided | n/a | UAT case-1 / case-2 require deliberate user setup; no built-in fallback |

**Missing dependencies with no fallback:** None — Phase 43 is purely additive.

**Missing dependencies with fallback:**
- Terminology server unreachable → walker returns `[]`, no suggestions surfaced (D-12).
- Bearer token absent for a `bearer`-typed validator → cascade demotes to server tier with `auth-missing` notify (D-02).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 + @testing-library/react 16.3.x + jsdom 29.x **[VERIFIED: package.json]** |
| Config file | `vitest.config.ts` (existing, unchanged) |
| Quick run command | `npx vitest run src/quality/__tests__/cascadingValidator.test.ts src/quality/__tests__/semanticNearMissWalker.test.ts src/quality/__tests__/normalizers.test.ts src/components/quality/__tests__/ValidationPanel.phi-gate.integration.test.tsx src/components/settings/__tests__/ValidatorAuthSettingsModal.test.tsx` |
| Full suite command | `npm test` |
| Estimated runtime | Quick: ~3-5s; Full: ~25-30s (post-Phase 41 baseline 1064+ passing) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| **VAL-06** | Schema accepts `auth: { type, username, password }` for basic | unit | `npx vitest run src/config/__tests__/settings.test.ts -t "auth schema"` | ❌ Wave 0 (extend existing if any, or create) |
| **VAL-06** | Schema rejects `auth.token` field (bearer never from YAML) | unit | `npx vitest run src/config/__tests__/settings.test.ts -t "rejects auth.token"` | ❌ Wave 0 |
| **VAL-06** | `tryExternal` injects `Authorization: Basic <base64>` for basic auth | unit (`vi.spyOn(global, 'fetch')`) | `npx vitest run src/quality/__tests__/cascadingValidator.test.ts -t "Test 16"` | ✅ Existing file, NEW test |
| **VAL-06** | `tryExternal` injects `Authorization: Bearer <token>` reading from `validator.bearerToken.v1` | unit | `npx vitest run src/quality/__tests__/cascadingValidator.test.ts -t "Test 17"` | ✅ Existing file, NEW test |
| **VAL-06** | Bearer auth + token absent → notify `auth-missing` + demote to server | unit | `npx vitest run src/quality/__tests__/cascadingValidator.test.ts -t "Test 18"` | ✅ Existing file, NEW test |
| **VAL-06** | 401/403 from validator → notify `auth-failed` + demote to server | unit | `npx vitest run src/quality/__tests__/cascadingValidator.test.ts -t "Test 19"` | ✅ Existing file, NEW test |
| **VAL-06** | PHI not acknowledged + auth configured → no `Authorization` header attempted (cascade demotes BEFORE auth path) — D-16 | integration | `npx vitest run src/components/quality/__tests__/ValidationPanel.phi-gate.integration.test.tsx -t "auth-without-PHI"` | ✅ Existing file, NEW test case D |
| **VAL-06** | `ValidatorAuthSettingsModal` saves token to `validator.bearerToken.v1`; clears via Clear button | unit/component | `npx vitest run src/components/settings/__tests__/ValidatorAuthSettingsModal.test.tsx` | ❌ Wave 0 |
| **VAL-06** | `ValidationPanel` banner copy reflects "auth: basic/bearer" | unit/component | `npx vitest run src/components/quality/__tests__/ValidationPanel.banner-auth.test.tsx` | ❌ Wave 0 |
| **VAL-07** | `normalizers.ts` extends `NormalizedIssue` with raw `code` field | unit | `npx vitest run src/quality/__tests__/normalizers.test.ts -t "code field"` | ✅ Existing file, NEW test |
| **VAL-07** | Walker returns `[]` when terminology client null (D-12) | unit | `npx vitest run src/quality/__tests__/semanticNearMissWalker.test.ts -t "client null"` | ❌ Wave 0 |
| **VAL-07** | Walker BFS bounded by `MAX_DEPTH=3` and `MAX_NODES=50` | unit | `npx vitest run src/quality/__tests__/semanticNearMissWalker.test.ts -t "bounds"` | ❌ Wave 0 |
| **VAL-07** | Walker returns ≤10 suggestions, ancestors first, sorted by depth+display | unit | `npx vitest run src/quality/__tests__/semanticNearMissWalker.test.ts -t "ordering"` | ❌ Wave 0 |
| **VAL-07** | Walker handles `valueCode` AND `valueString` AND `valueCoding.code` from $lookup | unit (3 fixtures) | `npx vitest run src/quality/__tests__/semanticNearMissWalker.test.ts -t "value variants"` | ❌ Wave 0 |
| **VAL-07** | `ResourceIssueTable` shows `<Collapse>` row for `code-invalid` issues only when `semanticNearMisses === true` | component | `npx vitest run src/components/quality/__tests__/ResourceIssueTable.suggestions.test.tsx` | ❌ Wave 0 |
| **VAL-07** | Default-off: when `semanticNearMisses` is absent or `false`, no Collapse rows render at all (D-11) | component | `npx vitest run src/components/quality/__tests__/ResourceIssueTable.suggestions.test.tsx -t "default off"` | ❌ Wave 0 |
| **VAL-06+VAL-07 (combined)** | Live-Blaze UAT — 3 cases per ROADMAP SC #4 | manual-only | (see 43-HUMAN-UAT.md scaffold) | ❌ Wave 0 — scaffold per Phase 42 pattern |

### Sampling Rate
- **Per task commit:** `npx vitest run src/quality/__tests__/cascadingValidator.test.ts` (~1.5s targeted)
- **Per wave merge:** `npm test` full suite + `npx tsc -b --noEmit`
- **Phase gate:** Full suite green (≥1064+11 = 1075+ passing / 0 failing) before `/gsd-verify-work`
- **Max feedback latency:** <60s

### Wave 0 Gaps
- [ ] `src/config/__tests__/settings.test.ts` — extend (or create) for auth schema parse + rejection of `auth.token`
- [ ] `src/quality/__tests__/semanticNearMissWalker.test.ts` — new file: client-null, bounds, ordering, value variants (4+ tests)
- [ ] `src/components/settings/__tests__/ValidatorAuthSettingsModal.test.tsx` — new file: open/close, save token to localStorage, clear token (3+ tests)
- [ ] `src/components/quality/__tests__/ValidationPanel.banner-auth.test.tsx` — new file: banner copy reflects active auth type (2+ tests)
- [ ] `src/components/quality/__tests__/ResourceIssueTable.suggestions.test.tsx` — new file: Collapse render for `code-invalid` + default-off behavior (3+ tests)
- [ ] Extend `src/quality/__tests__/cascadingValidator.test.ts` — Tests 16-19 (basic header, bearer header, auth-missing, auth-failed)
- [ ] Extend `src/quality/__tests__/normalizers.test.ts` — verify raw `code` field populated
- [ ] Extend `src/components/quality/__tests__/ValidationPanel.phi-gate.integration.test.tsx` — Test D: auth-without-PHI (D-16)
- [ ] Live UAT: scaffold `43-HUMAN-UAT.md` mirroring `42-HUMAN-UAT.md` (3 cases per ROADMAP SC #4)

**Total NEW test files:** 5
**EXTENDED test files:** 4
**Estimated new tests:** ~25 (4 cascade auth + 1 normalizer + 4-5 walker + 3 modal + 2 banner + 3 table + UAT scaffold + 1-2 schema)
**Expected post-phase baseline:** 1064 + ~25 = ~1089 passing

## Security Domain

> Phase 43 is high-impact-security: introduces credential storage and outbound auth. ASVS audit required.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | **YES** | Outbound HTTP Basic + Bearer; no inbound auth (local tool). RFC 7617 / RFC 6750 compliance. |
| V3 Session Management | partial | Bearer token persists in localStorage; no server-side session. Tab-close persistence is *intentional* (D-14). |
| V4 Access Control | n/a | Local tool, no multi-user model. |
| V5 Input Validation | **YES** | YAML schema parsing of `auth` block. Field-level narrowing rejects unexpected fields and `auth.token` (D-01). |
| V6 Cryptography | **YES** | Basic auth uses `btoa()` (RFC 7617). NO custom crypto. NO password hashing (basic-auth is by design plaintext-over-TLS). |
| V7 Error Handling | **YES** | Auth failures (401/403) demote silently with non-PII notify event (D-13, D-21). No credential in error log/toast. |
| V9 Communications | **YES** | All outbound auth requires HTTPS in production; the cascade does not enforce HTTPS at code level (user-config trust boundary, matches Phase 31 T-31-01 acceptance). |
| V14 Configuration | **YES** | Plaintext basic-auth in `settings.yaml` is documented and intentional (CONTEXT.md `<specifics>`). Bearer token NEVER in YAML (D-01). |

### Known Threat Patterns for {React 18 SPA + Mantine 8 + browser-only auth}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Credential leakage via React DevTools state inspection | I | Build `Authorization` header inside the closure of `tryExternal`, never store on validator-options object that crosses notify boundary (D-04). Re-encode per request (D-01). |
| Bearer token persisted to disk via `settings.yaml` round-trip | I | Schema parser at `settings.ts` strips `auth.token`/`auth.password` for `type: 'bearer'`. localStorage write happens ONLY via the modal's explicit save handler. Code comment marker `SECURITY: NEVER serialize this to disk` (Pitfall 7). |
| Bearer token logged in `notify` payload | I | D-21: `notify` payload may carry `authType: 'basic' \| 'bearer'` and `status: 401 \| 403` only. Toast copy at `useConformanceRun.ts:306-329` references neither. Log injection mitigated by typed enum (Phase 31 T-31-08). |
| 401-induced demote loop disclosing endpoint state | I | Demote semantics match Phase 31 (silent for `'demote'`, blue toast for `'cors'`/`'timeout'`). New `'auth-failed'` notify pattern: blue toast "Authentication failed — falling back to server validation. Check Settings → Validator auth." NO endpoint URL in toast. |
| PHI bypass via batched fetch with auth precomputed | E | D-04 PHI gate runs BEFORE auth header build inside `tryExternal`. Per-resource (not batched) — Phase 31 PITFALLS #3 stays in force. |
| Sniffed basic-auth credentials over HTTP | I | Outside-of-scope mitigation: user configures HTTPS validator URL. Code-level check could enforce, but matches T-31-01 acceptance (user-configured URL trust boundary). Document as accepted risk. |
| Token theft via cross-extension localStorage access | I | `validator.bearerToken.v1` accessible to any browser extension with localStorage permission on the origin. Local-tool threat model accepts this (D-14: persists across tab close). |
| Cycles in SNOMED hierarchy (DoS via walker) | D | MAX_DEPTH=3, MAX_NODES=50, visited Set (D-08). |
| `$lookup` HTTP error leaking via console | I | Walker uses `try/catch` with silent return `null` (D-12); no console.error of full response. |
| OperationOutcome `code-invalid` with adversarial value | I | `code` is a typed enum from `OperationOutcomeIssue.code` in @medplum/fhirtypes; cannot contain user-controlled string. Walker is invoked only on `code === 'code-invalid'` (Phase 31 T-31-08 pattern). |

### New Threat IDs (for SECURITY.md)
| Threat ID | Category | Component | Disposition | Mitigation |
|-----------|----------|-----------|-------------|------------|
| T-43-01 | I (PHI bypass via auth-precomputed reordering) | `cascadingValidator.tryExternal` | mitigate | D-04 ordering invariant + new test (Pitfall 1). |
| T-43-02 | I (Bearer token serialized to settings.yaml on disk) | `settings.ts` parser | mitigate | Field-level narrowing rejects bearer credentials in YAML; bearer-type only `{ type: 'bearer' }`. localStorage-only persistence. |
| T-43-03 | I (Credentials leaked via notify payload) | `cascadingValidator.notify` | mitigate | D-21: payload limited to `authType` + `status`. No credential strings. Typed enum for `authType` (`'basic' \| 'bearer'`). |
| T-43-04 | I (Bearer token in React DevTools state tree) | `tryExternal` + modal | mitigate | Header built locally per fetch (D-01); modal `useState(token)` is acceptable (transient form state) but cleared on save. |
| T-43-05 | D (DoS via cyclic SNOMED hierarchy) | `semanticNearMissWalker.ts` | mitigate | MAX_DEPTH=3 + MAX_NODES=50 + visited Set (D-08). |
| T-43-06 | I (Terminology server logging $lookup with PHI-tied invalid codes) | `semanticNearMissWalker.ts` | accept | Codes alone are NOT PHI; the resource-ID context is not sent. Terminology server logs are out-of-scope. Document as accepted. |
| T-43-07 | I (Auth-state mismatch with probe cache → user sees stale "server" tier after fixing token) | `useConformanceRun.ts` + cache invalidation | mitigate | Open Question 2 — recommended: include bearer-key in `extSerialized` dep. |

## Sources

### Primary (HIGH confidence)
- **Codebase inspection (file:line verified):**
  - `src/quality/cascadingValidator.ts:124-185` (tryExternal — header injection target)
  - `src/quality/cascadingValidator.ts:131-138` (PHI gate ordering — D-04 lock)
  - `src/quality/normalizers.ts:21-39` (existing normalizer; extension point)
  - `src/quality/types.ts:95-101` (NormalizedIssue interface; extend with `code?`)
  - `src/quality/phiGate.ts:18-40` (localStorage read pattern; mirror for bearer)
  - `src/config/types.ts:14-41` (AppSettings.validation.externalValidator; schema extension point)
  - `src/config/settings.ts:76-106` (YAML field-level narrowing; pattern to mirror)
  - `src/components/settings/TerminologySettingsModal.tsx:1-60` (modal structural template)
  - `src/components/settings/SettingsPage.tsx:236-250` (PasswordInput usage)
  - `src/terminology/TerminologyResolver.ts:54-184` ($lookup access pattern)
  - `src/terminology/TerminologyCache.ts:1-156` (LRU + localStorage mirror)
  - `src/components/quality/ResourceIssueTable.tsx:174-211` (Collapse row insertion target)
  - `src/components/quality/ValidationPanel.tsx:470-498` (banner Active strategy line)
  - `src/hooks/useConformanceRun.ts:240-356` (cascade caller; notify wiring)
  - `src/quality/__tests__/cascadingValidator.test.ts:64-200` (vi.spyOn header assertion pattern)
  - `src/components/quality/__tests__/ValidationPanel.phi-gate.integration.test.tsx` (PHI integration pattern; extend for D-16)
- **Phase 31 archive:** `.planning/milestones/v1.5-phases/31-ux-01-external-validator-cascade/{31-CONTEXT,31-VALIDATION,31-SECURITY}.md`
- **Phase 42 UAT scaffold pattern:** `.planning/phases/42-pre-probe-extension-module-counts-mii-ext-15/42-HUMAN-UAT.md`
- **Phase 31 PITFALLS:** `.planning/research/PITFALLS.md` (Pitfalls 1-4)

### Standards & Specs (CITED)
- HL7 FHIR R4 §5.5.1 — `$lookup` operation: https://hl7.org/fhir/R4/codesystem-operation-lookup.html
- HL7 FHIR R4 §11.4.5 — `OperationOutcome.issue.code` valueset: https://hl7.org/fhir/R4/valueset-issue-type.html
- RFC 7617 — Basic Authentication: https://datatracker.ietf.org/doc/html/rfc7617
- RFC 6750 — Bearer Token Usage: https://datatracker.ietf.org/doc/html/rfc6750

### Secondary (MEDIUM confidence — assumed, not session-verified)
- MDN — `WindowOrWorkerGlobalScope.btoa()` available under jsdom 29.x test runtime
- Mantine 8 docs — `<Collapse>` accessibility inside tables (Pitfall 6 flags as untested in this codebase)

### Tertiary (LOW confidence — none used in this research)
- (none)

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — every package version verified against `package.json` and existing imports. No new packages introduced. Reuse-only.
- Architecture: **HIGH** — existing patterns at Phase 31 (cascade), Phase 4 ($lookup), Phase 15 (drill-down rows), and Phase 7 (PHI gate) are concrete, file:line-verified, and minimally extended.
- Pitfalls: **HIGH** — pitfalls 1-3 anchor on Phase 31 PITFALLS.md (already-shipped lessons); pitfalls 4-7 derive from codebase inspection of explicit risk surfaces.
- Walker BFS bounds and ordering: **MEDIUM-HIGH** — D-08 / D-09 lock the design; A1/A2 open questions on $lookup response shape variants flagged in Pitfall 3.
- UI suggestion row behavior: **MEDIUM** — A7 flags Mantine `<Collapse>` in `<Table.Td>` accessibility as a pattern with no precedent in this codebase; planner should pick rendering approach during plan-phase.

**Research date:** 2026-04-29
**Valid until:** 2026-05-29 (30 days; stable codebase, no upstream churn expected within this window)
