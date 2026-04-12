import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { feedbackPlugin } from './src/dev/feedbackPlugin';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), feedbackPlugin()],
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
