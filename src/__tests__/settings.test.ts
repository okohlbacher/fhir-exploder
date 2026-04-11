import { describe, it } from 'vitest';

describe('loadSettings', () => {
  it.todo('loads and parses settings.yaml from /settings.yaml');
  it.todo('returns DEFAULTS with usingDefaults=true when settings.yaml is 404');
  it.todo('returns DEFAULTS with usingDefaults=true when YAML is malformed');
  it.todo('deep-merges partial settings with DEFAULTS');
});
