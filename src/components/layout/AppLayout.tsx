import { AppShell } from '@mantine/core';
import { Outlet } from 'react-router-dom';
import { Sidebar, type ConnectionStatus } from './Sidebar';

interface AppLayoutProps {
  connectionStatus: ConnectionStatus;
}

export function AppLayout({ connectionStatus }: AppLayoutProps) {
  return (
    <AppShell
      navbar={{ width: 240, breakpoint: 0 }}
      padding="lg"
    >
      <AppShell.Navbar bg="gray.0">
        <Sidebar connectionStatus={connectionStatus} />
      </AppShell.Navbar>
      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
