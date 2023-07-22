import {defineConfig} from 'vite'
import {sentryVitePlugin} from '@sentry/vite-plugin'

// https://vitejs.dev/config
export default defineConfig({
  build: {
    sourcemap: true,
  },
  resolve: {
    // Some libs that can run in both Web and Node.js, such as `axios`, we need to tell Vite to build them in Node.js.
    browserField: false,
    mainFields: ['module', 'jsnext:main', 'jsnext'],
  },
  plugins: [
    sentryVitePlugin({
      authToken: process.env.MINTTER_SENTRY_AUTH_TOKEN,
      org: 'mintter',
      project: 'electron',
      telemetry: false,
    }),
  ],
})
