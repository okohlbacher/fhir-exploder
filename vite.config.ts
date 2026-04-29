import { defineConfig, type PluginOption } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { feedbackPlugin } from './src/dev/feedbackPlugin';
import { fhirProxyPlugin } from './src/dev/fhirProxyPlugin';

// Build the plugin list. The visualizer is gated on `ANALYZE=1` (strict
// string equality — per 27-RESEARCH.md Pitfall 3, a truthy-check would let
// `ANALYZE=` or `ANALYZE=0` enable it accidentally and slow every build).
//
// fhirProxyPlugin owns dev-time routing of /fhir/* → upstream FHIR server,
// honouring `X-Fhir-Target` per request. It MUST be loaded BEFORE Vite's
// own static-file middleware so /fhir paths never fall through to disk.
const plugins: PluginOption[] = [fhirProxyPlugin(), react(), feedbackPlugin()];

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

// https://vite.dev/config/
export default defineConfig({
  plugins,
  server: {
    proxy: {
      // /fhir is handled by fhirProxyPlugin (loaded above) — it supports
      // dynamic per-request routing via the X-Fhir-Target header, which
      // Vite's built-in proxy can't do because http-proxy ignores `router`.
      // Keep /ontoserver here because it's a static target.
      '/ontoserver': {
        target: 'https://r4.ontoserver.csiro.au',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ontoserver/, '/fhir'),
        headers: { Accept: 'application/fhir+json' },
      },
    },
  },
});
