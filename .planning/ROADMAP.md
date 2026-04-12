# Roadmap: FHIR Exploder

## Overview

FHIR Exploder delivers a local-first React application for exploring Blaze FHIR server data. v1.0 shipped 2026-04-12 with 5 feature phases (connectivity, resource explorer, patient views, terminology resolution, data quality dashboard) plus 3 gap-closure phases.

## Milestones

- ✅ **v1.0 — MVP (shipped 2026-04-12)** — [Archive](milestones/v1.0-ROADMAP.md) · [Requirements](milestones/v1.0-REQUIREMENTS.md) · 25/25 requirements, 8 phases, 23 plans, 286 tests
- ⏸ **v1.1** — not yet scoped. Run `/gsd-new-milestone` to begin.

## Next Milestone

Use `/gsd-new-milestone` to:
- Define v1.1 requirements (fresh `.planning/REQUIREMENTS.md`)
- Research new domain / integrations
- Produce a new phase roadmap

Candidate v2 items carried over from v1 scope (see `milestones/v1.0-REQUIREMENTS.md` § "v2 Candidates"):
- BRWS-09: Bookmark + share search URLs
- BRWS-10: Export search results (CSV / NDJSON)
- QUAL-05: Quality metric trend analysis over time
- QUAL-06: PDF quality report
- `@mantine/charts` + `recharts` install for chart visuals (deferred from v1 per bundle budget)
- Tech debt pass: address 17 info-level code review findings from v1.0 (see `phases/04-terminology-resolution/04-REVIEW.md` + `phases/05-data-quality-dashboard/05-REVIEW.md`)

## Historical Phases

v1.0 phases archived to `milestones/v1.0-ROADMAP.md`. Phase directories remain in `.planning/phases/` for historical reference.
