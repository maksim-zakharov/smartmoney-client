import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vite.dev/config/
export default defineConfig({
  build: {
    outDir: './dist',
    assetsDir: 'assets',
    emptyOutDir: true, // also necessary
  },
  worker: {
    format: 'es', // Важно для Worker'ов в Vite
  },
  resolve: {
    alias: {
      ws: resolve(__dirname, 'src/alias/ws.js'),
    },
  },
  plugins: [react()],
  define: {
    'process.env': JSON.stringify(process.env.NODE_ENV),
  },
});
