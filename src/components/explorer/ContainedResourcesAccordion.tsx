/**
 * ContainedResourcesAccordion — inline render of `Resource.contained[]`.
 *
 * Phase 47 / READ-03 (D-08). Renders below the property table in
 * {@link HumanReadableView}, above the bottom resource-level
 * `<ExtensionsSection>`. Per UI-SPEC §Component 3:
 *
 *   - Mantine `<Accordion multiple variant="separated">`; collapsed by default
 *     (no default-value per Pitfall 6 — uncontrolled all-collapsed).
 *   - Header: `summarizeResource(c).primary` (D-08).
 *   - Panel: full `<ResourcePropertyTable resource={c} parentResource={parent} />`
 *     (no further drilldown).
 *   - Section heading "Contained Resources" appears only when at least one
 *     contained entry exists (UI-SPEC §When NOT to render).
 *
 * Q2 (RESEARCH.md): The terminology walker (`src/terminology/walker.ts`
 * `collectCodings`) is a generic depth-first walker over all object keys —
 * it DOES recurse into `contained[]` because contained values are nested
 * objects under the `contained` key. The parent's `useResolvedResource`
 * therefore handles terminology resolution for codings inside contained
 * resources transparently. Phase 47 does NOT re-wrap each accordion panel
 * in `useResolvedResource`. Verified at task start via:
 *
 *     $ grep -n "contained" src/terminology/walker.ts
 *     5: * `system: string` and `code: string`) contained within `value`. A shallow
 *
 * The walker has no key-based skip list; it walks every `child = v[key]`
 * recursively (line 30-31 of walker.ts).
 *
 * Q4 (D-09 cross-cut): The integration test
 * `HumanReadableView.read-phase.test.tsx` asserts this affordance renders
 * together with `<ReferenceLink>` (READ-01) and `<ExtensionChip>` (READ-02)
 * for a single fixture resource.
 *
 * Threats:
 *   - T-47-02 (DoS via pathological contained[] count): accept. Mantine
 *     Accordion renders only headers initially (panels mount lazily on
 *     expand). For typical FHIR data (N <= 50) the cost is negligible.
 *     Defensive `slice(0, 200)` cap NOT added in Phase 47 — flagged for
 *     HUMAN-UAT confirmation against live Blaze.
 *   - T-47-03 (XSS via header text): mitigated. Header text is rendered
 *     as a Mantine `<Text>` child string — React text-node escaping
 *     applies. NO raw-HTML injection sinks reachable.
 *   - T-47-07 (prototype pollution via contained[i]): mitigated. Bracket
 *     access `c.id`, `c.resourceType` only; no spread, no `Object.assign`.
 */
import { Accordion, Stack, Text } from '@mantine/core';
import type { Resource } from '@medplum/fhirtypes';
import { summarizeResource } from '../../utils/summarizeResource';
import { ResourcePropertyTable } from './ResourcePropertyTable';

export interface ContainedResourcesAccordionProps {
  resource: Resource;
}

export function ContainedResourcesAccordion({
  resource,
}: ContainedResourcesAccordionProps): JSX.Element | null {
  const contained = (resource as { contained?: Resource[] }).contained;
  if (!Array.isArray(contained) || contained.length === 0) return null;

  return (
    <Stack gap="xs">
      <Text size="sm" c="dimmed" tt="uppercase" mt="lg" mb="xs">
        Contained Resources
      </Text>
      <Accordion multiple variant="separated" radius="sm">
        {contained.map((c, i) => {
          // Pitfall 7: contained.id is technically required by FHIR but Blaze
          // (and other servers) sometimes return contained without id. Fall
          // back to a stable index-based key so React + Accordion don't
          // collide and the row still renders.
          const value = c.id ?? `idx-${i}`;
          const summary = summarizeResource(c).primary;
          return (
            <Accordion.Item key={value} value={value}>
              <Accordion.Control>
                <Text size="sm" fw={500}>
                  {c.resourceType} — {summary || '(no summary)'}
                </Text>
              </Accordion.Control>
              <Accordion.Panel>
                <ResourcePropertyTable resource={c} parentResource={resource} />
              </Accordion.Panel>
            </Accordion.Item>
          );
        })}
      </Accordion>
    </Stack>
  );
}
