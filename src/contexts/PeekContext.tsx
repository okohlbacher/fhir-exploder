import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useDisclosure } from '@mantine/hooks';
import type { Resource } from '@medplum/fhirtypes';

export interface PeekState {
  resource: Resource;
  originElement: HTMLElement | null;
}

export interface PeekContextValue {
  peekState: PeekState | null;
  opened: boolean;
  openPeek: (resource: Resource, originElement?: HTMLElement | null) => void;
  closePeek: () => void;
}

const PeekContext = createContext<PeekContextValue | null>(null);

/**
 * App-wide JSON peek drawer state. Mounted at AppLayout in Phase 52 Plan 02
 * so every route can call `usePeek().openPeek(resource)` without prop
 * drilling. The drawer renders inside the provider and stays mounted across
 * route changes (CONTEXT D-08).
 *
 * `originElement` is captured at openPeek time (D-15) so the consuming
 * drawer can call `originElement.focus()` after Esc to satisfy PEEK-02
 * focus-return.
 */
export function PeekProvider({ children }: { children: ReactNode }) {
  const [peekState, setPeekState] = useState<PeekState | null>(null);
  const [opened, { open, close }] = useDisclosure(false);

  const openPeek = useCallback(
    (resource: Resource, originElement?: HTMLElement | null) => {
      setPeekState({ resource, originElement: originElement ?? null });
      open();
    },
    [open],
  );

  const closePeek = useCallback(() => {
    close();
    // Note: focus restore is performed in JsonPeekDrawer.onClose using
    // peekState.originElement BEFORE peekState is cleared. We deliberately
    // keep peekState non-null after close so the drawer can read it.
  }, [close]);

  const value = useMemo<PeekContextValue>(
    () => ({ peekState, opened, openPeek, closePeek }),
    [peekState, opened, openPeek, closePeek],
  );

  return <PeekContext.Provider value={value}>{children}</PeekContext.Provider>;
}

export function usePeek(): PeekContextValue {
  const ctx = useContext(PeekContext);
  if (!ctx) throw new Error('usePeek must be used within PeekProvider');
  return ctx;
}
