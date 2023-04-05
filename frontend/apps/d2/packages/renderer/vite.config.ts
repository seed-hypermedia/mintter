import {join} from 'node:path'
import {builtinModules} from 'node:module'
import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Please note that `__dirname = packages/renderer` in this context.
  root: __dirname,
  base: './',

  build: {
    sourcemap: true,
    emptyOutDir: true,
    // Build output inside `dist/renderer` at the project root.
    outDir: '../../dist/renderer',

    rollupOptions: {
      // Entry point/input should be the `packages/renderer/index.html`.
      input: join(__dirname, 'index.html'),
      // Exclude node internal modules from the build output (we're building for web, not Node).
      external: [...builtinModules.flatMap((p) => [p, `node:${p}`])],
    },
  },
})
