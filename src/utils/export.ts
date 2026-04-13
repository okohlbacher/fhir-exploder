import type { Resource } from '@medplum/fhirtypes';
import { toRecord } from './fhir-helpers';

/**
 * Convert FHIR resources to CSV string.
 *
 * Extracts all unique top-level keys across resources as columns.
 * Nested objects are JSON-stringified. Arrays are joined with "; ".
 */
export function resourcesToCSV(resources: Resource[]): string {
  if (resources.length === 0) return '';

  // Collect all unique keys across all resources
  const keySet = new Set<string>();
  for (const r of resources) {
    for (const key of Object.keys(r)) {
      keySet.add(key);
    }
  }
  const keys = Array.from(keySet).sort();

  // Header row
  const rows: string[] = [keys.map(escapeCSV).join(',')];

  // Data rows
  for (const r of resources) {
    const row = keys.map((key) => {
      const val = toRecord(r)[key];
      if (val === undefined || val === null) return '';
      if (typeof val === 'string') return escapeCSV(val);
      if (typeof val === 'number' || typeof val === 'boolean') return String(val);
      if (Array.isArray(val)) {
        return escapeCSV(val.map((v) => (typeof v === 'object' ? JSON.stringify(v) : String(v))).join('; '));
      }
      return escapeCSV(JSON.stringify(val));
    });
    rows.push(row.join(','));
  }

  return rows.join('\n');
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Convert FHIR resources to NDJSON (one JSON object per line).
 */
export function resourcesToNDJSON(resources: Resource[]): string {
  return resources.map((r) => JSON.stringify(r)).join('\n');
}

/**
 * Trigger a browser file download from a string content.
 */
export function downloadString(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
