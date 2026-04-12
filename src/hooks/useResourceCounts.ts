import { useState, useEffect, useRef } from 'react';
import type { MedplumClient } from '@medplum/core';
import type { ResourceType } from '@medplum/fhirtypes';

/** Maximum number of concurrent count requests to avoid overloading the server */
const CONCURRENCY = 4;

type CountValue = number | 'loading' | 'error';

/**
 * Lazy-load resource counts for a list of resource types.
 * Uses a concurrency limiter (max 4 simultaneous requests) and
 * Promise.allSettled so one failure doesn't block others.
 */
export function useResourceCounts(
  client: MedplumClient | null,
  resourceTypes: string[],
  /**
   * Optional token used to force re-fetch even when `resourceTypes` is
   * unchanged. Any caller can bump this to trigger the effect re-run
   * without relying on array-ordering tricks.
   */
  refetchKey: number = 0,
): Record<string, CountValue> {
  const [counts, setCounts] = useState<Record<string, CountValue>>({});
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;

    if (!client || resourceTypes.length === 0) {
      setCounts({});
      return;
    }

    // Initialize all types as 'loading'
    const initial: Record<string, CountValue> = {};
    for (const type of resourceTypes) {
      initial[type] = 'loading';
    }
    setCounts(initial);

    // Worker pool pattern with concurrency limit
    const queue = [...resourceTypes];
    let activeCount = 0;

    function processNext() {
      if (cancelledRef.current) return;

      while (activeCount < CONCURRENCY && queue.length > 0) {
        const type = queue.shift()!;
        activeCount++;

        fetchCount(client, type)
          .then((count) => {
            if (cancelledRef.current) return;
            setCounts(prev => ({ ...prev, [type]: count }));
          })
          .catch(() => {
            if (cancelledRef.current) return;
            setCounts(prev => ({ ...prev, [type]: 'error' }));
          })
          .finally(() => {
            activeCount--;
            processNext();
          });
      }
    }

    processNext();

    return () => {
      cancelledRef.current = true;
    };
  }, [client, resourceTypes.join(','), refetchKey]);

  return counts;
}

async function fetchCount(client: MedplumClient, resourceType: string): Promise<number> {
  const bundle = await client.search(resourceType as ResourceType, '_summary=count');
  return bundle.total ?? 0;
}
