# Phase 1: Foundation & Blaze Connectivity - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-11
**Phase:** 01-foundation-blaze-connectivity
**Areas discussed:** App shell & navigation, Settings management, CapabilityStatement display, Connection flow & feedback

---

## App shell & navigation

### Navigation Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Sidebar | Persistent left sidebar with icons/labels for each entry point. Common in data tools. Scales well. | ✓ |
| Top navbar | Horizontal navigation bar at the top. Simpler but less room as app grows. | |
| Collapsible sidebar | Sidebar that collapses to icon-only mode. Best of both worlds. | |

**User's choice:** Sidebar
**Notes:** None

### Landing Page

| Option | Description | Selected |
|--------|-------------|----------|
| Connection status | Show server info, connection health, resource type list from CapabilityStatement | ✓ |
| Resource Explorer | Jump straight into Explorer view | |
| Setup wizard | Guide through initial config if no settings.yaml | |

**User's choice:** Connection status
**Notes:** None

### Theme

| Option | Description | Selected |
|--------|-------------|----------|
| Light theme | Clean, clinical look. Better for data-heavy UIs. Mantine default. | ✓ |
| Dark theme | Easier on eyes for long sessions. | |
| You decide | Claude picks based on FHIR data display needs. | |

**User's choice:** Light theme
**Notes:** None

---

## Settings management

### Settings UX

| Option | Description | Selected |
|--------|-------------|----------|
| File-only | Users edit settings.yaml in text editor. App reads on startup. Read-only settings page. | ✓ |
| In-app editor | Form fields that read AND write settings.yaml. | |
| File + reload button | File-only editing with a reload button in the app. | |

**User's choice:** File-only
**Notes:** None

### Config Path

| Option | Description | Selected |
|--------|-------------|----------|
| Project root | ./settings.yaml next to the app. Simple discovery. | ✓ |
| Public folder | ./public/settings.yaml served as static asset. | |
| You decide | Claude picks most practical location. | |

**User's choice:** Project root
**Notes:** None

### Bad Config Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Show inline error | App loads but shows clear error on landing page. | |
| Use sensible defaults | Fall back to localhost:8080 with open auth. Warning banner. | ✓ |
| Both | Defaults for missing file, errors for malformed YAML. | |

**User's choice:** Use sensible defaults
**Notes:** None

---

## CapabilityStatement display

### Resource Type Presentation

| Option | Description | Selected |
|--------|-------------|----------|
| Grouped list | Resource types grouped by FHIR category with counts. | ✓ |
| Flat alphabetical list | Simple A-Z list, name only. | |
| Card grid | Each type as a card with name, count, search params. | |
| You decide | Claude picks most practical display. | |

**User's choice:** Grouped list
**Notes:** None

### Clickable Resource Types

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, link ahead | Clickable links now, dead until Phase 2. Navigation ready. | ✓ |
| No, static for now | Display only. Phase 2 adds clickable behavior. | |
| You decide | Claude picks cleanest approach. | |

**User's choice:** Yes, link ahead
**Notes:** None

### Resource Type Metadata

| Option | Description | Selected |
|--------|-------------|----------|
| Resource count | Number of resources per type (requires count query per type) | ✓ |
| Supported search params | Search parameters from CapabilityStatement | ✓ |
| Supported operations | Operations like $everything, $validate | ✓ |
| Just the name | Minimal — name only | |

**User's choice:** Resource count, Supported search params, Supported operations (multi-select)
**Notes:** None

### Count Performance

| Option | Description | Selected |
|--------|-------------|----------|
| Lazy load counts | Show list immediately, fetch counts in background with per-type spinners. | ✓ |
| Fetch all upfront | Wait for all counts before showing list. | |
| You decide | Claude picks best performance approach. | |

**User's choice:** Lazy load counts
**Notes:** None

---

## Connection flow & feedback

### Auto-connect Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-connect | App reads settings and immediately connects. | |
| Manual connect button | App loads, shows config, user clicks Connect. | ✓ |
| You decide | Claude picks based on local dev tool feel. | |

**User's choice:** Manual connect button
**Notes:** None

### Status Indicator Location

| Option | Description | Selected |
|--------|-------------|----------|
| Top of sidebar | Colored dot/badge at sidebar top. Always visible. | ✓ |
| Header bar | Thin bar above main content. | |
| You decide | Claude places where it fits sidebar best. | |

**User's choice:** Top of sidebar
**Notes:** None

### Error Display

| Option | Description | Selected |
|--------|-------------|----------|
| Inline in main area | Error replaces landing page content with description, details, fix suggestions. | ✓ |
| Toast notification | Pop-up in corner. Less intrusive. | |
| Both | Toast alert + inline error with details. | |

**User's choice:** Inline in main area
**Notes:** None

---

## Claude's Discretion

No areas deferred to Claude's discretion.

## Deferred Ideas

None — discussion stayed within phase scope.
