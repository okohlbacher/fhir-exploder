import { ScrollArea } from '@mantine/core';
import type { Resource } from '@medplum/fhirtypes';
import { JsonTreeView as TreeView } from '../explorer/JsonTreeView'; // UNCHANGED — PEEK-06 invariant
import { tokenize, TOKEN_COLORS } from '../explorer/JsonSyntaxHighlight'; // NEW for showLineNumbers branch

export interface JsonViewerProps {
  resource: Resource;
  /**
   * ScrollArea height. Defaults to '100%' for drawer context (PEEK-06).
   * Use `'calc(100vh - 320px)'` for JsonModeView call site (SHELL-04)
   * to preserve the ResourceDetailPage layout (Pitfall 7).
   */
  h?: string | number;
  /**
   * Render flat line-numbered JSON instead of collapsible tree. Used by JSON
   * mode (SHELL-04). When false (default), the existing tree view is rendered —
   * PEEK drawer call sites are unaffected.
   *
   * Phase 54 (SHELL-04): showLineNumbers={true} renders a flat tokenized <pre>
   * with a numbered gutter (Option A from 54-RESEARCH.md). The JsonTreeView
   * import above is unchanged — PEEK-06 single-source-of-truth invariant
   * preserved.
   */
  showLineNumbers?: boolean;
}

/**
 * Single source-of-truth FHIR JSON renderer (PEEK-06). Wraps the collapsible
 * tree viewer (color-coded leaves, expand/collapse) in a Mantine ScrollArea.
 * After this extraction:
 *   - JsonModeView (Phase 54 SHELL-04 detail-page JSON tab) consumes JsonViewer with showLineNumbers
 *   - JsonPeekDrawer (Phase 52 Plan 02) consumes JsonViewer with h='100%'
 *   - The underlying tree implementation is an internal detail and is NOT
 *     re-exported through this wrapper.
 *
 * PEEK-06 grep gate: this is the only non-definition file that imports the
 * underlying tree implementation. JsonModeView must NOT import it directly.
 *
 * Phase 54: showLineNumbers={true} adds a flat <pre> with numbered gutter;
 * the tree mode (default false) is unchanged so drawer call sites are unaffected.
 */
export function JsonViewer({ resource, h = '100%', showLineNumbers = false }: JsonViewerProps) {
  return (
    <ScrollArea h={h}>
      {showLineNumbers ? renderLineNumberedJson(resource) : <TreeView data={resource} />}
    </ScrollArea>
  );
}

/**
 * Renders a flat tokenized <pre> with a left-gutter line-number column.
 * Uses the existing JsonSyntaxHighlight tokenizer (TOKEN_COLORS) so no new
 * color tokens are introduced. Per-line re-tokenization is acceptable for
 * Phase 54 (noted in 54-RESEARCH.md §JSON Mode Line Numbers Option A).
 *
 * NOT exported — internal to JsonViewer to preserve the PEEK-06 single-source-
 * of-truth invariant (one JSON renderer component in the app).
 */
function renderLineNumberedJson(resource: Resource): JSX.Element {
  const text = JSON.stringify(resource, null, 2);
  const lines = text.split('\n');

  return (
    <pre
      style={{
        margin: 0,
        fontFamily:
          'var(--font-mono, "IBM Plex Mono", ui-monospace, SFMono-Regular, monospace)',
        fontSize: 13,
        lineHeight: 1.5,
        padding: '8px 0',
      }}
    >
      {lines.map((lineText, i) => (
        <div
          key={i}
          style={{ display: 'grid', gridTemplateColumns: '48px 1fr', columnGap: 8 }}
        >
          <span style={{ color: '#adb5bd', textAlign: 'right', userSelect: 'none' }}>
            {i + 1}
          </span>
          <span>
            {tokenize(lineText).map((t, j) => (
              <span key={j} style={{ color: TOKEN_COLORS[t.type] }}>
                {t.value}
              </span>
            ))}
          </span>
        </div>
      ))}
    </pre>
  );
}
