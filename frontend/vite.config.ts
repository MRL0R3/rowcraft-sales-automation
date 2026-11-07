import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  publicDir: '../docs',
  define: { __ROWCRAFT_REPOSITORY__: JSON.stringify(process.env.VITE_REPOSITORY_URL ?? '') },
  server: { fs: { allow: ['..'] } },
  test: { environment: 'jsdom', setupFiles: './src/test-setup.ts' },
});
