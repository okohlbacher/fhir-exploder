import { AppShell, Box, Group, NavLink, Text } from '@mantine/core';
import {
  IconDatabase,
  IconUsers,
  IconChartBar,
  IconSettings,
} from '@tabler/icons-react';
import { NavLink as RouterNavLink, useLocation } from 'react-router-dom';

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';

interface SidebarProps {
  connectionStatus: ConnectionStatus;
}

const STATUS_CONFIG: Record<
  ConnectionStatus,
  { color: string; label: string; pulse: boolean }
> = {
  idle: { color: '#adb5bd', label: 'Not connected', pulse: false },
  connecting: { color: '#adb5bd', label: 'Connecting...', pulse: true },
  connected: { color: '#40c057', label: 'Connected', pulse: false },
  error: { color: '#fa5252', label: 'Disconnected', pulse: false },
};

const NAV_ITEMS = [
  { label: 'Explorer', icon: IconDatabase, to: '/explorer' },
  { label: 'Patients', icon: IconUsers, to: '/patients' },
  { label: 'Quality', icon: IconChartBar, to: '/quality' },
];

export function Sidebar({ connectionStatus }: SidebarProps) {
  const location = useLocation();
  const status = STATUS_CONFIG[connectionStatus];

  return (
    <>
      <AppShell.Section p="md">
        <Text fw={600} size="lg">
          FHIR Exploder
        </Text>
        <Group gap="xs" mt="xs">
          <Box
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: status.color,
              animation: status.pulse ? 'pulse 1.5s ease-in-out infinite' : undefined,
            }}
          />
          <Text size="xs" c="dimmed">
            {status.label}
          </Text>
        </Group>
      </AppShell.Section>

      <AppShell.Section grow>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            component={RouterNavLink}
            to={item.to}
            label={item.label}
            leftSection={<item.icon size={20} />}
            active={location.pathname === item.to}
          />
        ))}
      </AppShell.Section>

      <AppShell.Section>
        <NavLink
          component={RouterNavLink}
          to="/settings"
          label="Settings"
          leftSection={<IconSettings size={20} />}
          active={location.pathname === '/settings'}
        />
      </AppShell.Section>
    </>
  );
}
