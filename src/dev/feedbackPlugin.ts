/**
 * Vite dev plugin — feedback API.
 *
 * Serves POST /api/feedback and GET /api/feedback during `npm run dev`.
 * Writes feedback entries as JSON files in the `feedback/` directory
 * so Claude can read them later for UI improvements.
 *
 * Adapted from EyeMatics-EDM-UX server/issueApi.ts — simplified for
 * this project (no auth, no export endpoint).
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import type { Plugin } from 'vite';

const FEEDBACK_DIR = path.resolve(process.cwd(), 'feedback');

// ---------------------------------------------------------------------------
// Core logic
// ---------------------------------------------------------------------------

function ensureDir(): void {
  if (!fs.existsSync(FEEDBACK_DIR)) {
    fs.mkdirSync(FEEDBACK_DIR, { recursive: true });
  }
}

function validateBody(data: unknown): string | null {
  if (data === null || typeof data !== 'object') return 'Body must be a JSON object';
  const obj = data as Record<string, unknown>;
  if (typeof obj.page !== 'string' || obj.page.length === 0) return '"page" is required';
  if (typeof obj.description !== 'string' || obj.description.length === 0)
    return '"description" is required';
  return null;
}

function createFeedback(body: Record<string, unknown>): { id: string; filename: string } {
  const id = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  const entry = { id, timestamp, ...body };
  ensureDir();
  const filename = `feedback-${timestamp.replace(/[:.]/g, '-')}_${id.slice(0, 8)}.json`;
  fs.writeFileSync(path.join(FEEDBACK_DIR, filename), JSON.stringify(entry, null, 2), 'utf-8');
  return { id, filename };
}

function loadAll(): Record<string, unknown>[] {
  ensureDir();
  return fs
    .readdirSync(FEEDBACK_DIR)
    .filter((f) => f.startsWith('feedback-') && f.endsWith('.json'))
    .sort()
    .flatMap((f) => {
      try {
        const parsed = JSON.parse(fs.readFileSync(path.join(FEEDBACK_DIR, f), 'utf-8'));
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          const { screenshot, ...rest } = parsed as Record<string, unknown>;
          return [{ ...rest, hasScreenshot: !!screenshot }];
        }
      } catch {
        /* skip */
      }
      return [];
    });
}

// ---------------------------------------------------------------------------
// Read request body (Vite middleware uses raw Node streams, not Express)
// ---------------------------------------------------------------------------

function readBody(req: { on: Function }, maxBytes = 5 * 1024 * 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error('Request body too large'));
        return;
      }
      body += chunk.toString();
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

export function feedbackPlugin(): Plugin {
  return {
    name: 'feedback-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/api/feedback')) return next();

        if (req.method === 'POST' && req.url === '/api/feedback') {
          readBody(req)
            .then((raw) => {
              const data = JSON.parse(raw);
              const error = validateBody(data);
              if (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error }));
                return;
              }
              const result = createFeedback(data as Record<string, unknown>);
              res.writeHead(201, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(result));
            })
            .catch((err) => {
              const msg = err instanceof Error ? err.message : 'Internal error';
              const code = msg.includes('too large') ? 413 : 500;
              res.writeHead(code, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: msg }));
            });
          return;
        }

        if (req.method === 'GET' && req.url === '/api/feedback') {
          const items = loadAll();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ items, total: items.length }));
          return;
        }

        next();
      });
    },
  };
}
