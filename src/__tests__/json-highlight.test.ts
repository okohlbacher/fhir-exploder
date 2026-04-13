import { describe, it, expect } from 'vitest';
import { tokenize, TOKEN_COLORS } from '../components/explorer/JsonSyntaxHighlight';

describe('tokenize', () => {
  it('tokenizes a simple object with all value types', () => {
    const json = JSON.stringify({ key: 'value', num: 42, bool: true, n: null }, null, 2);
    const tokens = tokenize(json);

    const tokenTypes = tokens.map((t) => t.type);

    expect(tokenTypes).toContain('key');
    expect(tokenTypes).toContain('string');
    expect(tokenTypes).toContain('number');
    expect(tokenTypes).toContain('boolean');
    expect(tokenTypes).toContain('null');
    expect(tokenTypes).toContain('punctuation');
  });

  it('identifies property keys vs string values', () => {
    const json = JSON.stringify({ name: 'Alice' }, null, 2);
    const tokens = tokenize(json);

    const keyTokens = tokens.filter((t) => t.type === 'key');
    const stringTokens = tokens.filter((t) => t.type === 'string');

    expect(keyTokens.length).toBe(1);
    expect(keyTokens[0].value).toContain('name');
    expect(stringTokens.length).toBe(1);
    expect(stringTokens[0].value).toContain('Alice');
  });

  it('handles nested objects', () => {
    const json = JSON.stringify({ outer: { inner: 'val' } }, null, 2);
    const tokens = tokenize(json);

    const keys = tokens.filter((t) => t.type === 'key').map((t) => t.value);
    expect(keys.some((k) => k.includes('outer'))).toBe(true);
    expect(keys.some((k) => k.includes('inner'))).toBe(true);
  });

  it('handles arrays', () => {
    const json = JSON.stringify({ items: [1, 2, 3] }, null, 2);
    const tokens = tokenize(json);

    const numbers = tokens.filter((t) => t.type === 'number');
    expect(numbers.length).toBe(3);
  });

  it('handles empty object', () => {
    const json = JSON.stringify({}, null, 2);
    const tokens = tokenize(json);

    expect(tokens.length).toBeGreaterThan(0);
    expect(tokens.every((t) => t.type === 'punctuation')).toBe(true);
  });

  it('handles strings with escaped quotes', () => {
    const json = JSON.stringify({ msg: 'He said "hello"' }, null, 2);
    const tokens = tokenize(json);

    const strings = tokens.filter((t) => t.type === 'string');
    expect(strings.length).toBe(1);
    expect(strings[0].value).toContain('hello');
  });
});

describe('TOKEN_COLORS', () => {
  it('has correct colors per UI-SPEC', () => {
    expect(TOKEN_COLORS.string).toBe('#2f9e44');
    expect(TOKEN_COLORS.number).toBe('#e8590c');
    expect(TOKEN_COLORS.boolean).toBe('#9c36b5');
    expect(TOKEN_COLORS.null).toBe('#9c36b5');
    expect(TOKEN_COLORS.key).toBe('#1971c2');
    expect(TOKEN_COLORS.punctuation).toBe('#495057');
  });
});
