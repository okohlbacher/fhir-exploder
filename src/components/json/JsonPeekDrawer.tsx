import { Button, Drawer, Group, Text } from '@mantine/core';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePeek } from '../../contexts/PeekContext';
import { useShortcuts } from '../../hooks/useShortcuts';
import { JsonViewer } from './JsonViewer';

/**
 * Right-side 420px JSON peek drawer (PEEK-01..04). Mounted at AppLayout via
 * <PeekProvider> so every route can call `usePeek().openPeek(resource)` or
 * `usePeek().openPeekError(reference)` without prop drilling (CONTEXT D-08).
 *
 * Locked Mantine config (CONTEXT D-09 + UI-SPEC):
 *   position="right" · size={420} · trapFocus={true} · withOverlay={false}
 *   returnFocus={false} (manual focus return via originElement, see RESEARCH
 *   §Anti-patterns) · closeOnEscape={true} (default) · keepMounted={false}
 *
 * Focus return (PEEK-02): the originating <tr> element is captured at
 * openPeek call time and stored in peekState.originElement. handleClose
 * focuses that element AFTER calling closePeek so the drawer's trapFocus
 * doesn't fight the restoration.
 *
 * Enter handling (PEEK-03 + Pitfall 5): the global Enter listener navigates
 * to ?mode=json — but the same listener fires when the [Open full →] button
 * is focused, which would double-navigate. Guard against BUTTON/A focus.
 *
 * Error state (PEEK-04, D-05): when peekState.resource === null, the body
 * renders `<Text c="dimmed">Reference unresolvable</Text>`, the title falls
 * back to peekState.referenceText (monospace), the [Open full →] button is
 * hidden, and the Enter shortcut is a no-op (T-53-04 cleaner UX guard).
 */
export function JsonPeekDrawer() {
  const { peekState, opened, closePeek } = usePeek();
  const navigate = useNavigate();

  // Compute error flag inline so it's available in both the useShortcuts
  // closure (BEFORE early return — Rules of Hooks) and the render branches.
  // When peekState is null the drawer doesn't render anyway, so isError=false
  // is the correct fallback.
  const isError = peekState?.resource === null;

  const handleOpenFull = useCallback(() => {
    // Guard both peekState and peekState.resource — Phase 53 Plan 01 widened
    // resource to Resource | null for the openPeekError flow (PEEK-04).
    if (!peekState || !peekState.resource) return;
    const { resourceType, id } = peekState.resource;
    navigate(`/explorer/${resourceType}/${id}?mode=json`);
    closePeek();
  }, [peekState, navigate, closePeek]);

  const handleClose = useCallback(() => {
    const origin = peekState?.originElement;
    closePeek();
    // Restore focus AFTER Mantine releases trapFocus. Use queueMicrotask so
    // it runs after React's commit but before the next paint — visually
    // synchronous, but ordered after closePeek state update.
    queueMicrotask(() => {
      origin?.focus();
    });
  }, [peekState, closePeek]);

  // Enter while drawer is open → navigate full. Skip when in error state
  // (PEEK-04, threat T-53-04) AND when focus is on a BUTTON/A element to
  // prevent double-fire with [Open full →] click (Pitfall 5).
  // useShortcuts' built-in INPUT/TEXTAREA/SELECT guard handles form-control
  // focus.
  useShortcuts(
    {
      Enter: () => {
        if (isError) return;
        const tag = document.activeElement?.tagName;
        if (tag === 'BUTTON' || tag === 'A') return;
        handleOpenFull();
      },
    },
    opened,
  );

  // Don't render the Drawer at all when there is no peekState. Mantine
  // requires a non-empty title node — guarding here keeps the contract
  // simple and avoids a flash of "JSON peek" placeholder text.
  if (!peekState) return null;

  // Title text: resourceType/id in success state, referenceText fallback in
  // error state. Mantine <Text> escapes HTML (T-53-01) so even malicious
  // reference strings render as literal text.
  const titleText = isError
    ? peekState.referenceText ?? 'Reference'
    : `${peekState.resource!.resourceType}/${peekState.resource!.id}`;

  return (
    <Drawer
      opened={opened}
      onClose={handleClose}
      position="right"
      size={420}
      trapFocus
      withOverlay={false}
      returnFocus={false}
      padding="md"
      title={
        <Group justify="space-between" gap="sm" wrap="nowrap" w="100%">
          <Text size="sm" ff="monospace" fw={600}>
            {titleText}
          </Text>
          {!isError && (
            <Button
              size="xs"
              variant="subtle"
              color="indigo"
              onClick={handleOpenFull}
            >
              Open full →
            </Button>
          )}
        </Group>
      }
    >
      {isError ? (
        <Text c="dimmed">Reference unresolvable</Text>
      ) : (
        <JsonViewer resource={peekState.resource!} />
      )}
    </Drawer>
  );
}
