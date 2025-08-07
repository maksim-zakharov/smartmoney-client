import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { resolve } from 'path';
import tailwindcss from '@tailwindcss/vite';

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
      '@': path.resolve(__dirname, './src'),
      ws: resolve(__dirname, 'src/alias/ws.js'),
    },
  },
  plugins: [react(), tailwindcss()],
  define: {
    'process.env': JSON.stringify(process.env.NODE_ENV),
  },
});
