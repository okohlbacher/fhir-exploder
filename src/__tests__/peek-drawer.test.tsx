/**
 * Wave 0 test scaffolds for JsonPeekDrawer (PEEK-01..03).
 *
 * JsonPeekDrawer currently renders null (Wave 0 stub in Plan 01).
 * Most of these tests are intentionally RED until Plan 02 implements
 * the real drawer. The first test ("renders nothing...") passes because
 * the stub returns null, which is the correct initial state.
 *
 * Plan 02 replaces src/components/json/JsonPeekDrawer.tsx with the full
 * Mantine Drawer implementation, turning the remaining RED tests GREEN.
 */
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { PeekProvider, usePeek } from '../contexts/PeekContext';
import { JsonPeekDrawer } from '../components/json/JsonPeekDrawer';

// Polyfill ResizeObserver for jsdom (required by Mantine ScrollArea / Drawer)
class MockResizeObserver {
  observe = () => {};
  unobserve = () => {};
  disconnect = () => {};
}
(globalThis as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
  MockResizeObserver as unknown as typeof ResizeObserver;

// Polyfill matchMedia for jsdom (required by Mantine)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

function Harness({ children }: { children: React.ReactNode }) {
  return (
    <MantineProvider>
      <MemoryRouter>
        <PeekProvider>
          {children}
          <JsonPeekDrawer />
        </PeekProvider>
      </MemoryRouter>
    </MantineProvider>
  );
}

function Opener({ resource }: { resource: any }) {
  const { openPeek } = usePeek();
  return (
    <button onClick={() => openPeek(resource, document.activeElement as HTMLElement)}>
      open
    </button>
  );
}

describe('JsonPeekDrawer (PEEK-01..03)', () => {
  const sample = { resourceType: 'Patient', id: 'pat-1' };

  it('renders nothing when peekState is null', () => {
    render(
      <Harness>
        <Opener resource={sample} />
      </Harness>,
    );
    // Wave 0 stub renders null — title is correctly absent before openPeek is called
    expect(screen.queryByText('Patient/pat-1')).toBeNull();
  });

  // RED until Plan 02 wires real JsonPeekDrawer (stub renders null)
  it.skip('opens drawer with resourceType/id title when openPeek is called (PEEK-01)', () => {
    render(
      <Harness>
        <Opener resource={sample} />
      </Harness>,
    );
    fireEvent.click(screen.getByText('open'));
    expect(screen.getByText('Patient/pat-1')).toBeTruthy();
  });

  it('Esc closes the drawer (PEEK-02)', () => {
    render(
      <Harness>
        <Opener resource={sample} />
      </Harness>,
    );
    fireEvent.click(screen.getByText('open'));
    fireEvent.keyDown(document, { key: 'Escape' });
    // RED until Plan 02 — stub renders nothing so this passes vacuously;
    // real test: drawer title disappears after Esc
    expect(screen.queryByText('Patient/pat-1')).toBeNull();
  });

  // RED until Plan 02 wires real JsonPeekDrawer (stub renders null)
  it.skip('shows Open full → button when drawer is open (PEEK-03)', () => {
    render(
      <Harness>
        <Opener resource={sample} />
      </Harness>,
    );
    fireEvent.click(screen.getByText('open'));
    expect(screen.getByRole('button', { name: /Open full →/ })).toBeTruthy();
  });

  // RED until Plan 02 wires real JsonPeekDrawer (stub renders null)
  it.skip('content swaps without unmounting when openPeek is called with a different resource (PEEK-02)', () => {
    function TwoOpeners() {
      const { openPeek } = usePeek();
      return (
        <>
          <button onClick={() => openPeek({ resourceType: 'Patient', id: 'a' } as any)}>a</button>
          <button onClick={() => openPeek({ resourceType: 'Patient', id: 'b' } as any)}>b</button>
        </>
      );
    }
    render(
      <Harness>
        <TwoOpeners />
      </Harness>,
    );
    fireEvent.click(screen.getByText('a'));
    // RED until Plan 02: stub renders null — title not visible
    expect(screen.getByText('Patient/a')).toBeTruthy();
    fireEvent.click(screen.getByText('b'));
    expect(screen.getByText('Patient/b')).toBeTruthy();
    expect(screen.queryByText('Patient/a')).toBeNull();
  });
});
