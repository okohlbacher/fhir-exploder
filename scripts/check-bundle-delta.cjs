#!/usr/bin/env node
/**
 * Phase 49 — GRPH-01 SC #1 acceptance gate.
 *
 * Reads `dist/assets/index-*.js` (the main entry chunk emitted by Vite),
 * gzip-9 compresses it, compares against `scripts/.bundle-baseline.json`.
 * Exits 1 if:
 *   (a) the main chunk gz size grew by more than --max-delta-kb (default 5), OR
 *   (b) `@xyflow/react` or `@dagrejs/dagre` content leaked into the main chunk
 *       (indicating React.lazy code-split failed).
 *
 * Usage:
 *   node scripts/check-bundle-delta.cjs --max-delta-kb 5
 *   node scripts/check-bundle-delta.cjs --update-baseline   # rewrites baseline
 *
 * Exit codes:
 *   0  PASS — main chunk within budget AND lazy boundary intact
 *   1  FAIL — budget exceeded or lazy boundary broken
 *   2  ENV  — dist/ missing, baseline missing, or main chunk not found
 */
const {
  readdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
} = require('node:fs');
const { gzipSync } = require('node:zlib');
const { join } = require('node:path');

const args = process.argv.slice(2);
const maxDeltaKbArg = args.indexOf('--max-delta-kb');
const maxDeltaKb =
  maxDeltaKbArg >= 0 ? Number(args[maxDeltaKbArg + 1]) : 5;
const updateBaseline = args.includes('--update-baseline');

const distAssets = join(process.cwd(), 'dist', 'assets');
if (!existsSync(distAssets)) {
  console.error(
    '[check-bundle-delta] dist/assets/ not found — run `npm run build` first.',
  );
  process.exit(2);
}

const mainChunk = readdirSync(distAssets).find((f) =>
  /^index-[^.]+\.js$/.test(f),
);
if (!mainChunk) {
  console.error(
    '[check-bundle-delta] No index-*.js chunk found in dist/assets/.',
  );
  process.exit(2);
}

const mainBuf = readFileSync(join(distAssets, mainChunk));
const mainGzBytes = gzipSync(mainBuf, { level: 9 }).length;
const mainGzKb = mainGzBytes / 1024;

// Lazy chunk audit — Phase 49 enforces that xyflow/dagre live ONLY in the lazy
// chunk. We grep the raw main-chunk source for telltale identifiers.
const lazyChunks = readdirSync(distAssets).filter(
  (f) => /ResourceGraphView/.test(f) && /\.js$/.test(f),
);
const mainChunkText = mainBuf.toString('utf8');
const mainHasXyflow =
  /@xyflow\/react|xyflow_system/i.test(mainChunkText) ||
  /\.react-flow|reactflow/i.test(mainChunkText);
const mainHasDagre = /dagrejs|graphlib/i.test(mainChunkText);

const baselinePath = join(process.cwd(), 'scripts', '.bundle-baseline.json');

if (updateBaseline) {
  writeFileSync(
    baselinePath,
    JSON.stringify(
      {
        mainChunkGzBytes: mainGzBytes,
        mainChunkName: mainChunk,
        capturedAt: new Date().toISOString(),
      },
      null,
      2,
    ) + '\n',
  );
  console.log(
    `[check-bundle-delta] Baseline updated: ${(mainGzBytes / 1024).toFixed(2)} KB gz (${mainChunk})`,
  );
  process.exit(0);
}

if (!existsSync(baselinePath)) {
  console.error(
    `[check-bundle-delta] Baseline missing at ${baselinePath}.\n` +
      `Run \`node scripts/check-bundle-delta.cjs --update-baseline\` to capture the baseline.`,
  );
  process.exit(2);
}

const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
const baselineGzKb = baseline.mainChunkGzBytes / 1024;
const deltaKb = mainGzKb - baselineGzKb;

console.log(`[check-bundle-delta] main chunk: ${mainChunk}`);
console.log(
  `[check-bundle-delta] baseline gz: ${baselineGzKb.toFixed(2)} KB`,
);
console.log(`[check-bundle-delta] current  gz: ${mainGzKb.toFixed(2)} KB`);
console.log(
  `[check-bundle-delta] delta:        ${deltaKb >= 0 ? '+' : ''}${deltaKb.toFixed(2)} KB (cap ${maxDeltaKb} KB)`,
);
console.log(
  `[check-bundle-delta] main contains xyflow: ${mainHasXyflow}; main contains dagre: ${mainHasDagre}`,
);
console.log(
  `[check-bundle-delta] lazy chunks containing ResourceGraphView: ${lazyChunks.join(', ') || '(none)'}`,
);

if (mainHasXyflow || mainHasDagre) {
  console.error(
    '[check-bundle-delta] FAIL — xyflow/dagre leaked into the main chunk. Re-check React.lazy boundary.',
  );
  process.exit(1);
}
if (deltaKb > maxDeltaKb) {
  console.error(
    `[check-bundle-delta] FAIL — initial-load gz delta ${deltaKb.toFixed(2)} KB exceeds cap ${maxDeltaKb} KB.`,
  );
  process.exit(1);
}
console.log('[check-bundle-delta] PASS');
process.exit(0);
