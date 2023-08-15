import {defineConfig, loadEnv} from 'vite'
import {sentryVitePlugin} from '@sentry/vite-plugin'

// https://vitejs.dev/config
export default defineConfig(({command, mode}) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '')
  return {
    build: {
      sourcemap: true,
      rollupOptions: {
        external: ['@trpc/client'],
      },
    },
    resolve: {
      // Some libs that can run in both Web and Node.js, such as `axios`, we need to tell Vite to build them in Node.js.
      browserField: false,
      mainFields: ['module', 'jsnext:main', 'jsnext'],
    },
    plugins:
      command == 'build'
        ? [
            sentryVitePlugin({
              authToken: process.env.MINTTER_SENTRY_AUTH_TOKEN,
              org: 'mintter',
              project: 'electron',
              telemetry: false,
            }),
          ]
        : [],
  }
})
