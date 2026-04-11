import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export interface BreadcrumbEntry {
  resourceType: string;
  id: string;
  label?: string;
}

/**
 * Manages a breadcrumb trail for reference navigation in the Resource Explorer.
 *
 * Each push adds a new entry and navigates to that resource's detail URL.
 * navigateTo(index) slices the trail to that point and navigates back.
 * reset() clears the trail entirely.
 */
export function useBreadcrumbTrail() {
  const [trail, setTrail] = useState<BreadcrumbEntry[]>([]);
  const navigate = useNavigate();

  const push = useCallback(
    (entry: BreadcrumbEntry) => {
      setTrail((prev) => [...prev, entry]);
      navigate(`/explorer/${entry.resourceType}/${entry.id}`);
    },
    [navigate]
  );

  const navigateTo = useCallback(
    (index: number) => {
      setTrail((prev) => {
        const sliced = prev.slice(0, index + 1);
        const entry = sliced[sliced.length - 1];
        if (entry) {
          navigate(`/explorer/${entry.resourceType}/${entry.id}`);
        }
        return sliced;
      });
    },
    [navigate]
  );

  const reset = useCallback(() => {
    setTrail([]);
  }, []);

  return { trail, push, navigateTo, reset };
}
