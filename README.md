# FHIR Exploder

A local-first React application for exploring, browsing, and auditing data on a FHIR server (Blaze). Built with [Medplum React](https://www.medplum.com/docs/sdk/react) components, it provides three entry points — patient-centric browsing, generic resource exploration, and data quality auditing — with the [MII Kerndatensatz](https://www.medizininformatik-initiative.de/de/basismodule) as an optional navigation lens. Resolves terminology display values via the MII Terminology Server.

## Core Value

Connect to a Blaze FHIR server and make its contents human-readable and navigable — from patient-level clinical views down to raw FHIR JSON — without requiring deep FHIR expertise to understand what's in there.

## Features

- **Patient-centric browsing** — list and search patients by name, identifier, or birthDate; drill into a patient view with `PatientHeader`, MII Kerndatensatz module tabs (Diagnose, Prozedur, Laborbefund, Medikation, Fall, Consent), a chronological clinical timeline (Zeitleiste), and a toggle to raw FHIR resource browsing.
- **Generic resource explorer** — browse any FHIR resource type exposed by the server's `CapabilityStatement` with full search, filtering, and pagination.
- **Three display modes per resource** — human-readable (default), clinical+raw toggle, and developer/FHIR-structure view.
- **Local-only & read-only** — runs entirely in the browser against a reachable FHIR server. No write operations, no auth for the app itself.

## Tech Stack

- **Framework:** React 18 + TypeScript + Vite
- **FHIR:** `@medplum/core`, `@medplum/react`, `@medplum/react-hooks`, `@medplum/fhirtypes` (FHIR R4)
- **UI:** Mantine 8 (required peer of `@medplum/react`)
- **Routing:** react-router-dom v7
- **Config:** `settings.yaml` parsed via `js-yaml`
- **Tests:** Vitest + Testing Library

## Getting Started

### Prerequisites

- Node.js 20+
- A reachable FHIR R4 server. The project is primarily developed against [Blaze](https://github.com/samply/blaze) running locally.

### Install and run

```bash
npm install
npm run dev
```

Then open the URL printed by Vite (typically `http://localhost:5173`).

### Configure the server connection

Connection settings live in `settings.yaml` (or directly in the in-app settings). Supported auth modes: open (no auth), HTTP Basic, or Bearer token. See the in-app Settings screen for the current schema.

### Scripts

| Script | What it does |
|--------|--------------|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |
| `npm test` | Run the Vitest test suite once |
| `npm run test:watch` | Run Vitest in watch mode |

## Project Structure

```
src/
├── components/
│   ├── explorer/     # Generic FHIR resource explorer (Phase 2)
│   └── patients/     # Patient-centric browsing (Phase 3)
├── contexts/         # ConnectionContext (Medplum client lifecycle)
├── hooks/            # useConnection, useBreadcrumbTrail, etc.
├── utils/            # mii-modules config, timeline-utils, settings, etc.
└── __tests__/        # Vitest tests
```

Planning artifacts and phase history live under `.planning/`.

## Documentation

- `CLAUDE.md` — project constraints, conventions, and the full recommended/decided technology stack
- `.planning/PROJECT.md` — project overview and validated requirements by phase
- `.planning/ROADMAP.md` — milestone and phase roadmap
- `.planning/phases/` — per-phase plans, research, UI specs, summaries, and verification reports

## Contributing

Contributions are welcome. By submitting a pull request you agree that your contributions will be licensed under the MIT License (see below).

## License

Released under the [MIT License](./LICENSE). Copyright (c) 2026 FHIR Exploder contributors.
