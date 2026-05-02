import { describe, it, expect } from 'vitest';
import type {
  Condition,
  Encounter,
  Observation,
  Procedure,
  Resource,
} from '@medplum/fhirtypes';

import {
  extractDate,
  formatTimelineDate,
} from '../utils/timeline-utils';
import { summarizeResource } from '../utils/summarizeResource';

// ---------------------------------------------------------------------------
// extractDate
// ---------------------------------------------------------------------------

describe('extractDate', () => {
  it('returns onsetDateTime for Condition with onsetDateTime', () => {
    const condition: Condition = {
      resourceType: 'Condition',
      subject: { reference: 'Patient/x' },
      onsetDateTime: '2024-03-15T10:30:00Z',
      recordedDate: '2024-03-14T00:00:00Z',
    };
    expect(extractDate(condition)).toBe('2024-03-15T10:30:00Z');
  });

  it('falls back to recordedDate for Condition without onsetDateTime', () => {
    const condition: Condition = {
      resourceType: 'Condition',
      subject: { reference: 'Patient/x' },
      recordedDate: '2024-03-14T00:00:00Z',
    };
    expect(extractDate(condition)).toBe('2024-03-14T00:00:00Z');
  });

  it('falls back to onsetPeriod.start for Condition with only onsetPeriod', () => {
    const condition: Condition = {
      resourceType: 'Condition',
      subject: { reference: 'Patient/x' },
      onsetPeriod: { start: '2023-01-01' },
    };
    expect(extractDate(condition)).toBe('2023-01-01');
  });

  it('returns period.start for Encounter', () => {
    const encounter: Encounter = {
      resourceType: 'Encounter',
      status: 'finished',
      class: { code: 'AMB' },
      period: { start: '2024-02-01T08:00:00Z' },
    };
    expect(extractDate(encounter)).toBe('2024-02-01T08:00:00Z');
  });

  it('returns performedDateTime for Procedure', () => {
    const procedure: Procedure = {
      resourceType: 'Procedure',
      status: 'completed',
      subject: { reference: 'Patient/x' },
      performedDateTime: '2024-05-20T09:00:00Z',
    };
    expect(extractDate(procedure)).toBe('2024-05-20T09:00:00Z');
  });

  it('falls back to performedPeriod.start for Procedure without performedDateTime', () => {
    const procedure: Procedure = {
      resourceType: 'Procedure',
      status: 'completed',
      subject: { reference: 'Patient/x' },
      performedPeriod: { start: '2024-06-01' },
    };
    expect(extractDate(procedure)).toBe('2024-06-01');
  });

  it('returns effectiveDateTime for Observation', () => {
    const obs: Observation = {
      resourceType: 'Observation',
      status: 'final',
      code: { text: 'Glucose' },
      effectiveDateTime: '2024-07-01T12:00:00Z',
    };
    expect(extractDate(obs)).toBe('2024-07-01T12:00:00Z');
  });

  it('falls back to effectivePeriod.start for Observation without effectiveDateTime', () => {
    const obs: Observation = {
      resourceType: 'Observation',
      status: 'final',
      code: { text: 'Glucose' },
      effectivePeriod: { start: '2024-07-02T12:00:00Z' },
    };
    expect(extractDate(obs)).toBe('2024-07-02T12:00:00Z');
  });

  it('falls back to issued as last resort for Observation', () => {
    const obs: Observation = {
      resourceType: 'Observation',
      status: 'final',
      code: { text: 'Glucose' },
      issued: '2024-07-03T12:00:00Z',
    };
    expect(extractDate(obs)).toBe('2024-07-03T12:00:00Z');
  });

  it('returns undefined for a resource with no date fields', () => {
    const condition: Condition = {
      resourceType: 'Condition',
      subject: { reference: 'Patient/x' },
    };
    expect(extractDate(condition)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// summarizeResource(timeline-context).primary
// (Phase 51 / GAP-1: timeline call sites consume the canonical summary util.)
// ---------------------------------------------------------------------------

describe('summarizeResource(timeline-context).primary', () => {
  it('returns code.text for Condition', () => {
    const condition: Condition = {
      resourceType: 'Condition',
      subject: { reference: 'Patient/x' },
      code: { text: 'Diabetes mellitus Typ 2' },
    };
    expect(summarizeResource(condition).primary).toBe('Diabetes mellitus Typ 2');
  });

  it('falls back to code.coding[0].display for Condition', () => {
    const condition: Condition = {
      resourceType: 'Condition',
      subject: { reference: 'Patient/x' },
      code: {
        coding: [{ system: 'http://snomed.info/sct', code: '44054006', display: 'Diabetes type 2' }],
      },
    };
    expect(summarizeResource(condition).primary).toBe('Diabetes type 2');
  });

  it('returns type[0].text for Encounter (when class.display is absent)', () => {
    const encounter: Encounter = {
      resourceType: 'Encounter',
      status: 'finished',
      class: { code: 'AMB' },
      type: [{ text: 'Ambulanter Kontakt' }],
    };
    expect(summarizeResource(encounter).primary).toBe('Ambulanter Kontakt');
  });

  it('returns empty string fallback when Condition has no code/text/display', () => {
    const condition: Condition = {
      resourceType: 'Condition',
      subject: { reference: 'Patient/x' },
    };
    expect(summarizeResource(condition).primary).toBe('');
  });

  it('returns resource summary for Procedure', () => {
    const procedure: Procedure = {
      resourceType: 'Procedure',
      status: 'completed',
      subject: { reference: 'Patient/x' },
      code: { text: 'Appendektomie' },
    };
    expect(summarizeResource(procedure).primary).toBe('Appendektomie');
  });

  it('returns resource summary for Observation', () => {
    const obs: Observation = {
      resourceType: 'Observation',
      status: 'final',
      code: { text: 'Hämoglobin' },
    };
    expect(summarizeResource(obs).primary).toBe('Hämoglobin');
  });

  it('returns id (or empty string) for unknown resource types via generic walker', () => {
    const resource = {
      resourceType: 'Consent',
      id: 'consent-42',
    } as unknown as Resource;
    expect(summarizeResource(resource).primary).toBe('consent-42');
  });

  it('Encounter — class.display wins over type[0].text (canonical order; GAP-1 fix)', () => {
    const encounter: Encounter = {
      resourceType: 'Encounter',
      status: 'finished',
      class: { code: 'AMB', display: 'Ambulant' },
      type: [{ text: 'Other Type' }],
    };
    expect(summarizeResource(encounter).primary).toBe('Ambulant');
  });
});

// ---------------------------------------------------------------------------
// formatTimelineDate
// ---------------------------------------------------------------------------

describe('formatTimelineDate', () => {
  it('extracts YYYY-MM-DD from a full ISO datetime string', () => {
    expect(formatTimelineDate('2024-03-15T10:30:00Z')).toBe('2024-03-15');
  });

  it('returns date-only input unchanged', () => {
    expect(formatTimelineDate('2024-03-15')).toBe('2024-03-15');
  });
});
