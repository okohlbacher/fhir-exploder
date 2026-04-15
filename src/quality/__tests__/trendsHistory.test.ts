import { describe, it, expect } from 'vitest';
import type { QualitySnapshot } from '../trendsHistory';

/**
 * Round-trip serialization through JSON.parse(JSON.stringify(...)) must
 * preserve every field of QualitySnapshot verbatim. This guards D-02
 * (locked payload shape) and D-03/D-04 (localStorage persistence: the
 * snapshots are read back via JSON.parse).
 */
describe('QualitySnapshot serialization round-trip', () => {
  const makeSnap = (over: Partial<QualitySnapshot> = {}): QualitySnapshot => ({
    id: '11111111-2222-3333-4444-555555555555',
    capturedAt: '2026-04-14T18:30:42.123Z',
    serverUrl: 'http://localhost:8080/fhir',
    sampleSize: 100,
    cohort: [],
    scores: {
      completeness: 92.5,
      coverage: 78,
      validation: 99.1,
      plausibility: 99.9,
      labRanges: 97,
      duplicates: 100,
      references: 98.4,
    },
    thresholds: {
      completeness: 80,
      coverage: 70,
      validation: 95,
      plausibility: 99,
      labRanges: 95,
      duplicates: 99,
      references: 98,
    },
    ...over,
  });

  const roundTrip = (snaps: QualitySnapshot[]): QualitySnapshot[] =>
    JSON.parse(JSON.stringify(snaps)) as QualitySnapshot[];

  it('preserves an empty array', () => {
    const snaps: QualitySnapshot[] = [];
    expect(roundTrip(snaps)).toEqual(snaps);
  });

  it('preserves a single snapshot with all fields verbatim', () => {
    const snaps: QualitySnapshot[] = [makeSnap()];
    expect(roundTrip(snaps)).toEqual(snaps);
  });

  it('preserves three snapshots with distinct fields', () => {
    const snaps: QualitySnapshot[] = [
      makeSnap({ id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', sampleSize: 50 }),
      makeSnap({
        id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        cohort: ['Patient', 'Condition'],
        serverUrl: 'https://blaze.example.org/fhir',
      }),
      makeSnap({
        id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
        capturedAt: '2026-05-01T00:00:00.000Z',
      }),
    ];
    expect(roundTrip(snaps)).toEqual(snaps);
  });

  it('preserves empty cohort array as [] (not null/undefined)', () => {
    const snaps: QualitySnapshot[] = [makeSnap({ cohort: [] })];
    const restored = roundTrip(snaps);
    expect(restored[0].cohort).toEqual([]);
    expect(Array.isArray(restored[0].cohort)).toBe(true);
  });

  it('preserves scores.duplicates: null as null (not dropped)', () => {
    const snaps: QualitySnapshot[] = [
      makeSnap({
        scores: {
          completeness: 92.5,
          coverage: 78,
          validation: 99.1,
          plausibility: 99.9,
          labRanges: 97,
          duplicates: null,
          references: 98.4,
        },
      }),
    ];
    const restored = roundTrip(snaps);
    expect(restored[0].scores.duplicates).toBeNull();
    expect('duplicates' in restored[0].scores).toBe(true);
  });

  it('preserves thresholds.validation: null (disabled metric) as null', () => {
    const snaps: QualitySnapshot[] = [
      makeSnap({
        thresholds: {
          completeness: 80,
          coverage: 70,
          validation: null,
          plausibility: 99,
          labRanges: 95,
          duplicates: 99,
          references: 98,
        },
      }),
    ];
    const restored = roundTrip(snaps);
    expect(restored[0].thresholds.validation).toBeNull();
  });
});

/**
 * Legacy snapshot reader (Plan 21-01 Wave 0 stub).
 *
 * Phase 21 renames the snapshot `cohort: string[]` field (which actually
 * holds the dashboard resource-type filter list) to `resourceTypes: string[]`
 * — see CHRT-04. Existing on-disk snapshots written before the rename must
 * keep loading correctly: the reader MUST treat a legacy `cohort` field as
 * the new `resourceTypes` field.
 *
 * These tests are stubs — the reader/migrator they'll assert against lands
 * in Plan 21-04. Marked `it.skip` so this Wave 0 file still runs green.
 * The `-t "legacy snapshot"` filter in 21-VALIDATION.md resolves here.
 */
describe('legacy snapshot', () => {
  it.skip('treats legacy `cohort` field as `resourceTypes` (pending Plan 21-04)', () => {
    // TODO(Plan 21-04): Import migrateSnapshot (not yet implemented) from
    // ../trendsHistory and assert it promotes `cohort` → `resourceTypes`.
    //
    // Expected behaviour:
    //   Input:  { cohort: ['Patient','Observation'], resourceTypes: undefined }
    //   Output: { resourceTypes: ['Patient','Observation'] }  // legacy field dropped
    expect(true).toBe(true);
  });

  it.skip('leaves modern snapshots (with resourceTypes) untouched (pending Plan 21-04)', () => {
    // TODO(Plan 21-04): assert migrateSnapshot is idempotent — a snapshot
    // that already has `resourceTypes` is returned unchanged.
    expect(true).toBe(true);
  });
});
