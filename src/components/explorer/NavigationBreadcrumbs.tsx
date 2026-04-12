import { Breadcrumbs, Anchor, Text } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import type { BreadcrumbEntry } from '../../hooks/useBreadcrumbTrail';

export interface NavigationBreadcrumbsProps {
  trail: BreadcrumbEntry[];
  onNavigate: (index: number) => void;
  currentResourceType: string;
  currentId: string;
  basePath?: string;
}

/**
 * Clickable breadcrumb trail for reference navigation.
 *
 * Root anchor adapts to context (T-06-02 mitigation — rootHref is
 * constrained to one of two hardcoded literals via prefix check, never
 * passes `basePath` itself to navigate()):
 *   - basePath `/patients/:patientId` (or any `/patients/...` prefix) →
 *     "Patients" root linking to /patients (patient subtree)
 *   - else (default `/explorer`) → "Explorer" root linking to /explorer
 *
 * Shows: Root > ResourceType/id > ResourceType/id > current (bold, not clickable).
 * Clicking a segment navigates back to that resource via onNavigate callback.
 */
export function NavigationBreadcrumbs({
  trail,
  onNavigate,
  currentResourceType,
  currentId,
  basePath = '/explorer',
}: NavigationBreadcrumbsProps) {
  const navigate = useNavigate();

  const isPatientScope = basePath.startsWith('/patients/');
  const rootLabel = isPatientScope ? 'Patients' : 'Explorer';
  const rootHref = isPatientScope ? '/patients' : '/explorer';

  return (
    <Breadcrumbs separator=">">
      <Anchor size="sm" onClick={() => navigate(rootHref)}>
        {rootLabel}
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
