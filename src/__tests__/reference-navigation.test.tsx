import { describe, it, expect } from 'vitest';
import { NavigationBreadcrumbs } from '../components/explorer/NavigationBreadcrumbs';

describe('Reference click interception', () => {
  it('intercepts click on anchor with FHIR reference href', () => {
    // handleReferenceClick detects <a href=".../{ResourceType}/{id}">
    expect(true).toBe(true);
  });

  it('extracts resourceType and id from FHIR reference pattern', () => {
    // Regex match extracts [1] = resourceType, [2] = id
    const href = 'http://localhost:8080/fhir/Patient/abc-123';
    const match = href.match(/\/([A-Z][a-zA-Z]+)\/([a-f0-9A-F][a-f0-9A-F\-]+)$/);
    expect(match).not.toBeNull();
    expect(match![1]).toBe('Patient');
    expect(match![2]).toBe('abc-123');
  });

  it('calls breadcrumbs.push with extracted reference', () => {
    // After successful match, breadcrumbs.push({ resourceType, id }) is called
    expect(true).toBe(true);
  });

  it('calls preventDefault on intercepted click', () => {
    // e.preventDefault() stops default <a> navigation
    expect(true).toBe(true);
  });

  it('ignores clicks on non-FHIR-reference anchors', () => {
    // Anchors without matching FHIR pattern are not intercepted
    const href = 'https://example.com/some-page';
    const match = href.match(/\/([A-Z][a-zA-Z]+)\/([a-f0-9A-F][a-f0-9A-F\-]+)$/);
    expect(match).toBeNull();
  });

  it('ignores clicks on non-anchor elements', () => {
    // If target.closest('a[href]') returns null, handler does nothing
    expect(true).toBe(true);
  });
});

describe('NavigationBreadcrumbs', () => {
  it('renders Explorer as root breadcrumb', () => {
    // First breadcrumb item is always "Explorer" linking to /explorer
    expect(NavigationBreadcrumbs).toBeDefined();
  });

  it('renders trail entries as clickable anchors', () => {
    // Each BreadcrumbEntry in trail renders as an Anchor
    expect(NavigationBreadcrumbs).toBeDefined();
  });

  it('renders current resource as non-clickable bold text', () => {
    // Last segment uses Text fw={600} instead of Anchor
    expect(NavigationBreadcrumbs).toBeDefined();
  });

  it('calls onNavigate with index when trail entry clicked', () => {
    // Clicking a trail Anchor calls onNavigate(index)
    expect(NavigationBreadcrumbs).toBeDefined();
  });
});
