import reactRefresh from '@vitejs/plugin-react-refresh'
import {defineConfig} from 'vite'
import reactJSX from 'vite-react-jsx'
import tsconfigPaths from 'vite-tsconfig-paths'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [reactRefresh(), reactJSX(), tsconfigPaths()],
  build: {
    target: 'es2021',
    minify: !process.env.TAURI_DEBUG && 'esbuild',
    sourcemap: !process.env.TAURI_DEBUG,
    chunkSizeWarningLimit: 2048,
  },
})
