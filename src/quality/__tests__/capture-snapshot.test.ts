import { describe, it, expect } from 'vitest';
import type { MetricKey } from '../thresholds';
import {
  captureSnapshot,
  type MetricsReadSource,
  type CaptureSnapshotParams,
} from '../trendsHistory';

const UUID_V4_LIKE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const fullMetrics: MetricsReadSource = {
  overallCompleteness: 92.5,
  overallCoverage: 78,
  overallValidation: 99.1,
  overallPlausibility: 99.9,
  overallLabRanges: 97,
  overallDuplicates: 100,
  overallReferences: 98.4,
};

const fixedThreshold = (_k: MetricKey) => 80;

const baseParams = (over: Partial<CaptureSnapshotParams> = {}): CaptureSnapshotParams => ({
  metrics: fullMetrics,
  serverUrl: 'http://localhost:8080/fhir',
  sampleSize: 100,
  cohort: [],
  getActiveThreshold: fixedThreshold,
  ...over,
});

describe('captureSnapshot', () => {
  it('maps all 7 overall* metrics to scores (number values)', () => {
    const snap = captureSnapshot(baseParams());
    expect(snap.scores).toEqual({
      completeness: 92.5,
      coverage: 78,
      validation: 99.1,
      plausibility: 99.9,
      labRanges: 97,
      duplicates: 100,
      references: 98.4,
    });
    expect(Object.keys(snap.scores)).toHaveLength(7);
  });

  it('scores key order matches MetricKey union: completeness, coverage, validation, plausibility, labRanges, duplicates, references', () => {
    const snap = captureSnapshot(baseParams());
    expect(Object.keys(snap.scores)).toEqual([
      'completeness',
      'coverage',
      'validation',
      'plausibility',
      'labRanges',
      'duplicates',
      'references',
    ]);
  });

  it('coerces undefined metric to null', () => {
    const snap = captureSnapshot(
      baseParams({
        metrics: { ...fullMetrics, overallLabRanges: undefined },
      }),
    );
    expect(snap.scores.labRanges).toBeNull();
  });

  it('captures threshold: null (disabled metric) as null', () => {
    const snap = captureSnapshot(
      baseParams({
        getActiveThreshold: (k) => (k === 'validation' ? null : 80),
      }),
    );
    expect(snap.thresholds.validation).toBeNull();
    expect(snap.thresholds.completeness).toBe(80);
  });

  it('captures all 7 thresholds from getActiveThreshold', () => {
    const snap = captureSnapshot(baseParams());
    expect(Object.keys(snap.thresholds)).toHaveLength(7);
    expect(Object.values(snap.thresholds).every((t) => t === 80)).toBe(true);
  });

  it('generates a UUID-shaped id via crypto.randomUUID()', () => {
    const snap = captureSnapshot(baseParams());
    expect(snap.id).toMatch(UUID_V4_LIKE);
  });

  it('generates a distinct id for each call', () => {
    const a = captureSnapshot(baseParams());
    const b = captureSnapshot(baseParams());
    expect(a.id).not.toBe(b.id);
  });

  it('sets capturedAt to a valid ISO 8601 timestamp within 1s of Date.now()', () => {
    const before = Date.now();
    const snap = captureSnapshot(baseParams());
    const after = Date.now();
    const parsed = new Date(snap.capturedAt).getTime();
    expect(Number.isNaN(parsed)).toBe(false);
    expect(parsed).toBeGreaterThanOrEqual(before - 1000);
    expect(parsed).toBeLessThanOrEqual(after + 1000);
    // ISO 8601 UTC ends with Z
    expect(snap.capturedAt.endsWith('Z')).toBe(true);
  });

  it('passes through serverUrl, sampleSize, resourceTypes verbatim', () => {
    const cohort = ['Patient', 'Condition', 'Observation'];
    const snap = captureSnapshot(
      baseParams({
        serverUrl: 'https://blaze.mii.example.org/fhir',
        sampleSize: 500,
        cohort,
      }),
    );
    expect(snap.serverUrl).toBe('https://blaze.mii.example.org/fhir');
    expect(snap.sampleSize).toBe(500);
    // Plan 21-04: `cohort` legacy alias is still accepted but the stored
    // field is renamed to `resourceTypes`.
    expect(snap.resourceTypes).toEqual(['Patient', 'Condition', 'Observation']);
  });

  it('does not alias the caller resourceTypes array (defensive copy)', () => {
    const cohort = ['Patient'];
    const snap = captureSnapshot(baseParams({ cohort }));
    cohort.push('Condition');
    // Mutation of the caller array must not leak into the snapshot.
    expect(snap.resourceTypes).toEqual(['Patient']);
  });
});
