/**
 * scripts/__tests__/fetch-ips-profiles.test.mjs
 *
 * Plan 44-01 Task 4: defensive offline-tolerance assertions for the IPS
 * fetcher. The fetcher must (a) exit 0 when packages.fhir.org is
 * unreachable, and (b) preserve the committed src/quality/profiles/ips/
 * index.ts when no SDs are fetched (RESEARCH §6 Pitfall 8).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.resolve(__dirname, '..', 'fetch-ips-profiles.mjs');
const INDEX_TS = path.resolve(
  __dirname,
  '..',
  '..',
  'src',
  'quality',
  'profiles',
  'ips',
  'index.ts',
);

// HTTP_PROXY pointing at a closed local port forces fhir-package-loader to
// fail to fetch — exercising the warn-and-continue path that the defensive
// early-return relies on. NO_PROXY is cleared so the proxy applies to all
// hosts (otherwise localhost requests can bypass the proxy on some systems).
const OFFLINE_ENV = {
  ...process.env,
  HTTP_PROXY: 'http://127.0.0.1:1',
  HTTPS_PROXY: 'http://127.0.0.1:1',
  NO_PROXY: '',
  // Force the loader to use a fresh cache dir so it can't fall back to
  // ~/.fhir/packages where Task 3 already cached the package.
  FPL_CACHE_DIR: path.join(__dirname, '..', '..', 'node_modules', '.cache', 'fpl-test-offline'),
};

describe('fetch-ips-profiles (offline graceful-exit)', () => {
  let savedIndex;

  beforeAll(() => {
    // Snapshot committed index.ts so we can verify it's preserved after offline run.
    savedIndex = fs.readFileSync(INDEX_TS, 'utf-8');
  });

  afterAll(() => {
    // Restore in case test was destructive (defence-in-depth — the script
    // should NEVER overwrite when offline, but if it did, restore committed copy).
    fs.writeFileSync(INDEX_TS, savedIndex, 'utf-8');
  });

  it(
    'exits 0 when packages.fhir.org is unreachable (HTTP_PROXY blocks fetch)',
    () => {
      const result = spawnSync('node', [SCRIPT], {
        env: OFFLINE_ENV,
        timeout: 60000,
      });
      expect(result.status).toBe(0);
    },
    60000,
  );

  it(
    'preserves committed src/quality/profiles/ips/index.ts when offline',
    () => {
      const result = spawnSync('node', [SCRIPT], {
        env: OFFLINE_ENV,
        timeout: 60000,
      });
      expect(result.status).toBe(0);
      const after = fs.readFileSync(INDEX_TS, 'utf-8');
      // Byte-identical preservation: defensive early-return MUST NOT clobber.
      expect(after).toBe(savedIndex);
      // Sanity: committed registry still points at IPS Composition profile.
      expect(after).toMatch(/IPS_REGISTRY/);
      expect(after).toMatch(/Composition-uv-ips/);
    },
    60000,
  );
});
