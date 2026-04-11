import { Button, Group, Select, Text } from '@mantine/core';
import type { Bundle } from '@medplum/fhirtypes';

interface PaginationControlsProps {
  bundle: Bundle | undefined;
  currentCount: number;
  onPageChange: (url: string) => void;
  onCountChange: (count: number) => void;
  loading?: boolean;
}

/**
 * Pagination controls with Next/Previous buttons, page size selector,
 * and position display (D-07, D-08, D-09).
 *
 * Uses Bundle.link entries for navigation and Bundle.total for count display.
 * Page size is restricted to fixed options [10, 25, 50, 100] (T-02-06 mitigation).
 */
export function PaginationControls({
  bundle,
  currentCount,
  onPageChange,
  onCountChange,
  loading,
}: PaginationControlsProps) {
  const nextLink = bundle?.link?.find((l) => l.relation === 'next')?.url;
  const prevLink = bundle?.link?.find((l) => l.relation === 'previous' || l.relation === 'prev')?.url;
  const total = bundle?.total;
  const entryCount = bundle?.entry?.length ?? 0;

  // Calculate position display
  let positionText = '';
  if (entryCount > 0) {
    // Try to determine offset from self link or bundle context
    const selfLink = bundle?.link?.find((l) => l.relation === 'self')?.url;
    let offset = 0;
    if (selfLink) {
      const url = new URL(selfLink, 'http://localhost');
      const offsetParam = url.searchParams.get('__page-offset') ?? url.searchParams.get('_offset');
      if (offsetParam) {
        offset = parseInt(offsetParam, 10) || 0;
      }
    }

    positionText = `Showing ${offset + 1}-${offset + entryCount}`;
    if (total !== undefined) {
      positionText += ` of ${total}`;
    }
  }

  return (
    <Group justify="space-between" align="center">
      <Text size="sm" c="dimmed">
        {positionText}
      </Text>

      <Group gap="sm">
        <Button
          variant="default"
          size="sm"
          disabled={!prevLink || loading}
          onClick={() => prevLink && onPageChange(prevLink)}
        >
          Previous
        </Button>
        <Button
          variant="default"
          size="sm"
          disabled={!nextLink || loading}
          onClick={() => nextLink && onPageChange(nextLink)}
        >
          Next
        </Button>
      </Group>

      <Group gap="xs">
        <Text size="sm" c="dimmed">Results per page</Text>
        <Select
          data={['10', '25', '50', '100']}
          value={currentCount.toString()}
          onChange={(value) => {
            if (value) {
              onCountChange(parseInt(value, 10));
            }
          }}
          size="xs"
          style={{ width: 70 }}
          allowDeselect={false}
        />
      </Group>
    </Group>
  );
}
