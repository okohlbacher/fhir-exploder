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

// https://vite.dev/config/
export default defineConfig({
  plugins,
  server: {
    proxy: {
      '/fhir': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/ontoserver': {
        target: 'https://r4.ontoserver.csiro.au',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ontoserver/, '/fhir'),
        headers: { Accept: 'application/fhir+json' },
      },
    },
  },
});
