import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // `npm run dev` only starts Vite (frontend) — the api/ serverless
      // functions need a separate `vercel dev` process on :3000 (see
      // POLAR_SETUP.md). Without it, every /api/* call used to fail with a
      // bare, bodyless HTTP 500 from Vite's proxy (ECONNREFUSED against an
      // unreachable target) that looked identical to a real backend crash —
      // this is what "checkout returns 500 on localhost" actually was.
      // Surface it as a clear, actionable message instead.
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            console.error(
              `[vite proxy] Could not reach the API dev server at http://localhost:3000 (${err.code || err.message}). ` +
              'Is `vercel dev` running? `npm run dev` alone only serves the frontend — see POLAR_SETUP.md.'
            );
            if (res.writeHead && !res.headersSent) {
              res.writeHead(502, { 'Content-Type': 'application/json' });
            }
            if (res.end) {
              res.end(JSON.stringify({
                error: "Local API server isn't running. Start it with `vercel dev` alongside `npm run dev` (see POLAR_SETUP.md).",
              }));
            }
          });
        },
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-icons': ['lucide-react'],
        },
      },
    },
  },
});
