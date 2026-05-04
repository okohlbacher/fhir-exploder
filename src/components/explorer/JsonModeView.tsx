/**
 * JSON mode toolbar + line-numbered JsonViewer for the 4-mode resource shell
 * (SHELL-04, D-07).
 *
 * Renders above the JsonViewer:
 *   Left:  Copy + Download buttons
 *   Right: Structural-validation chip (teal=0 issues / yellow=N issues /
 *          gray=pending or not validated) + "Open in validator" link
 *
 * All operations are local-only (Copy uses Clipboard API, Download uses
 * downloadString from export.ts, validation is offline via createStructuralBackend).
 * No PHI is transmitted externally.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Anchor, Badge, Button, Group, Stack, Tooltip } from '@mantine/core';
import { IconCopy, IconDownload } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import type { Resource } from '@medplum/fhirtypes';
import { JsonViewer } from '../json/JsonViewer';
import { downloadString } from '../../utils/export';
import { createStructuralBackend } from '../../quality/structuralValidator';
import { getProfileForType } from '../../quality/profiles';

export interface JsonModeViewProps {
  resource: Resource;
}

export function JsonModeView({ resource }: JsonModeViewProps) {
  // Create the structural backend once; it is synchronous internally
  // but returns a Promise-typed API (Pattern 5 from 54-RESEARCH.md).
  const backend = useMemo(() => createStructuralBackend(getProfileForType), []);

  // Determine once per resource whether we have a bundled profile for it.
  // When false, chip shows "Not validated" (gray) — no profile → no validation.
  const hasProfile = useMemo(
    () => getProfileForType(resource.resourceType) !== null,
    [resource.resourceType],
  );

  // null  = pending (chip shows "…")
  // number = resolved issue count
  const [issueCount, setIssueCount] = useState<number | null>(null);

  useEffect(() => {
    if (!hasProfile) {
      setIssueCount(null); // chip stays in "Not validated" state (hasProfile=false branch)
      return;
    }
    let cancelled = false;
    setIssueCount(null); // reset to pending while validating new resource
    backend.validate(resource).then((issues) => {
      if (!cancelled) setIssueCount(issues.length);
    });
    return () => {
      cancelled = true;
    };
  }, [resource, backend, hasProfile]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(resource, null, 2));
      notifications.show({
        title: 'Copied to clipboard',
        message: `${resource.resourceType}/${resource.id}`,
        color: 'teal',
      });
    } catch {
      notifications.show({
        title: 'Copy failed',
        message:
          'Clipboard access was denied. Try Cmd/Ctrl+C after selecting the JSON manually.',
        color: 'red',
      });
    }
  }, [resource]);

  const handleDownload = useCallback(() => {
    downloadString(
      JSON.stringify(resource, null, 2),
      `${resource.resourceType}-${resource.id}.json`,
      'application/json',
    );
  }, [resource]);

  // Chip state machine (D-07 + UI-SPEC §Color validation chip semantic colors)
  let chipText: string;
  let chipColor: 'gray' | 'teal' | 'yellow';
  let tooltipText: string;

  if (!hasProfile) {
    chipText = 'Not validated';
    chipColor = 'gray';
    tooltipText =
      'Structural validation against bundled MII profile. No profile bundled for this resource type.';
  } else if (issueCount === null) {
    chipText = '…';
    chipColor = 'gray';
    tooltipText = 'Structural validation against bundled MII profile.';
  } else if (issueCount === 0) {
    chipText = '0 issues';
    chipColor = 'teal';
    tooltipText = 'Structural validation against bundled MII profile.';
  } else {
    chipText = `${issueCount} ${issueCount === 1 ? 'issue' : 'issues'}`;
    chipColor = 'yellow';
    tooltipText = 'Structural validation against bundled MII profile.';
  }

  return (
    <Stack gap="sm">
      <Group justify="space-between">
        <Group gap="xs">
          <Button
            size="xs"
            variant="light"
            leftSection={<IconCopy size={14} />}
            onClick={handleCopy}
          >
            Copy
          </Button>
          <Button
            size="xs"
            variant="light"
            leftSection={<IconDownload size={14} />}
            onClick={handleDownload}
          >
            Download
          </Button>
        </Group>
        <Group gap="sm">
          <Tooltip label={tooltipText} withArrow>
            <Badge variant="light" color={chipColor}>
              {chipText}
            </Badge>
          </Tooltip>
          <Anchor component={Link} to="/quality" size="sm">
            Open in validator
          </Anchor>
        </Group>
      </Group>
      {/* showLineNumbers prop added in Task 4 — typecheck will enforce it */}
      <JsonViewer resource={resource} h="calc(100vh - 320px)" showLineNumbers />
    </Stack>
  );
}
