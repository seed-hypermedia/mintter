import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default {
  cacheDir: '.vite',
  // prevent vite from obscuring rust errors
  clearScreen: false,
  // tauri expects a fixed port, fail if that port is not available
  server: {
    port: 3000,
    strictPort: true,
  },
  // to make use of `TAURI_PLATFORM`, `TAURI_ARCH`, `TAURI_FAMILY`, `TAURI_PLATFORM_VERSION`, `TAURI_PLATFORM_TYPE` and `TAURI_DEBUG` env variables
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    // tauri supports es2021
    target: ['es2021', 'chrome97', 'safari13'],
    // don't minify for debug builds
    minify: !process.env.TAURI_DEBUG && 'esbuild',
    // produce sourcemaps for debug builds
    sourcemap: !!process.env.TAURI_DEBUG,
  },
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
      jsxRuntime: 'classic'
    }),
  ],
  test: {
    setupFiles: ['./src/test/setup.ts'],
  },
}
