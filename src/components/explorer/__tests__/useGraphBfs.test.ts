/**
 * Phase 49 — Plan 02 Task 02 (BFS unit tests).
 *
 * 3 unit tests covering the mandatory D-20 BFS contract:
 *   1. BFS depth-cap (refuses traversal beyond depth 3, even when caller passes 10)
 *   2. BFS node-count cap (hard-cap at 150 nodes with truncation flag)
 *   5. Parallel fetch fanout (Promise.all-style — N refs trigger N parallel readResource calls)
 *
 * These pure-function tests exercise `runGraphBfs(client, root, depth)` directly
 * — no React, no providers — closing VALIDATION rows 49-02-01 + 49-02-02 + 49-02-03
 * and mitigating threat T-49-02-01 (DoS via BFS explosion).
 */
import { describe, it, expect, vi } from 'vitest';
import type { MedplumClient } from '@medplum/core';
import type { Resource } from '@medplum/fhirtypes';
import { runGraphBfs } from '../useGraphBfs';

describe('useGraphBfs depth cap', () => {
  it('BFS depth cap — refuses to traverse beyond depth 3 even when caller passes 10', async () => {
    // 10-deep linked Observation chain. Each Resource at level N has subject → level N+1.
    const mockClient = {
      readResource: vi.fn().mockImplementation((_type: string, id: string) =>
        Promise.resolve({
          resourceType: 'Observation',
          id,
          subject:
            id === '10' ? undefined : { reference: `Observation/${Number(id) + 1}` },
        } as Resource),
      ),
      fhirUrl: vi.fn((url: string) => ({
        toString: () => `http://test/fhir/${url}`,
      })),
      get: vi
        .fn()
        .mockResolvedValue({ resourceType: 'Bundle', total: 0, entry: [] }),
    } as unknown as MedplumClient;

    const root: Resource = {
      resourceType: 'Observation',
      id: '0',
      subject: { reference: 'Observation/1' },
    } as Resource;

    const { nodes } = await runGraphBfs(mockClient, root, 10); // caller passes 10

    // Hard cap at 3 → 4 nodes total (root + level 1 + level 2 + level 3).
    expect(nodes.size).toBe(4);
    const readMock = mockClient.readResource as ReturnType<typeof vi.fn>;
    expect(readMock).toHaveBeenCalledWith('Observation', '1');
    expect(readMock).toHaveBeenCalledWith('Observation', '2');
    expect(readMock).toHaveBeenCalledWith('Observation', '3');
    expect(readMock).not.toHaveBeenCalledWith('Observation', '4');
    expect(readMock).not.toHaveBeenCalledWith('Observation', '5');
  });
});

describe('useGraphBfs node count cap', () => {
  it('BFS node count cap — hard-caps total node count at 150', async () => {
    const mockClient = {
      fhirUrl: vi.fn((url: string) => ({
        toString: () => `http://test/fhir/${url}`,
      })),
      get: vi.fn().mockImplementation((url: string) => {
        // Patient incoming fan: 200 Observations.
        if (url.includes('Observation?patient=')) {
          return Promise.resolve({
            resourceType: 'Bundle',
            total: 200,
            entry: Array.from({ length: 200 }, (_, i) => ({
              resource: { resourceType: 'Observation', id: `obs-${i}` },
            })),
          });
        }
        return Promise.resolve({ resourceType: 'Bundle', total: 0, entry: [] });
      }),
      readResource: vi.fn(),
    } as unknown as MedplumClient;

    const root: Resource = { resourceType: 'Patient', id: 'p1' } as Resource;

    const { nodes, truncated } = await runGraphBfs(mockClient, root, 1);
    expect(nodes.size).toBe(150); // hard cap (149 + root)
    expect(truncated).toBe(true);
  });
});

describe('useGraphBfs parallel fetch fanout', () => {
  it('parallel fetch fanout — issues all 5 outgoing-ref fetches in parallel, not serialized', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const mockClient = {
      fhirUrl: vi.fn((url: string) => ({
        toString: () => `http://test/fhir/${url}`,
      })),
      get: vi
        .fn()
        .mockResolvedValue({ resourceType: 'Bundle', total: 0, entry: [] }),
      readResource: vi.fn().mockImplementation(() => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        return new Promise((resolve) =>
          setTimeout(() => {
            inFlight -= 1;
            resolve({ resourceType: 'Patient', id: `p-${Math.random()}` });
          }, 20),
        );
      }),
    } as unknown as MedplumClient;

    const root: Resource = {
      resourceType: 'Observation',
      id: 'o1',
      subject: { reference: 'Patient/p1' },
      encounter: { reference: 'Encounter/e1' },
      performer: [
        { reference: 'Practitioner/pr1' },
        { reference: 'Practitioner/pr2' },
      ],
      specimen: { reference: 'Specimen/sp1' },
    } as unknown as Resource;

    await runGraphBfs(mockClient, root, 1);
    const readMock = mockClient.readResource as ReturnType<typeof vi.fn>;
    expect(readMock).toHaveBeenCalledTimes(5);
    expect(maxInFlight).toBe(5); // NOT 1 (serialized would never overlap)
  });
});
