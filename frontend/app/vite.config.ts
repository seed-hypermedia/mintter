/// <reference types="vitest" />

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  cacheDir: '.vite',
  plugins: [
    tsconfigPaths(),
    // checker({
    //   typescript: true,
    //   overlay: {
    //     position: 'br',
    //   },
    // }),
    react({
      fastRefresh: process.env.NODE_ENV != 'test',
    }),
  ],
  build: {
    target: ['es2021', 'chrome97', 'safari13'],
    minify: !process.env.TAURI_DEBUG && 'esbuild',
    sourcemap: !!process.env.TAURI_DEBUG,
    chunkSizeWarningLimit: 2048,
  },
  test: {
    setupFiles: ['./src/test/setup.ts'],
  },
})
