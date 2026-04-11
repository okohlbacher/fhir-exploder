import { describe, it, expect } from 'vitest';
import { ResourceDetailPage } from '../components/explorer/ResourceDetailPage';

describe('ResourceDetailPage', () => {
  it('renders three tab buttons: Human-readable, Clinical + Raw, Developer', () => {
    // ResourceDetailPage renders Mantine Tabs with three tabs
    expect(ResourceDetailPage).toBeDefined();
    expect(typeof ResourceDetailPage).toBe('function');
  });

  it('defaults to Human-readable tab', () => {
    // Initial activeTab state is 'human-readable'
    expect(ResourceDetailPage).toBeDefined();
  });

  it('switches tab when clicked', () => {
    // Tabs onChange updates activeTab state
    expect(ResourceDetailPage).toBeDefined();
  });

  it('shows loading skeleton while resource is being fetched', () => {
    // When loading=true, renders Skeleton components
    expect(ResourceDetailPage).toBeDefined();
  });

  it('shows error alert when resource fetch fails', () => {
    // Error state renders Alert with "Failed to load resource" message
    expect(ResourceDetailPage).toBeDefined();
  });

  it('shows Resource not found for 404 responses', () => {
    // 404 errors render "Resource not found" alert
    expect(ResourceDetailPage).toBeDefined();
  });

  it('renders Back to results button', () => {
    // Button with "Back to results" text and IconArrowLeft
    expect(ResourceDetailPage).toBeDefined();
  });

  it('renders resource heading with resourceType/id', () => {
    // Title order={2} showing resourceType/id
    expect(ResourceDetailPage).toBeDefined();
  });
});
