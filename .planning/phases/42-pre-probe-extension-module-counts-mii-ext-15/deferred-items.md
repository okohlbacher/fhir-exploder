# Deferred Items — Phase 42

## Pre-existing test failures (not caused by Phase 42)

### deuteranopia pair #13 (kardiologie ↔ mikrobiologie)

- **Test:** `src/__tests__/visual/deuteranopia.test.tsx`
- **Failure:** `pair #13 kardiologie ↔ mikrobiologie: ΔE2000 = 1.406 (hexA=#3b5bdb, hexB=#6741d9); threshold = 5`
- **Status:** Pre-existing — failure observed BEFORE any Phase 42 commits land (verified by running the test on commit 31ce2ed before any Phase 42-01 source changes).
- **Why deferred:** SCOPE BOUNDARY. Phase 42-01 only touches `src/hooks/useMiiExtensionCounts.tsx` and its test. The deuteranopia matrix is a Phase 40 (DEUT-01) artifact; pair-discriminability tuning belongs to a future Phase 40 follow-up.
- **Follow-up:** Open issue against the Phase 40 deuteranopia matrix or the Phase 33 MII palette to widen the L*/h spread between kardiologie's `#3b5bdb` (indigo-ish) and mikrobiologie's `#6741d9` (violet-ish) so deuteranopic ΔE ≥ 5.
