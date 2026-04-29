import { defineConfig, type PluginOption } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { feedbackPlugin } from './src/dev/feedbackPlugin';

// Build the plugin list. The visualizer is gated on `ANALYZE=1` (strict
// string equality — per 27-RESEARCH.md Pitfall 3, a truthy-check would let
// `ANALYZE=` or `ANALYZE=0` enable it accidentally and slow every build).
const plugins: PluginOption[] = [react(), feedbackPlugin()];

if (process.env.ANALYZE === '1') {
  plugins.push(
    visualizer({
      filename: 'dist/bundle-stats.html',
      template: 'treemap',
      gzipSize: true,
      brotliSize: false,
      open: false,
    }) as PluginOption,
  );
}

// http-proxy `router` callback — accepts a per-request function that returns
// a target URL, overriding the static `target` set in proxy options. Vite's
// `ProxyOptions` typedef doesn't declare it, but http-proxy supports it at
// runtime. We build the proxy config object first with the looser
// `Record<string, unknown>` type and then assert into ProxyOptions when
// passing to defineConfig, which keeps the type relaxation localised.
//
// See https://github.com/http-party/node-http-proxy#options (`router`).
const fhirProxy: Record<string, unknown> = {
  target: 'http://localhost:8080',
  changeOrigin: true,
  router: (req: { headers: Record<string, string | string[] | undefined> }) => {
    const raw = req.headers['x-fhir-target'];
    const target = Array.isArray(raw) ? raw[0] : raw;
    if (typeof target === 'string' && target.length > 0) {
      try {
        return new URL(target).origin;
      } catch {
        return undefined;
      }
    }
    return undefined;
  },
};

// https://vite.dev/config/
export default defineConfig({
  plugins,
  server: {
    proxy: {
      // Default target is `http://localhost:8080` (used as fallback when no
      // `X-Fhir-Target` header is present). The `router` callback above
      // overrides this per-request based on the header set by
      // `createFhirClient`, which is how we switch FHIR servers at runtime
      // without restarting Vite.
      '/fhir': fhirProxy as { target: string; changeOrigin: boolean },
      '/ontoserver': {
        target: 'https://r4.ontoserver.csiro.au',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ontoserver/, '/fhir'),
        headers: { Accept: 'application/fhir+json' },
      },
    },
  },
});
