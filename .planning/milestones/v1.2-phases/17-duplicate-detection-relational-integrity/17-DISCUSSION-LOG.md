# Phase 17: Duplicate Detection & Relational Integrity - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-14
**Phase:** 17-duplicate-detection-relational-integrity
**Areas discussed:** Patient matching, Content hashing, Reference integrity, Dashboard layout

---

## Gray Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Patient matching | Matching strictness, fuzzy vs exact, handling partial data | |
| Content hashing | Which fields to hash, ordering, presentation | |
| Reference integrity | Batch vs per-resource checks, orphan detection approach | |
| Dashboard layout | New tabs vs panels, grouping strategy | |

**User's choice:** No preference — all areas delegated to Claude's discretion
**Notes:** User selected "[No preference]" for all four gray areas, indicating trust in Claude's judgment for all implementation decisions.

---

## Claude's Discretion

All four gray areas were resolved by Claude based on established project patterns:
- Patient matching: Exact match on normalized name + DOB (simplest correct approach)
- Content hashing: SHA-256 on canonical JSON (standard deduplication pattern)
- Reference integrity: Batched existence checks for efficiency
- Dashboard layout: 2 new tabs (Duplicates + References) following established 2-tab-per-phase pattern

## Deferred Ideas

- FHIRPath-based cohort definition — advanced feature, out of scope
