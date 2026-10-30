/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  // DEV_API_URL comes from an uncommitted `.env.development.local` and has no VITE_ prefix,
  // so it never reaches the client bundle. It points the dev server proxy at the `dev` API (Q-3).
  const { DEV_API_URL: devApiUrl } = loadEnv(mode, '.', 'DEV_API_');

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: devApiUrl ? { '/businesses': { target: devApiUrl, changeOrigin: true } } : {},
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./test/setup.ts'],
    },
  };
});
