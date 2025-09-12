import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Importante per Electron
  define: {
    'process.env.NODE_ENV': '"development"',
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  },
  server: {
    port: 5173,
    strictPort: true
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
