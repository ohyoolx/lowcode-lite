import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@lowcode-lite/core': path.resolve(__dirname, '../../packages/core/src'),
      '@lowcode-lite/components': path.resolve(__dirname, '../../packages/components/src'),
      '@lowcode-lite/shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
  server: {
    port: 3000,
  },
});
