import { defineConfig } from 'vite'
import reactRefresh from '@vitejs/plugin-react-refresh'
import { join } from 'path'

const isTest = process.env.NODE_ENV === 'test';

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@components': join(process.cwd(), './src/components'),
      '@pages': join(process.cwd(), './src/pages'),
      '@utils': join(process.cwd(), './src/utils'),
      '@mintter/ui-legacy': join(process.cwd(), './src/lib'),
      '@mintter/ui': join(process.cwd(), '../ui/src'),
      '@mintter/editor': join(process.cwd(), './src/editor'),
      '@mintter/client': join(process.cwd(), isTest
        ? './src/mocks/mintter-client'
        : './src/mintter-client'),
      '@mintter/hooks': join(process.cwd(), './src/mintter-hooks'),
      test: join(process.cwd(), './src/test'),
    },
  },
  esbuild: {
    jsxInject: 'import React from "react";'
  },
  plugins: [
    reactRefresh()
  ]
})