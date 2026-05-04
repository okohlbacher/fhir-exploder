/**
 * JsonPeekDrawer unit tests (PEEK-01..03).
 *
 * Plan 02 replaced the Wave 0 null stub with the real Mantine Drawer
 * implementation. The previously-skipped tests are now active.
 *
 * SearchResultsPage J-shortcut integration tests live in a separate file:
 * src/__tests__/peek-srp-integration.test.tsx
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { PeekProvider, usePeek } from '../contexts/PeekContext';
import { JsonPeekDrawer } from '../components/json/JsonPeekDrawer';

// ---------------------------------------------------------------------------
// Mantine / jsdom polyfills
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Mock react-router-dom useNavigate
// ---------------------------------------------------------------------------

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// ---------------------------------------------------------------------------
// Test harness
// ---------------------------------------------------------------------------

function Harness({ children }: { children: React.ReactNode }) {
  return (
    // env="test" disables Mantine Transition animations so drawers mount/unmount
    // synchronously in jsdom — no transitionend required (see Transition.mjs).
    <MantineProvider env="test">
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('JsonPeekDrawer (PEEK-01..03)', () => {
  const sample = { resourceType: 'Patient', id: 'pat-1' };

  it('renders nothing when peekState is null', () => {
    render(
      <Harness>
        <Opener resource={sample} />
      </Harness>,
    );
    // Before openPeek is called the drawer does not exist in the DOM
    expect(screen.queryByText('Patient/pat-1')).toBeNull();
  });

  it('opens drawer with resourceType/id title when openPeek is called (PEEK-01)', () => {
    render(
      <Harness>
        <Opener resource={sample} />
      </Harness>,
    );
    fireEvent.click(screen.getByText('open'));
    expect(screen.getByText('Patient/pat-1')).toBeTruthy();
  });

  it('Esc closes the drawer (PEEK-02)', async () => {
    render(
      <Harness>
        <Opener resource={sample} />
      </Harness>,
    );
    fireEvent.click(screen.getByText('open'));
    // Drawer title visible after open
    expect(screen.getByText('Patient/pat-1')).toBeTruthy();
    // Fire keydown on document.body (an Element) so event.target has getAttribute
    // Mantine's useWindowEvent listener (capture:true) should receive this
    await act(async () => {
      fireEvent.keyDown(document.body, { key: 'Escape' });
    });
    // After Esc: closePeek() sets opened=false. The Mantine Drawer's
    // Transition removes the content from DOM (keepMounted=false default).
    // The title Text element should be gone.
    expect(screen.queryByText('Patient/pat-1')).toBeNull();
  });

  it('shows Open full → button when drawer is open (PEEK-03)', () => {
    render(
      <Harness>
        <Opener resource={sample} />
      </Harness>,
    );
    fireEvent.click(screen.getByText('open'));
    expect(screen.getByRole('button', { name: /Open full →/ })).toBeTruthy();
  });

  it('content swaps without unmounting when openPeek is called with a different resource (PEEK-02)', () => {
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
    expect(screen.getByText('Patient/a')).toBeTruthy();
    fireEvent.click(screen.getByText('b'));
    expect(screen.getByText('Patient/b')).toBeTruthy();
    expect(screen.queryByText('Patient/a')).toBeNull();
  });

  it('focuses the originElement after Esc closes the drawer (PEEK-02)', async () => {
    // Create an element that can receive focus
    const opener = document.createElement('button');
    opener.textContent = 'origin-btn';
    document.body.appendChild(opener);

    function OpenerWithOrigin({ resource }: { resource: any }) {
      const { openPeek } = usePeek();
      return (
        <button
          id="origin-btn"
          onClick={() => openPeek(resource, opener)}
        >
          open-with-origin
        </button>
      );
    }

    render(
      <Harness>
        <OpenerWithOrigin resource={sample} />
      </Harness>,
    );

    fireEvent.click(screen.getByText('open-with-origin'));
    expect(screen.getByText('Patient/pat-1')).toBeTruthy();

    // Fire keydown on document.body (an Element) so event.target has getAttribute
    fireEvent.keyDown(document.body, { key: 'Escape' });

    // queueMicrotask fires after current microtask queue flushes
    await act(async () => {
      await Promise.resolve();
    });

    expect(document.activeElement).toBe(opener);

    document.body.removeChild(opener);
  });

  it('Enter while drawer open navigates to ?mode=json (PEEK-03)', () => {
    mockNavigate.mockClear();
    render(
      <Harness>
        <Opener resource={sample} />
      </Harness>,
    );
    fireEvent.click(screen.getByText('open'));
    expect(screen.getByText('Patient/pat-1')).toBeTruthy();

    // Press Enter with body focused (not on a BUTTON or A)
    // body.tagName === 'BODY' — the BUTTON/A guard should not fire
    fireEvent.keyDown(document, { key: 'Enter' });

    expect(mockNavigate).toHaveBeenCalledWith('/explorer/Patient/pat-1?mode=json');
  });

  it('Enter does NOT navigate when focus is on a BUTTON (Pitfall 5)', () => {
    mockNavigate.mockClear();
    render(
      <Harness>
        <Opener resource={sample} />
      </Harness>,
    );
    fireEvent.click(screen.getByText('open'));

    // Focus the "Open full →" button so activeElement.tagName === 'BUTTON'
    const btn = screen.getByRole('button', { name: /Open full →/ });
    btn.focus();

    fireEvent.keyDown(document, { key: 'Enter' });

    // The Enter shortcut should be suppressed — only the button's own onClick fires
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('clicking [Open full →] navigates to ?mode=json (PEEK-03)', () => {
    mockNavigate.mockClear();
    render(
      <Harness>
        <Opener resource={sample} />
      </Harness>,
    );
    fireEvent.click(screen.getByText('open'));

    const btn = screen.getByRole('button', { name: /Open full →/ });
    fireEvent.click(btn);

    expect(mockNavigate).toHaveBeenCalledWith('/explorer/Patient/pat-1?mode=json');
  });
});
