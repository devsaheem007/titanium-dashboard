import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the React app (5173) forwards /api and /uploads to the Express server (5000).
// That makes the browser think everything is one origin, so cookies "just work".
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://127.0.0.1:5000', changeOrigin: true },
      '/uploads': { target: 'http://127.0.0.1:5000', changeOrigin: true },
    },
  },
});
