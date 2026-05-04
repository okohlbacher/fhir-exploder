import { Button, Drawer, Group, Text } from '@mantine/core';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePeek } from '../../contexts/PeekContext';
import { useShortcuts } from '../../hooks/useShortcuts';
import { JsonViewer } from './JsonViewer';

/**
 * Right-side 420px JSON peek drawer (PEEK-01..03). Mounted at AppLayout via
 * <PeekProvider> so every route can call `usePeek().openPeek(resource)`
 * without prop drilling (CONTEXT D-08).
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
 */
export function JsonPeekDrawer() {
  const { peekState, opened, closePeek } = usePeek();
  const navigate = useNavigate();

  const handleOpenFull = useCallback(() => {
    if (!peekState) return;
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

  // Enter while drawer is open → navigate full. Skip when focus is on a
  // BUTTON or A element to prevent double-fire with [Open full →] click
  // (Pitfall 5). useShortcuts' built-in INPUT/TEXTAREA/SELECT guard handles
  // form-control focus.
  useShortcuts(
    {
      Enter: () => {
        const tag = document.activeElement?.tagName;
        if (tag === 'BUTTON' || tag === 'A') return;
        handleOpenFull();
      },
    },
    opened,
  );

  // Don't render the Drawer at all when there is no resource. Mantine
  // requires a non-empty title node — guarding here keeps the contract
  // simple and avoids a flash of "JSON peek" placeholder text.
  if (!peekState) return null;

  const { resourceType, id } = peekState.resource;

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
            {resourceType}/{id}
          </Text>
          <Button
            size="xs"
            variant="subtle"
            color="indigo"
            onClick={handleOpenFull}
          >
            Open full →
          </Button>
        </Group>
      }
    >
      <JsonViewer resource={peekState.resource} />
    </Drawer>
  );
}
