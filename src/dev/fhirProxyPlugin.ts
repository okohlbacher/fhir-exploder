import type { Plugin, ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * Dev-only Vite plugin that proxies `/fhir/*` requests to a runtime-configurable
 * upstream FHIR server.
 *
 * Why this isn't done with Vite's built-in `proxy` config:
 * Vite uses `http-proxy` directly (not `http-proxy-middleware`). `http-proxy`
 * does NOT support a `router` callback — that's an http-proxy-middleware-only
 * feature — so a per-request target override via the standard config is
 * silently ignored. Instead we implement a custom middleware that reads
 * `X-Fhir-Target` from each request and uses node's built-in `fetch` to
 * forward to that origin.
 *
 * Fallback target when the header is absent or invalid: `http://localhost:8080`.
 *
 * Production note: this plugin only adds middleware in dev (`configureServer`).
 * Production builds bypass it entirely — the built bundle's MedplumClient sends
 * requests to the configured FHIR origin directly, requiring the FHIR server
 * to allow CORS for the deployed page origin.
 */

const DEFAULT_TARGET = 'http://localhost:8080';

// Hop-by-hop headers that must NOT be forwarded per RFC 7230 §6.1, plus a few
// that confuse fetch-based forwarders (host, content-length get re-set by
// undici/fetch).
const STRIP_HEADERS = new Set([
  'host',
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'content-length',
]);

// Response-side headers that lie about the body once undici/fetch has
// auto-decoded the upstream content. If we forward `content-encoding: gzip`
// while sending the already-decompressed body, the browser will try to
// gunzip plain JSON and fail with "Failed to fetch" or similar.
const STRIP_RESPONSE_HEADERS = new Set([
  ...STRIP_HEADERS,
  'content-encoding',
]);

function pickTarget(req: IncomingMessage): string {
  const raw = req.headers['x-fhir-target'];
  const candidate = Array.isArray(raw) ? raw[0] : raw;
  if (typeof candidate === 'string' && candidate.length > 0) {
    try {
      return new URL(candidate).origin;
    } catch {
      return DEFAULT_TARGET;
    }
  }
  return DEFAULT_TARGET;
}

async function readBody(req: IncomingMessage): Promise<Buffer | undefined> {
  const method = (req.method ?? 'GET').toUpperCase();
  if (method === 'GET' || method === 'HEAD') return undefined;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : (chunk as Buffer));
  }
  return Buffer.concat(chunks);
}

function buildForwardHeaders(req: IncomingMessage, targetOrigin: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [name, value] of Object.entries(req.headers)) {
    const k = name.toLowerCase();
    if (STRIP_HEADERS.has(k)) continue;
    // Drop the X-Fhir-Target header itself — it's a control header for this
    // proxy, not something the upstream FHIR server needs to see.
    if (k === 'x-fhir-target') continue;
    if (Array.isArray(value)) out[name] = value.join(', ');
    else if (value !== undefined) out[name] = value;
  }
  // Set the upstream Host explicitly so the FHIR server doesn't see
  // `localhost:5173` (which would confuse some servers' authority checks).
  out.host = new URL(targetOrigin).host;
  return out;
}

async function handleFhirProxy(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const targetOrigin = pickTarget(req);
  // req.originalUrl preserves the full path including the `/fhir/` prefix;
  // Connect strips the mount prefix from req.url. Fall back to req.url if
  // originalUrl is unavailable (defensive — Vite always sets it on Connect).
  const incomingUrl = (req as IncomingMessage & { originalUrl?: string }).originalUrl ?? req.url ?? '/fhir/';
  const upstreamUrl = `${targetOrigin}${incomingUrl}`;

  let body: Buffer | undefined;
  try {
    body = await readBody(req);
  } catch (err) {
    res.statusCode = 400;
    res.setHeader('content-type', 'application/fhir+json');
    res.end(JSON.stringify({
      resourceType: 'OperationOutcome',
      issue: [{ severity: 'error', code: 'invalid', diagnostics: `Failed to read request body: ${String(err)}` }],
    }));
    return;
  }

  const headers = buildForwardHeaders(req, targetOrigin);

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      method: req.method ?? 'GET',
      headers,
      // Node's undici/fetch accepts Buffer at runtime; cast loosely so the
      // plugin type-checks under both DOM and Node lib configurations.
      body: body as unknown as undefined,
      // Don't follow redirects automatically — let the client see them so
      // browser-side handling stays consistent with direct requests.
      redirect: 'manual',
    });
  } catch (err) {
    res.statusCode = 502;
    res.setHeader('content-type', 'application/fhir+json');
    res.end(JSON.stringify({
      resourceType: 'OperationOutcome',
      issue: [{
        severity: 'error',
        code: 'transient',
        diagnostics: `Bad Gateway forwarding to ${targetOrigin}: ${String(err)}`,
      }],
    }));
    return;
  }

  // Copy status + headers back. Skip hop-by-hop AND content-encoding (fetch
  // already decompressed the body, so forwarding `content-encoding: gzip`
  // would have the browser try to gunzip plain text).
  res.statusCode = upstream.status;
  upstream.headers.forEach((value, name) => {
    if (STRIP_RESPONSE_HEADERS.has(name.toLowerCase())) return;
    res.setHeader(name, value);
  });

  // Stream the response body.
  const buf = Buffer.from(await upstream.arrayBuffer());
  res.end(buf);
}

export function fhirProxyPlugin(): Plugin {
  return {
    name: 'fhir-exploder:fhir-proxy',
    apply: 'serve',
    configureServer(server: ViteDevServer) {
      // Mount BEFORE Vite's static file middleware so /fhir/* never falls
      // through to disk lookup. `pre` placement via the mounting order in
      // configureServer (which runs before Vite installs its own internal
      // middleware) gives us the right priority.
      server.middlewares.use('/fhir', (req, res, next) => {
        // Defensive: only handle requests where this plugin is the chosen
        // path; otherwise let Vite's chain continue.
        if (!req.url) return next();
        handleFhirProxy(req, res).catch((err) => {
          // Last-resort error path — also encode as a FHIR OperationOutcome
          // so MedplumClient's error parsing handles it cleanly.
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('content-type', 'application/fhir+json');
            res.end(JSON.stringify({
              resourceType: 'OperationOutcome',
              issue: [{
                severity: 'error',
                code: 'exception',
                diagnostics: `fhir-proxy plugin crashed: ${String(err)}`,
              }],
            }));
          }
        });
      });
    },
  };
}
