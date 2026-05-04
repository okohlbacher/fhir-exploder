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
  resource: Resource | null;
  originElement: HTMLElement | null;
  /**
   * When `resource` is `null`, this is the unresolvable reason — the literal
   * UI-SPEC string `'Reference unresolvable'` (PEEK-04, D-03/D-04). The
   * drawer body branches on `resource === null` to render this state.
   */
  error?: string;
  /**
   * When `resource` is `null`, this is the raw FHIR reference text the user
   * tried to open (e.g. `'Patient/abc-123'`). Drawer title falls back to
   * this string in monospace when there is no real resource to title with.
   */
  referenceText?: string;
}

export interface PeekContextValue {
  peekState: PeekState | null;
  opened: boolean;
  openPeek: (resource: Resource, originElement?: HTMLElement | null) => void;
  /**
   * Opens the peek drawer in the failed-reference error state. Called from
   * Plan 02 call sites (ReferenceLink Cmd+click on failed status,
   * RelatedResourcesPanel empty/rejected fetch). Sets
   * `{ resource: null, error: 'Reference unresolvable', referenceText }`
   * atomically and opens the drawer (PEEK-04, threat T-53-02).
   */
  openPeekError: (
    reference: string,
    originElement?: HTMLElement | null,
  ) => void;
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

  const openPeekError = useCallback(
    (reference: string, originElement?: HTMLElement | null) => {
      // Atomic transition: resource set to null AND error/referenceText set
      // together (T-53-02 — no partial state where a stale non-null resource
      // could be read while error is set).
      setPeekState({
        resource: null,
        originElement: originElement ?? null,
        error: 'Reference unresolvable',
        referenceText: reference,
      });
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
    () => ({ peekState, opened, openPeek, openPeekError, closePeek }),
    [peekState, opened, openPeek, openPeekError, closePeek],
  );

  return <PeekContext.Provider value={value}>{children}</PeekContext.Provider>;
}

export function usePeek(): PeekContextValue {
  const ctx = useContext(PeekContext);
  if (!ctx) throw new Error('usePeek must be used within PeekProvider');
  return ctx;
}
