/**
 * ReferenceLink — visual states for FHIR Reference rendering in HumanReadableView.
 *
 * Phase 47 / READ-01 (D-01, D-05). Replaces the inline Anchor branch in
 * ResourcePropertyTable.RenderValue (lines 86-100 pre-Phase-47).
 *
 * Visual states (per UI-SPEC §Component 1):
 *   pending:  raw `Type/id` text + adjacent Mantine Skeleton; non-clickable feel via dim color
 *   resolved: summarizeResource(target).primary; Tooltip(full ref); Anchor → /explorer/Type/id
 *   failed:   raw `Type/id` text; Tooltip(full ref); Anchor still navigable (deep-link works
 *             even if reference unresolvable in this Blaze instance)
 *
 * Click navigation: emits `<a href="/explorer/Type/id">` so the existing
 * ResourceDetailPage.handleReferenceClick (line 104) interceptor handles
 * routing + breadcrumb push without changes.
 *
 * Fragment refs (#contained-id): if `parentResource` is provided and contains
 * a matching contained[] entry, render that resource's summary inline (no fetch).
 * Otherwise, fall through to status='failed'.
 */
import { useCallback, type MouseEvent as ReactMouseEvent } from 'react';
import { Anchor, Group, Skeleton, Text, Tooltip } from '@mantine/core';
import type { Resource } from '@medplum/fhirtypes';
import { useReferenceResolver } from '../../hooks/useReferenceResolver';
import { summarizeResource } from '../../utils/summarizeResource';
import { normalizeReference } from '../../utils/referenceUrl';
import { usePeek } from '../../contexts/PeekContext';
import { useBasePath } from '../../contexts/BasePathContext';

export interface ReferenceLinkProps {
  /** The raw FHIR Reference.reference string (relative, absolute, or fragment). */
  reference: string;
  /** Optional Reference.display — surfaced in dim text only while NOT resolved. */
  display?: string;
  /** Parent resource — used to look up `#contained-id` refs in parent.contained[]. */
  parentResource?: Resource;
}

function findContained(
  parent: Resource | undefined,
  fragment: string,
): Resource | null {
  if (!parent) return null;
  const id = fragment.startsWith('#') ? fragment.slice(1) : fragment;
  const contained = (parent as { contained?: Resource[] }).contained ?? [];
  for (const c of contained) {
    if (c.id === id) return c;
  }
  return null;
}

export function ReferenceLink({
  reference,
  display,
  parentResource,
}: ReferenceLinkProps): JSX.Element {
  // CRITICAL: hooks must run unconditionally before ANY early return (Rules of
  // Hooks). For fragment refs we pass `undefined` so the hook short-circuits
  // to status='failed' without issuing a fetch.
  const isFragment = reference.startsWith('#');
  const { resource, status } = useReferenceResolver(
    isFragment ? undefined : reference,
  );

  // FIX-01 (D-04): the navigation base-path prefix from BasePathContext —
  // '/patients/${patientId}' inside a patient subtree, '/explorer' otherwise.
  // Used to build hrefs so middle-click (new tab) preserves patient context.
  const basePath = useBasePath();

  // PEEK-04 (D-01/D-02): Cmd/Ctrl+click on the Anchor opens the JSON peek
  // drawer. Plain click falls through to existing in-app navigation handled
  // by ResourceDetailPage.handleReferenceClick (Phase 47). The handler
  // factory is parameterized by the specific render-path target so the same
  // logic serves resolved / failed / fragment-resolved branches.
  //   - target = Resource → openPeek(target, ...)
  //   - target = null     → openPeekError(rawRef, ...)
  // pending branch renders <Text>, no Anchor, so no handler attached.
  const { openPeek, openPeekError } = usePeek();
  const handleAnchorClick = useCallback(
    (
      target: Resource | null,
      rawRef: string,
    ): ((e: ReactMouseEvent<HTMLAnchorElement>) => void) =>
      (e: ReactMouseEvent<HTMLAnchorElement>) => {
        if (!(e.metaKey || e.ctrlKey)) return; // plain click → fall through
        // Both required: stopPropagation prevents bubble to ResourceDetailPage
        // wrapper handler (would push breadcrumb + open drawer); preventDefault
        // prevents browser native navigation to anchor href.
        e.preventDefault();
        e.stopPropagation();
        const origin = document.activeElement as HTMLElement | null;
        if (target) {
          openPeek(target, origin);
        } else {
          openPeekError(rawRef, origin);
        }
      },
    [openPeek, openPeekError],
  );

  // Fragment refs: render from parentResource.contained[] without a fetch.
  if (isFragment) {
    const contained = findContained(parentResource, reference);
    if (contained) {
      const summary = summarizeResource(contained).primary;
      const href = contained.id
        ? `${basePath}/${contained.resourceType}/${contained.id}`
        : '#';
      return (
        <Tooltip label={reference} withArrow position="top" openDelay={400}>
          <Anchor
            size="sm"
            href={href}
            aria-label={`${reference} (${summary})`}
            onClick={handleAnchorClick(contained, reference)}
          >
            {summary}
          </Anchor>
        </Tooltip>
      );
    }
    // Unmatched fragment → failed-style raw text
    return (
      <Tooltip label={reference} withArrow position="top" openDelay={400}>
        <Text size="sm" c="dimmed">
          {reference}
        </Text>
      </Tooltip>
    );
  }

  const normalized = normalizeReference(reference);
  const slash = normalized?.indexOf('/') ?? -1;
  const type = normalized && slash >= 0 ? normalized.slice(0, slash) : '';
  const id = normalized && slash >= 0 ? normalized.slice(slash + 1) : '';
  const href = type && id ? `${basePath}/${type}/${id}` : reference;
  const rawText = normalized ?? reference;

  if (status === 'pending') {
    return (
      <Group gap="xs" wrap="nowrap">
        <Text size="sm" c="dimmed">
          {rawText}
        </Text>
        <Skeleton width={120} height={14} />
        {display && (
          <Text size="sm" c="dimmed">
            ({display})
          </Text>
        )}
      </Group>
    );
  }

  if (status === 'resolved' && resource) {
    const summary = summarizeResource(resource).primary;
    return (
      <Tooltip label={reference} withArrow position="top" openDelay={400}>
        <Anchor
          size="sm"
          href={href}
          aria-label={`${rawText} (${summary})`}
          onClick={handleAnchorClick(resource, rawText)}
        >
          {summary}
        </Anchor>
      </Tooltip>
    );
  }

  // status === 'failed' — deep-link still works, just without resolution.
  return (
    <Tooltip label={reference} withArrow position="top" openDelay={400}>
      <Group gap="xs" wrap="nowrap">
        <Anchor
          size="sm"
          href={href}
          aria-label={rawText}
          onClick={handleAnchorClick(null, rawText)}
        >
          {rawText}
        </Anchor>
        {display && (
          <Text size="sm" c="dimmed">
            ({display})
          </Text>
        )}
      </Group>
    </Tooltip>
  );
}
