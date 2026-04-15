import { describe, it, expect } from 'vitest';
import { filterSnapshotsByServer, type QualitySnapshot } from '../trendsHistory';

function makeSnap(serverUrl: string, id: string): QualitySnapshot {
  return {
    id,
    capturedAt: '2026-04-14T18:30:42.123Z',
    serverUrl,
    sampleSize: 100,
    resourceTypes: [],
    cohortId: null,
    scores: {
      completeness: 90,
      coverage: 80,
      validation: 95,
      plausibility: 99,
      labRanges: 97,
      duplicates: 100,
      references: 98,
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
  };
}

describe('filterSnapshotsByServer', () => {
  it('returns only entries matching serverUrl exactly', () => {
    const snaps: QualitySnapshot[] = [
      makeSnap('http://a', '1'),
      makeSnap('http://b', '2'),
      makeSnap('http://a', '3'),
    ];
    const filtered = filterSnapshotsByServer(snaps, 'http://a');
    expect(filtered).toHaveLength(2);
    expect(filtered.every((s) => s.serverUrl === 'http://a')).toBe(true);
    expect(filtered.map((s) => s.id)).toEqual(['1', '3']);
  });

  it('uses exact string match (no prefix / trailing-slash normalization)', () => {
    const snaps: QualitySnapshot[] = [
      makeSnap('http://a/', '1'),
      makeSnap('http://a', '2'),
    ];
    // Filter for 'http://a' does NOT return 'http://a/'.
    const filtered = filterSnapshotsByServer(snaps, 'http://a');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('2');
  });

  it('returns [] for empty input', () => {
    expect(filterSnapshotsByServer([], 'http://a')).toEqual([]);
  });

  it('returns [] when the filter URL is not present', () => {
    const snaps: QualitySnapshot[] = [
      makeSnap('http://a', '1'),
      makeSnap('http://b', '2'),
    ];
    expect(filterSnapshotsByServer(snaps, 'http://c')).toEqual([]);
  });

  it('preserves the original order of matched entries', () => {
    const snaps: QualitySnapshot[] = [
      makeSnap('http://a', '1'),
      makeSnap('http://b', '2'),
      makeSnap('http://a', '3'),
      makeSnap('http://a', '4'),
    ];
    const filtered = filterSnapshotsByServer(snaps, 'http://a');
    expect(filtered.map((s) => s.id)).toEqual(['1', '3', '4']);
  });

  it('does not mutate the input array', () => {
    const snaps: QualitySnapshot[] = [makeSnap('http://a', '1'), makeSnap('http://b', '2')];
    const before = [...snaps];
    filterSnapshotsByServer(snaps, 'http://a');
    expect(snaps).toEqual(before);
  });
});
