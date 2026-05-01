/**
 * Phase 47 / Plan 01 / Task 2 (Wave 0) — useReferenceResolver hook tests.
 *
 * Asserts the 5 D-09 READ-01 cache states + D-04 normalization +
 * T-47-01 validation gate + StrictMode-safe dedup. The hook is the SINGLE
 * consumer-facing API per D-03; the underlying Map MUST stay private.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React, { StrictMode } from 'react';
import {
  useReferenceResolver,
  __resetReferenceCache,
} from '../useReferenceResolver';

const mockReadResource = vi.fn();
const notificationsShow = vi.fn();

vi.mock('@medplum/react-hooks', () => ({
  useMedplum: () => ({ readResource: mockReadResource }),
}));
vi.mock('@mantine/notifications', () => ({
  notifications: { show: notificationsShow },
}));

beforeEach(() => {
  __resetReferenceCache();
  mockReadResource.mockReset();
  notificationsShow.mockReset();
});

describe('useReferenceResolver', () => {
  it('cache miss: pending → resolved', async () => {
    mockReadResource.mockResolvedValue({ resourceType: 'Patient', id: 'x' });
    const { result } = renderHook(() => useReferenceResolver('Patient/x'));
    expect(result.current.status).toBe('pending');
    await waitFor(() => expect(result.current.status).toBe('resolved'));
    expect(result.current.resource).toEqual({ resourceType: 'Patient', id: 'x' });
    expect(mockReadResource).toHaveBeenCalledTimes(1);
  });

  it('cache hit: second consumer is synchronous, no extra fetch', async () => {
    mockReadResource.mockResolvedValue({ resourceType: 'Patient', id: 'x' });
    const a = renderHook(() => useReferenceResolver('Patient/x'));
    await waitFor(() => expect(a.result.current.status).toBe('resolved'));
    const b = renderHook(() => useReferenceResolver('Patient/x'));
    expect(b.result.current.status).toBe('resolved');
    expect(mockReadResource).toHaveBeenCalledTimes(1);
  });

  it('404 fallback: silent, no toast', async () => {
    mockReadResource.mockRejectedValue(
      Object.assign(new Error('Not found'), { status: 404 }),
    );
    const { result } = renderHook(() => useReferenceResolver('Patient/missing'));
    await waitFor(() => expect(result.current.status).toBe('failed'));
    expect(result.current.resource).toBeNull();
    expect(notificationsShow).not.toHaveBeenCalled();
  });

  it('network error fallback: silent, no console.error', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockReadResource.mockRejectedValue(new TypeError('NetworkError'));
    const { result } = renderHook(() => useReferenceResolver('Patient/y'));
    await waitFor(() => expect(result.current.status).toBe('failed'));
    expect(errSpy).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it('concurrent dedup: two simultaneous mounts → ONE fetch', async () => {
    let resolveFn: (v: unknown) => void = () => {};
    mockReadResource.mockImplementation(
      () =>
        new Promise((res) => {
          resolveFn = res;
        }),
    );
    const a = renderHook(() => useReferenceResolver('Patient/x'));
    const b = renderHook(() => useReferenceResolver('Patient/x'));
    expect(a.result.current.status).toBe('pending');
    expect(b.result.current.status).toBe('pending');
    expect(mockReadResource).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolveFn({ resourceType: 'Patient', id: 'x' });
    });
    await waitFor(() => expect(a.result.current.status).toBe('resolved'));
    expect(b.result.current.status).toBe('resolved');
  });

  it('D-04 normalization: absolute URL shares cache with relative', async () => {
    mockReadResource.mockResolvedValue({ resourceType: 'Patient', id: 'x' });
    const a = renderHook(() =>
      useReferenceResolver('http://blaze:8080/fhir/Patient/x'),
    );
    await waitFor(() => expect(a.result.current.status).toBe('resolved'));
    const b = renderHook(() => useReferenceResolver('Patient/x'));
    expect(b.result.current.status).toBe('resolved');
    expect(mockReadResource).toHaveBeenCalledTimes(1);
  });

  it('fragment ref: status=failed synchronously, no fetch', () => {
    const { result } = renderHook(() => useReferenceResolver('#sub-1'));
    expect(result.current.status).toBe('failed');
    expect(mockReadResource).not.toHaveBeenCalled();
  });

  it('urn ref: status=failed synchronously, no fetch', () => {
    const { result } = renderHook(() => useReferenceResolver('urn:uuid:abc'));
    expect(result.current.status).toBe('failed');
    expect(mockReadResource).not.toHaveBeenCalled();
  });

  it('invalid FHIR id: status=failed, no fetch (T-47-01 defense)', async () => {
    const { result } = renderHook(() =>
      useReferenceResolver('Patient/has spaces'),
    );
    // 'Patient/has spaces' passes normalizeReference (segs.length === 2),
    // but isValidFhirReference rejects it. Hook caches null synchronously.
    await waitFor(() => expect(result.current.status).toBe('failed'));
    expect(mockReadResource).not.toHaveBeenCalled();
  });

  it('StrictMode double-mount: still single fetch', async () => {
    mockReadResource.mockResolvedValue({ resourceType: 'Patient', id: 'x' });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <StrictMode>{children}</StrictMode>
    );
    const { result } = renderHook(() => useReferenceResolver('Patient/x'), {
      wrapper,
    });
    await waitFor(() => expect(result.current.status).toBe('resolved'));
    expect(mockReadResource).toHaveBeenCalledTimes(1);
  });

  it('__resetReferenceCache clears state between tests', async () => {
    mockReadResource.mockResolvedValue({ resourceType: 'Patient', id: 'reset-test' });
    const a = renderHook(() => useReferenceResolver('Patient/reset-test'));
    await waitFor(() => expect(a.result.current.status).toBe('resolved'));
    expect(mockReadResource).toHaveBeenCalledTimes(1);

    __resetReferenceCache();
    mockReadResource.mockClear();

    const b = renderHook(() => useReferenceResolver('Patient/reset-test'));
    expect(b.result.current.status).toBe('pending');
    await waitFor(() => expect(b.result.current.status).toBe('resolved'));
    expect(mockReadResource).toHaveBeenCalledTimes(1);
  });
});
