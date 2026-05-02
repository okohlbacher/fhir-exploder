# Phase 50: Theme E — STACK-01 Carry-Over: Mantine 9 / React 19 Gate - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered and the substantive pros/cons discussion that informed the deferral.

**Date:** 2026-05-01
**Phase:** 50-theme-e-stack-01-carry-over-mantine-9-react-19-gate
**Mode:** interactive — gate checked live, then deep pros/cons discussion, then user decision
**Areas discussed:** Live gate check, "What does Mantine do?", Mantine 9 upgrade pros/cons, Closure path

---

## Step 1 — Live Gate Check

Ran `npm view @medplum/react peerDependencies` against the live npm registry. Result (medplum/react@5.1.10):

```json
{
  "@mantine/core": "^8.0.0",
  "@mantine/hooks": "^8.0.0",
  "@mantine/notifications": "^8.0.0",
  "@mantine/spotlight": "^8.0.0",
  "@medplum/core": "5.1.10",
  "@medplum/react-hooks": "5.1.10",
  "react": "^18.0.0 || ^19.0.0",
  "react-dom": "^18.0.0 || ^19.0.0",
  "rfc6902": "^5.0.1",
  "signature_pad": "^5.0.10"
}
```

| Peer | Required Range | Current Project | Gate |
|------|----------------|-----------------|------|
| `@mantine/core` (and `/hooks`, `/notifications`, `/spotlight`) | `^8.0.0` only | `^8.3.18` | **FAILS** — Mantine 9 still blocked |
| `react` | `^18.0.0 \|\| ^19.0.0` | `^18.3.1` | **PASSES** — React 19 now allowed |
| `react-dom` | `^18.0.0 \|\| ^19.0.0` | `^18.3.1` | **PASSES** — React 19 now allowed |

**Key finding:** Medplum has DECOUPLED React 19 from Mantine 9 since v1.6-close. The original STACK-01 assumption that they would move together is no longer accurate. Three viable paths emerged:

| Option | Description |
|--------|-------------|
| 1 | Full defer (WAIVE-AND-DEFER both Mantine 9 and React 19) — matches v1.6 Phase 45 precedent |
| 2 | Partial upgrade — React 18 → 19 alone, defer Mantine 9 |
| 3 | Full defer even though React gate is open — keep the React/Mantine pair coupled until both gates open |

---

## Step 2 — User asked "What does Mantine do anyways?"

Answered: Mantine is a React component library + design system (analogous to Material-UI / Chakra / Ant Design). In FHIR Exploder it provides UI primitives (Card, Tabs, Modal, Slider, Tooltip, Alert, Skeleton, Group, Stack, SimpleGrid), hooks (useDisclosure, useDebouncedValue, useLocalStorage, useMediaQuery, useMantineColorScheme), theming (indigo accent, IBM Plex fonts, 4/6/10px radii, light/dark mode CSS variables), and specialized widgets (@mantine/charts wraps Recharts for the Quality dashboard; @mantine/dates for date pickers; @mantine/notifications for toasts).

Critically: Mantine is NOT optional infrastructure — it's a required peer dependency of `@medplum/react`. Every Medplum component (PatientHeader, SearchControl, ResourceTable, ResourcePropertyDisplay) renders Mantine internally. Removing Mantine means losing Medplum's React components.

Quantified the surface area in this codebase: **190 import statements across 145 source files** use Mantine — about 25% of all source files.

---

## Step 3 — Pros / Cons Discussion of Mantine 9 Upgrade

### Pros (the wins)

| # | Win | Magnitude |
|---|-----|-----------|
| 1 | CSS layers + better theme cascade — custom styles no longer fight specificity wars with library defaults | Medium (helps future custom-styled widgets) |
| 2 | Smaller bundle (~15-25 KB gz savings reported, dropped legacy `emotion` runtime) | Marginal — main chunk would drop ~333 → ~310 KB gz |
| 3 | Cleaner `useMantineColorScheme` API | Small (QoL only) |
| 4 | Better TypeScript inference on `createTheme()` and component generics | Small (fewer `as` casts in `src/theme.ts`) |
| 5 | Active development — Mantine 9 is where bug fixes ship; v8 enters maintenance soon | Defensible long-term posture, not urgent |

### Cons (the costs)

| # | Cost | Magnitude |
|---|------|-----------|
| 1 | Coupled with React 19 — Mantine 9 peer-pins `react: ^19.0.0` exclusively. Becomes a paired migration. | Large — doubles the breaking-change surface |
| 2 | Breaking changes in component APIs (Tabs, Notification, Modal, MediaQuery removed). ~12-15 of our components have API changes per the migration guide | Medium — fixable but each needs a touch |
| 3 | Visual regression risk across 145 files. Mantine 9 ships subtly tweaked default sizes/paddings/border-radii. Full visual UAT walk across 9 surfaces | Large — significant manual testing time |
| 4 | React 19 deprecates `React.FC` defaults, changes ref forwarding, tightens StrictMode. Phase 34/42/48/49 patterns all touch React internals that v19 changes | Medium — each pattern needs re-validation |
| 5 | Dependency cascade — `@medplum/react@5.1.10` peer is still `^8.0.0` only. Would require `--legacy-peer-deps` long-term until Medplum opens the gate | Large — footgun that masks future incompatibilities |
| 6 | Test suite churn — 1386 tests passing today; Mantine 9 changes some DOM structure (Tabs panel naming etc.); estimated 20-50 RTL test rewrites | Medium |
| 7 | Phase 49's `graph.module.css` CSS-variable bridge is tuned to Mantine 8's `--mantine-color-*` namespace; needs re-validation under Mantine 9 | Small but specific |
| 8 | NO user-facing wins — app looks identical post-upgrade. All wins are DX improvements | Foundational |

### Read on the tradeoff

**The Medplum peer-dep pin to `^8.0.0` is the strongest signal.** If the most important UI dependency in this stack hasn't moved to v9 yet, attempting the upgrade now means chasing a moving target. Medplum will move when Mantine 9's edge cases stabilize, and *then* the upgrade becomes a clean one-shot rather than a partial mess.

Recommended Option 1 (full defer): same path as v1.6 Phase 45 precedent, re-check at v1.8 milestone start.

---

## Step 4 — User Decision

> "Defer mantine 9 upgrade until medplum is comaptible w/ 9.x."

**Decision:** Option 1 (full defer). Both Mantine 9 AND React 19 deferred to v1.8. Trigger for re-attempt = `npm view @medplum/react peerDependencies` shows `@mantine/core: ^9.x` (or compatible range).

Captured in CONTEXT.md as:
- D-01: live gate output (frozen as v1.7-close evidence)
- D-02: defer-both rationale
- D-03: phase closure path = `deferred`
- D-04: v1.8 re-attempt trigger condition
- D-05: NO partial React 19 upgrade
- D-06: NO `--legacy-peer-deps` workaround
- D-07: NO codemod preview

---

## Claude's Discretion

- Exact wording of the WAIVE-AND-DEFER record in `50-SUMMARY.md` — mirror v1.6 Phase 45's `45-SUMMARY.md` format.
- Whether to add a "Mantine 9 watch" note to `.planning/PROJECT.md` v1.8 section — recommended yes (keeps trigger condition visible).
- Whether to file a feature-request issue against `medplum/medplum` — recommended no (their roadmap, we track state).

## Deferred Ideas

- STACK-01 (Mantine 9 / React 19 coupled upgrade) — re-attempt trigger documented in D-04, carries to v1.8 deferred-items list
- Partial React 18 → 19 upgrade alone — explicitly rejected in D-05
- Codemod preview against scratch branch — explicitly rejected in D-07
- Mantine 9 feature-request issue against medplum/medplum — out of scope (we track state, not influence Medplum's roadmap)
