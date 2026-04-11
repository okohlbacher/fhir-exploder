/**
 * Custom JSON syntax highlighter with 6 token-type coloring.
 *
 * Uses React JSX escaping for all content (no dangerouslySetInnerHTML)
 * to prevent XSS from FHIR resource content. Tokenizer operates on
 * string values produced by JSON.stringify only.
 */

export interface JsonToken {
  type: 'string' | 'number' | 'boolean' | 'null' | 'key' | 'punctuation';
  value: string;
}

export const TOKEN_COLORS: Record<JsonToken['type'], string> = {
  string: '#2f9e44',     // green.7
  number: '#e8590c',     // orange.8
  boolean: '#9c36b5',    // grape.7
  null: '#9c36b5',       // grape.7
  key: '#1971c2',        // blue.7
  punctuation: '#495057', // gray.7
};

// Regex patterns for JSON tokens (order matters)
const TOKEN_REGEX = /("(?:[^"\\]|\\.)*")|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b|(true|false)\b|(null)\b|([{}[\]:,])/g;

/**
 * Tokenize a JSON string into typed tokens for syntax highlighting.
 *
 * Strings followed by a colon are classified as keys; all other strings
 * are classified as string values.
 */
export function tokenize(json: string): JsonToken[] {
  const rawTokens: { type: JsonToken['type']; value: string; index: number }[] = [];
  let match: RegExpExecArray | null;

  // Reset regex state
  TOKEN_REGEX.lastIndex = 0;

  let lastIndex = 0;

  while ((match = TOKEN_REGEX.exec(json)) !== null) {
    // Capture whitespace/newlines between tokens as punctuation
    if (match.index > lastIndex) {
      const gap = json.slice(lastIndex, match.index);
      if (gap.length > 0) {
        rawTokens.push({ type: 'punctuation', value: gap, index: lastIndex });
      }
    }
    lastIndex = match.index + match[0].length;

    if (match[1] !== undefined) {
      // String - will be reclassified as key if followed by colon
      rawTokens.push({ type: 'string', value: match[1], index: match.index });
    } else if (match[2] !== undefined) {
      rawTokens.push({ type: 'number', value: match[2], index: match.index });
    } else if (match[3] !== undefined) {
      rawTokens.push({ type: 'boolean', value: match[3], index: match.index });
    } else if (match[4] !== undefined) {
      rawTokens.push({ type: 'null', value: match[4], index: match.index });
    } else if (match[5] !== undefined) {
      rawTokens.push({ type: 'punctuation', value: match[5], index: match.index });
    }
  }

  // Capture any trailing content
  if (lastIndex < json.length) {
    rawTokens.push({ type: 'punctuation', value: json.slice(lastIndex), index: lastIndex });
  }

  // Post-process: strings followed by ':' (possibly with whitespace) are keys
  const tokens: JsonToken[] = [];
  for (let i = 0; i < rawTokens.length; i++) {
    const token = rawTokens[i];
    if (token.type === 'string') {
      // Look ahead for a colon (skipping whitespace-only punctuation)
      let nextIdx = i + 1;
      while (nextIdx < rawTokens.length && rawTokens[nextIdx].type === 'punctuation' && rawTokens[nextIdx].value.trim() === '') {
        nextIdx++;
      }
      if (nextIdx < rawTokens.length && rawTokens[nextIdx].type === 'punctuation' && rawTokens[nextIdx].value === ':') {
        tokens.push({ type: 'key', value: token.value });
      } else {
        tokens.push({ type: 'string', value: token.value });
      }
    } else {
      tokens.push({ type: token.type, value: token.value });
    }
  }

  return tokens;
}

const PRE_STYLE: React.CSSProperties = {
  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
  fontSize: '13px',
  lineHeight: 1.5,
  background: '#f8f9fa',
  padding: '16px',
  overflow: 'auto',
  margin: 0,
  borderRadius: '4px',
};

/**
 * Render any data as syntax-highlighted JSON.
 *
 * All content is rendered via React's textContent (JSX children),
 * preventing XSS from untrusted FHIR resource data.
 */
export function JsonSyntaxHighlight({ data }: { data: unknown }) {
  const json = JSON.stringify(data, null, 2);
  if (json === undefined) {
    return <pre style={PRE_STYLE}>undefined</pre>;
  }

  const tokens = tokenize(json);

  return (
    <pre style={PRE_STYLE}>
      {tokens.map((token, i) => (
        <span key={i} style={{ color: TOKEN_COLORS[token.type] }}>
          {token.value}
        </span>
      ))}
    </pre>
  );
}
