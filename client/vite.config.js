import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/ws': { target: 'ws://localhost:3001', ws: true },
      // Sin esto, en desarrollo los fetch a /api daban 404 y la hoja de
      // campaña no se podía abrir (en producción los sirve Express).
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
      '/hoja-campana': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
});
