import { Breadcrumbs, Anchor, Text } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import type { BreadcrumbEntry } from '../../hooks/useBreadcrumbTrail';

export interface NavigationBreadcrumbsProps {
  trail: BreadcrumbEntry[];
  onNavigate: (index: number) => void;
  currentResourceType: string;
  currentId: string;
}

/**
 * Clickable breadcrumb trail for reference navigation in the Resource Explorer.
 *
 * Shows: Explorer > ResourceType/id > ResourceType/id > current (bold, not clickable).
 * Clicking a segment navigates back to that resource via onNavigate callback.
 */
export function NavigationBreadcrumbs({
  trail,
  onNavigate,
  currentResourceType,
  currentId,
}: NavigationBreadcrumbsProps) {
  const navigate = useNavigate();

  return (
    <Breadcrumbs separator=">">
      <Anchor size="sm" onClick={() => navigate('/explorer')}>
        Explorer
      </Anchor>
      {trail.map((entry, index) => (
        <Anchor key={index} size="sm" onClick={() => onNavigate(index)}>
          {entry.label ?? `${entry.resourceType}/${entry.id}`}
        </Anchor>
      ))}
      <Text fw={600} size="sm">
        {currentResourceType}/{currentId}
      </Text>
    </Breadcrumbs>
  );
}
