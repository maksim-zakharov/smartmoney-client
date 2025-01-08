import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  build: {
    outDir: './dist',
    emptyOutDir: true, // also necessary
  },
  plugins: [react()],
  define: {
    'process.env': JSON.stringify(process.env.NODE_ENV),
  },
})
