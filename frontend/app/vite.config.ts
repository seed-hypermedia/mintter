/// <reference types="vitest" />

import react from '@vitejs/plugin-react'
import {defineConfig} from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  cacheDir: '.vite',
  plugins: [
    tsconfigPaths(),
    react({
      fastRefresh: process.env.NODE_ENV != 'test',
    }),
  ],
  build: {
    target: 'es2021',
    minify: !process.env.TAURI_DEBUG && 'esbuild',
    sourcemap: !process.env.TAURI_DEBUG,
    chunkSizeWarningLimit: 2048,
  },
  test: {
    global: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
