import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Spotlight,
  closeSpotlight,
  type SpotlightActionData,
  type SpotlightActionGroupData,
} from '@mantine/spotlight';
import { useConnectionContext } from '../../contexts/ConnectionContext';
import { parseResourceTypes } from '../../fhir/capability';
import { CATEGORY_ORDER } from '../../utils/fhir-categories';

/**
 * Phase 56 SIDE-01 — global ⌘K command palette.
 * Mounted in AppLayout once; reachable from any descendant via openSpotlight().
 * Actions are lazy: empty until query.length >= 2 (D-03).
 * Groups follow CATEGORY_ORDER from fhir-categories.ts.
 */
export function AppSpotlight() {
  const navigate = useNavigate();
  const { state } = useConnectionContext();
  const [query, setQuery] = useState('');

  const parsedTypes = useMemo(
    () =>
      state.status === 'connected' ? parseResourceTypes(state.capability) : [],
    [state],
  );

  const groups: SpotlightActionGroupData[] = useMemo(() => {
    if (query.length < 2) return [];
    const q = query.toLowerCase();
    const matches = parsedTypes.filter((t) => t.type.toLowerCase().includes(q));
    if (matches.length === 0) return [];

    const byCategory = new Map<string, SpotlightActionData[]>();
    for (const t of matches) {
      const action: SpotlightActionData = {
        id: t.type,
        label: t.type,
        description: `View ${t.type} resources`,
        onClick: () => {
          navigate(`/explorer/${t.type}`);
          closeSpotlight();
        },
      };
      const arr = byCategory.get(t.category);
      if (arr) arr.push(action);
      else byCategory.set(t.category, [action]);
    }

    const ordered: SpotlightActionGroupData[] = [];
    for (const cat of CATEGORY_ORDER) {
      const actions = byCategory.get(cat);
      if (actions && actions.length > 0) {
        ordered.push({ group: cat, actions });
      }
    }
    for (const [cat, actions] of byCategory.entries()) {
      if (!CATEGORY_ORDER.includes(cat) && actions.length > 0) {
        ordered.push({ group: cat, actions });
      }
    }
    return ordered;
  }, [query, parsedTypes, navigate]);

  const notConnected = state.status !== 'connected';
  const nothingFoundLabel = notConnected
    ? 'Connect to a FHIR server to enable resource navigation'
    : query.length < 2
    ? 'Type 2+ characters to search resource types'
    : 'No matching resource types';

  return (
    <Spotlight
      shortcut="mod+K"
      actions={groups}
      query={query}
      onQueryChange={setQuery}
      nothingFound={nothingFoundLabel}
      highlightQuery
      searchProps={{ placeholder: 'Go to resource type…' }}
      scrollable
      maxHeight={400}
    />
  );
}
