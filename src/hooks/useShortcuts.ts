import { useEffect, useRef } from 'react';

/**
 * Shared keyboard-shortcut hook. Mirrors the input-focus guard pattern from
 * src/components/explorer/ResourceDetailPage.tsx:77-94 — skips when the
 * focused element is INPUT, TEXTAREA, or SELECT (no key conflicts with form
 * controls).
 *
 * Phase 52 ships this as the foundation; Phases 54 (mode keys 1/2/3/4) and
 * 56 (⌘K palette trigger) extend it. Per CONTEXT D-13, the existing raw
 * listener in ResourceDetailPage is NOT migrated in Phase 52.
 *
 * Pitfall 4 (RESEARCH): the shortcuts object is stored in a ref so the
 * effect dep array stays `[enabled]` — re-creating the shortcuts object on
 * every render does NOT re-register the listener.
 */
export function useShortcuts(
  shortcuts: Record<string, () => void>,
  enabled = true,
): void {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  useEffect(() => {
    if (!enabled) return;
    function handleKeyDown(e: KeyboardEvent) {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const handler = shortcutsRef.current[e.key];
      if (handler) handler();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled]);
}
