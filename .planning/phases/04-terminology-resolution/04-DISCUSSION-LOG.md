# Phase 4: Terminology Resolution - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-11
**Phase:** 04-terminology-resolution
**Areas discussed:** Terminology server integration, Resolution strategy, Caching, Graceful degradation
**Mode:** Auto — recommended defaults selected without manual interaction per user request.

---

## Terminology Server Integration
[auto] MII Terminology Server for $lookup/$translate. URL configurable in settings.yaml. Recommended default selected.

## Resolution Strategy
[auto] Check existing display value first, then $lookup by system+code, fall back to raw code. Transparent resolution — no user action. Recommended default selected.

## Caching
[auto] In-memory cache keyed by system+code. Optional localStorage persistence. "Clear cache" action in settings. Recommended default selected.

## Graceful Degradation
[auto] Silent fallback to raw code (system|code) with subtle indicator. No error toasts. Terminology server health in sidebar status. Recommended default selected.

## Claude's Discretion
- Batch vs individual resolution strategy
- Cache size limits and eviction
- Prefetching common code systems

## Deferred Ideas
None.
