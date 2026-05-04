import { useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Card, Group, Loader, SimpleGrid, Text, Title } from '@mantine/core';
import { useMedplum } from '@medplum/react-hooks';
import type { Bundle, ResourceType } from '@medplum/fhirtypes';
import type { ReverseReferenceEntry } from '../../utils/reverseReferenceCatalog';
import { usePeek } from '../../contexts/PeekContext';

export interface RelatedResourcesPanelProps {
  title: string;
  entries: readonly ReverseReferenceEntry[];
  refValue: string;
  onCardNavigate: (entry: ReverseReferenceEntry) => string;
}

/**
 * Composite key for the `counts` Record. Catalog entries can share a target
 * ResourceType but differ in SearchParameter (e.g. Observation source-type:
 * has-member + derived-from). Using `${e.type}:${e.param}` instead of `e.type`
 * alone prevents parallel fetches from clobbering one another's count slot.
 * (Closes WR-01 from 48-VERIFICATION.md / 48-REVIEW.md.)
 */
const entryKey = (e: ReverseReferenceEntry) => `${e.type}:${e.param}`;

/**
 * Shared render component for reverse-reference / related-reference panels (D-04).
 *
 * Owns: parallel _summary=count fetch, in-flight skeleton, populated grid, click-navigate.
 * Knows nothing about Patient vs non-Patient — that is the wrapper's job (D-05 / D-06).
 *
 * Mirrors PatientRelatedResources.tsx render path byte-identical (UI-SPEC §"Card Anatomy").
 */
export function RelatedResourcesPanel({
  title,
  entries,
  refValue,
  onCardNavigate,
}: RelatedResourcesPanelProps) {
  const client = useMedplum();
  const navigate = useNavigate();
  const { openPeek, openPeekError } = usePeek();
  const [counts, setCounts] = useState<Record<string, number | 'loading'>>({});

  // PEEK-05 (D-11..D-14): Cmd/Ctrl+click on a populated Card fires a one-shot
  // searchResources(type, {param: refValue, _count: '1'}) and opens the JSON
  // peek drawer with the first result. Empty/rejected fetch → openPeekError
  // with the search URL as the drawer title (no toast per PEEK-04 contract).
  // Plain click preserves the existing navigate(onCardNavigate(e)) regression.
  //
  // Inlined as a simple async arrow inside the Card onClick rather than
  // useCallback because the JSX closure `(evt) => handleCardClick(evt, e)`
  // is recreated each render anyway; useCallback would be cosmetic here and
  // would need an eslint-disable for the `onCardNavigate` prop reference.
  // Documented per Plan §Action note "Alternative (simpler) approach".
  const handleCardClick = async (
    evt: ReactMouseEvent,
    e: ReverseReferenceEntry,
  ): Promise<void> => {
    if (evt.metaKey || evt.ctrlKey) {
      evt.stopPropagation();
      const c = counts[entryKey(e)];
      if (c === 'loading' || c === 0 || c === undefined) return;
      const origin = document.activeElement as HTMLElement | null;
      const refUrl = `${e.type}?${e.param}=${refValue}`;
      try {
        const results = await client.searchResources(e.type as ResourceType, {
          [e.param]: refValue,
          _count: '1',
        });
        const first = results[0];
        if (first) {
          openPeek(first, origin);
        } else {
          openPeekError(refUrl, origin);
        }
      } catch {
        openPeekError(refUrl, origin);
      }
      return;
    }
    // Plain click: existing in-app navigation.
    navigate(onCardNavigate(e));
  };

  useEffect(() => {
    let cancelled = false;
    const initial: Record<string, number | 'loading'> = {};
    for (const e of entries) initial[entryKey(e)] = 'loading';
    setCounts(initial);

    for (const e of entries) {
      const url = `${e.type}?${e.param}=${refValue}&_summary=count&_count=0`;
      client
        .get(client.fhirUrl(url).toString())
        .then((raw) => {
          if (cancelled) return;
          const bundle: Bundle = typeof raw === 'string' ? JSON.parse(raw) : raw;
          setCounts((prev) => ({ ...prev, [entryKey(e)]: bundle.total ?? 0 }));
        })
        .catch(() => {
          if (cancelled) return;
          setCounts((prev) => ({ ...prev, [entryKey(e)]: 0 }));
        });
    }

    return () => { cancelled = true; };
  }, [client, refValue, entries]);

  const populated = useMemo(
    () => entries.filter((e) => typeof counts[entryKey(e)] === 'number' && (counts[entryKey(e)] as number) > 0),
    [counts, entries],
  );

  const loading = Object.values(counts).some((c) => c === 'loading');

  if (!loading && populated.length === 0) return null;

  return (
    <div>
      <Title order={5} mb="sm">{title}</Title>
      <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }}>
        {loading &&
          populated.length === 0 &&
          entries.slice(0, 4).map((e) => (
            <Card key={entryKey(e)} withBorder padding="sm">
              <Group justify="space-between">
                <Text size="sm">{e.type}</Text>
                <Loader size="xs" />
              </Group>
            </Card>
          ))}
        {populated.map((e) => (
          <Card
            key={entryKey(e)}
            withBorder
            padding="sm"
            style={{ cursor: 'pointer' }}
            onClick={(evt) => {
              void handleCardClick(evt, e);
            }}
          >
            <Group justify="space-between">
              <Group gap="xs">
                {e.icon && <Text size="sm">{e.icon}</Text>}
                <Text size="sm" fw={500}>{e.type}</Text>
              </Group>
              <Badge size="sm" variant="light" color="blue">
                {(counts[entryKey(e)] as number).toLocaleString()}
              </Badge>
            </Group>
          </Card>
        ))}
      </SimpleGrid>
    </div>
  );
}
