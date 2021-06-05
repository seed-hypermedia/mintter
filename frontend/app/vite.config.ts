import { defineConfig } from 'vite'
import reactRefresh from '@vitejs/plugin-react-refresh'

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@components': join(process.cwd(), './src/components'),
      '@pages': join(process.cwd(), './src/pages'),
      '@utils': join(process.cwd(), './src/utils'),
      '@mintter/editor': join(process.cwd(), './src/editor'),
      test: join(process.cwd(), './src/test'),
    },
  },
  plugins: [
    reactRefresh()
  ]
})