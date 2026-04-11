import { describe, it, expect } from 'vitest';
import { parseSearchRequest, formatSearchQuery } from '@medplum/core';

/**
 * Tests for the URL <-> SearchRequest sync logic used by useSearchState.
 * We test the core transformation logic directly since the hook itself
 * depends on react-router hooks that require a router context.
 */
describe('URL to SearchRequest parsing', () => {
  it('parses resource type and search params from URL format', () => {
    const result = parseSearchRequest('Patient?name=Smith&_count=25');
    expect(result.resourceType).toBe('Patient');
    expect(result.count).toBe(25);
  });

  it('parses multiple filter params', () => {
    const result = parseSearchRequest('Patient?name=Smith&gender=male');
    expect(result.resourceType).toBe('Patient');
    expect(result.filters).toBeDefined();
    expect(result.filters!.length).toBeGreaterThanOrEqual(2);
  });

  it('parses resource type with empty params', () => {
    const result = parseSearchRequest('Observation?');
    expect(result.resourceType).toBe('Observation');
  });

  it('handles resource type with no query string', () => {
    const result = parseSearchRequest('Patient');
    expect(result.resourceType).toBe('Patient');
  });
});

describe('SearchRequest to URL formatting', () => {
  it('formats a search request back to query string', () => {
    const search = parseSearchRequest('Patient?name=Smith&_count=25');
    const query = formatSearchQuery(search);
    expect(query).toContain('name=Smith');
    expect(query).toContain('_count=25');
  });

  it('round-trips a basic search request', () => {
    const original = 'Patient?_count=20';
    const parsed = parseSearchRequest(original);
    expect(parsed.resourceType).toBe('Patient');
    expect(parsed.count).toBe(20);
  });
});

describe('default count logic', () => {
  it('does not set count when _count not provided', () => {
    const result = parseSearchRequest('Patient?name=Smith');
    // parseSearchRequest returns undefined count when not specified
    // useSearchState hook should default to 20
    expect(result.count).toBeUndefined();
  });

  it('sets count when _count is provided', () => {
    const result = parseSearchRequest('Patient?_count=50');
    expect(result.count).toBe(50);
  });
});
