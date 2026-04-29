/**
 * QualityByTypeMatrix.csvExport.test.tsx — Plan 41-03 Task 4.
 *
 * Locks the QUAL-03 CSV export contract via the two pure helpers exported
 * from QualityByTypeMatrix.tsx:
 *   - buildMatrixCsvFilename(serverUrl, now?) → quality-matrix-{host}-{date}.csv
 *   - buildMatrixCsv(rows) → UTF-8 BOM + header + per-row CSV body
 *
 * D-21 from .planning/phases/41-explorer-quality-ux-polish/41-CONTEXT.md.
 *
 * Pure unit tests — no React rendering needed. Helpers are imported from
 * QualityByTypeMatrix.tsx (no separate module — keeps the surface localized
 * per D-19).
 */
import { describe, it, expect } from 'vitest';
import {
  buildMatrixCsv,
  buildMatrixCsvFilename,
  type MatrixRow,
} from '../QualityByTypeMatrix';

function row(partial: Partial<MatrixRow> & { type: string }): MatrixRow {
  return {
    countLoading: false,
    completeness: undefined,
    coverage: undefined,
    validation: undefined,
    references: undefined,
    dup: undefined,
    issues: undefined,
    ...partial,
  };
}

describe('QualityByTypeMatrix CSV export — QUAL-03', () => {
  describe('buildMatrixCsvFilename', () => {
    it('Test 1 — sanitizes localhost host with port', () => {
      const fn = buildMatrixCsvFilename(
        'http://localhost:8080/fhir/',
        new Date('2026-04-29T12:00:00Z'),
      );
      expect(fn).toBe('quality-matrix-localhost-8080-2026-04-29.csv');
    });

    it('Test 2 — matches the locked regex', () => {
      const fn = buildMatrixCsvFilename(
        'https://blaze.example.com/fhir/',
        new Date('2026-12-31T00:00:00Z'),
      );
      expect(fn).toMatch(/^quality-matrix-[a-z0-9.\-]+-\d{4}-\d{2}-\d{2}\.csv$/);
    });

    it('Test 3 — falls back to "unknown" host for invalid URL', () => {
      const fn = buildMatrixCsvFilename(
        'not a url',
        new Date('2026-04-29T12:00:00Z'),
      );
      expect(fn).toBe('quality-matrix-unknown-2026-04-29.csv');
    });

    it('Test 3b — UTC date used (independent of local TZ)', () => {
      // 23:30 in UTC of the 28th — local TZ might roll to the 29th but UTC stays.
      const fn = buildMatrixCsvFilename(
        'http://localhost:8080/fhir/',
        new Date('2026-04-28T23:30:00Z'),
      );
      expect(fn).toBe('quality-matrix-localhost-8080-2026-04-28.csv');
    });
  });

  describe('buildMatrixCsv', () => {
    it('Test 4 — output starts with UTF-8 BOM (U+FEFF)', () => {
      const csv = buildMatrixCsv([]);
      expect(csv.charCodeAt(0)).toBe(0xfeff);
    });

    it('Test 8 — header order is locked', () => {
      const csv = buildMatrixCsv([]);
      const firstLine = csv.replace(/^﻿/, '').split('\n')[0];
      expect(firstLine).toBe(
        'Resource type,Complete %,Coverage %,Validation %,References %,Dup,Issues',
      );
    });

    it('Test 5 — sparse cells render as empty strings (NOT 0%)', () => {
      const csv = buildMatrixCsv([row({ type: 'Consent' })]);
      const lines = csv.replace(/^﻿/, '').split('\n');
      // 6 trailing empty fields: Complete,Coverage,Validation,References,Dup,Issues
      expect(lines[1]).toBe('Consent,,,,,,');
      // Pitfall P-05 mirror: NEVER render 0% for sparse cells.
      expect(lines[1]).not.toContain('0%');
      expect(lines[1]).not.toContain(',0,');
    });

    it('Test 6 — populated cells render as bare numeric strings (no % suffix)', () => {
      const csv = buildMatrixCsv([
        row({
          type: 'Patient',
          completeness: 80,
          coverage: 90,
          validation: 95,
          references: 100,
          dup: 2,
          issues: 5,
        }),
      ]);
      const lines = csv.replace(/^﻿/, '').split('\n');
      expect(lines[1]).toBe('Patient,80,90,95,100,2,5');
      expect(lines[1]).not.toContain('%');
    });

    it('Test 7 — loading rows are omitted from the export', () => {
      const csv = buildMatrixCsv([
        row({
          type: 'Patient',
          completeness: 80,
          coverage: 90,
          validation: 95,
          references: 100,
          dup: 2,
          issues: 5,
        }),
        row({ type: 'LoadingType', countLoading: true }),
      ]);
      const lines = csv.replace(/^﻿/, '').split('\n');
      expect(lines).toHaveLength(2); // header + 1 data row (Loading skipped)
      expect(lines[1]).toBe('Patient,80,90,95,100,2,5');
      expect(csv).not.toContain('LoadingType');
    });

    it('Test 9 — types containing comma are CSV-escaped', () => {
      const csv = buildMatrixCsv([row({ type: 'Comma,Type' })]);
      const lines = csv.replace(/^﻿/, '').split('\n');
      expect(lines[1]).toBe('"Comma,Type",,,,,,');
    });

    it('Test 9b — types containing quotes are CSV-escaped', () => {
      const csv = buildMatrixCsv([row({ type: 'Quote"Type' })]);
      const lines = csv.replace(/^﻿/, '').split('\n');
      expect(lines[1]).toBe('"Quote""Type",,,,,,');
    });

    it('Test 10 — mixed sparse + populated rows render correctly', () => {
      const csv = buildMatrixCsv([
        row({
          type: 'Patient',
          completeness: 80,
          coverage: 90,
          validation: 95,
          references: 100,
          dup: 2,
          issues: 5,
        }),
        row({ type: 'Consent', completeness: 60 }), // others sparse
        row({ type: 'Observation' }), // all sparse
      ]);
      const lines = csv.replace(/^﻿/, '').split('\n');
      expect(lines).toHaveLength(4);
      expect(lines[1]).toBe('Patient,80,90,95,100,2,5');
      expect(lines[2]).toBe('Consent,60,,,,,');
      expect(lines[3]).toBe('Observation,,,,,,');
    });
  });
});
