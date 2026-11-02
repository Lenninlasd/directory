import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  // Same proxy as frontend/vite.config.ts; DEV_API_URL comes from an uncommitted `.env.development.local`.
  const { DEV_API_URL: devApiUrl } = loadEnv(mode, '.', 'DEV_API_');

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5174,
      proxy: devApiUrl ? { '/businesses': { target: devApiUrl, changeOrigin: true } } : {},
    },
  };
});
