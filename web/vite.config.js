import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'node:child_process';

const apiToken = process.env.VITE_API_TOKEN?.trim();

function gitHash() {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

const buildVersion = process.env.VITE_BUILD_VERSION || gitHash();
const buildDate = new Date().toISOString();

export default defineConfig({
  define: {
    __BUILD_VERSION__: JSON.stringify(buildVersion),
    __BUILD_DATE__: JSON.stringify(buildDate),
  },
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
