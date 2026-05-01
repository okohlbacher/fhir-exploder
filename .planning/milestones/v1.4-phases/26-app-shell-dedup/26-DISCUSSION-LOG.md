# Phase 26: App-Shell Dedup - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md.

**Date:** 2026-04-22
**Phase:** 26-app-shell-dedup
**Mode:** `--auto` (recommended defaults auto-selected; no interactive prompts)
**Areas discussed:** ConnectionGatedOutlet API, searchByIdentifierPrefix signature, Sidebar nested-route strategy, Anchor+Link migration, SettingsContext useCallback, plan batching

---

## ConnectionGatedOutlet API (SHELL-01)

| Option | Description | Selected |
|--------|-------------|----------|
| Render-prop `<ConnectionGatedOutlet render={(connected) => ...} />` | Max flexibility; each layout specifies what renders when connected | ✓ (recommended) |
| Children-wrapper `<ConnectionGatedOutlet><Outlet /></ConnectionGatedOutlet>` | Simpler but leaves layout-specific decoration in each layout |  |
| Layout-specific HOC | Doesn't achieve dedup to ≤30 LOC target |  |

**Auto-selection:** recommended — render-prop is what collapses the 3 layouts to ≤30 LOC.
**Notes:** MUST NOT wrap MedplumProvider (REQUIREMENTS.md explicit).

---

## searchByIdentifierPrefix signature (SHELL-02)

| Option | Description | Selected |
|--------|-------------|----------|
| `searchByIdentifierPrefix(client, type, prefix, { limit, pageSize })` | Options obj — extensible for future `system`, `sort` params | ✓ (recommended) |
| `searchByIdentifierPrefix(client, type, prefix, limit, pageSize)` | Flat params — simple but harder to extend |  |

**Auto-selection:** recommended — matches Medplum convention elsewhere.
**Notes:** return raw `Bundle`; callers already normalize. Wildcard semantics: union of both call-site variants.

---

## Sidebar nested-route strategy (SHELL-03)

| Option | Description | Selected |
|--------|-------------|----------|
| `NavLink` native `isActive` with `end={false}` | React Router 7 built-in; no custom matcher | ✓ (recommended) |
| Custom pathname-prefix matcher in Sidebar.tsx | Reinvents the wheel |  |
| Regex-based section matcher | Over-engineered |  |

**Auto-selection:** recommended — NavLink's `end={false}` is the canonical pattern.
**Notes:** `/` stays exact-match; `/patients`, `/explorer`, `/quality` are prefix-match roots.

---

## Anchor+Link migration (SHELL-04)

| Option | Description | Selected |
|--------|-------------|----------|
| Theme-default `<Anchor component={Link}>` | If Mantine theme link color matches current inline | ✓ (recommended if parity) |
| Explicit `c="blue"` | Guaranteed visual parity |  |
| Keep inline `style={{ color: 'var(--mantine-color-blue-6)' }}` | Not compliant with SHELL-04 |  |

**Auto-selection:** recommended — planner to verify theme default matches current rendering. Fallback to explicit `c="blue"` if not.
**Notes:** 10 sites identified via grep across 5 component files.

---

## SettingsContext useCallback (SHELL-05)

| Option | Description | Selected |
|--------|-------------|----------|
| `useCallback` with exhaustive deps (no eslint-disable) | Canonical React hook pattern | ✓ (locked) |

**Auto-selection:** locked — REQUIREMENTS.md SHELL-05 requires exactly this.
**Notes:** memoize non-primitive deps if needed (PITFALLS §7).

---

## Plan batching

| Option | Description | Selected |
|--------|-------------|----------|
| 2-3 plans: 26-01 (SHELL-01 isolated); 26-02 (SHELL-02+04+05 bundled); 26-03 (SHELL-03 small) | Balances blast radius with concurrency | ✓ (Claude's Discretion) |
| 5 plans (one per SHELL) | Too granular |  |
| 1 plan (all 5 SHELL) | Too coarse; SHELL-01 blast radius justifies isolation |  |

**Auto-selection:** planner decides within the recommended shape.
**Notes:** SHELL-01 should stay isolated (largest blast radius); 26-02 bundle is safe because file sets don't overlap with 26-01.

---

## Claude's Discretion

- Render-parity test strategy (snapshot vs structural)
- Exact commit message templates (per-SHELL vs combined)
- Whether to write a migration note for future layouts

## Deferred Ideas

- MedplumProvider consolidation (out of scope)
- Search helper genericization (Phase 27+ if ever)
- Sidebar responsive collapse (out of scope)
- Mantine theme link-color extension (out of scope)
