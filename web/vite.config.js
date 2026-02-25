import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const apiToken = process.env.VITE_API_TOKEN?.trim();

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    // Proxy /api calls to the listener during local development
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE_URL ?? 'http://localhost:3001',
        changeOrigin: true,
        headers: apiToken ? { 'x-api-token': apiToken } : {},
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    globals: true,
  },
});
