import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// A web fala com o servidor pela mesma origem: o proxy tira o prefixo /api antes de repassar.
const proxy = {
  '/api': {
    target: 'http://localhost:3000',
    rewrite: (caminho: string) => caminho.replace(/^\/api/, ''),
  },
};

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy },
  preview: { port: 4173, proxy },
});
