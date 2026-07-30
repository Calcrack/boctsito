// Config del smoke test de render del panel del narrador.
// Renderiza NarratorPanel en las 7 fases con un GameContext falso, para
// cazar fallos de render (variables inexistentes, props rotas) sin navegador.
//   npm run smoke
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // El panel habla con el servidor por GameContext: aquí se sustituye por
    // un doble con partidas de prueba en cada fase.
    alias: [
      { find: /(.*)\/context\/GameContext(\.jsx)?$/, replacement: path.resolve('./test/smoke-stub.jsx') },
    ],
  },
  build: {
    ssr: './test/smoke-entry.jsx',
    outDir: './test/.smoke-out',
    emptyOutDir: true,
    rollupOptions: { output: { format: 'cjs', entryFileNames: 'smoke.cjs' } },
  },
});
