import { ScrollArea } from '@mantine/core';
import type { Resource } from '@medplum/fhirtypes';
import { JsonTreeView as TreeView } from '../explorer/JsonTreeView';

export interface JsonViewerProps {
  resource: Resource;
  /**
   * ScrollArea height. Defaults to '100%' for drawer context (PEEK-06).
   * Use `'calc(100vh - 250px)'` for the legacy DeveloperJsonView call site
   * to preserve the v1.7 ResourceDetailPage layout (Pitfall 7).
   */
  h?: string | number;
}

/**
 * Single source-of-truth FHIR JSON renderer (PEEK-06). Wraps the collapsible
 * tree viewer (color-coded leaves, expand/collapse) in a Mantine ScrollArea.
 * After this extraction:
 *   - DeveloperJsonView (legacy detail-page tab) consumes JsonViewer
 *   - JsonPeekDrawer (Phase 52 Plan 02) consumes JsonViewer with h='100%'
 *   - The underlying tree implementation is an internal detail and is NOT
 *     re-exported through this wrapper.
 *
 * PEEK-06 grep gate: this is the only non-definition file that imports the
 * underlying tree implementation. DeveloperJsonView must NOT import it directly.
 */
export function JsonViewer({ resource, h = '100%' }: JsonViewerProps) {
  return (
    <ScrollArea h={h}>
      <TreeView data={resource} />
    </ScrollArea>
  );
}
