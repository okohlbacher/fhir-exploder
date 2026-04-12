/**
 * Terminology cache key format: `{serverUrl}|{system}|{code}`.
 *
 * The serverUrl prefix namespaces entries per termserver so a settings.yaml
 * URL swap does not surface stale entries from a different server
 * (Pitfall 5 in RESEARCH.md).
 */

export const LOCAL_STORAGE_PREFIX = 'tx-cache:v1:';

export function makeTerminologyKey(
  serverUrl: string,
  system: string,
  code: string,
): string {
  return `${serverUrl}|${system}|${code}`;
}

/**
 * Inverse of makeTerminologyKey. Returns null for malformed keys.
 * Because the serverUrl or system URLs may theoretically contain '|' in
 * exotic cases, we split on the first two pipes only: everything after
 * the second pipe is the code.
 */
export function parseTerminologyKey(
  key: string,
): { serverUrl: string; system: string; code: string } | null {
  const firstPipe = key.indexOf('|');
  if (firstPipe < 0) return null;
  const secondPipe = key.indexOf('|', firstPipe + 1);
  if (secondPipe < 0) return null;
  const serverUrl = key.slice(0, firstPipe);
  const system = key.slice(firstPipe + 1, secondPipe);
  const code = key.slice(secondPipe + 1);
  if (!serverUrl || !system || !code) return null;
  return { serverUrl, system, code };
}
