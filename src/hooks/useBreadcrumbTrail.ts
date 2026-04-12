import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export interface BreadcrumbEntry {
  resourceType: string;
  id: string;
  label?: string;
}

/**
 * Manages a breadcrumb trail for reference navigation across both the
 * generic Resource Explorer and patient-centric browsing.
 *
 * Each push adds a new entry and navigates to that resource's detail URL.
 * navigateTo(index) slices the trail to that point and navigates back.
 * reset() clears the trail entirely.
 *
 * @param basePath URL prefix for resource detail navigation (default `/explorer`).
 *                 Phase 3 patient pages pass `/patients/:patientId` to keep users
 *                 inside patient context when following references.
 */
export function useBreadcrumbTrail(basePath: string = '/explorer') {
  const [trail, setTrail] = useState<BreadcrumbEntry[]>([]);
  const navigate = useNavigate();

  const push = useCallback(
    (entry: BreadcrumbEntry) => {
      setTrail((prev) => [...prev, entry]);
      navigate(`${basePath}/${entry.resourceType}/${entry.id}`);
    },
    [navigate, basePath]
  );

  const navigateTo = useCallback(
    (index: number) => {
      const entry = trail[index];
      if (entry) {
        setTrail((prev) => prev.slice(0, index + 1));
        navigate(`${basePath}/${entry.resourceType}/${entry.id}`);
      }
    },
    [navigate, trail, basePath]
  );

  const reset = useCallback(() => {
    setTrail([]);
  }, []);

  return { trail, push, navigateTo, reset };
}
